<template>
  <div>

  </div>
</template>

<script>
  import {store, bus} from '../controllers/config'

  function update (d) {
    // fetch data
    store.fetchRaw(d.uid)
      .then((ret) => {
        console.log(ret.actual, ret.pred)
      }, (e) => {
        console.error(e)
      })
  }

  export default {
    name: "SmallMultiplesView",

    data () {
      return {
      }
    },

    mounted: function () {
      // register event listeners
      bus.$on('agg-vis.dot-click', update.bind(this))
    }
  }
</script>

<style scoped>

</style>
