import * as d3 from 'd3'
import * as d3_hexbin from 'd3-hexbin'
import _ from 'lodash'
import {SCHEMA} from '../controllers/constants'
import {util} from '../controllers/config'

class VolcanoPlot {
  constructor () {
    this.outerWidth = 400
    this.outerHeight = 400
    this.margin = {
      top: 15,
      right: 15,
      bottom: 60,
      left: 60
    }

    // styling
    this.radius = 4     // hex tile radius
    this.padding = 15   // space between dots and background boundary
    this.font_size = 12 // axis label font size
  }

  wrangle (data) {
    // log-transform p value
    return _.map(data, (d) => {
      d['y'] = -Math.log10(d[SCHEMA.P])
      return d
    })
  }

  drawColorLegend (svg, color) {
    let width = 15
    let height = 75
    let domain = color.domain()
    color.domain([0, height])

    svg.selectAll('rect')
      .data(d3.range(height))
      .enter()
      .append('rect')
      .attr('y', (d, i) => height - i)
      .attr('x', 0)
      .attr('width', width)
      .attr('height', 1)
      .style('fill', (d) => color(d))

    let ys = d3.scaleLinear()
      .domain(domain)
      .range([height, 0])
    let axis = svg.append('g')
      .attr('transform', `translate(${width}, 0)`)
      .call(d3.axisRight(ys).ticks(3))
    axis.select('.domain')
      .remove()
  }

  drawQuantile (svg, data, col, scale) {
    let height = this.outerHeight - this.margin.top - this.margin.bottom
    let width = this.outerWidth - this.margin.left - this.margin.right

    let qs = [1, 50, 99]
    let arr = _.map(data, (d) => d[col])
    let lines = _.map(qs, (q) => {
      return {'val': util.quantile(arr, q * 0.01), 'label': q}
    })
    let vertical = col === 'diff'
    let cls = 'volcano-' + col

    // dashed line
    svg.selectAll(`.${cls}`)
      .data(lines)
      .enter()
      .append('path')
      .classed(cls, true)
      .attr('d', (d) => {
        if (vertical) {
          return `M${scale(d.val)},${-this.padding}V${height + this.padding}`
        }
        return `M-${this.padding},${scale(d.val)}H${width + this.padding}`
      })
      .attr('fill', 'none')
      .attr('stroke', '#000')
      .attr('stroke-opacity', 0.2)
      .attr('stroke-dasharray', '4 3')

    // label
    svg.selectAll(`.${cls}-text`)
      .data(lines)
      .enter()
      .append('text')
      .classed(cls + '-text', true)
      .attr('y', (d) => vertical ? 0 : scale(d.val) - 2)
      .attr('x', (d) => vertical ? scale(d.val) + 2 : width)
      .style('font-size', 9)
      .text((d) => d.label)
  }

  draw (parent, data) {
    let height = this.outerHeight - this.margin.top - this.margin.bottom
    let width = this.outerWidth - this.margin.left - this.margin.right
    data = this.wrangle(data)

    // prepare the canvas
    let raw = d3.select(parent)
      .append('svg')
      .attr('width', this.outerWidth)
      .attr('height', this.outerHeight)
    let svg = raw.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`)

    // scales
    let xs = d3.scaleLinear()
      .domain([d3.min(data, (d) => d.diff), d3.max(data, (d) => d.diff)])
      .range([0, width])
    let ys = d3.scaleLinear()
      .domain([d3.min(data, (d) => d.y), d3.max(data, (d) => d.y)])
      .range([height, 0])

    // background
    svg.append('rect')
      .attr('x', -this.padding)
      .attr('y', -this.padding)
      .attr('width', width + 2 * this.padding)
      .attr('height', height + 2 * this.padding)
      .attr('fill', 'none')
      .attr('stroke', '#ddd')

    // compute the hex bin data
    let hexbin = d3_hexbin.hexbin()
      .radius(this.radius)
      .extent([[0, 0], [width, height]])
    let hex_data = hexbin(_.map(data, (d) => [xs(d.diff), ys(d.y)]))

    // color scale
    let color = d3.scaleSequential(d3.interpolatePlasma)
      .domain([0, d3.max(hex_data, (d) => d.length)])

    // draw the hex
    svg.selectAll('path')
      .data(hex_data)
      .enter()
      .append('path')
      .attr('d', hexbin.hexagon())
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .attr('fill', (d) => color(d.length) )
      .attr('stroke', 'none')

    // axis and label
    let x_axis = svg.append('g')
      .attr('transform', `translate(0,${height + this.padding})`)
      .call(d3.axisBottom(xs).ticks(5))
    let y_axis = svg.append('g')
      .attr('transform', `translate(-${this.padding}, 0)`)
      .call(d3.axisLeft(ys).ticks(5))
    x_axis.select('.domain')
      .remove()
    y_axis.select('.domain')
      .remove()
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', - 32 - this.padding)
      .attr('x', -(height / 2))
      .style('text-anchor', 'middle')
      .style('font-size', this.font_size)
      .text('-log10(pvalue)')
    svg.append('text')
      .attr('y', height + this.padding + 32)
      .attr('x', width / 2)
      .style('text-anchor', 'middle')
      .style('font-size', this.font_size)
      .text('Effect Size')

    // dashed lines for quantiles
    this.drawQuantile(svg, data, 'diff', xs)
    this.drawQuantile(svg, data, 'y', ys)

    // color legend
    let g = svg.append('g').attr('transform', `translate(25, 0)`)
    this.drawColorLegend(g, color)
  }
}

export default VolcanoPlot
