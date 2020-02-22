import * as d3 from 'd3'
import BaseScale from './base_scale'

class DotPlotScale extends BaseScale {
  constructor (range, params) {
    super(params)

    // scales
    this.x = null
    this.y = null

    // initialize
    this.init(range)
  }

  init (range) {
    let h = this.height()
    let w = this.width()

    // make an "identity" y scale
    this.y = d3.scaleLinear().range([0, h]).domain([0, h])

    // x scale
    this.x = d3.scaleLinear()
      .range([0, w]).nice()

    let xMax = range[1]
    let xMin = range[0]

    this.x.domain([xMin, xMax])
  }
}

export default DotPlotScale
