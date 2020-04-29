<template>
  <div class="bb-outer">

    <!--Header-->
    <header class="navbar bb-navbar">
      <div style="width: 180px">
        <span class="ml-3 font-weight-bold">boba</span>
      </div>
      <title-menu></title-menu>
      <div style="width: 180px">
        <b-button v-if="mode === 0" variant="outline-info" size="sm" class="mr-3"
                  style="margin-top: 2px" v-b-modal.modal-warn>Make Inference</b-button>
        <help-button class="mr-3 float-right"></help-button>
      </div>
    </header>

    <!--Loading Spinner-->
    <loading-spinner :loading="loading"></loading-spinner>

    <!--Exploration Views-->
    <div v-if="mode === 0" class="bb-main-view d-flex">

      <!--Left Panel-->
      <div class="bb-left-panel d-flex flex-column">
        <!--Title-->
        <div class="bb-panel-title text-muted">Decisions</div>

        <!--ADG-->
        <div class="h-100 d-flex flex-column">
          <adg-view class="h-100"></adg-view>
          <!--<filter-option-view class="h-50"></filter-option-view>-->
          <legend-view class="h-50"></legend-view>
        </div>
      </div>

      <!--Main Panel-->
      <div class="d-flex flex-column flex-grow-1">
        <!--Menu-->
        <div class="bb-menu-bar">
          <main-controls></main-controls>
        </div>

        <!--Visualizations-->
        <div class="h-100 d-flex flex-column justify-content-between">
          <!--Aggregate Visualization-->
          <aggregate-vis class="h-50"></aggregate-vis>

          <div>
            <!--Option distribution-->
            <option-ratio-view></option-ratio-view>
          </div>
        </div>
      </div>

      <!--Right Panel-->
      <div class="bb-right-panel">
        <!--Title-->
        <div class="bb-panel-title text-muted">Model Fit</div>

        <!--Small multiples-->
        <small-multiples-view></small-multiples-view>
      </div>
    </div>

    <!--Warning-->
    <b-modal id="modal-warn" title="Proceed to Make Inference" ref="modal"
             @ok="onInfer">
      <p>Are you sure? Once you view the inference visualizations,
        you cannot return to the current views.</p>

      <div v-if="show_prune" class="mt-3">
        <b-form-checkbox v-model="infer_prune">
          Exclude pruned universes from inference</b-form-checkbox>
      </div>
    </b-modal>

    <!--Config before inference-->
    <inference-config v-if="mode === 1"></inference-config>

    <!--Inference View-->
    <infer-view v-if="mode === 2" :type="infer_type"
                :prune="infer_prune"></infer-view>

  </div>
</template>

<script>
  import {store, bus} from '../controllers/config'
  import {SCHEMA} from '../controllers/constants'
  import HelpButton from '../components/HelpButton.vue'
  import TitleMenu from '../components/TitleMenu.vue'
  import AggregateVis from '../components/AggregateVis.vue'
  import LoadingSpinner from '../components/LoadingSpinner.vue'
  import AdgView from '../components/AdgView.vue'
  import FilterOptionView from '../components/FilterOptionView.vue'
  import OptionRatioView from '../components/OptionRatioView.vue'
  import LegendView from '../components/LegendView.vue'
  import SmallMultiplesView from '../components/SmallMultiplesView.vue'
  import MainControls from '../components/MainControls.vue'
  import InferenceConfig from '../components/InferenceConfig.vue'
  import InferView from '../components/InferView.vue'

  export default {
    components: {
      InferView,
      InferenceConfig,
      MainControls,
      SmallMultiplesView,
      LegendView, FilterOptionView, AdgView, LoadingSpinner, AggregateVis,
      TitleMenu, HelpButton, OptionRatioView},

    data () {
      return {
        mode: 0,  // 0-explore, 1-pick, 2-infer
        infer_type: 'null',
        infer_prune: false,
        show_prune: false,
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
          return store.fetchUncertainty()
        })
        .then(() => {
          if (store.configs.x_range_outer) {
            store.x_range = store.configs.x_range_outer
          }
          this.loading = false

          // notify other components that data is ready
          bus.$emit('data-ready')
        }, (e) => {
          this.loading = false
          console.error(e)
        })

      // event listener
      this.$root.$on('bv::modal::show', () => {
        // modal is about to show
        this.show_prune = store.fit_cutoff != null
          && !(SCHEMA.WEIGHT in store.configs.schema)
        this.infer_prune = this.show_prune
      })
    },
    methods: {
      onInfer () {
        // determine type
        let has_null = SCHEMA.NUL in store.configs.schema
        this.infer_type = has_null ? 'null' : 'simple'

        this.mode = 2
      }
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
    min-height 3.5rem
    background-color #24292e
    box-shadow 0 0.5rem 1rem rgba(0,0,0,.05), inset 0 -1px 0 rgba(0,0,0,.1)

  .bb-left-panel
    width: 300px
    border-right: 1px solid rgba(0, 0, 0, 0.15)
    background-color #fafafa

  .bb-right-panel
    width: 300px
    border-left: 1px solid rgba(0, 0, 0, 0.15)
    background-color #fff

  .bb-main-view
    width 100%
    height calc(100vh - 3.5rem)

  .bb-menu-bar
    height 3.5rem
    background-color #fff
    border-bottom 1px solid rgba(0,0,0,0.1)
    box-shadow 0.5rem 0 2rem rgba(0,0,0,.03)

  .bb-panel-title
    line-height 3.2rem
    border-bottom 1px solid rgba(0,0,0,0.07)
    margin-left 2rem
    margin-right 2rem
    font-size 0.9rem
    font-weight 500

</style>
