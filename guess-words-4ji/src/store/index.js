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
    playerName: 'Player',
    playerID: uuidv4(),
    room_key: undefined,
    room_state: {},
    word_len: 0
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
    setWordLen: function (state, new_word_len) {
      state.word_len = new_word_len;
    }
  }
})

export default store
