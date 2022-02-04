<template>
  <v-card class="py-2 my-2">
    <v-card-title>Game</v-card-title>
    <v-card-subtitle>History</v-card-subtitle>
    <v-simple-table style="width: fit-content" class="mx-auto mb-2">
      <tbody>
      <tr class="justify-center" v-for="(item, index) in this.history " :key="index">
        <td><span>{{players[item.player_id].player_name}}</span></td>
        <td v-for="(char_info, index) in item.word" :key="index" class="text-center px-1" style="max-width: 50px">
          <GameCharacter :character="char_info.char"
                         :status="char_info.status"
          />
        </td>
      </tr>

      <tr class="justify-center" v-if="current_round === $store.state.playerID || this.history.length === 0">
        <td><span v-if="current_round">{{players[current_round].player_name}}</span></td>
        <td v-for="index in length" :key="index" class="text-center px-1">
          <GameCharacter :character="pending_word[index - 1]" status="unknown" v-if="(index -1) < pending_word.length"/>
          <GameCharacter character="_" status="unknown" v-else/>
        </td>
      </tr>
      </tbody>
    </v-simple-table>
    <v-card v-if="status!== 'ended'" class="mx-auto py-1" width="80%">
      <v-card-title v-if="Object.keys(players).length > 0" >{{`${players[current_round].player_name} is guessing...`}}</v-card-title>
      <v-card-subtitle v-if="Object.keys(players).length > 0">{{players[current_round].player_id}}</v-card-subtitle>
      <div v-if="current_round === $store.state.playerID" style="width: 90%;" class="mx-auto">
        <v-text-field :disabled="current_round !== $store.state.playerID"
                      v-model="pending_word"
                      :error="pending_word.length > length"
                      :error-messages="pending_word.length > length ? 'Word too long': undefined"
                      label="Enter your Guess here"></v-text-field>
        <v-btn :disabled="pending_word.length !== length || current_round !== $store.state.playerID" v-on:click="submit" >Submit</v-btn>
      </div>
    </v-card>
    <v-card v-else  class="mx-auto" width="80%">
      <v-card-title>{{word.word}}</v-card-title>
      <v-card-subtitle>{{word.mean}}</v-card-subtitle>
      <v-btn v-on:click="() => $router.push('/')">Return To Home</v-btn>
    </v-card>
  </v-card>
</template>

<script>
import GameCharacter, {STATUS_ALL_CORRECT, STATUS_NOT_CORRECT, STATUS_PARTIAL_CORRECT} from '@/components/GameCharacter'
import {requestServer} from '@/plugins/function_helpers'

export default {
  name: 'Game',
  components: { GameCharacter },
  data: function () {
    return {
      history: [{
        word: [{ char: 'h', status: STATUS_ALL_CORRECT }, { char: 'a', status: STATUS_NOT_CORRECT }, {
          char: 'b',
          status: STATUS_PARTIAL_CORRECT
        }]
      }],
      players: {},
      pending_word: '',
      current_round: undefined,
      length: 0,
      data_querier: undefined,
      status: undefined,
      word: undefined,
    }
  },
  methods: {
    getRoomInfo: function () {
      return requestServer(this, '/get', 'GET').then((data) => {
        this.current_round = data.pending_players[data.current_round];
        this.players = data.players;
        this.history = data.history;
        this.status = data.status;
        if(this.status === 'ended'){
          requestServer(this, '/get-word', 'GET').then((data) => {
            this.word = data;
          })
        }
      })
    },
    submit: function () {
      requestServer(this, '/submit', 'POST', {
        word: this.pending_word
      }).then((data) => {
        this.current_round = data.pending_players[data.current_round];
        this.players = data.players;
        this.history = data.history;
        this.status = data.status;
        if(this.status === 'ended'){
          requestServer(this, '/get-word', 'GET').then((data) => {
            this.word = data;
          })
        }
      })
      this.pending_word = '';
    }
  },
  mounted() {
    requestServer(this, '/get-word-length', 'GET').then((data) => {
      console.log(data)
      this.length = data.length
    });
    this.getRoomInfo()
    // TODO: May use websocket
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