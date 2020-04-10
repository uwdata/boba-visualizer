<template>
  <div class="d-flex justify-content-between">
    <!--controls-->
    <div class="d-flex">
      <!--color by-->
      <div class="ml-4 mr-3 mt-2">
        <div class="bb-menu-item text-muted mb-1">Color By</div>
        <b-dropdown size="sm" variant="light" :text="color" block split
                    menu-class="bb-drop-menu">
          <b-dropdown-item v-for="c in color_options" v-bind:key="c"
                           @click="onColorChange(c)">{{c}}</b-dropdown-item>
        </b-dropdown>
      </div>

      <!--uncertainty-->
      <div v-if="has_uncertainty" class="ml-3 mr-3 mt-2">
        <div class="bb-menu-item text-muted mb-1">Uncertainty</div>
        <b-dropdown size="sm" variant="light" :text="uncertainty" block
                    split menu-class="bb-drop-menu">
          <b-dropdown-item v-for="u in uncertainty_options" v-bind:key="u"
                           @click="onUncertaintyChange(u)">{{u}}</b-dropdown-item>
        </b-dropdown>
      </div>

      <!--slider for zooming-->
      <div class="ml-3 mr-3 mt-2">
        <div class="bb-menu-item text-muted mb-1">X-axis Range</div>
        <vue-slider v-model="x_range" :width="100" :min="x_min" :max="x_max"
                    @drag-end="onSliderChange" :interval="interval" :clickable="false"
                    :enableCross="false" :minRange="interval" :silent="true"/>
      </div>

      <!--pruning-->
      <div v-if="allow_prune" class="ml-3 mr-3 mt-2">
        <div class="bb-menu-item text-muted mb-1">Prune</div>
        <vue-slider v-model="fit_cutoff" :width="75" :min="fit_min" :max="fit_max"
                    @drag-end="onPruneChange" :interval="fit_step" :clickable="false"
                    :minRange="fit_step" :silent="true"/>
      </div>
    </div>

    <!--categorical color legend-->
    <div v-if="legend.length" class="mr-3 mt-2">
      <div class="bb-menu-item text-muted mb-1">Legend</div>
      <div class="d-flex" style="font-size: 11px">
        <div v-for="l in legend" class="mr-2">
          <span :style="`color:${l.color};font-size:8px`"><i class="fas fa-circle"></i></span>
          <span class="ml-1 text-muted">{{l.text}}</span>
        </div>
      </div>
    </div>

    <!--colormap-->
    <div v-if="colormap" class="mr-3 mt-2">
      <div class="bb-menu-item text-muted">{{colormap.title}}</div>
      <div style="font-size: 9px; width: 80px;">
        <img src="blues.png" class="w-100"/>
        <div class="w-100 d-flex justify-content-between text-muted">
          <div>{{colormap.light}}</div><div>{{colormap.dark}}</div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
  import {bus, store} from '../controllers/config'
  import VueSlider from 'vue-slider-component'
  import 'vue-slider-component/theme/antd.css'
  import {COLOR_TYPE, UNC_TYPE, SCHEMA} from '../controllers/constants'
  export default {
    name: "MainControls",
    components: {
      VueSlider
    },
    data () {
      return {
        // x-axis slider
        x_range: [0, 1],
        x_min: 0,
        x_max: 1,
        interval: 1,

        // color by
        color_options: ['None', COLOR_TYPE.SIGN],
        color: 'None',
        legend: [],
        colormap: false,

        // uncertainty
        has_uncertainty: false,
        uncertainty_options: [UNC_TYPE.AGG, UNC_TYPE.PDF, UNC_TYPE.CDF],
        uncertainty: UNC_TYPE.AGG,

        // pruning slider
        allow_prune: false,
        fit_cutoff: 1,
        fit_min: 0,
        fit_max: 1,
        fit_step: 0.01
      }
    },
    mounted () {
      // register event listener
      bus.$on('data-ready', () => {
        this.initSlider()
        this.initColor()
        this.initPruneSlider()

        this.has_uncertainty = SCHEMA.UNC in store.configs.schema
      })
    },
    methods: {
      initColor () {
        if (SCHEMA.P in store.configs.schema) {
          this.color_options.push(COLOR_TYPE.P)
        }

        if (SCHEMA.FIT in store.configs.schema) {
          this.color_options.splice(1, 0, COLOR_TYPE.FIT)
        }
      },
      calStep (range) {
        let step = (range[1] - range[0]) / 200
        if (step > 1) {
          let i = 1
          while (step > 1) {
            step /= 10
            i *= 10
          }

          return {
            min: Math.floor(range[0] / i) * i,
            max: Math.ceil(range[1] / i) * i,
            step: i
          }
        } else {
          let n = 0
          let i = 1
          while (step < 1) {
            step *= 10
            n += 1
            i /= 10
          }
          return {
            min: Number(range[0].toPrecision(n)),
            max: Number(range[1].toPrecision(n)),
            step: i
          }
        }
      },
      initSlider () {
        // figure out the interval
        let res = this.calStep(store.x_range)
        this.x_min = res.min
        this.x_max = res.max
        this.interval = res.step

        if (store.configs.x_range) {
          this.x_range = store.configs.x_range
        } else {
          this.x_range = [this.x_min, this.x_max]
        }
      },
      initPruneSlider () {
        if (!(SCHEMA.FIT in store.configs.schema)) {
          return
        }

        let res = this.calStep(store.fit_range)
        this.fit_min = res.min
        this.fit_max = res.max
        this.fit_cutoff = this.fit_max
        this.fit_step = res.step
      },
      onSliderChange () {
        store.x_range = this.x_range
        bus.$emit('update-scale')
      },
      onPruneChange () {
        store.fit_cutoff = this.fit_cutoff
        bus.$emit('update-prune')
      },
      onColorChange (c) {
        if (this.color === c) {
          return
        }

        this.color = c
        store.color_by = c
        bus.$emit('update-color')

        // color legend
        let p_sign = [{color: '#e45756', text: 'x<0'}]
        let p_pvalue = [{color: '#e45756', text: 'p<0.05'}]
        this.legend = c === COLOR_TYPE.SIGN ? p_sign :
          c === COLOR_TYPE.P ? p_pvalue : []
        this.colormap = c === COLOR_TYPE.FIT ? {title: 'Model Fit',
          light: store.configs.fit_range ? 'poor' : 'worse',
          dark: store.configs.fit_range ? 'good' : 'better'} : null

        // only show the prune slider when we color by model fit
        this.allow_prune = c === COLOR_TYPE.FIT
      },
      onUncertaintyChange (u) {
        if (this.uncertainty === u) {
          return
        }

        this.uncertainty = u
        store.uncertainty_vis = u
        bus.$emit('update-uncertainty')
      }
    }
  }
</script>

<style lang="stylus">
  .b-dropdown
    width: 100px

  .b-dropdown .btn-block
    text-align: left

  .b-dropdown .btn
    font-size: 0.7rem
    line-height: 1.2
    padding-top: 0.1rem
    padding-bottom: 0.1rem

  .b-dropdown .bb-drop-menu
    font-size: 0.7rem
    line-height: 1.5
    min-width: 100px
    padding: 0.2rem 0

  .b-dropdown .dropdown-item
    padding: 0.25rem 0.5rem

  .bb-menu-item
    font-size 0.6em
    text-transform uppercase
    font-weight 500
</style>