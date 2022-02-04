<template>
  <v-container>

    <h1>Welcome to Guess Word</h1>
    <v-text-field v-model="room_id" label=" Enter a Room Key: "></v-text-field>
    <v-text-field v-on:change="update_player_name" v-model="player_name" label="Enter your Name:"></v-text-field>
    <v-row>
      <v-btn v-on:click="create_room" class="mx-2">Create Room</v-btn>
      <v-btn v-on:click="join_room" class="mx-2">Join Room</v-btn>
    </v-row>

  </v-container>
</template>

<script>

import Vue from 'vue'

export default {
  name: 'Welcome',
  data: function () {
    return {
      room_id: this.$store.state.room_key,
      player_name: this.$store.state.playerName,
    }
  },
  methods: {
    create_room: function () {
      Vue.prototype.$socket.emit('create', this.room_id, {
        player_id: this.$store.state.playerID,
        player_name: this.$store.state.playerName
      })
    },
    join_room: function () {
      Vue.prototype.$socket.emit('join', this.room_id, {
        player_id: this.$store.state.playerID,
        player_name: this.$store.state.playerName
      })
    },
    update_player_name: function () {
      this.$store.commit('setPlayerName', this.player_name)
    }
  },
  mounted() {

    Vue.prototype.$socket.on('room_created', (room_info) => {
      this.$store.commit('setRoom', this.room_id)
      this.$store.commit('setRoomState', room_info)
      this.$router.push('/wait')
    })

    Vue.prototype.$socket.on('room_joined', () => {
      this.$store.commit('setRoom', this.room_id)
      this.$router.push('/wait')
    })

    Vue.prototype.$socket.on('room_update', (room_info) => {
      this.$store.commit('setRoomState', room_info)
    })
  },
  beforeDestroy() {
    Vue.prototype.$socket.off('room_created')
    Vue.prototype.$socket.off('room_update')
  }
}
</script>
