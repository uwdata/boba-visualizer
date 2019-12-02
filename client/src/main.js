import Vue from 'vue'
import App from './App.vue'
import router from './router'
import BootstrapVue from 'bootstrap-vue'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import {log_debug} from './controllers/config'

Vue.use(BootstrapVue)

/* eslint-disable-next-line no-new */
new Vue({
  el: '#app',
  router,
  render: h => h(App),
  mounted: function () {
    log_debug('main.js', 'mounted()')
  }
})
