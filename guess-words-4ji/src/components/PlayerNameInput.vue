<template>
  <v-card>
    <v-card-title class="text-h5">
      Get started
    </v-card-title>

    <v-card-text>
      This is a Wordle-like game that you can play with your friend.
    </v-card-text>
    <v-text-field
        ref="page1"
        v-model="player_name"
        label="Name your self"
        @keyup.enter="() => {if (player_name)
              {
                $emit('next');
              }}"
        class="mx-4"
        filled
        required
    autofocus/>

    <v-card-actions>
      <v-spacer></v-spacer>

      <v-btn
          color="green darken-1"
          text
          @click="$emit('next');"
          :disabled="!this.$store.state.playerName"
      >
        OK
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
<script>
export default {
  name: 'PlayerNameInput',
  props: {
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
  },
  mounted() {
  }
}
</script>