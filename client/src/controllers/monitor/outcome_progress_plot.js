import * as d3 from 'd3'
import _ from 'lodash'

class OutcomeProgressPlot {
  constructor (parent) {
    this.outerWidth = 0   // will be set by caller
    this.outerHeight = 0  // will be set by caller
    this.margin = {
      top: 0,
      right: 0,
      bottom: 15,
      left: 30
    }
    this.parent = parent

    // style
    this.y_label = 'Frequency'
    this.x_label = ''
    this.label_font_size = 12

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

    // draw axis
    let height = this.ys.range()[0]
    this.x_axis = this.svg.append('g')
      .attr('transform', 'translate(0,' + height + ')')
      .classed('x axis muted', true)
      .call(d3.axisBottom(this.xs))
    this.y_axis = this.svg.append('g')
      .attr('transform', 'translate(0, 0)')
      .classed('y axis muted', true)
    this._drawYAxis()

    // draw mean line and CI band
    this._drawLineAndCI(data)
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
      this._drawYAxis(true)
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

  _drawYAxis (redraw=false) {
    let height = this.ys.range()[0]
    let y_axis = redraw ? this.y_axis.transition(this.trans) : this.y_axis

    y_axis
      .call(d3.axisLeft(this.ys).ticks(6))
      .call(g => g.selectAll('.domain')
        .attr('d', `M0,0V${height}`))
  }

  _drawLineAndCI (data, redraw=false) {
    // draw CIs
    let area = d3.area()
      .x((d) => this.xs(d['n_samples']))
      .y0((d) => this.ys(d.lower))
      .y1((d) => this.ys(d.upper))
    if (redraw) {
      this.svg.select('.outcome-CI')
        .datum(data)
        .transition(this.trans)
        .attr('d', area)
    } else {
      this.svg.append('path')
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
      this.svg.select('.outcome-mean')
        .datum(line_data)
        .transition(this.trans)
        .attr('d', line)
    } else {
      this.svg.append('path')
        .datum(line_data)
        .attr('d', line)
        .attr('fill', 'none')
        .classed('outcome-mean', true)
    }
  }
}

export default OutcomeProgressPlot
