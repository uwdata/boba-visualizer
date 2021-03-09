import * as d3 from 'd3'
import _ from 'lodash'
import DotPlotScale from '../vis/dot_plot_scale'
import {store, util} from '../config'
import {SCHEMA, sign} from '../constants'
import BrushX from '../vis/brushX'

class MonitorDotPlot {
  constructor () {
    this.outerWidth = 1050
    this.outerHeight = 70
    this.margin = {
      top: 0,
      right: 3,
      bottom: 20,
      left: 15
    }

    // small multiple style, set by caller
    this.axis = true
    this.x_axis_label = 'Effect Size'
    this.y_axis_label = false
    this.row_title = null
    this.col_title = null

    // generic style
    this.dot_radius = 4
    this.facet_label_width = 20
    this.label_font_size = 11
    this.title_font_size = 11
    this.na_width = 30

    // multi view consistency
    this.y_range = []
    this.has_na = false

    // assigned when calling draw
    this.parent = ''
    this.data = []
    this.nulls = []

    // components
    this.scale = null
    this.brush = null

    // intermediate objects
    this.x_axis = null
    this.svg = null
  }


  init (parent, data) {
    this.parent = parent

    // separate nulls
    let i = _.findIndex(data, (d) => _.isNumber(d[SCHEMA.POINT]))
    this.data = i >= 0 ? _.slice(data, i) : []
    this.nulls = i >= 0 ? _.slice(data, 0, i) : data

    let outerWidth = this.outerWidth
    let outerHeight = this.outerHeight
    let margin = this.margin

    // make space for labels
    margin.bottom += this.x_axis_label ? this.label_font_size : 0

    // scale
    let scale_params = {
      'outerWidth': this.outerWidth,
      'outerHeight': this.outerHeight,
      'margin': this.margin,
      'x_field': SCHEMA.POINT
    }

    // using a shared x range
    let scale = new DotPlotScale(store.x_range, scale_params)
    this.scale = scale

    // prepare the canvas
    this.svg = d3.select(parent)
      .append('svg')
      .attr('width', outerWidth)
      .attr('height', outerHeight)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    this.svg.append('svg')
      .classed('objects', true)
      .attr('width', scale.width())
      .attr('height', scale.height())

    // brush
    this.brush = new BrushX(data, scale)

    // title and labels
    this._drawTitles()
  }

  draw () {
    // dots
    this._drawDensityDots()

    // axis
    this._drawAxis()
  }

  getRange () {
    // set x scale first before computing y
    this.scale.x.domain(store.x_range)
    if (this.has_na) {
      let rg = this.scale.x.range()
      this.scale.x.range([rg[0], rg[1] - this.na_width])
    }

    // compute layout
    let i = _.findIndex(this.data, (d) => d[SCHEMA.POINT] >= sign)
    i = Math.max(i, 0)
    this._computeDensityDots(i, this.data.length, true)
    this._computeDensityDots(i - 1, -1, false)

    // find max count as the y domain
    let max_y = d3.max(this.data, (d) => d._y)
    max_y = Math.max(max_y, this.nulls.length)  // count of NA
    return [0, max_y]
  }

  setRange (y_range) {
    this.y_range = y_range
  }

  /**
   * Density dot algorithm, assuming data is sorted.
   * @param start
   * @param end
   * @param forward Whether start should be smaller than end.
   * @private
   */
  _computeDensityDots (start, end, forward) {
    let scale = this.scale
    let data = this.data
    let bin_size = this.dot_radius  // x-axis half bin size

    // dot density algorithm
    // assuming data is sorted
    let x = null
    let count = 0
    let i = start
    while (forward ? i < end : i > end) {
      let xi = scale.x(data[i][SCHEMA.POINT])
      let within = forward ? (xi < x + bin_size && xi >= x - bin_size) :
        (xi <= x + bin_size && xi > x - bin_size)
      if (x != null && within) {
        count += 1
      } else {
        x = forward ? xi + bin_size : xi - bin_size
        count = 0
      }

      data[i]._x = x
      data[i]._y = count

      i += forward ? 1 : -1
    }
  }

  _drawDensityDots () {
    let scale = this.scale
    let maxy = this.y_range[1]

    //todo
    // sort by model fit
    // if (SCHEMA.FIT in store.configs.schema) {
    //   data = _.reduce(_.groupBy(data, '_x'), (res, ds) => {
    //     ds = _.map(_.sortBy(ds, SCHEMA.FIT), (d, i) => {
    //       d._y = i
    //       return d
    //     })
    //     return res.concat(ds)
    //   }, [])
    // }

    // compute x and y for NA points
    let na = _.each(this.nulls, (d, i) => {
      d._x = this.scale.x.range()[1] + this.na_width / 2
      d._y = i
    })

    // compute y based on counts
    let data = this.data.concat(na)
    let step = Math.min(scale.height() / (maxy + 1), this.dot_radius * 2)
    _.each(data, (d) => {
      d._y = scale.height() - d._y * step - step * 0.5
    })

    let opacity = Math.max(0.3, Math.min(1, step / this.dot_radius * 0.75))
    let svg = this.svg.select('.objects')
    svg.selectAll('.dot')
      .data(data).enter()
      .append('circle')
      .classed('dot', true)
      .attr('r', () => this.dot_radius)
      .attr('cx', (d) => d._x)
      .attr('cy', (d) => d._y)
      .attr('fill-opacity', opacity)
  }

