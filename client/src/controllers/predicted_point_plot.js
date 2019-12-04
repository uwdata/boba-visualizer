import * as d3 from 'd3'

/**
 * A plot for blending predicted point estimates
 */
class PredictedPoint {

  constructor () {
    this.outerWidth = 1050
    this.outerHeight = 600
    this.margin = {
      top: 10,
      right: 70,
      bottom: 10,
      left: 70
    }
    this.backgroud = '#fff'
    this.axis = true
    this.dot_radius = 4

    // assigned when calling draw
    this.parent = ''
    this.data = []

    // callbacks
    this.onDotMouseover = () => {}
    this.onDotMouseout = () => {}
  }

  draw (parent, data) {
    this.parent = parent
    this.data = data

    let outerWidth = this.outerWidth
    let outerHeight = this.outerHeight
    let margin = this.margin
    let width = outerWidth - margin.left - margin.right
    let height = 50
    let that = this

    let x = d3.scaleLinear()
      .range([0, width]).nice()

    let xMax = d3.max(data, (d) => d.diff) * 1.05
    let xMin = d3.min(data, (d) => d.diff) * 1.05

    x.domain([xMin, xMax])
    let xAxis = d3.axisBottom(x).tickSize(-height)

    let svg = d3.select(parent)
      .append('svg')
      .attr('width', outerWidth)
      .attr('height', outerHeight)

    let rect = svg.append('rect')
      .attr('width', outerWidth)
      .attr('height', outerHeight)
      .attr('fill', this.backgroud)

    if (this.axis) {
      // X Axis
      svg.append("g")
        .classed("x axis", true)
        .attr('transform', `translate(0,${height})`)
        .call(xAxis)
        .call(g => g.selectAll('.tick line')
          .attr('stroke-opacity', 0.5)
          .attr('stroke-dasharray', '2, 2'))
    }

    // dots
    let objects = svg.append('svg')
      .classed('objects', true)
      .attr('width', width)
      .attr('height', height)

    let dots = objects.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .classed('dot', true)
      .attr('r', () => this.dot_radius)
      .attr('cx', (d) => x(d.diff))
      .attr('cy', () => (height - this.dot_radius) / 2)
      .attr('fill-opacity', 0.3)
      .on('mouseover', dotMouseover)
      .on('mouseout', dotMouseout)

    function dotMouseover(d) {
      that.onDotMouseover(d, d3.event.clientX, d3.event.clientY)
    }

    function dotMouseout(d) {
      that.onDotMouseout(d)
    }
  }
}

export default PredictedPoint
