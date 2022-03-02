<template>
  <v-dialog
      v-model="dialog"
      :persistent="e6<2"
  >
    <v-stepper
        v-model="e6"
        v-on:change="(value) => {
          console.log(value)
          if (value === 1 && $refs.page1) {
            setTimeout(() => $refs.page1.$el.focus());
          }  else if (value === 2 && $refs.page2) {
            setTimeout(() => $refs.page2.$el.focus());
          }
        }"
    >
      <v-stepper-header>
        <v-stepper-step
            :complete="e6 > 1"
            step="1"
        >
          Give your self a name
        </v-stepper-step>
        <v-divider></v-divider>
        <v-stepper-step
            :complete="e6 > 2"
            step="2"
        >
          Complete
        </v-stepper-step>
      </v-stepper-header>
      <v-stepper-content step="1">
        <PlayerNameInput v-on:next="e6=2"/>
      </v-stepper-content>


      <v-stepper-content step="2">
        <v-card>
          <v-card-title class="text-h5">
            Welcome
          </v-card-title>
          <v-card-text>
            Now you can play a game with your friend by entering the same room keys. Have fun.
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
                ref="page2"
                color="green darken-1"
                text
                @click="dialog = false"
                v-on:keyup.enter="dialog = false"
            >
              Close
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-stepper-content>
    </v-stepper>

  </v-dialog>
</template>
<script>
import PlayerNameInput from '@/components/PlayerNameInput'

export default {
  name: 'PlayerNameDialog',
  components: { PlayerNameInput },
  data: function () {
    return {
      e6: 1,
      dialog: !this.$store.state.playerName
    }
  }
}
</script>