  _drawXAxis (redraw = false) {
    let scale = this.scale
    let xAxis = d3.axisBottom(scale.x).tickSize(-scale.height())
      .ticks(Math.round(scale.width() / 30))
    console.log(scale.x.range(), scale.width())

    let tmp = redraw ? this.x_axis.transition().duration(1000) : this.x_axis
    tmp.call(xAxis)
      .call(g => g.selectAll('.tick line')
        .attr('stroke-opacity', 0.1)
        .attr('stroke-dasharray', '2, 2'))
      .call(g => g.selectAll('.domain')
        .attr('d', `M0.5,0H${scale.x.range()[1]}`))

    // NA label
    if (this.has_na) {
      let th = scale.height() + this.label_font_size * 2 + 3
      this.svg.append('text')
        .classed('axis-label muted', true)
        .attr('transform', `translate(${scale.width() - this.na_width / 2}, ${th})`)
        .style('text-anchor', 'middle')
        .style('font-size', this.label_font_size)
        .text('null')
    }
  }

  _drawAxis () {
    let scale = this.scale
    let svg = this.svg

    if (this.axis) {
      // X Axis
      this.x_axis = svg.append("g")
        .classed("x axis muted", true)
        .attr('transform', `translate(0,${scale.height()})`)
      this._drawXAxis()

      // x-axis label
      if (this.x_axis_label) {
        let th = scale.height() + this.label_font_size * 2 + 3
        svg.append('text')
          .classed('axis-label muted', true)
          .attr('transform', `translate(${scale.width() / 2}, ${th})`)
          .style('text-anchor', 'middle')
          .style('font-size', this.label_font_size)
          .text(this.x_axis_label)
      }

      // y-axis label
      if (this.y_axis_label) {
        let label = 'Count'
        this.svg.append('text')
          .classed('y axis-label muted', true)
          .attr('transform', 'rotate(-90)')
          .attr('x', 0 - (this.scale.height() / 2))
          .attr('y', -3)
          .style('text-anchor', 'middle')
          .style('font-size', this.label_font_size)
          .text(label)
      }
    }
  }

  _drawTitles () {
    let scale = this.scale
    let svg = this.svg

    // row and column title
    if (this.row_title != null) {
      let t = util.clipText(this.row_title, scale.width() - 20,
        '12px bold system-ui')

      let bg = svg.append('rect')
        .classed('facet-title', true)
        .attr('x', 0)
        .attr('y', -this.facet_label_width)
        .attr('height', this.facet_label_width - 2)
        .attr('width', scale.width())
      let text = svg.append('text')
        .classed('facet-title-text', true)
        .attr('transform', `translate(${scale.width()/2}, ${-this.title_font_size / 2 - 1})`)
        .style('text-anchor', 'middle')
        .style('font-size', this.title_font_size)
        .text(t)

      // hover to show all text!!
      let wrap = util.wrapText(this.row_title, scale.width() - 20,
        '12px bold system-ui')
      let mouseover = () => {
        bg.attr('height', this.title_font_size * wrap.length + 5).raise()
        text.text(wrap[0]).raise()
        _.each(wrap, (line, i) => {
          if (i > 0) {
            text.append('tspan').text(line).attr('x', 0)
              .attr('dy', this.title_font_size)
          }
        })
      }

      let mouseout = () => {
        bg.attr('height', this.facet_label_width - 2)
        text.selectAll('tspan').remove()
        text.text(t)
      }

      if (wrap.length > 1) {
        bg.on('mouseover', mouseover).on('mouseout', mouseout)
        text.on('mouseover', mouseover).on('mouseout', mouseout)
      }
    }
    if (this.col_title != null) {
      let t = util.clipText(this.col_title, scale.height() - 10,
        '12px bold system-ui')

      let ty = scale.width()
      svg.append('rect')
        .classed('facet-title', true)
        .attr('x', ty)
        .attr('y', 0)
        .attr('height', scale.height())
        .attr('width', this.facet_label_width - 2)
      svg.append('text')
        .classed('facet-title-text', true)
        .attr('transform', `translate(${ty + 6}, ${(scale.height() / 2)}), rotate(90)`)
        .attr('x', 0)
        .attr('y', 0)
        .style('text-anchor', 'middle')
        .style('font-size', this.title_font_size)
        .text(t)
    }
  }
}

export default MonitorDotPlot
