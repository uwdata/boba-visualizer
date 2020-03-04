import * as d3 from 'd3'
import _ from 'lodash'
import {bus, store, util} from './config'
import {COLOR_TYPE, UNC_TYPE, sign} from './constants'

class CurveView {
  constructor (caller) {
    // pass by caller
    this.parent = caller

    // flag
    this.active = false
  }

  draw (redraw = false) {
    let uncertainty = this.parent.uncertainty
    let svg = this.parent.svg.select('.objects')

    switch (this.parent.uncertainty_vis) {
      case UNC_TYPE.PDF:
        this._drawCurves(svg, uncertainty, 0, redraw)
        break
      case UNC_TYPE.CDF:
        this._drawCurves(svg, uncertainty, 1, redraw)
        break
    }
  }

  updateScale () {
    if (!this.active) {
      return
    }
    this.draw(true)
  }

  updateColor (color) {
    if (!this.active) {
      return
    }
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
  }

  clearClicked () {
    if (!this.active) {
      return
    }
    let svg = this.parent.svg
    svg.selectAll('.uncertainty-curve.clicked').classed('clicked', false)
  }

  colorClicked () {
    if (!this.active) {
      return
    }
    this.clearClicked()

    let uids = this.parent.clicked_uids
    let dict = _.zipObject(uids)
    this.parent.svg.selectAll('.uncertainty-curve')
      .filter(d => d.uid in dict)
      .classed('clicked', true)
      .raise()
  }

  switchView () {
    if (this.active) {
      this.colorClicked()
      this.updateColor(this.parent.color_by)
    }
  }

  getYLabel () {
    let u = this.parent.uncertainty_vis
    let label = u === UNC_TYPE.PDF ? 'Probability Density' :
      (u === UNC_TYPE.CDF ? 'Cumulative Density' : '')
    return this.active ? label : ''
  }

  /**
   * To display uncertainty, overlay PDFs or CDFs from individual universes
   * Prototype 0: PDF curves, 1: CDF curves
   */
  _drawCurves (svg, uncertainty, prototype, redraw) {
    if (!_.keys(uncertainty).length) {
      return
    }

    if (redraw) {
      svg.selectAll('.uncertainty-curve').remove()
    }

    let scale = this.parent.scale
    let kernel_bw= 0.5

    let data = []
    _.each(uncertainty, (arr, idx) => {
      let estimator = util.kde(util.epanechnikov(kernel_bw), scale.x.ticks(40))
      let density = estimator(arr)
      if (prototype === 1) {
        density = util.toCdf(density)
      }
      density.uid = Number(idx)

      data.push(density)
    })

    // scale
    let h = Math.min(scale.height(), prototype === 0 ? 120 : 100)
    let emax = prototype === 1 ? 1 : d3.max(_.flatten(data), (d) => d[1])
    let ys = d3.scaleLinear().range([scale.height(), scale.height() - h])
      .domain([0, emax])

    // line
    let line = d3.line().curve(d3.curveBasis)
      .x((d) => scale.x(d[0]))
      .y((d) => ys(d[1]))

    // plot the curve
    svg.selectAll('.uncertainty-curve')
      .data(data)
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
