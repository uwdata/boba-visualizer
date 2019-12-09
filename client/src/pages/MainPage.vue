<template>
  <div class="bb-outer">

    <!--Header-->
    <header class="navbar bb-navbar">
      <span class="ml-3 font-weight-bold">boba</span>
      <title-menu></title-menu>
      <help-button class="mr-3"></help-button>
    </header>

    <!--Loading Spinner-->
    <loading-spinner :loading="loading"></loading-spinner>

    <!--Main View-->
    <div class="row m-0 bb-main-view">

      <!--Left Panel-->
      <div class="col-3 p-0 bb-left-panel d-flex flex-column">
        <!--Menu-->
        <div class="bb-menu-bar"></div>

        <!--ADG-->
        <div class="h-100">
          <adg-view class="h-50"></adg-view>
          <filter-option-view class="h-50"></filter-option-view>
        </div>
      </div>

      <!--Right Panel-->
      <div class="col-9 p-0 d-flex flex-column">
        <!--Menu-->
        <div class="bb-menu-bar"></div>

        <!--Visualization-->
        <div class="h-100">
          <div><aggregate-vis></aggregate-vis></div>
          <div class="h-100"></div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
  import {store, bus} from '../controllers/config'
  import HelpButton from '../components/HelpButton.vue'
  import TitleMenu from '../components/TitleMenu.vue'
  import AggregateVis from '../components/AggregateVis.vue'
  import LoadingSpinner from '../components/LoadingSpinner.vue'
  import AdgView from '../components/AdgView.vue'
  import FilterOptionView from '../components/FilterOptionView.vue'

  export default {
    components: {FilterOptionView, AdgView, LoadingSpinner, AggregateVis,
      TitleMenu, HelpButton},

    data () {
      return {
        loading: false //fixme
      }
    },

    mounted: function () {
      // fetch data from server
      store.fetchUniverses()
        .then(() => {
          return store.fetchOverview()
        })
        .then(() => {
          return store.fetchPredictions()
        })
        .then(() => {
          this.loading = false

          // notify other components that data is ready
          bus.$emit('data-ready')
        }, (e) => {
          this.loading = false
          console.error(e)
        })
    }
  }
</script>

<style lang="stylus">
  html, body
    margin 0
    height 100%
    overflow hidden

  .bb-outer
    overflow-x hidden
    overflow-y hidden

  .bb-navbar
    color #fff
    min-height 4rem
    background-color #24292e
    box-shadow 0 0.5rem 1rem rgba(0,0,0,.05), inset 0 -1px 0 rgba(0,0,0,.1)

  .bb-left-panel
    border-right: 1px solid rgba(0, 0, 0, 0.1)
    background-color #fafafa

  .bb-main-view
    width 100%
    height calc(100vh - 4rem)

  .bb-menu-bar
    height 4rem
    background-color #fff
    border-bottom 1px solid rgba(0,0,0,0.1)
    box-shadow 0.5rem 0 2rem rgba(0,0,0,.03)

</style>
