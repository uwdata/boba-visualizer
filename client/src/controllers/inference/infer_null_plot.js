import * as d3 from 'd3'
import {store} from '../config'
import _ from 'lodash'
import BaseScale from '../vis/base_scale'

class InferNullPlot {
  constructor () {
    this.outerWidth = 1050
    this.outerHeight = 250
    this.margin = {
      top: 15,
      right: 20,
      bottom: 30,
      left: 20
    }
    this.x_axis_label = 'Effect Size'
    this.label_font_size = 11

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

    // scale
    let l = data.length
    let scale = new BaseScale(scale_params)
    scale.x = d3.scaleLinear().range([0, scale.width()])
      .domain([0, l])
    scale.y = d3.scaleLinear().range([scale.height(), 0])
      .domain(store.x_range)
      // .domain([data[0].diff, data[l - 1].diff])
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

    // draw the spec curve
    this.drawSpecCurve(obj)
  }

  drawAxis () {
    let scale = this.scale

    // y axis
    let yaxis = d3.axisRight(scale.y).tickSize(-scale.width())
      .ticks(5)
    this.svg.append('g')
      .classed('y axis muted', true)
      .attr('transform', `translate(${scale.width()},0)`)
      .call(yaxis)
      .call(g => g.selectAll('.tick line')
        .attr('stroke-opacity', 0.1)
        .attr('stroke-dasharray', '2, 2'))
      .call(g => g.selectAll('.domain')
        .attr('d', `M0.5,${scale.height()} V0.5`))
  }

  drawSpecCurve (svg) {
    let scale = this.scale
    let w = scale.width() / this.data.length
    w = Math.min(w, 1.5)

    // draw the CI
    svg.selectAll('.null-box')
      .data(this.data)
      .enter()
      .append('rect')
      .classed('null-box', true)
      .attr('x', (d) => scale.x(d.i) - w/2)
      .attr('y', (d) => scale.y(d.upper))
      .attr('width', w)
      .attr('height', (d) => Math.abs(scale.y(d.upper) - scale.y(d.lower)))

    // draw the median and the point estimate
    // this.drawDash(svg, 'null-median', 'i', 'median')
    let pts = this.drawDash(svg, 'null-point', 'i', 'diff')
    pts.filter((d) => d.diff > d.upper || d.diff < d.lower)
      .classed('null-outside', true)
  }

  drawDash (svg, cls, x_col, y_col) {
    let scale = this.scale
    let w = scale.width() / this.data.length

    return svg.selectAll('.' + cls)
      .data(this.data)
      .enter()
      .append('line')
      .classed(cls, true)
      .attr('x1', (d) => scale.x(d[x_col]) - w/2)
      .attr('x2', (d) => scale.x(d[x_col]) + w/2)
      .attr('y1', (d) => scale.y(d[y_col]))
      .attr('y2', (d) => scale.y(d[y_col]))
  }
}

export default InferNullPlot
