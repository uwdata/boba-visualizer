<template>
  <div class="bb-border-top">
    <!--Hint-->
    <div v-if="!decision && !active_filters.length"
         class="m-3 text-small text-center">
      Click on a decision to filter.
    </div>

    <!--Show currently active filters-->
    <div class="m-3 text-small" v-if="!decision && active_filters.length">
      <div class="d-flex justify-content-between">
        <div class="mb-2 font-weight-bold">Excluded options</div>
        <b-button size="sm" variant="outline-dark" @click="clearAll">
          Reset</b-button>
      </div>

      <ul>
        <li v-for="f in active_filters" class="mb-2">
          <span class="text-capitalize font-weight-bold">{{f.decision}}: </span>
          <ul><li v-for="opt in f.options">{{opt}}</li></ul>
        </li>
      </ul>
    </div>

    <!--Pick options in a decision-->
    <div class="m-3 text-small" v-if="decision">
      <div class="text-capitalize font-weight-bold mb-2">{{decision}}</div>
      <b-form-group>
        <b-form-checkbox-group :id="decision" v-model="selected" stacked
                               :options="options"></b-form-checkbox-group>
      </b-form-group>
      <div class="mt-2">
        <b-button size="sm" variant="dark" @click="save">
          Update Filter</b-button>
      </div>
    </div>
  </div>
</template>

<script>
  import {bus, store} from '../controllers/config'
  import _ from 'lodash'

  export default {
    name: "FilterOptionView",

    data () {
      return {
        active_filters: [],
        decision: null,
        selected: [],
        options: []
      }
    },

    mounted () {
      // register event listener
      bus.$on('adg-node-click', (d) => {
        this.decision = d

        // make a copy
        this.options = _.map(store.filter[d], (v, k) => {
          return {text: k, value: k}
        })
        this.selected = []
        _.each(store.filter[d], (v, k) => {
          if (v) {
            this.selected.push(k)
          }
        })
      })
    },

    methods: {
      save () {
        let d = this.decision

        // save to store
        _.each(this.options, (opt) => {
          store.filter[d][opt.value] = false
        })
        _.each(this.selected, (opt) => {
          store.filter[d][opt] = true
        })

        // notify other views
        bus.$emit('filter')

        // update this view
        this.decision = null
        this.updateActiveFilters()
      },

      updateActiveFilters () {
        this.active_filters = []

        _.each(store.filter, (opts, dec) => {
          let res = []
          _.each(opts, (shown, opt) => {
            if (!shown) {
              res.push(opt)
            }
          })

          if (res.length) {
            this.active_filters.push({decision: dec, options: res})
          }
        })
      },

      clearAll () {
        store.resetFilter()
        this.updateActiveFilters()
        bus.$emit('filter')
      }
    }
  }
</script>

<style scoped>

</style>