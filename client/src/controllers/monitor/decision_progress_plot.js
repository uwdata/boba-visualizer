import * as d3 from 'd3'
import _ from 'lodash'
import {tableau10} from '../config'


// fixme: hard coded for AD test
const SENSITIVE = 5


class DecisionProgressPlot {
  constructor (parent, decisions) {
    this.outerWidth = 0   // will be set by caller
    this.outerHeight = 0  // will be set by caller
    this.margin = {
      top: 5,
      right: 0,
      bottom: 6,
      left: 20
    }
    this.parent = parent
    this.decisions = decisions

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
    this.color_scale = null
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
    this.color_scale = d3.scaleOrdinal().domain(this.decisions)
      .range(tableau10.match(/.{1,6}/g))

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

    // draw time series
    this.svg.append('g').classed('actual-plot', true)
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

    // look for min and max in all decision columns, ignoring NaN
    let y_min = _.min(_.map(this.decisions, (dec) => d3.min(data, (d) =>
      (_.isNumber(d[dec]) && !_.isNaN(d[dec])) ? d[dec] : Infinity)))
    let y_max = _.max(_.map(this.decisions, (dec) => d3.max(data, (d) =>
      (_.isNumber(d[dec]) && !_.isNaN(d[dec])) ? d[dec] : -Infinity)))
    y_max = Math.max(SENSITIVE, y_max) // fixme

    this.ys = d3.scaleLinear()
      .domain([y_min * 1.1, y_max * 1.1])
      .range([height, 0])
  }

  _drawYAxis () {
    let width = this.xs.range()[1]
    let func = d3.axisLeft(this.ys).ticks(6)
      .tickSize(-width)

    this.y_axis
      .call(func)
      .call(g => g.selectAll('.domain').remove())
      .call(g => g.selectAll('.tick line')
        .attr('stroke-opacity', 0.1)
        .attr('stroke-dasharray', '2, 2'))
  }

  _drawLineAndCI (data, redraw=false) {
    let svg = this.svg.select('.actual-plot')

    let line = d3.line()
      .x((d) =>this.xs(d.x))
      .y((d) => this.ys(d.y))

    let line_data = _.map(this.decisions, (dec) => {
      let values = []
      for (let i = 0; i < data.length; i++) {
        let val = data[i][dec]
        if (data[i].type === 'score' && _.isNumber(val) && !_.isNaN(val)) {
          values.push({x: data[i]['n_samples'], y: val})
        }
      }
      return {decision: dec, values: values}
    })

    let sel = svg.selectAll('.sens-progress-line')
      .data(line_data)
    if (redraw) {
      sel = sel.transition(this.trans)
    } else {
      sel = sel.enter()
        .append('path')
        .classed('sens-progress-line', true)
    }
    sel
      .attr('stroke', (d) => '#' + this.color_scale(d.decision))
      .attr('d', (d) => line(d.values))
      .attr('fill', 'none')
      .attr('stroke-linejoin', 'round')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.8)
  }
}

export default DecisionProgressPlot
