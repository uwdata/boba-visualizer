import * as d3 from 'd3'
import {store, util} from '../config'
import DotPlotScale from '../vis/dot_plot_scale'
import _ from 'lodash'

class InferStackingPlot {
  constructor () {
    this.outerWidth = 1050
    this.outerHeight = 250
    this.margin = {
      top: 2,
      right: 20,
      bottom: 30,
      left: 20
    }
    this.x_axis_label = 'Effect Size'
    this.label_font_size = 11

    // internal
    this.svg = null
    this.scale = null
  }

  draw (parent, uncertainty, nul_dist) {
    // scale
    let scale_params = {
      'outerWidth': this.outerWidth,
      'outerHeight': this.outerHeight,
      'margin': this.margin,
      'x_field': 'diff'
    }

    // using a shared x range
    let scale = new DotPlotScale(store.x_range, scale_params)
    this.scale = scale

    // prepare the canvas
    this.svg = d3.select(parent)
      .append('svg')
      .attr('width', this.outerWidth)
      .attr('height', this.outerHeight)
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`)

    let obj = this.svg.append('svg')
      .classed('objects', true)
      .attr('width', scale.width())
      .attr('height', scale.height())

    // axis
    this.drawAxis()

    // densities
    if (typeof nul_dist === 'number') {
      this.drawLine(obj, nul_dist)
      this.drawHist(obj, uncertainty, 'density-observed')
    } else {
      // figure out the ratio
      let u = _.find(uncertainty, (d) => d).length
      let n = _.find(nul_dist, (d) => d).length
      let ur = u >= n ? 1 : n / u
      let nr = n >= u ? 1 : u / n

      // shared y axis
      this.drawHist(obj, uncertainty, 'density-observed', ur)
      this.drawHist(obj, nul_dist, 'density-null', nr)
    }
  }

  drawLine (svg, effect) {
    // draw a line at the effect size
    let scale = this.scale
    svg.append('line')
      .attr('x1', scale.x(effect))
      .attr('x2', scale.x(effect))
      .attr('y1', 0)
      .attr('y2', scale.height())
      .attr('stroke', '#e45756')
  }

  drawEnvelope (svg) {
    let scale = this.scale
    let dp = this.data
    // remove null and outliers (outside 10x range)
    let dm = scale.x.domain()
    let xr = (dm[1] - dm[0]) * 10
    dp = _.filter(dp, (d) => d != null && d < dm[1] + xr && d > dm[0] - xr)

    let density = util.kde_smart(dp, 0.5)

    // y scale
    let ys = d3.scaleLinear().domain([0, d3.max(density, (d) => d[1])])
      .range([0, scale.height()])

    // area
    let area = d3.area()
      .x((d) => scale.x(d[0]))
      .y0(scale.height())
      .y1((d) => scale.height() - ys(d[1]))

    // plot
    svg.append('path')
      .attr('class', 'envelope')
      .datum(density)
      .attr('d', area)

  }

  stackHist (data) {
    let scale = this.scale

    let dm = scale.x.domain()
    let step = (dm[1] - dm[0]) / (scale.width() / 2)
    let bins = _.range(dm[0], dm[1], step)

    let res = _.zipObject(bins, _.map(bins, () => 0))
    _.each(data, (arr) => {
      if (!arr) {
        return  // continue
      }
      let hist = d3.histogram().domain(scale.x.domain())
        .thresholds(bins)(arr)
      let w = arr.weight
      _.each(hist, (d) => {
        res[d.x1] += d.length * w
      })
    })
    res = _.map(res, (val, key) => {
      return {x: key, y: val}
    })
    res = _.filter(res, (d) => !_.isNaN(d.y))
    return res
  }

  /**
   * Draw the envelope as a histogram
   */
  drawHist (svg, data, cls, ratio = 1) {
    let scale = this.scale
    let hist = this.stackHist(data)

    // y scale
    let ym = d3.max(hist, (d) => d.y) * ratio
    let ys = d3.scaleLinear().domain([0, ym])
      .range([0, scale.height()])

    // area
    let area = d3.area()
      .x((d) => scale.x(d.x))
      .y0(scale.height())
      .y1((d) => scale.height() - ys(d.y))

    // plot
    svg.append('path')
      .attr('class', cls)
      .datum(hist)
      .attr('d', area)
  }

  drawAxis () {
    let scale = this.scale
    let xAxis = d3.axisBottom(scale.x).tickSize(-scale.height())
      .ticks(Math.round(scale.width() / 30))

    this.svg.append("g")
      .classed("x axis muted", true)
      .attr('transform', `translate(0,${scale.height()})`)
      .call(xAxis)
      .call(g => g.selectAll('.tick line')
        .attr('stroke-opacity', 0.1)
        .attr('stroke-dasharray', '2, 2'))
      .call(g => g.selectAll('.domain')
        .attr('d', `M0.5,0H${scale.width()}`))

    let th = scale.height() + this.label_font_size * 2 + 3
    this.svg.append('text')
      .classed('axis-label muted', true)
      .attr('transform', `translate(${scale.width() / 2}, ${th})`)
      .style('text-anchor', 'middle')
      .style('font-size', this.label_font_size)
      .text(this.x_axis_label)
  }
}

export default InferStackingPlot
