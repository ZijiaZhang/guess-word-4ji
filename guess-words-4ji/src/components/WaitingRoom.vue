<template>
  <div>
    <v-card width="80%"  class="mx-auto mt-2">
      <v-card-title>Waiting Room</v-card-title>
      <v-card-subtitle class="align-start">{{ room_info.room_key }}</v-card-subtitle>
      <v-list two-line>
        <v-toolbar flat>
          <v-toolbar-title flat class="text-h6">
            Players
          </v-toolbar-title>
        </v-toolbar>
        <v-list-item v-for="player in room_info.players" :key="player.player_id">
          <v-list-item-content>
            <v-list-item-title>{{ player.player_name || 'Player' }}</v-list-item-title>
            <v-list-item-subtitle>{{ player.player_id }}</v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
      </v-list>
      <v-btn v-on:click="start_game" v-if="room_info.players && room_info.players[$store.state.playerID].role === 'creator'" >Start</v-btn>
      <v-card-subtitle class="black--text" v-else>Waiting for creator to start the game ...</v-card-subtitle>
      <v-card-text class="text-caption">{{ JSON.stringify(room_info) }}</v-card-text>
    </v-card>
  </div>
</template>

<script>
import {requestServer} from '@/plugins/function_helpers'

export default {
  name: 'WaitingRoom',
  data: function () {
    return {
      room_info: {},
      data_querier: undefined,
    }
  },
  methods: {
    getRoomInfo: function () {
      return requestServer(this, '/get', 'GET').then((data) => {
        this.room_info = data
        if(this.room_info.status === 'started'){
          this.$router.push('/game');
        }
      })
    },
    start_game: function () {
      return requestServer(this, '/start', 'POST').then(() => {
        this.$router.push('/game');
      });
    }
  },
  mounted() {
    this.getRoomInfo()
    this.data_querier = setInterval(() => this.getRoomInfo(), 3000)
  },
  beforeDestroy() {
    if (this.data_querier) {
      clearInterval(this.data_querier)
    }
  }
}
</script>

<style scoped>

</style>