import * as d3 from 'd3'
import _ from 'lodash'
import BaseScale from './base_scale'

class GraphScale extends BaseScale {
  constructor (nodes, params) {
    super(params)

    // own params
    this.node_radius = params.node_radius || 10

    // scales
    this.x = null
    this.y = null

    // initialize
    this.init(nodes)
  }

  init (nodes) {
    const LEVEL_H = 50
    let h = this.height()
    let w = this.width()

    // y scale
    let levels = _.uniq(_.map(nodes, this.y_field))
    this.y = d3.scalePoint()
      .rangeRound([0, Math.min(h, levels.length * LEVEL_H)])
      .domain(levels)
      .padding(0.5)

    // make an "identity" x scale
    // we will compute x manually and store in _x
    this.x = d3.scaleLinear().range([0, w]).domain([0, w])
  }
}

export default GraphScale
