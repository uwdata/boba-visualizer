import * as d3 from 'd3'
import _ from 'lodash'
import {store, tableau10} from '../controllers/config'

class SpecCurvePlot {
  constructor () {
    this.outerWidth = 1050
    this.upperHeight = 130
    this.lowerHeight = 0 // will be computed
    this.margin = {
      top: 0,
      right: 30,
      bottom: 20,
      left: 250,
      inner: 15
    }
    this.dot_radius = 1.4
    this.row_height = 12

    // assigned in calling draw
    this.parent = ''
    this.data = []

    // components
    this.svg = null
  }

  getLowerHeight () {
    let h = 0
    _.each(store.decisions, (dec) => {
      h += (dec.length + 2) * this.row_height
    })

    return h + this.margin.top + this.margin.bottom +
      2 * this.margin.inner - this.row_height
  }

  draw (parent, data) {
    this.parent = parent
    this.data = data
    let l = data.length
    this.lowerHeight = this.getLowerHeight()

    // prepare the canvas
    let raw = d3.select(parent)
      .append('svg')
      .attr('width', this.outerWidth)
      .attr('height', this.upperHeight + this.lowerHeight)
    this.svg = raw.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`)

    // upper plot
    let width = this.outerWidth - this.margin.left - this.margin.right
    let height = this.upperHeight - this.margin.top
    let upper = this.svg.append('svg')
      .classed('upper', true)
      .attr('width', width)
      .attr('height', height)

    // scales
    let scale_x = d3.scaleLinear().range([this.margin.inner, width - this.margin.inner])
      .domain([0, l])
    let scale_y = d3.scaleLinear().range([height - 5, 5])
      .domain([data[0].diff, data[l - 1].diff])

    // the green background
    upper.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#C0DCC0')

    // draw CIs (if applicable)
    let ds = _.filter(data, (d) => d.upper != null)
    if (ds.length) {
      let area = d3.area()
        .x((d) => scale_x(d.i))
        .y0((d) => scale_y(d.lower))
        .y1((d) => scale_y(d.upper))
      upper.append('path')
        .datum(ds)
        .classed('spec-curve-envelope', true)
        .attr('d', area)
    }

    // draw dots
    upper.selectAll('.curve-dot')
      .data(data)
      .enter()
      .append('circle')
      .classed('curve-dot', true)
      .attr('r', () => this.dot_radius)
      .attr('cx', (d) => scale_x(d.i))
      .attr('cy', (d) => scale_y(d.diff))

    // the horizontal line at 0
    if (scale_y.domain()[0] * scale_y.domain()[1] < 0) {
      upper.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', scale_y(0))
        .attr('y2', scale_y(0))
        .attr('stroke', '#888')
    }

    // y axis
    let yaxis = d3.axisRight(scale_y).tickSize(-width)
      .ticks(3)
    this.svg.append("g")
      .classed("y axis muted", true)
      .attr('transform', `translate(${width},0)`)
      .call(yaxis)
      .call(g => g.selectAll('.tick line')
        .attr('stroke-opacity', 0.1)
        .attr('stroke-dasharray', '2, 2'))
      .call(g => g.selectAll('.domain')
        .attr('d', `M0.5,${height} V0.5`))

    // lower plot
    height = this.lowerHeight - this.margin.top - this.margin.bottom
    let lower = this.svg.append('g')
      .attr('transform', `translate(0,${this.upperHeight + this.margin.top})`)
      .append('svg')
      .classed('lower', true)
      .attr('width', width)
      .attr('height', height)
    // the white background
    lower.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#fff')
    // canvas for the decision labels
    let labels = raw.append('g')
      .attr('transform', `translate(0,${this.upperHeight + this.margin.top + this.margin.inner})`)
      .append('svg')
      .attr('width', this.margin.left)
      .attr('height', height)

    let h0 = 0
    let i = 0
    _.each(store.decisions, (opts, dec) => {
      // dots
      let cl = 'dec-dot-' + i
      let color = '#' + tableau10.substr(i * 6, 6)
      lower.selectAll('.' + cl)
        .data(data)
        .enter()
        .append('circle')
        .classed(cl, true)
        .attr('r', () => this.dot_radius)
        .attr('cx', (d) => scale_x(d.i))
        .attr('cy', (d) => {
          let idx = _.indexOf(opts, d[dec])
          return h0 + (1.5 + idx) * this.row_height + this.margin.inner
        })
        .attr('fill', color)

      // labels
      let ls = _.concat([dec], opts)
      _.each(ls, (label, idx) => {
        labels.append('text')
          .attr('x', this.margin.left - 10)
          .attr('y', h0 + (idx + 0.5) * this.row_height)
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'middle')
          .style('font-size', () => idx ? this.row_height - 3 : this.row_height)
          .style('font-weight', () => idx ? 'normal' : 'bold')
          .text(label)
      })

      // increment
      h0 += (opts.length + 2) * this.row_height
      i += 1
    })

    // bottom axis
    height = this.upperHeight + this.lowerHeight - this.margin.bottom
    let xaxis = d3.axisBottom(scale_x).tickSize(5)
      .ticks(l / 50)
    this.svg.append("g")
      .classed("x axis muted", true)
      .attr('transform', `translate(0, ${height})`)
      .call(xaxis)
      .call(g => g.selectAll('.tick')
        .filter((d, i) => i > 1 && i < l/50-1)
        .remove())
  }
}

export default SpecCurvePlot
