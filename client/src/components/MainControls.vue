<template>
  <div class="d-flex">
    <div class="ml-4 mr-2 mt-2">
      <div class="bb-menu-item text-muted">X-axis Range</div>
      <vue-slider v-model="x_range" :width="100"/>
    </div>
  </div>
</template>

<script>
  import VueSlider from 'vue-slider-component'
  import 'vue-slider-component/theme/antd.css'
  export default {
    name: "MainControls",
    components: {
      VueSlider
    },
    data () {
      return {
        x_range: [0, 100]
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