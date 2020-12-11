import * as d3 from 'd3'
import _ from 'lodash'

class PCurvePlot {
  constructor () {
    this.outerWidth = 450
    this.outerHeight = 400
    this.margin = {
      top: 15,
      right: 15,
      bottom: 60,
      left: 60
    }

    this.y_label = 'Share of significant p-value'
    this.x_label = 'p-value'
    this.radius = 4
    this.cutoff = 0.1
    this.n_bins = 10
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
      .attr('y', -10)
      .attr('width', width)
      .attr('height', height + 10)
      .attr('fill', 'none')
      .attr('stroke', '#000')

    // bins and scale
    let xs = d3.scaleLinear()
      .domain([d3.min(data), d3.max(data)])
      .range([10, width - 10])
    let histogram = d3.histogram()
      .value((d) => d)
      .domain(xs.domain())
      .thresholds(this.n_bins)
    let bins =histogram(data)

    // convert count to frequency
    bins = _.map(bins, (arr) => {
      return {x0: arr.x0, x1: arr.x1, y: arr.length / data.length}
    })
    let ys = d3.scaleLinear()
      .domain([0, d3.max(bins, (d) => d.y)]).nice()
      .range([height - 20, 0])

    // draw the poly-line
    let line = d3.line()
      .x((d) => 0.5 * xs(d.x0) + 0.5 * xs(d.x1))
      .y((d) => ys(d.y))
    svg.append('path')
      .datum(bins)
      .attr('d', line)
      .attr('stroke', '#000')
      .attr('fill', 'none')

    // draw the little squares
    svg.selectAll('.pcurve-square')
      .data(bins)
      .enter()
      .append('rect')
      .attr('x', (d) => 0.5 * xs(d.x0) + 0.5 * xs(d.x1) - this.radius)
      .attr('y', (d) => ys(d.y) - this.radius)
      .attr('width', this.radius * 2)
      .attr('height', this.radius * 2)
      .attr('fill', '#fff')
      .attr('stroke', '#000')

    // draw axis
    svg.append('g')
      .attr('transform', 'translate(0,' + height + ')')
      .call(d3.axisBottom(xs))
      .call((g) => g.select('.domain').remove())
    svg.append('g')
      .call(d3.axisLeft(ys).ticks(10))
      .call((g) => g.select('.domain').remove())

    // draw the dashed line
    if (this.cutoff != null) {
      svg.append('path')
        .attr('d', `M0,${ys(this.cutoff)}H${width}`)
        .attr('stroke', '#000')
        .attr('stroke-dasharray', '4 4')
    }

    // axis labels
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', - 38)
      .attr('x', -(height / 2))
      .style('text-anchor', 'middle')
      .text(this.y_label)
    svg.append('text')
      .attr('y', height + 38)
      .attr('x', width / 2)
      .style('text-anchor', 'middle')
      .text(this.x_label)
  }
}

export default PCurvePlot
