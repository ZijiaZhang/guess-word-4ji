const {ROOM_STATE_CREATED, ROOM_STATE_ENDED, ROOM_STATE_STARTED, STATUS_PARTIAL_CORRECT, STATUS_ALL_CORRECT, STATUS_NOT_CORRECT, PLAYER_ROLE_CREATOR, PLAYER_ROLE_PLAYER, STATUS_UNKNOWN} = require('./constants')
const Firestore = require('@google-cloud/firestore');
const {v4: uuidv4} = require('uuid');

const db = new Firestore({
    projectId: 'golden-tide-340508',
    keyFilename: 'key/golden-tide-340508-6a68baf365e6.json',
});

const REDISHOST = process.env.REDISHOST || '192.168.86.22';
const REDISPORT = process.env.REDISPORT || 6379;

console.log(`Connectiong redis://${REDISHOST}:${REDISPORT}`)
const redisClient = require('redis').createClient({url: `redis://${REDISHOST}:${REDISPORT}`} );
redisClient.on('error', (err) => console.log('Redis Client Error:', err));
const collRef = db.collection('rooms');

function shuffle(array) {
    let currentIndex = array.length,  randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}

const transactionWrapper = async (func) => {
    try {
      return await db.runTransaction(func);
    } catch (e) {
        console.error(`Transaction Error, ${e}`)
        throw e;
    }

}

async function findMatch(playerObject){
    return await transactionWrapper(async (t) => {
       const validMatches = await findOpenRoomsInDB(t);
        if(validMatches.empty) {
            const room_key = uuidv4();
            const new_room = {
                room_key,
                players: {},
                status: ROOM_STATE_CREATED,
                created_time: +new Date(),
                history: [],
                pending_players: [],
                current_round: 0,
                public: true,
                word_len: [5,5],
                timeout: true
            };
            new_room.players[playerObject.player_id] = {  disconnected: false, ...playerObject };
            await t.set(collRef.doc(new_room.room_key), new_room);
            await redisClient.set(room_key, JSON.stringify(new_room));
            return new_room;
        }
        const room = validMatches.docs[0].data();
        room.players[playerObject.player_id] = {
            disconnected: false,
            ...playerObject
        };
        room.status = ROOM_STATE_STARTED;
        await redisClient.set(room.room_key, JSON.stringify(room));
        await t.set(collRef.doc(room.room_key), room);
        return room;
    });



}

async function createRoom(roomName, playerObject){
    return await transactionWrapper(async (t) => {
        try{
            let room = await getRoomFromCache(t, roomName, true);
            if (room && (room.status !== ROOM_STATE_ENDED && new Date() - 1000 * 60 * 10 < room.created_time)) {
                await redisClient.unwatch(roomName);
                return false;
            }
            const new_room = {
                room_key: roomName,
                players: {},
                status: ROOM_STATE_CREATED,
                created_time: +new Date(),
                history: [],
                pending_players: [],
                current_round: 0,
                public: false,
                word_len: [3,6],
                timeout: false
            };
            new_room.players[playerObject.player_id] = {
                role: PLAYER_ROLE_CREATOR,
                disconnected: false,
                ...playerObject
            };
            await redisClient.multi().set(roomName, JSON.stringify(new_room)).exec();
            await setRoomInDB(t, new_room);
            return true;
        } catch (e) {
            // ABORTED
            console.log({err: "Redis Transaction Aborted", e});
            return false;
        }

    });
}

async function playerJoinRoom(roomName, playerObject) {
    return await transactionWrapper(async (t) => {
        try {
            const room = await getRoomFromCache(t, roomName, true);
            if (!room || room.status === ROOM_STATE_ENDED) {
                await redisClient.unwatch(roomName);
                return false;
            }
            // Reconnect
            if (playerObject.player_id in room.players) {
                await redisClient.unwatch(roomName);
                return true;
            }
            // Not allow player to join after created
            if (room.status !== ROOM_STATE_CREATED) {
                await redisClient.unwatch(roomName);
                return false;
            }
            room.players[playerObject.player_id] = {
                role: PLAYER_ROLE_PLAYER,
                disconnected: false,
                ...playerObject
            };
            await redisClient.multi().set(roomName, JSON.stringify(room)).exec();
            await updatePlayersInDB(t, roomName, room.players);

            return true;
        } catch (e){
            console.log({err: "Redis Transaction Aborted", e});
            return false;
        }
    });

}

async function getRoomFromCache(t, roomName, watch=false) {
    console.log(`Reading room ${roomName} from Cache`);
    if (!(await redisClient.exists(roomName))) {
        console.log(`${roomName} not in redis`)
        const room = await getRoomFromDatabase(t, roomName);
        if (room) {
            await redisClient.set(roomName, JSON.stringify(room));
        }
    }
    if(watch){
        await redisClient.watch(roomName);
    }
    const room_info = await redisClient.get(roomName);
    return JSON.parse(room_info);
}

async function getRoomFromCacheNoTransaction(roomName) {
    console.log(`Reading room ${roomName} from Cache`);
    if (!(await redisClient.exists(roomName))) {
        console.log(`${roomName} not in redis`)
        const doc =  await collRef.doc(roomName).get();
        let room;
        if (!doc.exists){
            room = null;
        }else {
            room = doc.data();
        }
        if (room) {
            await redisClient.set(roomName, JSON.stringify(room));
        }
    }
    const room_info = await redisClient.get(roomName);
    return JSON.parse(room_info);
}

