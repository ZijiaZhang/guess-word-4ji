<template>
  <v-container>
    <error-message :message="error_message" :hidden="!show_error_message"/>
    <h1>Testing 222</h1>
    <v-text-field  v-model="room_id" label=" Enter a Room Key: "></v-text-field>
    <v-text-field  v-on:change="update_player_name" v-model="player_name" label="Enter your Name:"></v-text-field>
    <v-row>
      <v-btn v-on:click="create_room" class="mx-2">Create Room</v-btn>
      <v-btn v-on:click="join_room" class="mx-2">Join Room</v-btn>
    </v-row>

  </v-container>
</template>

<script>
  import {requestServer} from '@/plugins/function_helpers'
  import ErrorMessage from '@/components/ErrorMessage'

  export default {
    name: 'Welcome',
    components: { ErrorMessage },
    data: function () {
      return {
        room_id: '',
        player_name: this.$store.state.playerName,
        error_message: '',
        show_error_message: false
      }
    },
    methods: {
      display_error_message (msg) {
        this.error_message = msg;
        this.show_error_message = true;
        setTimeout(() => this.show_error_message = false, 2000)
      },
      create_room: function () {
        requestServer(this, '/create', 'POST', {
          room_key: this.room_id,
          player: {
            player_id: this.$store.state.playerID,
            player_name: this.$store.state.playerName
          }
        } ).then(() => {
          this.$store.commit('setRoom', this.room_id);
          this.$router.push('/wait');
        }).catch((err) => {
          this.display_error_message(err.message);
        })
      },
      join_room: function () {
        requestServer(this, '/join', 'POST', {
          room_key: this.room_id,
          player: {
            player_id: this.$store.state.playerID,
            player_name: this.$store.state.playerName
          }
        } ).then((data) => {
          console.log(data);
          this.$store.commit('setRoom', this.room_id);
          this.$router.push('/wait');
        }).catch((err) => {
          this.display_error_message(err.message);
        })
      },
      update_player_name: function () {
        this.$store.commit('setPlayerName', this.player_name);
        // requestServer(this, '/api/update_name', 'POST', {
        //   player_name: this.player_name
        // })
      }
    }
  }
</script>
