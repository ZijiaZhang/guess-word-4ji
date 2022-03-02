<template>
  <v-card>
    <v-card-title>Room Settings</v-card-title>
    <v-card-text>
    <v-radio-group v-model="word_bank" label="Word Bank">
      <v-radio
          label="CET4"
          :value="0"
      />
    </v-radio-group>
      <v-divider/>
    <v-range-slider
        class="pt-10"
        label="Min/Max length of the word"
        thumb-color="primary"
        thumb-label="always"
        min="2"
        max="10"
        tick-size="4"
        v-model="word_len"
        v-on:change="submitWordRange"
        />
      <v-switch
          label="Enable Timeout"
        v-model="enable_timeout"
          v-on:change="updateTimeout"
      />


    </v-card-text>
  </v-card>
</template>

<script>
import Vue from 'vue'

export default {
  name: 'GameOptions',
  data: function () {
    return {
      word_len: [3,6],
      word_bank: 0,
      enable_timeout: false,
    }
  },
  methods: {
    submitWordRange: function (){
      Vue.prototype.$socket.emit('update_room_setting', {word_len: this.word_len});
    },
    updateTimeout: function () {
      Vue.prototype.$socket.emit('update_room_setting', {timeout: this.enable_timeout});
    }
  }
}
</script>

<style scoped>

</style>