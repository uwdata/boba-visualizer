<template>
  <div class="mt-5 d-flex justify-content-center">
    <div style="max-width: 700px">
      <h3>Multiverse charts</h3>
      <ul class="mt-3">
        <li><router-link to="/spec-curve">Specification Curve</router-link></li>
        <li><router-link to="/grid">Grid (Steegen 2016)</router-link></li>
        <li><router-link to="/hist">Histogram (Steegen 2016)</router-link></li>
        <li><router-link to="/facet">Facet Histogram</router-link></li>
        <li><router-link to="/forest">Forest Plot (Silberzahn 2018)</router-link></li>
        <li><router-link to="/volcano">Volcano Plot (Patel 2015)</router-link></li>
        <li><router-link to="/contour">Contour Plot (Patel 2015)</router-link></li>
        <li><router-link to="/cdf">CDF Plot</router-link></li>
        <li><router-link to="/p-curve">P-Curve and Histogram</router-link></li>
        <li><router-link to="/parallel">Parallel Line Plot</router-link></li>
      </ul>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'ChartsPage'
  }
</script>

<style scoped>

</style>
