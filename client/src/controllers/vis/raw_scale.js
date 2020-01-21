import * as d3 from 'd3'
import BaseScale from './base_scale'

class RawScale extends BaseScale {
  constructor (data, params) {
    super(params)

    // scales
    this.x = null
    this.y = null

    // initialize
    this.init(data)
  }

  init (data) {
    let h = this.height()
    let w = this.width()

    // y scale maps category to height
    this.y = d3.scaleBand().rangeRound([0, h]).padding(0.1)
      .domain(['actual', 'pred'])

    // x scale
    this.x = d3.scaleLinear()
      .range([0, w]).nice()

    let xMax = d3.max(data) * 1.05
    let xMin = d3.min(data) * 1.05

    this.x.domain([xMin, xMax])
  }
}

export default RawScale
