import * as d3 from 'd3'
import _ from 'lodash'
import {SCHEMA} from '../controllers/constants'

class ForestPlot {
  constructor () {
    this.outerWidth = 680
    this.outerHeight = 0
    this.margin = {
      top: 15,
      right: 15,
      bottom: 60,
      left: 70
    }

    this.line_height = 16
    this.omit_index = 3

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
      .domain([d3.min(data, (d) => d.lower), d3.max(data, (d) => d.upper)])
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
  }
}

export default ForestPlot
