const {ROOM_STATE_CREATED, ROOM_STATE_ENDED, ROOM_STATE_STARTED, STATUS_PARTIAL_CORRECT, STATUS_ALL_CORRECT, STATUS_NOT_CORRECT, PLAYER_ROLE_CREATOR, PLAYER_ROLE_PLAYER, STATUS_UNKNOWN} = require('./constants')
const Firestore = require('@google-cloud/firestore');

const db = new Firestore({
    projectId: 'golden-tide-340508',
    keyFilename: 'key/golden-tide-340508-ea4a960ebfab.json',
});

const REDISHOST = process.env.REDISHOST || '192.168.86.22';
const REDISPORT = process.env.REDISPORT || 6379;

console.log(`Connectiong redis://${REDISHOST}:${REDISPORT}`)
const redisClient = require('redis').createClient({url: `redis://${REDISHOST}:${REDISPORT}`} );
redisClient.on('error', (err) => console.log('Redis Client Error:', err));

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

async function createRoom(roomName, playerObject){
    let room = await getRoomFromCache(roomName);
    if (room && (room.status !== ROOM_STATE_ENDED && new Date() - 1000*60*10 < room.created_time)){
        return false;
    }
    const new_room = {
        room_key: roomName,
        players: {},
        status: ROOM_STATE_CREATED,
        created_time: +new Date(),
        history: [],
        pending_players: [],
        current_round: 0
    };
    new_room.players[playerObject.player_id] = {
        role: PLAYER_ROLE_CREATOR,
        ...playerObject };
    await redisClient.set(roomName, JSON.stringify(new_room));
    await setRoomInDB(new_room);
    return true;
}

async function playerJoinRoom(roomName, playerObject) {
    let room = await getRoomFromCache(roomName);
    if(!room || room.status === ROOM_STATE_ENDED){
        return false;
    }
    // Reconnect
    if (playerObject.player_id in room.players){
        return true;
    }
    // Not allow player to join after created
    if (room.status !== ROOM_STATE_CREATED) {
        return false;
    }
    room.players[playerObject.player_id] = {
        role: PLAYER_ROLE_PLAYER,
        disconnected: false,
        ...playerObject
    };
    await redisClient.set(roomName, JSON.stringify(room));
    await updatePlayersInDB(roomName, room.players);
    return true;
}

async function getRoomFromCache(roomName) {
    console.log(`Reading room ${roomName} from Cache`);
    if (!(await redisClient.exists(roomName))) {
        console.log(`${roomName} not in redis`)
        const room = await getRoomFromDatabase(roomName);
        if (room) {
            await redisClient.set(roomName, JSON.stringify(room));
        }
    }
    const room_info = await redisClient.get(roomName);
    console.log(room_info);
    return JSON.parse(room_info);
}

async function setRoomStart(roomName, wordObject){
    let room = await getRoomFromCache(roomName);
    room.status = ROOM_STATE_STARTED;
    room.word = wordObject;
    room.history = [];
    room.pending_players = shuffle(Object.keys(room.players))
    room.current_round = 0;
    await redisClient.set(roomName, JSON.stringify(room));
    await setRoomInDB(room);
    return room;
}

async function setRoomEnd(roomName) {
    let room = await getRoomFromCache(roomName);
    room.status = ROOM_STATE_ENDED;
    await redisClient.set(roomName, JSON.stringify(room));
    await setRoomInDB(room);
    return room;
}

async function removePlayerFromRoom(roomName, player_id) {
    let room = await getRoomFromCache(roomName);
    if (player_id in room.players) {
        delete room.players[player_id]
    }
    console.log(room.players);
    room.pending_players = shuffle(Object.keys(room.players))
    room.current_round = 0;
    if (room.players.length === 0 || Object.values(room.players).every((p) => p.disconnected)){
        room.status = ROOM_STATE_ENDED;
    }
    await redisClient.set(roomName, JSON.stringify(room));
    await setRoomInDB(room);
    return room;
}

async function markPlayerAsDisconnected(roomName, player_id) {
    let room = await getRoomFromCache(roomName);
    if (player_id in room.players) {
        room.players[player_id].disconnected = true;
    }

    if (room.players.length === 0 || Object.values(room.players).every((p) => p.disconnected)){
        room.status = ROOM_STATE_ENDED;
    }
    await redisClient.set(roomName, JSON.stringify(room));
    await setRoomInDB(room);
    return room;
}



async function addRoomHistory(roomName, history){
    let room = await getRoomFromCache(roomName);
    room.history.push(history);
    room.current_round = (room.current_round + 1) % room.pending_players.length
    await redisClient.set(roomName, JSON.stringify(room));
    await setRoomInDB(room);
    return room;
}

const collRef = db.collection('rooms');

// const fake_DB = {}

async function setRoomInDB(new_room){
    // return fake_DB[new_room.room_key] = new_room;
    return await collRef.doc(new_room.room_key).set(new_room);
}

async function updatePlayersInDB(roomName, newPlayers){
    // return fake_DB[roomName].players = newPlayers;
    return await collRef.doc(roomName).update({players: newPlayers});
}

// Query the example database for messages for a specific room
async function getRoomFromDatabase(roomName) {
    // return fake_DB[roomName];
    const doc =  await collRef.doc(roomName).get();
    if (!doc.exists){
        return null;
    }
    return doc.data();
}

module.exports = {redisClient, addRoomHistory, createRoom, getRoomFromCache, playerJoinRoom, setRoomEnd, setRoomStart, removePlayerFromRoom, markPlayerAsDisconnected}