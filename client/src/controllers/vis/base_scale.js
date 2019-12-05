import * as d3 from 'd3'
import _ from 'lodash'

class BaseScale {
  constructor (params) {
    // public params
    this.outerWidth = params.outerWidth
    this.outerHeight = params.outerHeight
    this.margin = params.margin

    this.x_field = params.x_field || 'x'
    this.y_field = params.y_field || 'y'
  }

  /**
   * Get the x field
   * @param d
   */
  getRawX (d) {
    if (_.has(d, '_x')) return d._x
    return d[this.x_field]
  }

  /**
   * Get the y field
   * @param d
   */
  getRawY (d) {
    if (_.has(d, '_y')) return d._y
    return d[this.y_field]
  }

  /**
   * A helper function to get the canvas width (outer minus margin)
   */
  width () {
    return this.outerWidth - this.margin.left - this.margin.right
  }

  /**
   * A helper function to get the canvas height (outer minus margin)
   */
  height () {
    return this.outerHeight - this.margin.top - this.margin.bottom
  }
}

export default BaseScale
