<template>
  <v-container>
    <PlayerNameDialog/>
    <v-card-title>Guess a Word</v-card-title>

    <v-text-field v-model="player_name" label="Enter your Name:" filled></v-text-field>


    <v-tabs
        v-model="game_mode"
        background-color="transparent"
        color="basil"
        icons-and-text
        grow
    >
      <v-tab>Private Games</v-tab>
      <v-tab>
        <v-chip color="red lighten-2" small pill class="d-inline ma-2">Testing</v-chip>
        Public Games
      </v-tab>
    </v-tabs>
    <v-tabs-items v-model="game_mode">
      <v-tab-item>
        <v-card class="mx-1" flat>
          <v-card-title>Create/Join a Private room</v-card-title>
          <v-col class="justify-center">
            <v-text-field v-model="room_id" label=" Enter a Room Key: " filled></v-text-field>
            <v-btn v-on:click="create_room" :loading="loading" class="mx-2" :disabled="!$store.state.connected">Create
              Room
            </v-btn>
            <v-btn v-on:click="join_room" :loading="loading" class="mx-2" :disabled="!$store.state.connected">Join Room
            </v-btn>
          </v-col>
        </v-card>
      </v-tab-item>
      <v-tab-item>
        <v-card class="mx-1" flat>
          <v-card-title>Join a Random room
            <v-chip color="red lighten-2" small pill class="d-inline mx-2">Testing</v-chip>
          </v-card-title>
          <v-card-subtitle>Each room support 2 players.</v-card-subtitle>
          <v-card-text>Have a 30s limit each round.</v-card-text>

          <v-col class="justify-center">
            <v-btn v-on:click="match_making" :loading="loading" class="mx-2" :disabled="!$store.state.connected">Start
              Match Making
            </v-btn>
          </v-col>
        </v-card>
      </v-tab-item>
    </v-tabs-items>
  </v-container>
</template>

<script>

import Vue from 'vue'
import PlayerNameDialog from '@/components/PlayerNameDialog'

export default {
  name: 'Welcome',
  components: { PlayerNameDialog },
  data: function () {
    return {
      game_mode: 'public',
      room_id: this.$store.state.room_key,
      loading: false,
      dialog: !this.$store.state.playerName,
      e6: 1
    }
  },
  methods: {
    match_making: function () {
      this.loading = true
      Vue.prototype.$socket.emit(
          'match_making', {
            player: {
              player_id: this.$store.state.playerID,
              player_name: this.$store.state.playerName
            }
          },
          (err, room_info) => {
            this.loading = false
            if (err) {
              return
            }
            this.$store.commit('setRoom', room_info.room_key)
            this.$store.commit('setRoomState', room_info)
            this.$router.push('/wait')
          }
      )
    },
    create_room: function () {
      this.loading = true
      Vue.prototype.$socket.emit(
          'create',
          {
            room_key: this.room_id,
            player: {
              player_id: this.$store.state.playerID,
              player_name: this.$store.state.playerName
            }
          }, (err, room_info) => {
            this.loading = false
            if (err) {
              return
            }
            this.$store.commit('setRoom', this.room_id)
            this.$store.commit('setRoomState', room_info)
            this.$router.push('/wait')
          })
    },
    join_room: function () {
      this.loading = true
      Vue.prototype.$socket.emit('join',
          {
            room_key: this.room_id,
            player: {
              player_id: this.$store.state.playerID,
              player_name: this.$store.state.playerName
            }
          },
          (err, room_info) => {
            this.loading = false
            if (err) {
              return
            }
            this.$store.commit('setRoomState', room_info)
            this.$store.commit('setRoom', room_info.room_key)
            this.$router.push('/wait')
          }
      )
    }
  },
  computed: {
    player_name:
        {
          get() {
            return this.$store.state.playerName
          },
          set(value) {
            this.$store.commit('setPlayerName', value)
          }
        }
  }
}
</script>
