<template>
  <div class="mn-container pl-3 pr-3">

    <!--Header-->
    <header class="navbar mn-navbar mt-1 row text-muted">
      <div style="width:200px"><span class="mn-app-title">Boba Monitor</span></div>
      <title-menu></title-menu>
      <div style="width:200px"><help-button class="float-right"></help-button></div>
    </header>

    <!--Progress-->
    <b-form-row class="mn-progress-row mt-1">
      <div class="col-6"><progress-card></progress-card></div>
      <div class="col-3"><decision-progress-view></decision-progress-view></div>
      <div class="col-3"><outcome-progress-view></outcome-progress-view></div>
    </b-form-row>
  </div>
</template>

<script>
  import {store, bus} from '../controllers/config'
  import {SCHEMA} from '../controllers/constants'
  import TitleMenu from '../components/TitleMenu.vue'
  import HelpButton from '../components/HelpButton.vue'
  import ProgressCard from '../components/monitor/ProgressCard.vue'
  import DecisionProgressView from '../components/monitor/DecisionProgressView.vue'
  import OutcomeProgressView from '../components/monitor/OutcomeProgressView.vue'

  export default {
    name: 'MonitorPage',
    components: {OutcomeProgressView, DecisionProgressView, ProgressCard, HelpButton, TitleMenu},
    data () {
      return {
      }
    },
    mounted () {
      store.fetchUniverses()
        .then(() => {
          return store.fetchOverview()
        })
        .then(() => {
          // notify other components that data is ready
          bus.$emit('data-ready')
        }, (e) => {
          this.loading = false
          console.error(e)
        })
    }
  }
</script>

<style scoped lang="stylus">
.mn-container
  width 100vw
  height 100vh
  background-color #eee

.mn-app-title
  font-size 1.2rem

.mn-navbar
  min-height 3.5rem

.mn-progress-row
  height 10rem
  min-height 10rem
</style>
