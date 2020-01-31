<template>
  <div class="d-flex">
    <!--Data set-->
    <div class="w-50 mr-5">
      <div class="bb-menu-item">dataset</div>
      <div>{{dataset}}</div>
    </div>

    <!--Decisions-->
    <div class="w-50 mr-5">
      <div class="bb-menu-item">decisions</div>
      <div>{{decisions}}</div>
    </div>

    <!--Size-->
    <div class="w-50">
      <div class="bb-menu-item">universes</div>
      <div>{{universes}}</div>
    </div>
  </div>
</template>

<script>
  import {bus, store} from '../controllers/config'
  import _ from 'lodash'

  export default {
    name: "TitleMenu",

    data () {
      return {
        dataset: '--',
        decisions: '--',
        universes: '--'
      }
    },

    mounted: function () {
      // register event listener
      bus.$on('data-ready', this.updateData)
    },

    methods: {
      updateData () {
        this.dataset = store.configs.dataset || 'multiverse'
        this.decisions = _.size(store.decisions).toLocaleString()
        this.universes = _.size(store.universes).toLocaleString()
      }
    }
  }
</script>

<style lang="stylus" scoped>
  .bb-menu-item
    font-size 0.6em
    text-transform uppercase
</style>