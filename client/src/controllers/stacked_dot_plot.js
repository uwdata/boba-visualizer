import * as d3 from 'd3'
import _ from 'lodash'
import DotPlotScale from './vis/dot_plot_scale'
import BrushX from './vis/brushX'
import DotView from './dot_view'
import CurveView from './curve_view'
import {store, util} from './config'
import {UNC_TYPE} from './constants'

class StackedDotPlot {
  constructor () {
    this.outerWidth = 1050
    this.outerHeight = 70
    this.margin = {
      top: 0,
      right: 3,
      bottom: 20,
      left: 15
    }
    this.axis = true
    this.dot_radius = 4
    this.title = 'Overview Distribution'
    this.x_axis_label = 'Predicted Difference'
    this.y_axis_label = true // text will be chosen by view type
    this.row_title = null
    this.col_title = null
    this.facet_label_width = 20
    this.label_font_size = 11
    this.title_font_size = 11

    // assigned when calling draw
    this.parent = ''
    this.data = []
    this.uncertainty = []

    // components
    this.scale = null
    this.brush = null
    this.dot_view = new DotView(this)
    this.curve_view = new CurveView(this)

    // intermediate objects
    this.x_axis = null
    this.svg = null

    // to be persistent through view change
    this.color_by = null
    this.uncertainty_vis = null
    this.clicked_uids = []
  }

  init (parent, data, uncertainty) {
    this.parent = parent
    this.data = data
    this.uncertainty = uncertainty

    let outerWidth = this.outerWidth
    let outerHeight = this.outerHeight
    let margin = this.margin

    // make space for labels
    margin.bottom += this.x_axis_label ? this.label_font_size : 0
    margin.top += this.title ? this.title_font_size : 0

    // scale
    let scale_params = {
      'outerWidth': this.outerWidth,
      'outerHeight': this.outerHeight,
      'margin': this.margin,
      'x_field': 'diff'
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

    // brush
    let brush = new BrushX(data, scale, `${this.parent} .dot`)
    brush.attach(this.svg)
    this.brush = brush

    // axis
    this._drawAxis()

    // title and labels
    this._drawTitles()

    this.svg.append('svg')
      .classed('objects', true)
      .attr('width', scale.width())
      .attr('height', scale.height())

    this._changeViewFlag()
  }

  draw (y_range) {
    let objects = this.svg.select('.objects')

    // dots and curves
    this.dot_view.draw(objects, y_range)
    this.curve_view.draw(y_range)
    this._switchView()
    this.updateColor(this.color_by)
  }

  getRange () {
    this.scale.x.domain(store.x_range)
    return this.dot_view.getRange() || this.curve_view.getRange()
  }

  updateScale (y_range) {
    // x scale has been updated in getRange()
    // update x axis
    this._drawXAxis(true)

    // we don't handle brush resize for now
    this.brush.clear()

    // update dots/curves
    this.dot_view.updateScale(y_range)
    this.curve_view.updateScale(y_range)
  }

  updateColor (color) {
    this.color_by = color
    this.dot_view.updateColor(color)
    this.curve_view.updateColor(color)
  }

  updateUncertainty (y_range) {
    let view = this.uncertainty_vis === UNC_TYPE.AGG ? 0 : 1

    this.curve_view.clear()

    if (view === 1) {
      this.curve_view._y_range = y_range
      this.curve_view.draw()
    } else {
      this.dot_view._y_range = y_range
      this.dot_view.drawEnvelope()
    }

    this._switchView()
  }

  clearClicked () {
    this.dot_view.clearClicked()
    this.curve_view.clearClicked()
  }

  colorClicked () {
    this.dot_view.colorClicked()
    this.curve_view.colorClicked()
  }

  _changeViewFlag () {
    let view = this.uncertainty_vis === UNC_TYPE.CDF
    || this.uncertainty_vis === UNC_TYPE.PDF ? 1 : 0

    this.dot_view.active = view === 0
    this.curve_view.active = view === 1
  }

  _switchView () {
    this.dot_view.switchView()
    this.curve_view.switchView()
    this._labelYAxis(true)
  }

  _drawXAxis (redraw = false) {
    let scale = this.scale
    let xAxis = d3.axisBottom(scale.x).tickSize(-scale.height())
      .ticks(Math.round(scale.width() / 30))

    let tmp = redraw ? this.x_axis.transition().duration(1000) : this.x_axis
    tmp.call(xAxis)
      .call(g => g.selectAll('.tick line')
        .attr('stroke-opacity', 0.1)
        .attr('stroke-dasharray', '2, 2'))
      .call(g => g.selectAll('.domain')
        .attr('d', `M0.5,0H${scale.width()}`))
  }

  _labelYAxis (update = false) {
    if (!this.y_axis_label) {
      return
    }

    let label = this.dot_view.getYLabel() + this.curve_view.getYLabel()
    if (update) {
      this.svg.select('.y.axis-label')
        .text(label)
    } else {
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
      this._labelYAxis()
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

    // title
    if (this.title) {
      // let th = scale.height() + this.label_font_size * 3 + 3
      let th = 0
      svg.append('text')
        .attr('transform', `translate(${scale.width()/2}, ${th})`)
        .style('text-anchor', 'middle')
        .style('font-size', this.title_font_size)
        .style('font-weight', '700')
        .text(this.title)
    }
  }
}

export default StackedDotPlot
