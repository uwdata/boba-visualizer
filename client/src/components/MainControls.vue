<template>
  <div class="d-flex">
    <div class="ml-4 mr-2 mt-2">
      <div class="bb-menu-item text-muted">X-axis Range</div>
      <vue-slider v-model="x_range" :width="100" :min="x_min" :max="x_max"
                  @drag-end="onChange" :interval="interval" :silent="true"/>
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
        interval: 1
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

        this.x_range = [this.x_min, this.x_max]
      })
    },
    methods: {
      onChange () {
        store.x_range = this.x_range
        bus.$emit('update-scale')
      }
    }
  }
</script>

<style scoped lang="stylus">
  .bb-menu-item
    font-size 0.6em
    text-transform uppercase
    font-weight 500
</style>