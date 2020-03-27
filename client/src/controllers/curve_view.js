import * as d3 from 'd3'
import _ from 'lodash'
import {bus, store, util} from './config'
import {COLOR_TYPE, UNC_TYPE, sign} from './constants'

class CurveView {
  constructor (caller) {
    this.strip_height = 13
    this.strip_padding = 5

    // pass by caller
    this.parent = caller
  }

  draw (redraw = false) {
    // skip if the dataset does not have uncertainty
    let uncertainty = this.parent.uncertainty
    if (!_.keys(uncertainty).length) {
      return
    }

    let svg = this.parent.svg.select('.objects')
    let prototype = this.parent.uncertainty_vis === UNC_TYPE.PDF ? 0 : 1
    this._drawCurves(svg, prototype, redraw)
    this._drawStrip(redraw)
  }

  getRange () {
    let uncertainty = this.parent.uncertainty
    if (!_.keys(uncertainty).length) {
      return
    }

    let prototype = this.parent.uncertainty_vis === UNC_TYPE.PDF ? 0 : 1
    let data = []
    _.each(uncertainty, (arr, idx) => {
      let density = util.kde_smart(arr)
      if (prototype === 1) {
        density = util.toCdf(density)
      }
      density.uid = Number(idx)

      data.push(density)
    })
    this._density = data

    // scale
    let emax = prototype === 1 ? 1 : d3.max(_.flatten(data), (d) => d[1])
    return [0, emax]
  }


  updateScale () {
    this.draw(true)
  }

  updateColor (color) {
    let svg = this.parent.svg
    let data = this.parent.data

    let uids = {}
    _.each(data, (d) => {
      let isin = color === COLOR_TYPE.SIGN && d.diff < sign
      isin |= color === COLOR_TYPE.P &&
        d[store.configs.agg_plot.p_value_field] < 0.05

      if (isin) {
        uids[d.uid] = true
      }
    })

    svg.selectAll('.uncertainty-curve')
      .classed('colored', false)
      .filter((d) => d.uid in uids)
      .classed('colored', true)

    svg.selectAll('.chip')
      .classed('colored', false)
      .filter((d) => d.uid in uids)
      .classed('colored', true)
  }

  clearClicked () {
    let svg = this.parent.svg
    svg.selectAll('.uncertainty-curve.clicked').classed('clicked', false)
    svg.selectAll('.chip.clicked').classed('clicked', false)
  }

  colorClicked () {
    this.clearClicked()

    let uids = this.parent.clicked_uids
    let dict = _.zipObject(uids)
    this.parent.svg.selectAll('.uncertainty-curve')
      .filter(d => d.uid in dict)
      .classed('clicked', true)
      .raise()

    this.parent.svg.selectAll('.chip')
      .filter(d => d.uid in dict)
      .classed('clicked', true)
      .raise()
  }

  getYLabel () {
    let u = this.parent.uncertainty_vis
    return u === UNC_TYPE.PDF ? 'Probability Density' :
      (u === UNC_TYPE.CDF ? 'Cumulative Density' : '')
  }

  clear () {
    this._clearCurves()
    this.parent.svg.select('.strip-plot').remove()
  }

  _clearCurves () {
    let svg = this.parent.svg
    svg.selectAll('.uncertainty-curve').remove()
    svg.selectAll('.y.axis').remove()
  }

  /**
   * Draw the y-axis, if applicable
   * @param ys The y-scale used for curves
   * @param svg
   * @private
   */
  _drawAxis (ys, svg) {
    if (!this.parent.y_axis_label) {
      return
    }

    // axis
    let yAxis = d3.axisLeft(ys).tickSize(1)
      .ticks(2)

    svg.append("g")
      .classed("y axis muted", true)
      .call(yAxis)
      .call(g => g.selectAll('.tick:first-of-type').remove())
      .call(g => g.selectAll('.tick text')
        .attr('x', 18))
      .call(g => g.selectAll('.tick line')
        .attr('x2', 3))
  }

  /**
   * Draw the strip plot underneath the x axis.
   */
  _drawStrip(redraw = false) {
    let scale = this.parent.scale
    // account for x axis label height
    let h0 = scale.height() - this.strip_height + 17

    if (redraw) {
      this.parent.svg.selectAll('.chip')
        .transition()
        .duration(1000)
        .attr('x1', (d) => scale.x(d.diff))
        .attr('x2', (d) => scale.x(d.diff))
    } else {
      let svg = this.parent.svg.append('g')
        .classed('strip-plot', true)

      svg.selectAll('.chip')
        .data(this.parent.data)
        .enter()
        .append('line')
        .classed('chip', true)
        .attr('x1', (d) => scale.x(d.diff))
        .attr('y1', h0)
        .attr('x2', (d) => scale.x(d.diff))
        .attr('y2', h0 + this.strip_height - this.strip_padding)
    }
  }

  /**
   * To display uncertainty, overlay PDFs or CDFs from individual universes
   * Prototype 0: PDF curves, 1: CDF curves
   */
  _drawCurves (svg, prototype, redraw) {
    if (redraw) {
      this._clearCurves()
    }

    let scale = this.parent.scale

    // scale
    // let h = Math.min(scale.height(), prototype === 0 ? 250 : 200)
    let h = scale.height() - 5
    let ys = d3.scaleLinear().domain(this.parent.y_range)
      .range([scale.height() - this.strip_height, scale.height() - h])

    // axis
    this._drawAxis(ys, svg)

    // line
    let line = d3.line().curve(d3.curveBasis)
      .x((d) => scale.x(d[0]))
      .y((d) => ys(d[1]))

    // plot the curve
    svg.selectAll('.uncertainty-curve')
      .data(this._density)
      .enter()
      .append('path')
      .classed('uncertainty-curve', true)
      .attr('d', line)
      .on('mouseover', curveMouseover)
      .on('mouseout', curveMouseout)
      .on('click', curveClick)

    if (redraw) {
      this.colorClicked()
    }

    let that = this.parent
    function curveMouseover () {
      d3.select(this).classed('hovered', true)
    }
    function curveMouseout() {
      d3.select(this).classed('hovered', false)
    }
    function curveClick(d) {
      bus.$emit('agg-vis.dot-click', d.uid, that.data)
    }
  }


  /**
   * Show uncertainty as a p-box
   */
  _drawPBox (svg, uncertainty, redraw = false) {
    if (!_.keys(uncertainty).length) {
      return
    }

    // todo: y-axis label
    let scale = this.parent.scale
    let kernel_bw= 0.5
    let X = scale.x.ticks(40)
    let bounds = _.map(X, (x) => [x, 1, 0])
    _.each(uncertainty, (arr) => {
      let estimator = util.kde(util.epanechnikov(kernel_bw), X)
      let density = estimator(arr)
      density = util.toCdf(density)
      _.each(density, (d, i) => {
        bounds[i][1] = Math.min(bounds[i][1], d[1])
        bounds[i][2] = Math.max(bounds[i][2], d[1])
      })
    })

    // scale
    let h = Math.min(scale.height(), 100)
    let ys = d3.scaleLinear().range([scale.height(), scale.height() - h])
      .domain([0, 1])

    let area = d3.area()
      .x((d) => scale.x(d[0]))
      .y0((d) => ys(d[2]))
      .y1((d) => ys(d[1]))

    // plot the areas
    if (redraw) {
      svg.select('.envelope')
        .datum(bounds)
        .attr('d', area)
    } else {
      let el = svg.append('path')
        .attr('class', 'envelope')
        .datum(bounds)
        .attr('d', area)
      util.moveToBack(el)
    }
  }
}

export default CurveView
