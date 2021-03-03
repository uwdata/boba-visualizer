<template>
  <div class="mn-card h-100 d-flex flex-column">
    <div class="mn-card-title">Decision Sensitivity</div>
    <div id="decision-progress-vis" ref="chart" class="w-100 flex-grow-1"></div>
  </div>
</template>

<script>
  import {bus, store} from '../../controllers/config'
  import DecisionProgressPlot from '../../controllers/monitor/decision_progress_plot'

  export default {
    name: 'DecisionProgressView',
    data () {
      return {
        chart: null
      }
    },
    mounted () {
      bus.$on('data-ready', () => {
        this.chart = new DecisionProgressPlot('#decision-progress-vis',
          _.keys(store.decisions))

        let w = this.$refs.chart.clientWidth
        let h = this.$refs.chart.clientHeight
        this.chart.outerWidth = w
        this.chart.outerHeight = h
        this.chart.x_range = [0, store.universes.length]

        //draw
        this.chart.update(store.running_sensitivity)
      })

      bus.$on('/monitor/update-sensitivity', () => {
        // update
        this.chart.update(store.running_sensitivity)
      })
    },
    methods: {

    }
  }
</script>

<style scoped>

</style>
