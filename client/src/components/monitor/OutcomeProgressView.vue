<template>
  <div class="mn-card h-100 d-flex flex-column">
    <div class="mn-card-title">Main Effect Mean</div>
    <div id="outcome-progress-vis" ref="chart" class="w-100 flex-grow-1"></div>
  </div>
</template>

<script>
  import {bus, store} from '../../controllers/config'
  import OutcomeProgressPlot from '../../controllers/monitor/outcome_progress_plot'

  export default {
    name: 'OutcomeProgressView',
    data () {
      return {
        chart: null
      }
    },
    mounted () {
      bus.$on('data-ready', () => {
        this.chart = new OutcomeProgressPlot('#outcome-progress-vis')

        let w = this.$refs.chart.clientWidth
        let h = this.$refs.chart.clientHeight
        this.chart.outerWidth = w
        this.chart.outerHeight = h
        this.chart.x_max = store.universes.length

        let data = store.running_outcome
        this.chart.update(data)

        // this.genFakeData(data)
        // this.simulateUpdates()
      })

      bus.$on('/monitor/update-outcome', () => {
        this.chart.update(store.running_outcome)
      })
    },
    methods: {
      // for debugging
      genFakeData (data) {
        let i = data[data.length - 1].n_samples
        let num = data[data.length - 1].mean
        setInterval(() => {
          i += 5
          num += 0.1
          data.push({n_samples: i, mean: num, lower: num-0.5, upper: num+0.5})
          this.chart.update(data)
        }, 2000)
      },
      // for debugging
      simulateUpdates () {
        const step = 1
        const speed = 1000

        let i = 20
        let iid = setInterval(() => {
          if (i >= store.running_outcome.length - 1) {
            clearInterval(iid)
            return
          }
          this.chart.update(_.slice(store.running_outcome, 0, i))
          i += step
        }, speed)
      }
    }
  }
</script>

<style lang="stylus">
.outcome-CI
  fill #37c2e8
  opacity 0.3
  stroke-linejoin round

.outcome-mean
  stroke #37c2e8
  stroke-linejoin round
  stroke-width 2
</style>
