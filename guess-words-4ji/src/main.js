import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import store from './store'
import router from './router'
import {io} from 'socket.io-client'

Vue.config.productionTip = false
Vue.prototype.$socket = io();

new Vue({
  vuetify,
  store,
  router,
  render: h => h(App)
}).$mount('#app')



