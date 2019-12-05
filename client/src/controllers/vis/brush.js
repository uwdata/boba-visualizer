import * as d3 from 'd3'
import {bus} from '../config'
import _ from 'lodash'

class Brush {
  constructor (data, scale, selector) {
    this.selector = selector
    this.brush = this.init(data, scale)
  }

  init (data, scale) {
    let selector = this.selector

    function brushstart () {
      d3.selectAll(selector).classed('brushed', false)
      bus.$emit('brush', [])
    }

    function brushing () {
      // empty selection
      if (!d3.event.selection) return

      // x0, y0, x1, y1
      let sel = _.flatten(d3.event.selection)
      let bounds = _.map(sel, (s, idx) => idx % 2 ? scale.y.invert(s) : scale.x.invert(s))
      bounds = label_bounds(bounds)

      // change color of selected points
      d3.selectAll(selector)
        .classed('brushed', (p) => {
          let inside = scale.getRawX(p) >= bounds.x0 &&
            scale.getRawX(p) <= bounds.x1 &&
            scale.getRawY(p) >= bounds.y0 &&
            scale.getRawY(p) <=bounds.y1
          return inside
        })
    }

    function brushended () {
      // empty selection
      if (!d3.event.selection) return

      // x0, y0, x1, y1
      let sel = _.flatten(d3.event.selection)
      let bounds = _.map(sel, (s, idx) => idx % 2 ? scale.y.invert(s) : scale.x.invert(s))
      bounds = label_bounds(bounds)

      let pts = _.filter(data, (p) => {
        return scale.getRawX(p) >= bounds.x0 &&
          scale.getRawX(p) <= bounds.x1 &&
          scale.getRawY(p) >= bounds.y0 &&
          scale.getRawY(p) <=bounds.y1
      })

      bus.$emit('brush', pts)
    }

    return d3.brushX()
      .on('start', brushstart)
      .on('brush', brushing)
      .on("end", brushended)
  }

  /**
   * Clear current brush selection
   */
  clear () {
    d3.select('.brush').call(this.brush.move, null)
  }

  /**
   * Remove brush div
   */
  remove () {
    d3.selectAll('.brush')
      .call(this.brush.move, null)
      .remove()
  }

  /**
   * Attach the brush to the parent svg as the top-most layer
   * @param svg
   */
  attach (svg) {
    svg.append('g').attr('class', 'brush').call(this.brush)
  }
}

/**
 * Helper function converting bounds array to an object.
 * @param arr
 * @returns {{x0: number, x1: number, y0: number, y1: number}}
 */
function label_bounds (arr) {
  return {
    x0: Math.min(arr[0], arr[2]),
    x1: Math.max(arr[0], arr[2]),
    y0: Math.min(arr[1], arr[3]),
    y1: Math.max(arr[1], arr[3])
  }
}

export default Brush
