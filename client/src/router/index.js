import Vue from 'vue'
import Router from 'vue-router'

import MainPage from '../pages/MainPage.vue'
import SpecCurvePage from '../archetype_vis/SpecCurvePage.vue'
import GridPage from '../archetype_vis/GridPage.vue'
import ChartsPage from '../archetype_vis/ChartsPage.vue'
import HistPage from '../archetype_vis/HistPage.vue'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'home',
      component: MainPage
    },
    {
      path: '/charts',
      name: 'charts',
      component: ChartsPage
    },
    {
      path: '/grid',
      component: GridPage
    },
    {
      path: '/spec-curve',
      name: 'spec-curve',
      component: SpecCurvePage
    },
    {
      path: '/hist',
      name: 'hist',
      component: HistPage
    }
  ]
})
