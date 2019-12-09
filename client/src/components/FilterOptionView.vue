<template>
  <div class="bb-border-top">
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
      }
    }
  }
</script>

<style scoped>

</style>