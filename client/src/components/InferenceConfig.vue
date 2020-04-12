<template>
  <div class="text-center bb-container">
    <!--title-->
    <div class="pt-5" style="font-weight: 500">
      Pick an Inference Chart Type</div>

    <!--cards-->
    <div class="mt-4 d-flex justify-content-center">
      <div v-for="c in charts" @click="selected=c"
           class="bb-card bb-chart-option mr-3">
        <div class="font-weight-bold">{{titles[c]}}</div>
        <div class="mt-2 mb-2">
          <img :src="`${c}.png`" :alt="c" class="img-responsive">
        </div>
        <div class="text-left">{{desc[c]}}</div>
      </div>
    </div>

    <!--corresponding radio buttons-->
    <div class="mt-2 d-flex justify-content-center">
     <div v-for="c in charts" class="bb-chart-option mr-3">
       <b-form-radio v-model="selected" :value="c"></b-form-radio>
     </div>
    </div>

    <!--checkbox for pruning-->
    <div v-if="pruned && selected" class="mt-4">
      <b-form-checkbox v-model="include_prune">
        Exclude pruned universes from inference</b-form-checkbox>
    </div>
    <div v-else class="pt-4"></div>

    <!--button-->
    <div v-if="selected" class="mt-3">
      <b-button variant="info" style="width: 300px;" @click="onNext">
        View Chart</b-button>
    </div>

  </div>
</template>

<script>
  import {store, bus} from '../controllers/config'
  const titles = {
    'simple': 'Density vs. Line',
    'null': 'Specification Curve',
    'stacking': 'Stacking'
  }
  const desc = {
    'simple': 'This chart compares the aggregated sampling uncertainty' +
        ' in the multiverse to the expected effect size.',
    'null': 'This chart compares the point estimates in universes to the' +
        ' null distribution.',
    'stacking': 'This chart uses stacking to aggregate both the universe' +
        ' distribution and the null distribution.'
  }

  export default {
    name: "InferenceConfig",
    data () {
      return {
        selected: '',
        pruned: false,
        include_prune: false,
        charts: ['simple', 'null', 'stacking'],

        // title and description
        titles: titles,
        desc: desc
      }
    },

    mounted () {
      this.pruned = store.fit_cutoff != null
      this.include_prune = this.pruned

      //todo: determine available chart types
    },

    methods: {
      onNext () {
        bus.$emit('infer', {type: this.selected, prune: this.include_prune})
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