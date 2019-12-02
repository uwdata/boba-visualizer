import Vue from 'vue'
import Router from 'vue-router'

import MainPage from '../pages/MainPage.vue'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'home',
      component: MainPage
    }
  ]
})
