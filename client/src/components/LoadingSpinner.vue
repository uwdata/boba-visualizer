<template>
  <div v-if="loading"
       class="bb-loading-backdrop d-flex align-items-center justify-content-center">
    <div class="card w-25 h-25">
      <div class="card-body d-flex align-items-center">
        <vue-loading type="spiningDubbles" color="#4b2e83"
                     :size="{ width: '50px', height: '50px' }"></vue-loading>
      </div>
    </div>
  </div>
</template>

<script>
  import {VueLoading} from 'vue-loading-template'
  export default {
    name: "LoadingSpinner",
    props: ['loading'],
    components: {VueLoading}
  }
</script>

<style lang="stylus" scoped>
  .bb-loading-backdrop {
    position: absolute;
    left: 0;
    top: 0;
    background-color: rgba(0, 0, 0, 0.2);
    z-index: 10000;
    width: 100%;
    height: 100%;
  }
</style>