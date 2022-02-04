var express = require('express');
var router = express.Router();

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

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('api');
});

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
  all_sessions[room_key].players[creator.player_id] = {role: PLAYER_ROLE_CREATOR, ...creator};
  return true;
}

const join_room = (room_key, player) => {
  if (!(room_key in all_sessions) || all_sessions[room_key].status === ROOM_STATE_ENDED) {
    return false;
  }
  if (player in all_sessions[room_key].players){
    return true;
  }
  if(all_sessions[room_key].status !== ROOM_STATE_STARTED){
    return false;
  }

  all_sessions[room_key].players[player.player_id] = {role: PLAYER_ROLE_PLAYER, ...player};
  return true;
}

router.post('/create', function (req, res, next){
  const room_key = req.body.room_key
  const player = req.body.player
  if (!room_key || !player){
    res.status(400).send({message: 'Error creating room, bad request'});
    return;
  }
  if(create_room(room_key, player)){
    res.status(200).send(all_sessions[room_key]);
  } else {
    res.status(403).send({message: 'Room code in use, please choose another one'});
  }

})

router.post('/join', function (req, res, next){
  const room_key = req.body.room_key
  const player = req.body.player
  if (!room_key || !player){
    res.status(400).send({message: 'Error joining room, bad request'});
    return;
  }
  if(join_room(room_key, player)){
    res.status(200).send(all_sessions[room_key]);
  } else {
    res.status(403).send({message: 'Resource not available'});
  }
})

const verify_room = function (req, res, next){
  if(!req.headers['x-player'] || !req.headers['x-room']) {
    return res.status(401).json({ message: 'Missing Authorization Header'})
  }
  req.player = req.headers['x-player']
  req.room = req.headers['x-room']
  if (!(req.room in all_sessions)){
    return res.status(404).json({message: 'Requested room not found'});
  }
  if (!(req.player in all_sessions[req.room].players)){
    return  res.status(404).json({message: 'Player requested is not in room'});
  }
  req.room_session = all_sessions[req.room];
  return next();
}

router.get('/get', verify_room, function (req, res, next) {
  let data = req.room_session
  return res.json({
    room_key: data.room_key,
    players: data.players,
    status: data.status,
    created_time: data.created_time,
    history: data.history,
    current_round: data.current_round,
    pending_players: data.pending_players
  });
})

router.post('/update_name', verify_room, function (req, res, next) {
  req.room_session.players[req.player].player_name = req.body.player_name
  return res.json({
    message: 'Name Updated'
  });
})

const fs = require('fs');
const rawdata = fs.readFileSync('data/Words/all.json');
let all_words = JSON.parse(rawdata);
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

router.post('/start', verify_room, function (req, res, next) {
  req.room_session.status = ROOM_STATE_STARTED
  req.room_session.word = get_random_word();
  req.room_session.history = [];
  req.room_session.pending_players = shuffle(Object.keys(req.room_session.players));
  req.room_session.current_round = 0;
  return res.json({message: 'Started'});
})

router.get('/get-word-length', verify_room, function (req, res, next) {
  return res.json({
    length: req.room_session.word.word.length
  });
})

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

router.post('/submit', verify_room, function (req, res, next) {
  const word = req.body.word.toLowerCase();
  const target =  req.room_session.word.word;
  if (word.length !== target.length) {
    return res.status(400).json({message: 'word length mismatch'})
  }
  if (req.player !== req.room_session.pending_players[req.room_session.current_round]){
    return res.status(401).json({message: 'Not your round'});
  }

  const final_result = get_word_matches(word, target)

  req.room_session.history.push({
    word: final_result,
    player_id: req.player
  });

  if (word === target) {
    req.room_session.status = ROOM_STATE_ENDED;
  }

  req.room_session.current_round = (req.room_session.current_round + 1) %req.room_session.pending_players.length;

  return res.json({
    room_key: req.room_session.room_key,
    players: req.room_session.players,
    status: req.room_session.status,
    created_time: req.room_session.created_time,
    history: req.room_session.history,
    current_round: req.room_session.current_round,
    pending_players: req.room_session.pending_players
  });
})

router.get('/get-word', verify_room, function (req, res, next) {
  if (req.room_session.status !== ROOM_STATE_ENDED){
    return res.status(403).json({message: 'This game has not ended'});
  }
  return res.json(req.room_session.word);
})

module.exports = router;
