import Vue from 'vue'
import Router from 'vue-router'

import MainPage from '../pages/MainPage.vue'
import SpecCurvePage from '../archetype_vis/SpecCurvePage.vue'
import GridPage from '../archetype_vis/GridPage.vue'
import ChartsPage from '../archetype_vis/ChartsPage.vue'
import HistPage from '../archetype_vis/HistPage.vue'
import ForestPage from '../archetype_vis/ForestPlotPage.vue'
import VolcanoPage from '../archetype_vis/VolcanoPage.vue'
import ContourPage from '../archetype_vis/ContourPage.vue'
import FacetPage from '../archetype_vis/FacetPage.vue'

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
    {path: '/grid', component: GridPage},
    {path: '/spec-curve', component: SpecCurvePage},
    {path: '/hist', component: HistPage},
    {path: '/forest',component: ForestPage},
    {path: '/volcano', component: VolcanoPage},
    {path: '/contour', component: ContourPage},
    {path: '/facet', component: FacetPage}
  ]
})
