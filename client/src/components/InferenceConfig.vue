<template>
  <div class="text-center bb-container">
    <!--title-->
    <div class="pt-5" style="font-weight: 500">
      Pick an Inference Chart Type</div>

    <!--cards-->
    <div class="mt-4 d-flex justify-content-center">
      <!--simple-->
      <div class="bb-card bb-chart-option mr-3" @click="selected='simple'">
        <div class="font-weight-bold">Simple</div>
        <div class="mt-2 mb-2">
          <img src="simple.png" class="img-responsive">
        </div>
        <div class="text-left">This chart compares the aggregated sampling uncertainty
          in the multiverse to the expected effect size.</div>
      </div>

      <!--null-->
      <div class="bb-card bb-chart-option mr-3" @click="selected='null'">
        <div class="font-weight-bold">Specification Curve</div>
        <div class="mt-2 mb-2">
          <img src="null.png" class="img-responsive">
        </div>
        <div class="text-left">This chart compares the point estimates in universes to the
          null distribution.</div>
      </div>
    </div>

    <!--corresponding radio buttons-->
    <div class="mt-2 d-flex justify-content-center">
     <div class="bb-chart-option mr-3">
       <b-form-radio v-model="selected" value="simple"></b-form-radio>
     </div>
      <div class="bb-chart-option mr-3">
        <b-form-radio v-model="selected" value="null"></b-form-radio>
      </div>
    </div>

    <!--checkbox for pruning-->
    <div v-if="pruned && selected" class="mt-4">
      <b-form-checkbox v-model="include_prune">
        Do not show pruned universes</b-form-checkbox>
    </div>
    <div v-else class="pt-4"></div>

    <!--button-->
    <div v-if="selected" class="mt-3">
      <b-button variant="info" style="width: 250px;" @click="onNext">
        View Chart</b-button>
    </div>

  </div>
</template>

<script>
  import {store} from '../controllers/config'

  export default {
    name: "InferenceConfig",
    data () {
      return {
        selected: '',
        pruned: false,
        include_prune: true
      }
    },

    mounted () {
      this.pruned = store.fit_cutoff != null

      //todo: determine available chart types
    },

    methods: {
      onNext () {
        console.log(this.selected, this.include_prune)
      }
    }
  }
</script>

<style scoped lang="stylus">
  .bb-container
    background-color #fafafa
    width 100%
    height 100vh

  .bb-card
    box-shadow 0 1px 4px rgba(0,0,0,.04)
    border 1px solid rgba(0,0,0,.09)
    border-radius 2px
    padding 15px
    background-color #fff
    cursor pointer

  .bb-chart-option
    width 300px

  .img-responsive
    display block
    max-width 100%
    height auto
</style>