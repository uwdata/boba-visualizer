<template>
  <div v-if="universe" class="bb-detail-tip p-2" v-bind:style="styles">
    <div v-for="d in universe">
      <span class="mr-2 font-weight-bold">{{d.field}}: </span>
      <span>{{d.value}}</span>
    </div>
  </div>
</template>

<script>
  import {store} from '../controllers/config'

  export default {
    name: "DetailTip",
    props: ['top', 'left', 'detail', 'offset'],
    computed: {
      universe () {
        if (this.detail == null) {
          return null
        }
        let uni = store.getUniverseById(this.detail.uid)
        uni = _.map(uni, (value, key) => {
          return {field: key, value: value}
        })
        return uni
      },
      styles () {
        if (this.detail == null) {
          return {top: 0, left: 0}
        }

        let offset = this.offset == null ? 100 : this.offset

        return {
          top: (this.detail.y - this.top + offset) + 'px',
          left: (this.detail.x - this.left) + 'px'
        }
      }
    }
  }
</script>

<style lang="stylus" scoped>
  .bb-detail-tip
    width 240px
    background-color #fff
    box-shadow 0 2px 6px rgba(0,0,0,0.05)
    position absolute
    z-index 15000
    top 0
    left 0
</style>