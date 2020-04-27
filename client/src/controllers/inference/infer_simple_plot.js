import * as d3 from 'd3'
import {store, util} from '../config'
import DotPlotScale from '../vis/dot_plot_scale'
import _ from 'lodash'

class InferSimplePlot {
  constructor () {
    this.outerWidth = 1050
    this.outerHeight = 250
    this.margin = {
      top: 2,
      right: 20,
      bottom: 30,
      left: 20
    }
    this.null = 0
    this.x_axis_label = 'Effect Size'
    this.label_font_size = 11
    this.smooth = true

    // internal
    this.svg = null
    this.scale = null
    this.data = null
  }

  draw (parent, data) {
    this.data = data

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

    // envelope
    this.smooth = store.configs.dataset !== 'hurricane' //fixme
    if (this.smooth) {
      this.drawEnvelope(obj)
    } else {
      this.drawHist(obj)
    }

    // draw a line at the effect size
    obj.append('line')
      .attr('x1', scale.x(this.null))
      .attr('x2', scale.x(this.null))
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
      .attr('class', 'density-observed')
      .datum(density)
      .attr('d', area)

  }

  /**
   * Draw the envelope as a histogram
   */
  drawHist (svg) {
    let scale = this.scale
    let dp = this.data

    let dm = scale.x.domain()
    let step = (dm[1] - dm[0]) / (scale.width() / 2)
    let bins = _.range(dm[0], dm[1], step)
    let hist = d3.histogram().domain(scale.x.domain())
      .thresholds(bins)(dp)

    // y scale
    let ys = d3.scaleLinear().domain([0, d3.max(hist, (d) => d.length)])
      .range([0, scale.height()])

    // area
    let area = d3.area()
      .x((d) => scale.x(d.x1))
      .y0(scale.height())
      .y1((d) => scale.height() - ys(d.length))

    // plot
    svg.append('path')
      .attr('class', 'density-observed')
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

export default InferSimplePlot
