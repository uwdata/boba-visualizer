<template>
  <div class="d-inline-block">
    <!--Button-->
    <div class="bb-icon" v-b-modal.modal-help>
      <i class="far fa-fw fa-question-circle"></i>
    </div>

    <!--Modal-->
    <b-modal id="modal-help" title="Boba Visualizer" class="text-dark"
             :ok-only="true">
      <div> TODO </div>
    </b-modal>
  </div>
</template>

<script>
  export default {
    name: "HelpButton"
  }
</script>

<style lang="stylus" scoped>
  .bb-icon
    font-size 1.5em
    cursor pointer
</style>