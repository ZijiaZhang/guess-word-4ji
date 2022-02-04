<template>
  <v-app id="app">
    <v-banner
        single-line
        color="orange lighten-2 white--text">
      This is a beta build.
      <template v-slot:actions>
        <v-btn
            color="primary"
            text
            v-on:click="reportIssue"
        >
          Report Issue
        </v-btn>
      </template>
    </v-banner>
    <error-message :message="error_message" :hidden="!show_error_message"/>
    <router-view/>
  </v-app>
</template>

<style lang="scss">

</style>
<script>
import ErrorMessage from '@/components/ErrorMessage'
import Vue from 'vue'


export default {
  name: 'App',
  components: { ErrorMessage },
  data: function () {
    return {
      error_message: '',
      show_error_message: false
    }
  },
  methods: {
    display_error_message(msg) {
      this.error_message = msg
      this.show_error_message = true
      setTimeout(() => this.show_error_message = false, 2000)
    },
    reportIssue(){
      window.open('https://github.com/ZijiaZhang/guess-word-4ji/issues', '_blank').focus();
    }
  },
  mounted() {
    Vue.prototype.$socket.on('error', (e) => {
      this.display_error_message(e);
      this.$store.commit('setRoomState', {});
      if(this.$router.currentRoute.path !== '/') {
        this.$router.push('/')
      }
    })
  }
}

</script>