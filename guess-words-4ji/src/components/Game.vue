<template>
  <v-card class="py-2 my-2">
    <v-card-title>Game</v-card-title>
    <v-card-subtitle>History</v-card-subtitle>
    <v-simple-table style="width: fit-content" class="mx-auto mb-2">
      <tbody>
      <tr class="justify-center" v-for="(item, index) in $store.state.room_state.history " :key="index">
        <td><span>{{$store.state.room_state.players[item.player_id].player_name}}</span></td>
        <td v-for="(char_info, index) in item.word" :key="index" class="text-center px-1" style="max-width: 50px">
          <GameCharacter :character="char_info.char"
                         :status="char_info.status"
          />
        </td>
      </tr>

      <tr class="justify-center" v-if="$store.state.room_state.pending_players[$store.state.room_state.current_round] === $store.state.playerID || $store.state.room_state.history.length === 0">
        <td><span>{{$store.state.room_state.players[$store.state.room_state.pending_players[$store.state.room_state.current_round]].player_name}}</span></td>
        <td v-for="index in $store.state.word_len" :key="index" class="text-center px-1">
          <GameCharacter :character="pending_word[index - 1]" status="unknown" v-if="(index -1) < pending_word.length"/>
          <GameCharacter character="_" status="unknown" v-else/>
        </td>
      </tr>
      </tbody>
    </v-simple-table>
    <v-card v-if="$store.state.room_state.status!== 'ended'" class="mx-auto py-1" width="80%">
      <v-card-title v-if="Object.keys($store.state.room_state.players).length > 0" >{{`${$store.state.room_state.players[$store.state.room_state.pending_players[$store.state.room_state.current_round]].player_name} is guessing...`}}</v-card-title>
      <v-card-subtitle v-if="Object.keys($store.state.room_state.players).length > 0">{{$store.state.room_state.players[$store.state.room_state.pending_players[$store.state.room_state.current_round]].player_id}}</v-card-subtitle>
      <div v-if="$store.state.room_state.pending_players[$store.state.room_state.current_round] === $store.state.playerID" style="width: 90%;" class="mx-auto">
        <v-text-field :disabled="$store.state.room_state.pending_players[$store.state.room_state.current_round] !== $store.state.playerID"
                      v-model="pending_word"
                      :error="pending_word.length >  $store.state.word_len"
                      :error-messages="pending_word.length >  $store.state.word_len ? 'Word too long': undefined"
                      label="Enter your Guess here"></v-text-field>
        <v-btn :disabled="pending_word.length !==  $store.state.word_len || $store.state.room_state.pending_players[$store.state.room_state.current_round] !== $store.state.playerID" v-on:click="submit" >Submit</v-btn>
      </div>
    </v-card>
    <v-card v-else-if="word"  class="mx-auto" width="80%">
      <v-card-title>{{word.word}}</v-card-title>
      <v-card-subtitle>{{word.mean}}</v-card-subtitle>
      <v-btn v-on:click="() => $router.push('/')">Return To Home</v-btn>
    </v-card>
  </v-card>
</template>

<script>
import GameCharacter from '@/components/GameCharacter'
import Vue from 'vue'

export default {
  name: 'Game',
  components: { GameCharacter },
  data: function () {
    return {
      word: undefined,
      pending_word: ''
    }
  },
  methods: {
    submit: function () {
      Vue.prototype.$socket.emit('submit', this.pending_word);
      this.pending_word = '';
    }
  },
  watch() {

  },
  mounted() {
    Vue.prototype.$socket.emit('get');
    Vue.prototype.$socket.on('room_update', (room_info) => {
      if(room_info.status === 'ended') {
        Vue.prototype.$socket.emit('get_word');
      }
      this.$store.commit('setRoomState', room_info)
    })
    Vue.prototype.$socket.on('word_len', (word_len) => {
      this.$store.commit('setWordLen', word_len);
    })
    Vue.prototype.$socket.emit('word_len');
    Vue.prototype.$socket.on('get_word', (word) => {
      this.word = word;
    })
  },
  beforeDestroy() {
    Vue.prototype.$socket.off('room_update')
    Vue.prototype.$socket.off('word_len')
  }
}
</script>

<style scoped>

</style>