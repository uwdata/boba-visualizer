import * as d3 from 'd3'
import {bus} from '../config'
import _ from 'lodash'

class BrushX {
  constructor (data, scale) {
    // the d3 brush object
    this.brush = this.init(data, scale)

    // attributes
    this.selector = ''
    this.brushstart_callback = null
    this.brushing_callback = null
  }

  init (data, scale) {
    let that = this

    function brushstart () {
      d3.selectAll(that.selector).classed('brushed', false)
      if (that.brushstart_callback) {
        that.brushstart_callback()
      }
      bus.$emit('brush-remove', that.selector)
    }

    function brushing () {
      // empty selection
      if (!d3.event.selection) return

      // x0, x1
      let sel = _.flatten(d3.event.selection)
      let bounds = _.map(sel, (s) => s)

      // change color of selected points
      let uids = {}
      d3.selectAll(that.selector)
        .classed('brushed', (p) => {
          let is_in = scale.getRawX(p) >= bounds[0] &&
            scale.getRawX(p) <= bounds[1]
          uids[p.uid] = is_in
          return is_in
        })

      // callback
      if (that.brushing_callback) {
        that.brushing_callback(uids)
      }
    }

    function brushended () {
      // empty selection
      if (!d3.event.selection) {
        bus.$emit('brush', [])
        return
      }

      // x0, x1
      let sel = _.flatten(d3.event.selection)
      let bounds = _.map(sel, (s) => s)

      let pts = _.filter(data, (p) => {
        return scale.getRawX(p) >= bounds[0] &&
          scale.getRawX(p) <= bounds[1]
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
    // manually reset brush styling because calling brush.move will invoke
    // brushstart, and brushstart will fire the event again
    d3.selectAll(this.selector).classed('brushed', false)
    d3.select(`${this._container()} .brush .selection`)
      .style('display', 'none')
  }

  /**
   * Remove brush div
   */
  remove () {
    d3.selectAll(`${this._container()} .brush`)
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

  /**
   * Helper function to get the selector for the subplot container.
   */
  _container () {
    return this.selector.split(' ')[0]
  }
}

export default BrushX