async function updateRoomSettings(roomName, settings){
    return await transactionWrapper(async (t) => {
        try {
            let room = await getRoomFromCache(t, roomName, true);
            room = {...room, ...settings}
            await redisClient.multi().set(roomName, JSON.stringify(room)).exec();
            await setRoomInDB(t, room);
            return room;
        } catch (e) {
            console.log({err: "Redis Transaction Aborted", e});

            return false;
        }
    });
}

async function setRoomStart(roomName, wordObject){
    return await transactionWrapper(async (t) => {
        try {
            let room = await getRoomFromCache(t, roomName, true);
            room.status = ROOM_STATE_STARTED;
            room.word = wordObject;
            room.history = [];
            room.pending_players = shuffle(Object.keys(room.players))
            room.current_round = 0;
            room.current_round_time = +new Date();
            await redisClient.multi().set(roomName, JSON.stringify(room)).exec();
            await setRoomInDB(t, room);
            return room;
        } catch (e) {
            console.log({err: "Redis Transaction Aborted", e});

            return false;
        }
    });
}

async function setRoomEnd(roomName) {
    return await transactionWrapper(async (t) => {
        try {
            let room = await getRoomFromCache(t, roomName, true);
            room.status = ROOM_STATE_ENDED;
            await redisClient.multi().set(roomName, JSON.stringify(room)).exec();
            await setRoomInDB(t, room);
            return room;
        } catch (e) {
            console.log({err: "Redis Transaction Aborted", e});

            return false;
        }
    });
}

async function removePlayerFromRoom(roomName, player_id) {
    return await transactionWrapper(async (t) => {
        try {
            let room = await getRoomFromCache(t, roomName, true);
            if (player_id in room.players) {
                delete room.players[player_id]
            }
            room.pending_players = shuffle(Object.keys(room.players))
            room.current_round = 0;
            room.current_round_time = +new Date();
            const should_terminate = room.players.length === 0 || Object.values(room.players).every((p) => p.disconnected);
            if (should_terminate) {
                room.status = ROOM_STATE_ENDED;
            }
            await redisClient.multi().set(roomName, JSON.stringify(room)).exec();
            if (should_terminate) {
                await removeRoom(t, roomName);
            } else {
                await setRoomInDB(t, room);
            }
            return room;
        } catch (e) {
            console.log({err: "Redis Transaction Aborted", e});

            return false;
        }
    });
}

async function markPlayerAsDisconnected(roomName, player_id) {
    return await transactionWrapper(async (t) => {
        try {
            let room = await getRoomFromCache(t, roomName, true);
            if (player_id in room.players) {
                room.players[player_id].disconnected = true;
            }
            const should_terminate = room.players.length === 0 || Object.values(room.players).every((p) => p.disconnected);
            if (should_terminate) {
                room.status = ROOM_STATE_ENDED;
            }
            if (should_terminate) {
                await removeRoom(t, roomName);
            } else {
                await setRoomInDB(t, room);
            }
            await redisClient.multi().set(roomName, JSON.stringify(room)).exec();
            return room;
        } catch (e) {
            console.log({err: "Redis Transaction Aborted", e});

            return false;
        }
    });
}



async function addRoomHistory(roomName, history){
    return await transactionWrapper(async (t) => {
        try {
            let room = await getRoomFromCache(t, roomName, true);
            if ((history.player_id) !== room.pending_players[room.current_round]) {
                await redisClient.unwatch(roomName);
                throw { msg: 'Not your round' }
            }
            room.history.push(history);
            room.current_round = (room.current_round + 1) % room.pending_players.length
            room.current_round_time = +new Date();
            await redisClient.multi().set(roomName, JSON.stringify(room)).exec();
            await setRoomInDB(t, room);
            return room;
        } catch (e) {

            console.log({err: "Redis Transaction Aborted", e});
            return  false;
        }
    });
}



// const fake_DB = {}

async function setRoomInDB(t, new_room){
    // return fake_DB[new_room.room_key] = new_room;
    return await t.set(collRef.doc(new_room.room_key), new_room);
}

async function removeRoom(t, roomName){
    //return delete fake_DB[roomName.room_key];
    // console.log({phase: 'db_removed', roomName})
    console.log(`Room Removed ${roomName}`)
    return await t.delete(collRef.doc(roomName));
}

async function updatePlayersInDB(t, roomName, newPlayers){
    // return fake_DB[roomName].players = newPlayers;
    return await t.update(collRef.doc(roomName), {players: newPlayers});
}

// Query the example database for messages for a specific room
async function getRoomFromDatabase(t, roomName) {
    // return fake_DB[roomName];
    const doc =  await t.get(collRef.doc(roomName));
    if (!doc.exists){
        return null;
    }
    return doc.data();
}

async function findOpenRoomsInDB(t){
    // for (let entry of Object.values(fake_DB)) {
    //     if (entry.public && entry.status === ROOM_STATE_CREATED){
    //         return [entry];
    //     }
    // }
    // return [];
    return await t.get(collRef.where('public', '==', true).where('status', '==', ROOM_STATE_CREATED)
        .orderBy('created_time').limit(1));
}

module.exports = {redisClient, updateRoomSettings, getRoomFromCacheNoTransaction, addRoomHistory, createRoom, playerJoinRoom, setRoomEnd, setRoomStart, removePlayerFromRoom, markPlayerAsDisconnected, findMatch}
