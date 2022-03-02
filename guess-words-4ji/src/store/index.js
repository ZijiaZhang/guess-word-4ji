import Vue from 'vue'
import Vuex from 'vuex'
import { v4 as uuidv4 } from 'uuid';
import createPersistedState from 'vuex-persistedstate'


Vue.use(Vuex)

/* eslint-disable no-new */
const store = new Vuex.Store({
  plugins: [createPersistedState()],
  modules: {
  },
  state: {
    playerName: undefined,
    playerID: uuidv4(),
    room_key: undefined,
    room_state: {},
    word_len: 0,
    connected: Vue.prototype.$socket? Vue.prototype.$socket.connected : false
  },
  mutations: {
    setRoom: function (state, new_room_key) {
      state.room_key = new_room_key
    },
    setPlayerName: function(state, new_player_name) {
      state.playerName = new_player_name;
    },
    setRoomState: function (state, new_room_state) {
      state.room_state = new_room_state;
    },
    setPlayer: function (state, new_players){
      state.room_state.players = new_players;
      state.room_state = {...state.room_state};
    },
    setRoomStatus: function (state, new_status) {
      state.room_state.status = new_status;
      state.room_state = {...state.room_state};
    },
    setWordLen: function (state, new_word_len) {
      state.word_len = new_word_len;
    },
    setConnected: function (state, connected) {
      state.connected = connected
    }
  }
})

export default store
