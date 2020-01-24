import * as d3 from 'd3'
import _ from 'lodash'
import DotPlotScale from './vis/dot_plot_scale'
import BrushX from './vis/brushX'
import {bus, store} from './config'

class StackedDotPlot {
  constructor () {
    this.outerWidth = 1050
    this.outerHeight = 70
    this.margin = {
      top: 0,
      right: 15,
      bottom: 20,
      left: 15
    }
    this.axis = true
    this.dot_radius = 4
    this.jitter = true
    this.title = 'Overview Distribution'
    this.x_axis_label = 'Predicted Difference'
    this.y_axis_label = 'Count'
    this.row_title = null
    this.col_title = null
    this.facet_label_width = 20
    this.label_font_size = 11
    this.title_font_size = 12

    // assigned when calling draw
    this.parent = ''
    this.data = []

    // components
    this.scale = null
    this.brush = null
  }

  draw (parent, data) {
    this.parent = parent
    this.data = data

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
    // fixme: here I hack to make the scale consistent
    let scale = new DotPlotScale(store.predicted_diff, scale_params)
    // let scale = new DotPlotScale(data, scale_params)
    this.scale = scale

    // prepare the canvas
    let svg = d3.select(parent)
      .append('svg')
      .attr('width', outerWidth)
      .attr('height', outerHeight)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // brush
    let brush = new BrushX(data, scale, `${this.parent} .dot`)
    brush.attach(svg)
    this.brush = brush

    // axis
    this._drawAxis(svg)

    // title and labels
    this._drawTitles(svg)

    let objects = svg.append('svg')
      .classed('objects', true)
      .attr('width', scale.width())
      .attr('height', scale.height())

    // dots
    this._drawDensityDots(objects)  // replace different chart types here
      .on('mouseover', dotMouseover)
      .on('mouseout', dotMouseout)
      .on('click', dotClick)

    function dotMouseover(d) {
      bus.$emit('agg-vis.dot-mouseover',
        {data: d, x: d3.event.clientX, y: d3.event.clientY})
    }

    function dotMouseout(d) {
      bus.$emit('agg-vis.dot-mouseout', {data: d})
    }

    function dotClick(d) {
      bus.$emit('agg-vis.dot-click', d)
    }
  }

  _drawAxis (svg) {
    let scale = this.scale
    let xAxis = d3.axisBottom(scale.x).tickSize(-scale.height())

    if (this.axis) {
      // X Axis
      svg.append("g")
        .classed("x axis", true)
        .attr('transform', `translate(0,${scale.height()})`)
        .call(xAxis)
        .call(g => g.selectAll('.tick line')
          .attr('stroke-opacity', 0.5)
          .attr('stroke-dasharray', '2, 2'))

      // x-axis label
      if (this.x_axis_label) {
        let th = scale.height() + this.label_font_size * 2 + 3
        svg.append('text')
          .attr('transform', `translate(${scale.width() / 2}, ${th})`)
          .style('text-anchor', 'middle')
          .style('font-size', this.label_font_size)
          .text(this.x_axis_label)
      }

      // y-axis label
      if (this.y_axis_label) {
        svg.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', 0 - (scale.height() / 2))
          .attr('y', -3)
          .style('text-anchor', 'middle')
          .style('font-size', this.label_font_size)
          .text(this.y_axis_label)
      }
    }
  }

  _drawTitles (svg) {
    let scale = this.scale

    // row and column title
    if (this.row_title != null) {
      svg.append('rect')
        .classed('facet-title', true)
        .attr('x', 0)
        .attr('y', -this.facet_label_width)
        .attr('height', this.facet_label_width - 2)
        .attr('width', scale.width())
      svg.append('text')
        .attr('transform', `translate(${scale.width()/2}, ${-this.title_font_size / 2 - 1})`)
        .style('text-anchor', 'middle')
        .style('font-size', this.title_font_size)
        .style('font-weight', '700')
        .text(this.row_title)
    }
    if (this.col_title != null) {
      let ty = scale.width()
      svg.append('rect')
        .classed('facet-title', true)
        .attr('x', ty)
        .attr('y', 0)
        .attr('height', scale.height())
        .attr('width', this.facet_label_width - 2)
      svg.append('text')
        .attr('transform', `translate(${ty + 6}, ${(scale.height() / 2)}), rotate(90)`)
        .attr('x', 0)
        .attr('y', 0)
        .style('text-anchor', 'middle')
        .style('font-size', this.title_font_size)
        .style('font-weight', '700')
        .text(this.col_title)
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

  /**
   * Draw density dot plots (from Allison & Cicchetti, 1976) without smoothing
   * Opacity will be adjusted based on the amount of overlap
   * @param parent
   * @returns {*}
   * @private
   */
  _drawDensityDots (parent) {
    let scale = this.scale
    let data = this.data
    let bin_size = this.dot_radius * 2  // x-axis bin size

    // dot density algorithm
    // assuming data is sorted
    let i = 0
    let x = null
    let count = 0
    while (i < data.length) {
      let xi = data[i].diff
      if (x != null && scale.x(xi) < scale.x(x) + bin_size) {
        count += 1
      } else {
        x = xi
        count = 0
      }

      data[i]._x = x
      data[i]._y = count

      i += 1
    }

    // compute y based on counts
    let step = Math.min(scale.height() / (d3.max(data, (d) => d._y) + 1),
      this.dot_radius * 2)
    _.each(data, (d) => {
      d._y = scale.height() - d._y * step - step * 0.5
    })

    let opacity = Math.max(0.3, Math.min(0.8, step / this.dot_radius * 0.5))
    let dots = parent.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .classed('dot', true)
      .attr('r', () => this.dot_radius)
      .attr('cx', (d) => scale.x(d._x))
      .attr('cy', (d) => d._y)
      .attr('fill-opacity', opacity)

    return dots
  }

  /**
   * Draw jittered plot. When dots overlap, displace the y position by adding
   * a small amount of uniform random error.
   * @param parent
   * @returns {*|void} D3 selections of all dots.
   * @private
   */
  _drawJittered (parent) {
    let scale = this.scale
    let data = this.data

    let dots = parent.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .classed('dot', true)
      .attr('r', () => this.dot_radius)
      .attr('cx', (d) => scale.x(d.diff))
      .attr('cy', (d) => {
        let y = (scale.height() - this.dot_radius) / 2
        let j = this.jitter ? (Math.random() - 0.5)  * scale.height() : 0
        d._y = y + j // save this for brushing
        return y + j
      })
      .attr('fill-opacity', 0.3)

    return dots
  }

  /**
   * Draw histogram dot plot. Note that we're using the true x value, instead
   * of the binned x value. Also, we allow dots to overlap along the y-axis.
   * @param parent
   * @returns {*|void} D3 selections of all dots.
   * @private
   */
  _drawHistoDots (parent) {
    let scale = this.scale
    let data = this.data

    // compute the bins
    let hist = d3.histogram()
      .value((d) => d.diff)
      .domain(scale.x.domain())
      .thresholds(Math.floor(scale.width() / this.dot_radius))

    let bins = hist(data)
    let step = scale.height() / d3.max(bins, (d) => d.length)

    // compute the y position for each point
    _.each(bins, (arr) => {
      _.each(arr, (d, idx) => {
        d._y = scale.height() - Math.floor(idx * step)
      })
    })

    // draw
    let dots = parent.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .classed('dot', true)
      .attr('r', () => this.dot_radius)
      .attr('cx', (d) => scale.x(d.diff))
      .attr('cy', (d) => d._y)
      .attr('fill-opacity', 0.3)

    return dots
  }
}

export default StackedDotPlot
