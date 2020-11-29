import * as d3 from 'd3'
import _ from 'lodash'
import {SCHEMA} from '../controllers/constants'

const SIGN = 0

class ForestPlot {
  constructor () {
    this.outerWidth = 680
    this.outerHeight = 0
    this.margin = {
      top: 30,
      right: 15,
      bottom: 60,
      left: 300
    }

    this.line_height = 18
    this.omit_index = 3
    this.x_label = 'Regression Coefficient'

    this.CI_tick_length = 8
    this.dot_radius = 3
  }

  wrangle (data, cutoff) {
    let res = []
    let omitted = Boolean(data.length - cutoff * 2)

    if (omitted) {
      for (let i = 0; i < cutoff; i++) {
        res.push(data[i])
      }
      for (let i = data.length - cutoff; i < data.length; i++) {
        res.push(data[i])
      }
    } else {
      res = data
    }

    res = _.map(res, (d, i) => {
      return {
        'uid': d.uid,
        '_y': omitted ? (i < cutoff ? i : i + this.omit_index) : i,
        'dot': d[SCHEMA.POINT],
        'upper': d[SCHEMA.POINT] + d[SCHEMA.STDERR] * 1.96,
        'lower': d[SCHEMA.POINT] - d[SCHEMA.STDERR] * 1.96,
      }
    })
    return res
  }

  draw (parent, data, cutoff) {
    let omitted = data.length - cutoff * 2
    let height = this.line_height * (cutoff * 2 + (omitted ? this.omit_index : 0))
    let width = this.outerWidth - this.margin.left - this.margin.right
    this.outerHeight = height + this.margin.top + this.margin.bottom
    data = this.wrangle(data, cutoff)

    // prepare the canvas
    let raw = d3.select(parent)
      .append('svg')
      .attr('width', this.outerWidth)
      .attr('height', this.outerHeight)
    let svg = raw.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`)

    // scale
    let xs = d3.scaleLinear()
      .domain([d3.min(data, (d) => d.lower) * 1.1, d3.max(data, (d) => d.upper) * 1.1])
      .range([0, width])

    // dots
    svg.selectAll('.forest-dot')
      .data(data)
      .enter()
      .append('circle')
      .classed('forest-dot', true)
      .attr('cx', (d) => xs(d.dot))
      .attr('cy', (d) => this.line_height * d['_y'])
      .attr('r', this.dot_radius)

    // confidence intervals
    let l = this.CI_tick_length
    svg.selectAll('.forest-ci')
      .data(data)
      .enter()
      .append('path')
      .classed('forest-ci', true)
      .attr('d', (d) => {
        return `M${xs(d.lower)},${this.line_height * d._y-l/2}` +
          `v${l}v-${l/2}H${xs(d.upper)}v${l/2}v-${l}`
      })
      .attr('stroke', '#000')
      .attr('fill', 'none')

    // axes
    let x_axis = svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xs).ticks(5))
    x_axis.select('.domain')
      .remove()
    svg.append('path')
      .attr('d', `M0,-${this.margin.top}V${height}h${width}`)
      .attr('stroke', '#000')
      .attr('fill', 'none')

    // dashed line
    svg.append('path')
      .attr('d', `M${xs(SIGN)},-${this.margin.top}V${height}`)
      .attr('stroke', '#666')
      .attr('stroke-dasharray', '6 3')

    // axis label
    svg.append('text')
      .attr('y', height + 38)
      .attr('x', width / 2)
      .style('text-anchor', 'middle')
      .text(this.x_label)

    // table on the left
    // fixme: table header & content are hardcoded
    let margin_left = 15
    let header_height = this.margin.top - this.CI_tick_length/2
    let table = raw.append('g')
      .attr('transform', `translate(${margin_left},${header_height})`)
    let x0 = 5
    let x1 = 60
    let x2 = 200
    let fs = this.line_height - 4
    let rows = table.selectAll('.forest-row')
      .data(data)
      .enter()
      .append('g')
      .classed('forest-text', true)

    rows.append('text')
      .attr('x', x0)
      .attr('y', (d) => this.line_height * d['_y'])
      .style('alignment-baseline', 'hanging')
      .style('font-size', fs)
      .text((d) => d.uid)

    rows.append('text')
      .attr('x', x1)
      .attr('y', (d) => this.line_height * d['_y'])
      .style('alignment-baseline', 'hanging')
      .style('font-size', fs)
      .text('Linear Regression')

    rows.append('text')
      .attr('x', x2)
      .attr('y', (d) => this.line_height * d['_y'])
      .style('alignment-baseline', 'hanging')
      .style('font-size', fs)
      .text((d) => d.dot.toFixed(2))

    // table header
    let padding = 5
    table.append('path')
      .attr('d', `M0,-${padding}H${this.margin.left - margin_left - 10}`)
      .attr('stroke', '#000')
    table.append('path')
      .attr('d', `M0,-${header_height - 0.5}H${this.margin.left - margin_left - 10}`)
      .attr('stroke', '#000')
    table.append('text')
      .attr('x', x0)
      .attr('y', -padding * 2)
      .style('alignment-baseline', 'baseline')
      .style('font-size', fs)
      .text('ID')
    table.append('text')
      .attr('x', x1)
      .attr('y', -padding * 2)
      .style('alignment-baseline', 'baseline')
      .style('font-size', fs)
      .text('Analytic Approach')
    table.append('text')
      .attr('x', x2)
      .attr('y', -padding * 2)
      .style('alignment-baseline', 'baseline')
      .style('font-size', fs)
      .text('Coefficient')

    // omitted
    if (omitted) {
      table.append('text')
        .attr('x', x1)
        .attr('y', this.line_height * 11)
        .style('alignment-baseline', 'hanging')
        .style('font-size', fs)
        .attr('fill', '#666')
        .text(` ... ${omitted} more universes`)
    }
  }
}

export default ForestPlot
