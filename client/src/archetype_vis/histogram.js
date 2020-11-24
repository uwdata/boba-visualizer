import * as d3 from 'd3'
import _ from 'lodash'

class HistPlot {
  constructor () {
    this.outerWidth = 680
    this.outerHeight = 400
    this.margin = {
      top: 15,
      right: 15,
      bottom: 60,
      left: 70
    }
    this.padding_bottom = 10
    this.padding_left = 20
  }

  draw (parent, data, column, cutoff) {
    let height = this.outerHeight - this.margin.top - this.margin.bottom
    let width = this.outerWidth - this.margin.left - this.margin.right

    // prepare the canvas
    let raw = d3.select(parent)
      .append('svg')
      .attr('width', this.outerWidth)
      .attr('height', this.outerHeight)
    raw.append('rect')
      .attr('x', this.margin.left - this.padding_left)
      .attr('y', 0)
      .attr('width', this.outerWidth)
      .attr('height', this.outerHeight - this.margin.bottom + this.padding_bottom)
      .attr('fill', '#eee')
    let svg = raw.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`)

    // bins and scale
    data = _.map(data, (d) => d[column])
    let xs = d3.scaleLinear()
      .domain([d3.min(data), d3.max(data)])
      .range([0, width])
    let histogram = d3.histogram()
      .value((d) => d)
      .domain(xs.domain())
      .thresholds(80)
    let bins =histogram(data)

    let ys = d3.scaleLinear()
      .domain([0, d3.max(bins, (bin) => bin.length)]).nice()
      .range([height, 0])

    // draw axis
    let x_axis = svg.append('g')
      .attr('transform', 'translate(0,' + (height + this.padding_bottom) + ')')
      .call(d3.axisBottom(xs))
    let y_axis = svg.append('g')
      .attr('transform', 'translate(-' + this.padding_left + ', 0)')
      .call(d3.axisLeft(ys).ticks(10))

    // manually draw the white tick lines
    svg.selectAll('.gridline-x')
      .data(x_axis.selectAll('.tick').data())
      .enter()
      .append('path')
      .classed('gridline-x', true)
      .attr('d', (d) => `M${xs(d)},-${this.margin.top}V${height + this.padding_bottom}`)
      .attr('stroke', '#fff')
    svg.selectAll('.gridline-y')
      .data(y_axis.selectAll('.tick').data())
      .enter()
      .append('path')
      .classed('gridline-y', true)
      .attr('d', (d) => `M-${this.padding_left},${ys(d)}H${width + this.padding_left}`)
      .attr('stroke', '#fff')

    // customize style
    svg.append('path')
      .attr('d', `M0,${height}H${width}`)
      .attr('stroke', '#222')
    x_axis.select('.domain')
      .remove()
    y_axis.select('.domain')
      .remove()

    // draw bars
    svg.selectAll('rect')
      .data(bins)
      .enter()
      .append('rect')
      .attr('x', (d) => xs(d.x0))
      .attr('width', (d) => xs(d.x1) - xs(d.x0))
      .attr('y', (d) => ys(d.length))
      .attr('height', (d) => ys(0) - ys(d.length))
      .attr('fill', '#fff')
      .attr('stroke', '#222')
      .attr('stroke-width', 1)

    // draw the dashed line
    svg.append('path')
      .attr('d', `M${xs(cutoff)},-${this.margin.top}V${height + this.padding_bottom}`)
      .attr('stroke', '#f00')
      .attr('stroke-dasharray', '4 3')

    // axis labels
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', - 38 - this.padding_left)
      .attr('x', -(height / 2))
      .style('text-anchor', 'middle')
      .text('Frequency')
    svg.append('text')
      .attr('y', height + this.padding_bottom + 38)
      .attr('x', width / 2)
      .style('text-anchor', 'middle')
      .text(column)
  }
}

export default HistPlot
