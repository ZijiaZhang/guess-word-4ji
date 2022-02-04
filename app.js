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
 * Create HTTP server.
 */

var server = http.createServer(app);

const { Server } = require("socket.io");

const io = new Server(server);


const ROOM_STATE_CREATED = 'created';
const ROOM_STATE_STARTED = 'started';
const ROOM_STATE_ENDED = 'ended';
const PLAYER_ROLE_CREATOR = 'creator';
const PLAYER_ROLE_PLAYER = 'player';

const STATUS_ALL_CORRECT = 'correct';
const STATUS_NOT_CORRECT = 'wrong';
const STATUS_PARTIAL_CORRECT = 'partial';
const STATUS_UNKNOWN = 'unknown';


let all_sessions = {}
const fs = require('fs');
const rawdata = fs.readFileSync('data/Words/all.json');
const all_words = JSON.parse(rawdata);
const get_random_word = function (){
    return all_words[Math.floor(Math.random()*all_words.length)]
}
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

const create_room = (room_key, creator) => {
    if (room_key in all_sessions && (all_sessions[room_key].status !== ROOM_STATE_ENDED || new Date() - 1000*60*60 > all_sessions[room_key].created_time)) {
        return false;
    }
    all_sessions[room_key] = {
        room_key,
        players: {},
        status: ROOM_STATE_CREATED,
        created_time: +new Date(),
        history: [],
        pending_players: []
    }
    if (creator in all_sessions[room_key].players){
        return false;
    }
    all_sessions[room_key].players[creator.player_id] = {
        role: PLAYER_ROLE_CREATOR,
        ...creator,
    };
    return true;
}

const join_room = (room_key, player) => {
    if (!(room_key in all_sessions) || all_sessions[room_key].status === ROOM_STATE_ENDED) {
        return false;
    }
    if (player.player_id in all_sessions[room_key].players){
        return true;
    }
    if(all_sessions[room_key].status !== ROOM_STATE_CREATED){
        return false;
    }

    all_sessions[room_key].players[player.player_id] = {role: PLAYER_ROLE_PLAYER, ...player};
    return true;
}

const get_room_data = (room_key) => {
    return {
        room_key: all_sessions[room_key].room_key,
        players: all_sessions[room_key].players,
        status: all_sessions[room_key].status,
        created_time: all_sessions[room_key].created_time,
        history: all_sessions[room_key].history,
        current_round: all_sessions[room_key].current_round,
        pending_players: all_sessions[room_key].pending_players
    }
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
            try{
                f(...args)
            } catch(e) {
                console.error(e);
                socket.emit('error', e.msg || 'Server/Connection Error');
            }
        }
    }
    socket.on('disconnect', () => {
        // console.log('user disconnected');
    });

    socket.on('create', error_catcher((room_key, player) => {
        // console.log(room_key, player, 'Create Room')
        if (create_room(room_key, player)){
            socket.emit('room_created', get_room_data(room_key));
            io.socketsLeave(room_key);
            socket.join(room_key);
            io.to(room_key).emit('room_update', get_room_data(room_key))
            socket.data.player = player;
            socket.data.room_key = room_key;
        } else {
            throw {msg: 'Cannot create room'};
        }
    }))
    socket.on('join', error_catcher((room_key, player) => {
        if (join_room(room_key, player)){
            socket.join(room_key)
            socket.emit('room_joined', get_room_data(room_key));
            io.to(room_key).emit('room_update', get_room_data(room_key))
            socket.data.player = player;
            socket.data.room_key = room_key;
        } else {
            throw {msg: 'Cannot join room'};
        }
    }))

    socket.on('get', error_catcher(() => {

        socket.emit('room_update', get_room_data(socket.data.room_key));
    }))

    socket.on('start', error_catcher(() => {
        all_sessions[socket.data.room_key].status = ROOM_STATE_STARTED
        all_sessions[socket.data.room_key].word = get_random_word();
        all_sessions[socket.data.room_key].history = [];
        all_sessions[socket.data.room_key].pending_players = shuffle(Object.keys(all_sessions[socket.data.room_key].players));
        all_sessions[socket.data.room_key].current_round = 0;
        io.to(socket.data.room_key).emit('room_update', get_room_data(socket.data.room_key))
        // console.log(all_sessions[socket.data.room_key].word);
        io.to(socket.data.room_key).emit('game_start', all_sessions[socket.data.room_key].word.word.length);
    }))

    socket.on('word_len', error_catcher(() => {
        // console.log(all_sessions[socket.data.room_key].word);
        io.to(socket.data.room_key).emit('word_len', all_sessions[socket.data.room_key].word.word.length);
    }))

    socket.on('submit', error_catcher((word) => {
        word = word.toLowerCase();
        const target = all_sessions[socket.data.room_key].word.word;
        // console.log(target);
        if (word.length !== target.length){
            socket.emit('submit_error', 'word length mismatch');
        }
        if (socket.data.player !== all_sessions[socket.data.room_key].pending_players[all_sessions[socket.data.room_key].current_round]){
            socket.emit('submit_error', 'Not your round');
        }
        const final_result = get_word_matches(word, target)
        all_sessions[socket.data.room_key].history.push({
            word: final_result,
            player_id: socket.data.player.player_id
        });
        if (word === target) {
            all_sessions[socket.data.room_key].status = ROOM_STATE_ENDED;
        }
        all_sessions[socket.data.room_key].current_round = (all_sessions[socket.data.room_key].current_round + 1) %all_sessions[socket.data.room_key].pending_players.length;
        io.to(socket.data.room_key).emit('room_update', get_room_data(socket.data.room_key))
    }))

    socket.on('get_word', error_catcher(() => {
        if(all_sessions[socket.data.room_key].status === ROOM_STATE_ENDED) {
            socket.emit('get_word', all_sessions[socket.data.room_key].word);
        }
    }))

});


server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

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
