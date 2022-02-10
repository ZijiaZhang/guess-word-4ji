const {ROOM_STATE_CREATED, ROOM_STATE_ENDED, ROOM_STATE_STARTED, STATUS_PARTIAL_CORRECT, STATUS_ALL_CORRECT, STATUS_NOT_CORRECT, PLAYER_ROLE_CREATOR, PLAYER_ROLE_PLAYER, STATUS_UNKNOWN} = require('./constants')
const {redisClient, addRoomHistory, createRoom, getRoomFromCache, playerJoinRoom, setRoomEnd, setRoomStart, removePlayerFromRoom, markPlayerAsDisconnected,
    findMatch
} = require('./redis')

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
// var apiRouter = require('./routes/api');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'dist')));

app.use('/', indexRouter);
// app.use('/api', apiRouter);

module.exports = app;

var debug = require('debug')('guess-words-4ji-backend:server');
var http = require('http');

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Create HTTP server.
 */

const redisAdapter = require('@socket.io/redis-adapter');
const pubClient = redisClient;
const subClient = pubClient.duplicate();
const serverPromise =  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {

    var server = http.createServer(app);

    const { Server } = require("socket.io");

    const io = new Server(server);
    io.adapter(redisAdapter(pubClient, subClient));

    const fs = require('fs');
    const rawdata = fs.readFileSync('data/Words/all.json');
    const all_words = JSON.parse(rawdata);
    const get_random_word = function () {
        return all_words[Math.floor(Math.random() * all_words.length)]
    }

    const parse_room_data = (room) => {
        return {
            room_key: room.room_key,
            players: room.players,
            status: room.status,
            created_time: room.created_time,
            history: room.history,
            current_round: room.current_round,
            pending_players: room.pending_players
        }
    }

    const get_room_data = async (room_key) => {
        if(!room_key){
            throw {msg: 'connection error roomKey error'}
        }
        let room = await getRoomFromCache(room_key)
        return parse_room_data(room);
    }

    function get_word_matches(word, target) {
        const word_result = word.split('').map((char, index) => {
            return {
                input: char,
                target: target[index],
                same: char === target[index]
            }
        })
        let rest_word = {}
        for (let i = 0; i < word.length; i++) {
            if (!word_result[i].same) {
                if (!(word_result[i].target in rest_word)) {
                    rest_word[word_result[i].target] = 0
                }
                rest_word[word_result[i].target] += 1
            }
        }
        const final_result = []
        for (let { input, same } of word_result) {
            if (same) {
                final_result.push({
                    char: input,
                    status: STATUS_ALL_CORRECT
                })
            } else {
                if (input in rest_word && rest_word[input] > 0) {
                    final_result.push({
                        char: input,
                        status: STATUS_PARTIAL_CORRECT
                    })
                    rest_word[input]--
                } else {
                    final_result.push({
                        char: input,
                        status: STATUS_NOT_CORRECT
                    })
                }
            }
        }
        return final_result
    }

    io.on('connection', (socket) => {
        // console.log('a user connected');
        const error_catcher = (f) => {
            return (...args) => {
                try {
                    f(...args)
                } catch (e) {
                    console.error(e);
                    socket.emit('error', e.msg || 'Server/Connection Error');
                }
            }
        }
        const error_catcher_async = (f) => {
            return async (...args) => {
                try {
                    await f(...args)
                } catch (e) {
                    console.error(e);
                    socket.emit('error', e.msg || 'Server/Connection Error');
                }
            }
        }
        socket.on('match_making', error_catcher_async(async ({player}, callBack) => {
            if (!player.player_name){
                callBack('Invalid Player Name', undefined);
                throw {msg: 'Invalid Player Name'};
            }
            let room = await findMatch(player);
            socket.join(room.room_key);
            socket.data.room_key = room.room_key;
            socket.data.player = player;
            io.to(socket.data.room_key).emit('info',  `${player.player_name} joined the room`);
            if (Object.keys(room.players).length !== 2){
                callBack(undefined, room);
                return;
            }
            // Start the game
            room = await setRoomStart(socket.data.room_key, get_random_word());
            const log = {phase: 'game_start', room};
            console.log(JSON.stringify(log))
            io.to(socket.data.room_key).emit('game_start', room.word.word.length);
            callBack(undefined, room);
        }));

        socket.on('create', error_catcher_async(async ({ room_key, player }, callBack) => {
            if(!room_key || !player.player_name){
                callBack('Invalid room name or player name', undefined);
                throw {msg: 'Invalid room name or player name'};
            }
            // console.log(room_key, player, 'Create Room')
            if (await createRoom(room_key, player)) {
                const prev_sockets = await io.in(room_key).allSockets();
                for (let socket of prev_sockets) {
                    io.of('/').adapter.remoteLeave('socket', room_key);
                }
                socket.join(room_key);
                socket.data.player = player;
                socket.data.room_key = room_key;
                // Room Created Callback
                let room = await get_room_data(room_key);
                const log = {phase: 'room_created', room};
                console.log(JSON.stringify(log))
                callBack(undefined, room);
            } else {
                callBack('Cannot create room', undefined);
                throw { msg: 'Cannot create room' };
            }
        }))
        socket.on('join', error_catcher_async(async ({ room_key, player }, callBack) => {
            if(!room_key|| !player.player_name){
                callBack('Invalid room name or player name', undefined);
                throw {msg: 'Invalid room name or player name'};
            }
            if (await playerJoinRoom(room_key, player)) {
                socket.join(room_key)
                console.log(await io.in(room_key).allSockets())
                const room = await get_room_data(room_key);
                callBack(undefined, room);
                io.to(room_key).emit('player_list_updated', room.players);
                socket.data.player = player;
                socket.data.room_key = room_key;
                const log = {phase: 'player_join', room};
                console.log(JSON.stringify(log))
                io.to(room_key).emit('info',  `${player.player_name} joined the room`);
            } else {
                callBack('Cannot create room', undefined );
                throw { msg: 'Cannot join room' };
            }
        }))

        socket.on('get', error_catcher_async(async (callBack) => {
            let room_data = await get_room_data(socket.data.room_key);
            callBack(room_data);
        }))

        socket.on('start', error_catcher_async(async () => {
            if(!socket.data.room_key){
                throw {msg: 'connection error roomKey error'}
            }
            let room = await getRoomFromCache(socket.data.room_key);
            if (room.players[socket.data.player.player_id].role !==PLAYER_ROLE_CREATOR) {
                throw {msg: 'only Owner can start the game'}
            }
            room = await setRoomStart(socket.data.room_key, get_random_word());
            const log = {phase: 'game_start', room};
            console.log(JSON.stringify(log))
            io.to(socket.data.room_key).emit('game_start', room.word.word.length);
        }))

        socket.on('word_len', error_catcher_async(async (callBack) => {
            if(!socket.data.room_key){
                throw {msg: 'connection error roomKey error'}
            }
            let room = await getRoomFromCache(socket.data.room_key);
            callBack(room.word.word.length);
        }))

        socket.on('submit', error_catcher_async(async ({ word }, errorCallBack) => {
            if(!socket.data.room_key){
                throw {msg: 'connection error roomKey error'}
            }
            word = word.toLowerCase();
            let room = await getRoomFromCache(socket.data.room_key);
            const target = room.word.word;
            // console.log(target);
            if (word.length !== target.length) {
                errorCallBack('word length mismatch');
                return;
            }
            if (socket.data.player.player_id !== room.pending_players[room.current_round]) {
                errorCallBack(`Not your round ${socket.data.player.player_id} !=== ${room.pending_players[room.current_round]}`);
                return
            }
            const final_result = get_word_matches(word, target)
            room = await addRoomHistory(socket.data.room_key, {
                word: final_result,
                player_id: socket.data.player.player_id,
                player_name: socket.data.player.player_name
            });
            if (word === target) {
                room = await setRoomEnd(socket.data.room_key)
            }
            const log = {phase: 'submit_end', room};
            console.log(JSON.stringify(log))
            io.to(socket.data.room_key).emit('room_update', parse_room_data(room));
        }))

        socket.on('get_word', error_catcher_async(async (callBack) => {
            if(!socket.data.room_key){
                throw {msg: 'connection error roomKey error'}
            }
            const room = await getRoomFromCache(socket.data.room_key);
            if (room.status === ROOM_STATE_ENDED) {
                callBack(room.word);
            }
        }))

        socket.on('timeout', error_catcher_async(async () => {
            let room = await getRoomFromCache(socket.data.room_key);
            if (new Date() - 30 * 1000 < room.current_round_time){
                return;
            }
            const target = room.word.word;
            let final_result = target.split('').map(() => {
                return {
                    char: '_',
                    status: STATUS_UNKNOWN
                }
            })
            const player_id = room.pending_players[room.current_round]
            room = await addRoomHistory(socket.data.room_key, {
                word: final_result,
                player_id: player_id,
                player_name: room.players[player_id].player_name + ' TIMEOUT'
            })
            const log = {phase: `${room.players[player_id]} timeout`, room};
            console.log(JSON.stringify(log));
            io.to(socket.data.room_key).emit('room_update', parse_room_data(room));
        }));

        socket.on('leave_room', error_catcher_async(async () => {
            if (!socket.data.room_key || !socket.data.player || !socket.data.player.player_id) {
                return;
            }
            let room = await removePlayerFromRoom(socket.data.room_key, socket.data.player.player_id)
            socket.leave(socket.data.room_key);
            io.to(socket.data.room_key).emit('player_left', parse_room_data(room));
            if(room.status !== ROOM_STATE_ENDED) {
                io.to(socket.data.room_key).emit('warn', `Player ${socket.data.player.player_name} left room, reorganizing the rounds`);
            }
            const log = {phase: 'player_left', room};
            console.log(JSON.stringify(log))
            socket.data.room_key = undefined;
        }))

        socket.on('disconnect', error_catcher_async(async () => {
            if (!socket.data.room_key || !socket.data.player || !socket.data.player.player_id) {
                return;
            }
            const room = await markPlayerAsDisconnected(socket.data.room_key, socket.data.player.player_id);
            const log = {phase: 'player_disconnected', room};
            console.log(JSON.stringify(log))
            io.to(socket.data.room_key).emit('warn',  `${socket.data.player.player_name} has disconnected`);
        }))

    });


    server.listen(port);
    server.on('error', onError);
    server.on('listening', onListening);


    /**
     * Event listener for HTTP server "error" event.
     */

    function onError(error) {
        if (error.syscall !== 'listen') {
            throw error;
        }

        var bind = typeof port === 'string'
            ? 'Pipe ' + port
            : 'Port ' + port;

        // handle specific listen errors with friendly messages
        switch (error.code) {
            case 'EACCES':
                console.error(bind + ' requires elevated privileges');
                process.exit(1);
                break;
            case 'EADDRINUSE':
                console.error(bind + ' is already in use');
                process.exit(1);
                break;
            default:
                throw error;
        }
    }

    /**
     * Event listener for HTTP server "listening" event.
     */

    function onListening() {
        var addr = server.address();
        var bind = typeof addr === 'string'
            ? 'pipe ' + addr
            : 'port ' + addr.port;
        debug('Listening on ' + bind);
    }

});