import Vue from 'vue'
import VueRouter from 'vue-router'
import Welcome from '../components/Welcome'
import WaitingRoom from '@/components/WaitingRoom'
import Game from '@/components/Game'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Welcome
  },
  {
    path: '/wait',
    name: 'Waiting Room',
    component: WaitingRoom
  },
  {
    path: '/game',
    name: 'Game Room',
    component: Game
  }
]

const router = new VueRouter({
  routes
})

export default router
