<template>
  <div class="d-flex justify-content-between">
    <!--controls-->
    <div class="d-flex">
      <!--color by-->
      <div class="ml-4 mr-3 mt-2">
        <div class="bb-menu-item text-muted mb-1">Color By</div>
        <b-dropdown size="sm" variant="light" :text="color" block split
                    menu-class="bb-drop-menu">
          <b-dropdown-item v-for="c in color_options"
                           @click="onColorChange(c)">{{c}}</b-dropdown-item>
        </b-dropdown>
      </div>
      <!--slider for zooming-->
      <div class="ml-3 mr-3 mt-2">
        <div class="bb-menu-item text-muted mb-1">X-axis Range</div>
        <vue-slider v-model="x_range" :width="100" :min="x_min" :max="x_max"
                    @drag-end="onSliderChange" :interval="interval" :clickable="false"
                    :enableCross="false" :minRange="min_range" :silent="true"/>
      </div>
    </div>

    <!--legend-->
    <div v-if="legend.length" class="mr-3 mt-2">
      <div class="bb-menu-item text-muted mb-1">Legend</div>
      <div class="d-flex" style="font-size: 11px">
        <div v-for="l in legend" class="mr-2">
          <span :style="`color:${l.color};font-size:8px`"><i class="fas fa-circle"></i></span>
          <span class="ml-1 text-muted">{{l.text}}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import {bus, store} from '../controllers/config'
  import VueSlider from 'vue-slider-component'
  import 'vue-slider-component/theme/antd.css'
  export default {
    name: "MainControls",
    components: {
      VueSlider
    },
    data () {
      return {
        x_range: [0, 1],
        x_min: 0,
        x_max: 1,
        interval: 1,
        min_range: 1,
        color_options: ['None', 'Sign'],
        color: 'None',
        legend: []
      }
    },
    mounted () {
      // register event listener
      bus.$on('data-ready', () => {
        // figure out the interval
        let step = (store.x_range[1] - store.x_range[0]) / 200
        if (step > 1) {
          let i = 1
          while (step > 1) {
            step /= 10
            i *= 10
          }

          this.x_min = Math.floor(store.x_range[0] / i) * i
          this.x_max = Math.ceil(store.x_range[1] / i) * i
          this.interval = i
        } else {
          let n = 0
          let i = 1
          while (step < 1) {
            step *= 10
            n += 1
            i /= 10
          }
          this.interval = i
          this.x_min = Number(store.x_range[0].toPrecision(n))
          this.x_max = Number(store.x_range[1].toPrecision(n))
        }

        if (store.configs.agg_plot.x_range) {
          this.x_range = store.configs.agg_plot.x_range
        } else {
          this.x_range = [this.x_min, this.x_max]
        }

        this.min_range = this.interval
      })
    },
    methods: {
      onSliderChange () {
        store.x_range = this.x_range
        bus.$emit('update-scale')
      },
      onColorChange (c) {
        this.color = c
        store.color_by = c
        bus.$emit('update-color')

        let p_sign = [{color: '#3e8dc3', text: 'x>=0'},
          {color: '#e45756', text: 'x<0'}]
        this.legend = c === 'Sign' ? p_sign : []
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