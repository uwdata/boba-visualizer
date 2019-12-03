import * as d3 from 'd3'

/**
 * A plot for blending predicted point estimates
 */
class PredictedPoint {

  constructor () {
    this.outerWidth = 1050
    this.outerHeight = 600
    this.margin = {
      top: 10,
      right: 70,
      bottom: 10,
      left: 70
    }
    this.backgroud = '#fff'
  }

  draw (parent) {
    let outerWidth = this.outerWidth
    let outerHeight = this.outerHeight

    let svg = d3.select(parent)
      .append('svg')
      .attr('width', outerWidth)
      .attr('height', outerHeight)

    let rect = svg.append('rect')
      .attr('width', outerWidth)
      .attr('height', outerHeight)
      .attr('fill', this.backgroud)
  }
}

export default PredictedPoint
