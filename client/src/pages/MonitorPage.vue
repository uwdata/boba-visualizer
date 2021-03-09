<template>
  <div class="mn-container pl-3 pr-3">

    <!--Header-->
    <header class="navbar mn-navbar row text-muted">
      <div style="width:200px"><span class="font-semi-bold">Boba Monitor</span></div>
      <title-menu></title-menu>
      <div style="width:200px"><help-button class="float-right"></help-button></div>
    </header>

    <!--Progress-->
    <b-form-row class="mn-progress-row">
      <div class="col-6"><progress-card></progress-card></div>
      <div class="col-3"><outcome-progress-view></outcome-progress-view></div>
      <div class="col-3"><decision-progress-view></decision-progress-view></div>
    </b-form-row>

    <!--Bottom row-->
    <b-form-row class="mn-bottom-row">
      <div class="col-3"><monitor-adg-view></monitor-adg-view></div>
      <div class="col-6"><monitor-main-view></monitor-main-view></div>
      <div class="col-3"><error-message-view></error-message-view></div>
    </b-form-row>
  </div>
</template>

<script>
  import {store, bus} from '../controllers/config'
  import TitleMenu from '../components/TitleMenu.vue'
  import HelpButton from '../components/HelpButton.vue'
  import ProgressCard from '../components/monitor/ProgressCard.vue'
  import DecisionProgressView from '../components/monitor/DecisionProgressView.vue'
  import OutcomeProgressView from '../components/monitor/OutcomeProgressView.vue'
  import ErrorMessageView from '../components/monitor/ErrorMessageView.vue'
  import MonitorAdgView from '../components/monitor/MonitorAdgView.vue'
  import MonitorMainView from '../components/monitor/MonitorMainView.vue'

  export default {
    name: 'MonitorPage',
    components: {
      ErrorMessageView, OutcomeProgressView, DecisionProgressView,
      ProgressCard, HelpButton, TitleMenu, MonitorMainView, MonitorAdgView},
    data () {
      return {
      }
    },
    created () {
      store.initSocket()
    },
    mounted () {
      store.fetchUniverses()
        .then(() => {
          return store.fetchOverview()
        })
        .then(() => {
          return store.fetchMonitorStatus()
        })
        .then(() => {
          // notify other components that data is ready
          bus.$emit('data-ready')
        }, (e) => {
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

.mn-navbar
  min-height 3.5rem

.mn-progress-row
  height 11rem
  min-height 11rem

.mn-bottom-row
  height calc(100vh - 15.5rem - 10px)
  margin-top 10px
  & .mn-card
    height calc(100vh - 15.5rem - 10px)
</style>
