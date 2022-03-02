<template>
  <v-card class="py-2 my-2 mx-1" flat>
    <v-row style="width: 100%">
      <v-card-title>Game</v-card-title>
      <v-spacer></v-spacer>
      <v-btn v-on:click="leave" class="my-auto red lighten-1 white--text"> Leave Game</v-btn>
    </v-row>

    <v-card-subtitle>History</v-card-subtitle>
    <v-simple-table style="width: fit-content" class="mx-auto mb-2">
      <tbody>
      <tr class="justify-center" v-for="(item, index) in $store.state.room_state.history " :key="index">
        <td><span>{{ item.player_name }}</span></td>
        <td v-for="(char_info, index) in item.word" :key="index" class="text-center px-1" style="max-width: 50px">
          <GameCharacter :character="char_info.char"
                         :status="char_info.status"
          />
        </td>
      </tr>

      <tr class="justify-center"
          v-if="$store.state.room_state.status !== 'ended' && (current_player_id === $store.state.playerID || $store.state.room_state.history.length === 0)">
        <td><span>{{ current_player_object.player_name }}</span></td>
        <td v-for="index in $store.state.word_len" :key="index" class="text-center px-1">
          <GameCharacter :character="pending_word[index - 1]" status="unknown" v-if="(index -1) < pending_word.length"/>
          <GameCharacter character="_" status="unknown" v-else/>
        </td>
      </tr>
      </tbody>
    </v-simple-table>
    <v-card class="mx-auto py-1 ma5" width="80%"
            v-if="$store.state.room_state.status !== 'ended' && current_player_id === $store.state.playerID">
      <div style="width: 90%;" class="mx-auto">
        <v-text-field :disabled="current_player_id !== $store.state.playerID"
                      v-model="pending_word"
                      :error="pending_word.length >  $store.state.word_len"
                      :error-messages="error_msg"
                      label="Enter your Guess here"></v-text-field>
        <v-btn :disabled="pending_word.length !==  $store.state.word_len || current_player_id !== $store.state.playerID"
               v-on:click="submit">Submit
        </v-btn>
      </div>
    </v-card>
    <WordView v-else-if="word" :word="word"/>
    <v-card class="my-1 mx-auto" width="80%" style="position: sticky; bottom: 0;"
            v-if="$store.state.room_state.status!== 'ended'">
      <v-card-title v-if="Object.keys($store.state.room_state.players).length > 0">
        {{ `${current_player_object.player_name} is guessing...` }}
      </v-card-title>
      <v-card-title v-if="this.$store.state.room_state.timeout">{{this.counter}}</v-card-title>
      <v-card-subtitle v-if="Object.keys($store.state.room_state.players).length > 0">
        {{ current_player_object.player_id }}
      </v-card-subtitle>
    </v-card>
  </v-card>
</template>

<script>
import GameCharacter from '@/components/GameCharacter'
import Vue from 'vue'
import WordView from '@/components/WordView'

export default {
  name: 'Game',
  components: { WordView, GameCharacter },
  data: function () {
    return {
      word: undefined,
      pending_word: '',
      counter: 30,
      counter_timer: undefined,
    }
  },
  methods: {
    leave: function () {
      Vue.prototype.$socket.emit('leave_room')
      this.$router.push('/')
    },
    submit: function () {
      this.submit_error = undefined
      Vue.prototype.$socket.emit('submit', { word: this.pending_word }, (error) => {
        this.submit_error = error
        console.log(error)
      })
      this.pending_word = ''
    },
    cancel_timer: function () {
      if (this.counter_timer) {
        clearInterval(this.counter_timer)
        this.counter_timer=undefined;
      }
    }
  },
  computed: {
    current_player_id: function () {
      return this.$store.state.room_state.pending_players[this.$store.state.room_state.current_round]
    },
    current_player_object: function () {
      return this.$store.state.room_state.players[this.current_player_id]
    },
    error_msg: function () {
      if (this.submit_error) {
        return this.submit_error
      }
      if (this.pending_word.length > this.$store.state.word_len) {
        return 'Word too long'
      }
      return undefined
    }
  },
  mounted() {
    Vue.prototype.$socket.on('room_update', (room_info) => {
      // Activate counter on public matches
      if (room_info.timeout) {
        if (room_info.current_round !== this.$store.state.room_state.current_round) {
          this.cancel_timer();
          this.counter = 30
          this.counter_timer = setInterval(() => {
            this.counter--
            if (this.counter < 0) {
              Vue.prototype.$socket.emit('timeout', this.current_player_id)
            }
          }, 1000)
        }
      }
      if (room_info.status === 'ended') {
        Vue.prototype.$socket.emit('get_word', (word) => this.word = word)
        this.cancel_timer()
        Vue.prototype.$socket.emit('leave_room')
      }
      this.$store.commit('setRoomState', room_info)
    })
    Vue.prototype.$socket.on('player_left', (room_info) => {
      this.$store.commit('setRoomState', room_info)
    })

    Vue.prototype.$socket.emit('get', (room_info) => {
      if (this.$store.state.room_state?.timeout) {
        this.counter_timer = setInterval(() => {
          this.counter--
          if (this.counter < 0) {
            Vue.prototype.$socket.emit('timeout', this.current_player_id)
          }
        }, 1000)
      }
      if (room_info.status === 'ended') {
        Vue.prototype.$socket.emit('get_word', (word) => this.word = word)
        this.cancel_timer()
        Vue.prototype.$socket.emit('leave_room')
      }
      this.$store.commit('setRoomState', room_info)
    })
    Vue.prototype.$socket.emit('word_len', (word_len) => {
      this.$store.commit('setWordLen', word_len)
    })
  },
  beforeDestroy() {
    Vue.prototype.$socket.off('room_update')
    Vue.prototype.$socket.off('player_left')
    this.cancel_timer();
  }
}
</script>

