import * as d3 from 'd3'
import _ from 'lodash'
import BandScale from './vis/band_scale'
import BrushX from './vis/brushX'
import {bus, store} from './config'

class StackedDotPlot {
  constructor () {
    this.outerWidth = 1050
    this.outerHeight = 70
    this.margin = {
      top: 0,
      right: 15,
      bottom: 15,
      left: 15
    }
    this.background = '#fff'
    this.axis = true
    this.dot_radius = 4

    // assigned when calling draw
    this.parent = ''
    this.data = []

    // components
    this.scale = null
  }

  draw (parent, data) {
    this.parent = parent
    this.data = data

    let outerWidth = this.outerWidth
    let outerHeight = this.outerHeight
    let margin = this.margin

    // scale
    let scale_params = {
      'outerWidth': this.outerWidth,
      'outerHeight': this.outerHeight,
      'margin': this.margin,
      'x_field': 'diff'
    }
    // fixme: here I hack to make the scale consistent
    let scale = new BandScale(store.predicted_diff, scale_params)
    this.scale = scale

    // prepare the canvas
    let svg = d3.select(parent)
      .append('svg')
      .attr('width', outerWidth)
      .attr('height', outerHeight)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    let rect = svg.append('rect')
      .attr('width', scale.width())
      .attr('height', scale.height())
      .attr('fill', this.background)

    // brush
    let brush = new BrushX(data, scale, '.dot')
    brush.attach(svg)
    this.brush = brush

    // axis
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
    }

    let objects = svg.append('svg')
      .classed('objects', true)
      .attr('width', scale.width())
      .attr('height', scale.height())

    // dots
    this._drawHistoDots(objects)
      .on('mouseover', dotMouseover)
      .on('mouseout', dotMouseout)

    function dotMouseover(d) {
      bus.$emit('agg-vis.dot-mouseover',
        {data: d, x: d3.event.clientX, y: d3.event.clientY})
    }

    function dotMouseout(d) {
      bus.$emit('agg-vis.dot-mouseout', {data: d})
    }
  }

  /**
   * Draw histogram dot plot. Note that we're using the true x value, instead
   * of the binned x value. Also, we allow dots to overlap along the y-axis.
   * @param parent
   * @returns {*|void}
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
