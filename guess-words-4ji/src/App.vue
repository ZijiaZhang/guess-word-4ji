<template>
  <v-app id="app">
    <div>
      <v-banner
          single-line
          color="red lighten-2 white--text">
        This is an alpha build. May still have service disruptions.
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
      <error-message v-for="(message, index) in error_messages" :message="message.msg" :type="message.type"
                     :key="index"/>
    </div>


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
      index: 0,
      error_messages: {}
    }
  },
  methods: {
    display_error_message(msg, type = 'error') {
      const index = this.index
      this.error_messages[index] = { msg, type }
      this.error_messages = { ...this.error_messages }
      this.index +=1;
      setTimeout(() => {
        delete this.error_messages[index]
        this.error_messages = { ...this.error_messages }
      }, 2000)

    },
    reportIssue() {
      window.open('https://github.com/ZijiaZhang/guess-word-4ji/issues', '_blank').focus()
    }
  }
  ,
  mounted() {
    Vue.prototype.$socket.on('error', (e) => {
      this.display_error_message(e)
      this.$store.commit('setRoomState', {})
      if (this.$router.currentRoute.path !== '/') {
        this.$router.push('/')
      }
    })

    Vue.prototype.$socket.on('connect_error', () => {
      this.display_error_message('Cannot connect to server, retrying...')
      this.$store.commit('setConnected', false);
      if (this.$router.currentRoute.path !== '/') {
        this.$router.push('/')
      }
    })

    Vue.prototype.$socket.on('connect', () => {
      this.display_error_message('Connected to server', 'info');
      this.$store.commit('setConnected', true);
    })

    Vue.prototype.$socket.on('warn', (e) => {
      this.display_error_message(e, 'warn')
    })
    Vue.prototype.$socket.on('info', (e) => {
      this.display_error_message(e, 'info')
    })

    Vue.prototype.$socket.on('show_error', (e) => {
      this.display_error_message(e, 'error')
    })
  }
}

</script>