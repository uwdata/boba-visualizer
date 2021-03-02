import * as d3 from 'd3'
import _ from 'lodash'

class OutcomeProgressPlot {
  constructor (parent) {
    this.outerWidth = 0   // will be set by caller
    this.outerHeight = 0  // will be set by caller
    this.margin = {
      top: 5,
      right: 0,
      bottom: 6,
      left: 20
    }
    this.parent = parent

    // style
    this.x_label = 'Time'
    this.label_font_size = 10
    this.show_x_label = true

    // axis range
    this.x_range = null

    // internal
    this.svg = null
    this.xs = null        // x scale
    this.ys = null        // y scale
    this.trans = null     // shared transition
  }

  draw (data) {
    // prepare the canvas
    this.svg = d3.select(this.parent)
      .append('svg')
      .attr('width', this.outerWidth)
      .attr('height', this.outerHeight)
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`)

    // scale
    this._setScale(data)

    // shared transition config, for synchronization
    this.trans = d3.transition()
      .duration(1000)
      .ease(d3.easeLinear)

    // draw y axis
    this.y_axis = this.svg.append('g')
      .attr('transform', 'translate(0, 0)')
      .classed('y axis muted', true)
    this._drawYAxis()

    // x axis label
    if (this.show_x_label) {
      let height = this.ys.range()[0]
      let width = this.xs.range()[1]
      this.svg.append('text')
        .classed('axis-label muted', true)
        .attr('transform', `translate(${width / 2}, ${height + 3})`)
        .style('text-anchor', 'middle')
        .style('font-size', this.label_font_size)
        .text(this.x_label)
    }

    // draw mean line and CI band
    this.svg.append('g').classed('actual-plot', true)
    this._drawLineAndCI(data)

    // legend
    let width = this.xs.range()[1]
    let legend_width = 70
    let symbol_width = 20
    let legend_padding = 5
    let box = this.svg.append('g')
      .classed('legend-container', true)
      .attr('transform', `translate(${width - legend_width},${-this.margin.top})`)
    box.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('height', this.label_font_size * 4)
      .attr('width', legend_width)
      .attr('fill', '#fff')
    box.append('rect')
      .classed('outcome-CI', true)
      .attr('x', legend_padding)
      .attr('y', legend_padding)
      .attr('height', this.label_font_size)
      .attr('width', symbol_width)
    box.append('text')
      .classed('axis-label muted', true)
      .attr('x', symbol_width + legend_padding + 5)
      .attr('y', legend_padding + 8)
      .style('font-size', this.label_font_size)
      .text('95% CI')
    let y_start = legend_padding + 5 + this.label_font_size * 1.5 - 1
    box.append('path')
      .classed('outcome-mean', true)
      .attr('d', `M${legend_padding},${y_start}h${symbol_width}`)
    box.append('text')
      .classed('axis-label muted', true)
      .attr('x', symbol_width + legend_padding + 5)
      .attr('y', legend_padding + 22)
      .style('font-size', this.label_font_size)
      .text('Mean')
  }

  clear () {
    if (this.svg) {
      d3.select(this.parent).selectAll('*').remove()
    }
    this.svg = null
  }

  update (data) {
    if (!data || data.length < 2) {
      // the data has been cleared
      this.clear()
    } else if (!this.svg) {
      // the chart has been removed
      this.draw(data)
    } else {
      // update the current chart
      this._setScale(data)
      this._drawYAxis()
      this._drawLineAndCI(data, true)
    }
  }

  _setScale (data) {
    let height = this.outerHeight - this.margin.top - this.margin.bottom
    let width = this.outerWidth - this.margin.left - this.margin.right

    this.xs = d3.scaleLinear()
      .domain(this.x_range || [0, d3.max(data, (d) => d['n_samples'])])
      .range([0, width])
    this.ys = d3.scaleLinear()
      .domain([d3.min(data, (d) => d.lower), d3.max(data, (d) => d.upper)])
      .range([height, 0])
  }

  _drawYAxis () {
    let width = this.xs.range()[1]
    let func = d3.axisLeft(this.ys).ticks(6)
      .tickSize(-width)

    // animation will have a weird flashing bug, probably because we remove the domain ...
    // let y_axis = redraw ? this.y_axis.transition(this.trans) : this.y_axis

    this.y_axis
      .call(func)
      .call(g => g.selectAll('.domain').remove())
      .call(g => g.selectAll('.tick line')
        .attr('stroke-opacity', 0.1)
        .attr('stroke-dasharray', '2, 2'))
  }

  _drawLineAndCI (data, redraw=false) {
    let svg = this.svg.select('.actual-plot')

    // draw CIs
    let area = d3.area()
      .x((d) => this.xs(d['n_samples']))
      .y0((d) => this.ys(d.lower))
      .y1((d) => this.ys(d.upper))
    if (redraw) {
      svg.select('.outcome-CI')
        .datum(data)
        .transition(this.trans)
        .attr('d', area)
    } else {
      svg.append('path')
        .datum(data)
        .classed('outcome-CI', true)
        .attr('d', area)
    }

    // draw the mean line
    let line_data = _.map(data, (d, i) => {
      return {
        x0: i < 1 ? d['n_samples'] : data[i - 1]['n_samples'],
        x1: d['n_samples'],
        y: d['mean']
      }
    })
    let line = d3.line()
      .x((d) => 0.5 * this.xs(d.x0) + 0.5 * this.xs(d.x1))
      .y((d) => this.ys(d.y))
    if (redraw) {
      svg.select('.outcome-mean')
        .datum(line_data)
        .transition(this.trans)
        .attr('d', line)
    } else {
      svg.append('path')
        .datum(line_data)
        .attr('d', line)
        .attr('fill', 'none')
        .classed('outcome-mean', true)
    }
  }
}

export default OutcomeProgressPlot
