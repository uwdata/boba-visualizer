import * as d3 from 'd3'
import {bus} from './config'
import BandScale from './vis/band_scale'
import BrushX from './vis/brushX'

/**
 * A plot for blending predicted point estimates
 */
class BandPlot {

  constructor () {
    this.outerWidth = 1050
    this.outerHeight = 70
    this.margin = {
      top: 0,
      right: 70,
      bottom: 20,
      left: 70
    }
    this.background = '#fff'
    this.axis = true
    this.dot_radius = 4
    this.jitter = true

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

    let scale_params = {
      'outerWidth': this.outerWidth,
      'outerHeight': this.outerHeight,
      'margin': this.margin,
      'x_field': 'diff'
    }
    let scale = new BandScale(data, scale_params)
    this.scale = scale

    let xAxis = d3.axisBottom(scale.x).tickSize(-scale.height())

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

    // dots
    let objects = svg.append('svg')
      .classed('objects', true)
      .attr('width', scale.width())
      .attr('height', scale.height())

    let dots = objects.selectAll('.dot')
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
}

export default BandPlot
