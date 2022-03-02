<template>
  <div>
    <v-card width="80%"  class="mx-auto mt-2">
      <v-card-title>Waiting Room</v-card-title>
      <v-card-subtitle class="align-start">{{ this.$store.state.room_state.room_key }}</v-card-subtitle>
      <v-list two-line>
        <v-toolbar flat>
          <v-toolbar-title flat class="text-h6">
            Players
          </v-toolbar-title>
        </v-toolbar>
        <v-list-item v-for="player in this.$store.state.room_state.players" :key="player.player_id">
          <v-list-item-content>
            <v-list-item-title>{{ player.player_name || 'Player' }}</v-list-item-title>
            <v-list-item-subtitle>{{ player.player_id }}</v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
      </v-list>
      <GameOptions/>
      <v-btn v-on:click="start_game" v-if="this.$store.state.room_state.players && this.$store.state.room_state.players[$store.state.playerID].role === 'creator'" >Start</v-btn>
      <v-card-subtitle class="black--text" v-else>{{ $store.state.room_state.public ? 'Waiting for more players...' : 'Waiting for creator to start the game ...'  }}</v-card-subtitle>
      <v-card-text class="text-caption">{{ JSON.stringify(this.$store.state.room_state) }}</v-card-text>
    </v-card>
  </div>
</template>

<script>

import Vue from 'vue'
import GameOptions from '@/components/GameOptions'

export default {
  name: 'WaitingRoom',
  components: { GameOptions },
  methods: {
    start_game: function () {
      Vue.prototype.$socket.emit('start');
    }
  },
  mounted() {
    Vue.prototype.$socket.emit('get', (room_info) => {
      this.$store.commit('setRoomState', room_info)
      if (room_info.status === 'started'){
        this.$router.push('/game');
      }
    });
    Vue.prototype.$socket.on('player_list_updated', (playerList) => {
      this.$store.commit('setPlayer', playerList)
    });
    Vue.prototype.$socket.on('game_start', (word_len) => {
      console.log(word_len);
      this.$store.commit('setRoomStatus', 'started');
      this.$store.commit('setWordLen', word_len);
      this.$router.push('/game');
    })
  },
  beforeDestroy() {
    Vue.prototype.$socket.off('game_start')
    Vue.prototype.$socket.off('player_list_updated//')
  }
}
</script>

<style scoped>

</style>