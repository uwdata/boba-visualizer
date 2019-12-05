import * as d3 from 'd3'
import BaseScale from './base_scale'

class PPPScale extends BaseScale {
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

    // make an "identity" y scale
    this.y = d3.scaleLinear().range([0, h]).domain([0, h])

    // x scale
    this.x = d3.scaleLinear()
      .range([0, w]).nice()

    let xMax = d3.max(data, (d) => d[this.x_field]) * 1.05
    let xMin = d3.min(data, (d) => d[this.x_field]) * 1.05

    this.x.domain([xMin, xMax])
  }
}

export default PPPScale
