import * as d3 from 'd3'
import _ from 'lodash'
import {util} from '../controllers/config'

class DensityPlot {
  constructor () {
    this.outerWidth = 450
    this.outerHeight = 400
    this.margin = {
      top: 15,
      right: 15,
      bottom: 50,
      left: 50
    }

    this.type = 0   // 0: PDF, 1: CDF
    this.x_label = 'Effect Size'
    this.label_font_size = 12

    this.label_cdf = 'Cumulative Frequency Distribution'
    this.label_pdf = 'Frequency'
  }

  draw (parent, data) {
    let height = this.outerHeight - this.margin.top - this.margin.bottom
    let width = this.outerWidth - this.margin.left - this.margin.right

    // prepare the canvas
    let raw = d3.select(parent)
      .append('svg')
      .attr('width', this.outerWidth)
      .attr('height', this.outerHeight)
    let svg = raw.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`)
    svg.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('stroke', '#ddd')
      .attr('stroke-width', 2)

    // compute density
    data = _.map(data, (d) => d.diff)
    let density = util.kde_smart(data)
    if (this.type === 1) {
      density = util.toCdf(density)
    }

    // scale
    let xs = d3.scaleLinear()
      .domain([density[0][0] * 1.1, density[density.length - 1][0] * 1.1])
      .range([0, width])
    let ys = d3.scaleLinear()
      .domain([-0.05, 1.05])
      .range([height, 0])

    // axis
    svg.append('g')
      .attr('transform', 'translate(0,' + height + ')')
      .call(d3.axisBottom(xs))
      .call((g) => g.select('.domain').remove())
    svg.append('g')
      .call(d3.axisLeft(ys))
      .call((g) => g.select('.domain').remove())

    // axis gridlines
    svg.append('g')
      .attr('transform', 'translate(0,' + height + ')')
      .call(d3.axisBottom(xs)
        .tickSize(-height)
        .tickFormat(''))
      .call((g) => g.selectAll('.tick')
        .attr('stroke-opacity', 0.07))
      .call((g) => g.select('.domain').remove())
    svg.append('g')
      .call(d3.axisLeft(ys)
        .tickSize(-width)
        .tickFormat(''))
      .call((g) => g.selectAll('.tick')
        .attr('stroke-opacity', 0.07))
      .call((g) => g.select('.domain').remove())


    // draw the density curve
    let line = d3.line().curve(d3.curveBasis)
      .x((d) => {
        console.log(d)
        return xs(d[0])
      })
      .y((d) => ys(d[1]))
    svg.selectAll('.density-curve')
      .data([density])
      .enter()
      .append('path')
      .classed('density-curve', true)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke-linejoin', 'round')
      .attr('stroke', '#000')

    // axis label
    let y_label = this.type === 1 ? this.label_cdf : this.label_pdf
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', - 38)
      .attr('x', -(height / 2))
      .style('text-anchor', 'middle')
      .style('font-size', this.label_font_size)
      .text(y_label)
    svg.append('text')
      .attr('y', height + 38)
      .attr('x', width / 2)
      .style('text-anchor', 'middle')
      .style('font-size', this.label_font_size)
      .text(this.x_label)
  }
}

export default DensityPlot
