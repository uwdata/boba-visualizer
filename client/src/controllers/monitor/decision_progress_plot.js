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
    this.x_label = 'Progress'
    this.label_font_size = 10
    this.show_x_label = true

    // axis range
    this.x_max = null     // must be set by caller

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
    // x and y scale will be set prior to calling the draw function
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
    this._drawXAxis()

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
      let non_empty = this._setScale(data)
      if (non_empty) {
        this.draw(data)
      }
    } else {
      // update the current chart
      this._setScale(data)
      this._drawYAxis()
      this._drawXAxis(true)
      this._drawLineAndCI(data, true)
    }
  }

  _setScale (data) {
    let height = this.outerHeight - this.margin.top - this.margin.bottom
    let width = this.outerWidth - this.margin.left - this.margin.right

    let xmax = d3.max(data, (d) => d['n_samples']) / this.x_max
    xmax = xmax > 0.6 ? 1 : (xmax > 0.4 ? 0.75 : (xmax > 0.2 ? 0.5 : 0.25))
    this.xs = d3.scaleLinear()
      .domain([0, xmax])
      .range([0, width])

    // look for min and max in all decision columns, ignoring NaN
    let y_min = _.min(_.map(this.decisions, (dec) => d3.min(data, (d) =>
      (_.isNumber(d[dec]) && !_.isNaN(d[dec])) ? d[dec] : Infinity)))
    let y_max = _.max(_.map(this.decisions, (dec) => d3.max(data, (d) =>
      (_.isNumber(d[dec]) && !_.isNaN(d[dec])) ? d[dec] : -Infinity)))
    let non_empty = _.isFinite(y_min) && _.isFinite(y_max)
    y_max = Math.max(SENSITIVE, y_max) // fixme

    let y_pad = Math.max(Math.abs(y_min * 0.1), Math.abs(y_max * 0.1))
    this.ys = d3.scaleLinear()
      .domain([y_min - y_pad, y_max + y_pad])
      .range([height, 0])

    return non_empty
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

  _drawXAxis (redraw=false) {
    let x_max = this.xs.domain()[1]
    let height = this.ys.range()[0]
    let labels = [x_max] // only one label at the end

    // draw every 'milestone' label
    // let labels = _.range(0.25, x_max + 0.01, 0.25)

    let sel = this.svg.selectAll('.axis-label.muted.x-axis')
      .data(labels)
    if (redraw) {
      sel = sel.transition(this.trans)
    } else {
      sel = sel.enter()
        .append('text')
        .classed('axis-label muted x-axis', true)
    }
    sel
      .attr('transform', `translate(0, ${height + 3})`)
      .attr('x', (d) => this.xs(d))
      .style('text-anchor', 'end')
      .style('font-size', this.label_font_size)
      .text((d) => d * 100 + '%')
  }

  _drawLineAndCI (data, redraw=false) {
    let svg = this.svg.select('.actual-plot')

    // these are the column names for AD score, lower CI, upper CI
    const cols = ['score', 'lower', 'upper']

    let line = d3.line()
      .curve(d3.curveMonotoneX) // not sure if smoothing is right
      .x((d) =>this.xs(d.x / this.x_max))
      .y((d) => this.ys(d['score']))

    let area = d3.area()
      .curve(d3.curveMonotoneX)
      .x((d) => this.xs(d.x / this.x_max))
      .y0((d) => this.ys(d.lower))
      .y1((d) => this.ys(d.upper))

    // wrangle data
    let gp = _.groupBy(data, 'n_samples')
    let formatted_data = _.map(this.decisions, (dec) => {
      let lines = []
      let areas = []
      _.each(gp, (arr, n_samples) => {
        let item = {x: Number(n_samples)}
        _.each(arr, (row) => {
          let val = row[dec]
          let col = row.type
          if (_.includes(cols, col) && _.isNumber(val) && !_.isNaN(val)) {
            item[col] = val
          }
        })
        if ('score' in item) {
          lines.push(item)
        }
        if ('lower' in item && 'upper' in item) {
          areas.push(item)
        }
      })
      return {decision: dec, line_data: lines, area_data: areas}
    })

    // draw the area
    let sel = svg.selectAll('.sens-progress-area')
      .data(formatted_data)
    if (redraw) {
      sel = sel.transition(this.trans)
    } else {
      sel = sel.enter()
        .append('path')
        .classed('sens-progress-area', true)
    }
    sel.attr('d', (d) => area(d.area_data))
      .attr('fill',(d) => '#' + this.color_scale(d.decision))
      .attr('opacity', 0.1)

    // draw the lines
    sel = svg.selectAll('.sens-progress-line')
      .data(formatted_data)
    if (redraw) {
      sel = sel.transition(this.trans)
    } else {
      sel = sel.enter()
        .append('path')
        .classed('sens-progress-line', true)
    }
    sel
      .attr('stroke', (d) => '#' + this.color_scale(d.decision))
      .attr('d', (d) => line(d.line_data))
      .attr('fill', 'none')
      .attr('stroke-linejoin', 'round')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.7)
  }
}

export default DecisionProgressPlot
