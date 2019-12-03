<template>
  <div class="d-flex">
    <!--Data set-->
    <div class="w-50 mr-5">
      <div class="bb-menu-item">dataset</div>
      <div>hurricane</div>
    </div>

    <!--Decisions-->
    <div class="w-50 mr-5">
      <div class="bb-menu-item">decisions</div>
      <div>8</div>
    </div>

    <!--Size-->
    <div class="w-50">
      <div class="bb-menu-item">universes</div>
      <div>1,000</div>
    </div>
  </div>
</template>

<script>
  export default {
    name: "TitleMenu"
  }
</script>

<style lang="stylus" scoped>
  .bb-menu-item
    font-size 0.6em
    text-transform uppercase
</style>