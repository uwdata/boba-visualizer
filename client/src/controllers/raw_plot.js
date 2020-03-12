import * as d3 from 'd3'
import RawScale from './vis/raw_scale'
import {bus, util} from './config'
import _ from 'lodash'

class RawPlot {
  constructor () {
    this.outerWidth = 300
    this.outerHeight = 120
    this.margin = {
      top: 0,
      right: 2,
      bottom: 20,
      left: 2
    }
    this.dot_radius = 4
    this.dot_opacity = 0.3
    this.title = ''
    this.x_axis_label = ''
    this.label_font_size = 11

    // assigned when calling draw
    this.parent = ''
    this.data = []

    // components
    this.scale = null
  }

  draw (parent, data, range) {
    this.parent = parent
    this.data = data

    let outerWidth = this.outerWidth
    let outerHeight = this.outerHeight
    let margin = this.margin

    // make space for labels
    margin.bottom += (this.x_axis_label || this.title) ? this.label_font_size : 0

    // scale
    let scale_params = {
      'outerWidth': this.outerWidth,
      'outerHeight': this.outerHeight,
      'margin': this.margin
    }

    let scale = new RawScale(range, scale_params)
    this.scale = scale

    // prepare the canvas
    let svg = d3.select(parent)
      .append('svg')
      .attr('width', outerWidth)
      .attr('height', outerHeight)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // axis
    this._drawAxis(svg)

    // title and labels
    this._drawTitles(svg)

    let objects = svg.append('svg')
      .classed('objects', true)
      .attr('width', scale.width())
      .attr('height', scale.height())

    // first draw the actual data as dots
    this._drawDots(objects, data.actual, scale.y('actual'), 'raw-dot')
    this._drawViolin(objects, data.actual, scale.y('actual'))

    // then draw the predicted data as violin plots
    this._drawDots(objects, data.pred, scale.y('pred'), 'pred-dot')
    this._drawViolin(objects, data.pred, scale.y('pred'))
  }

  _drawDots (svg, data, y0, cls) {
    let scale = this.scale
    let bin_size = this.dot_radius * 2 // x-axis bin size

    // sort
    data = _.map(data, (d, i) => {
      return {value: d, _index: i}
    })
    let sorted = _.sortBy(data, (d) => d.value)

    // dot density algorithm
    let i = 0
    let x = null
    let count = 0
    while (i < sorted.length) {
      let xi = sorted[i].value
      if (x != null && scale.x(xi) < scale.x(x) + bin_size) {
        count += 1
      } else {
        x = xi
        count = 0
      }

      let idx =sorted[i]._index
      data[idx]._x = x
      data[idx]._y = count

      i += 1
    }

    // compute y based on counts
    let h = scale.y.bandwidth() / 2
    let step = Math.min(h / (d3.max(data, (d) => d._y) + 1),
      this.dot_radius)
    _.each(data, (d) => {
      let delta = d._y * step + step * 0.5
      d._y = d._y % 2 ? y0 + h + delta : y0 + h - delta
    })

    svg.selectAll('.' + cls)
      .data(data)
      .enter()
      .append('circle')
      .classed(cls, true)
      .attr('r', () => this.dot_radius)
      .attr('cx', (d) => scale.x(d._x))
      .attr('cy', (d) => d._y)
      .attr('fill-opacity', this.dot_opacity)
  }

  _drawViolin (svg, data, y0) {
    let scale = this.scale

    // compute kernel density estimation
    let density = util.kde_smart(data)

    // scale
    let h = scale.y.bandwidth() / 2
    let ys = d3.scaleLinear().range([y0 + h, y0])
      .domain([0, 1.05 * d3.max(_.map(density, (d) => d[1]))])

    // line
    let line = d3.line().curve(d3.curveBasis)
      .x((d) => scale.x(d[0]))
      .y((d) => ys(d[1]))

    // plot the upper curve
    svg.append('path')
      .attr('class', 'violin-curve')
      .datum(density)
      .attr('d', line)

    // plot the lower curve
    ys.range([y0 + h, y0 + h * 2])
    line = d3.line().curve(d3.curveBasis)
      .x((d) => scale.x(d[0]))
      .y((d) => ys(d[1]))

    svg.append('path')
      .attr('class', 'violin-curve')
      .datum(density)
      .attr('d', line)
  }

  _drawAxis (svg) {
    let scale = this.scale
    let xAxis = d3.axisBottom(scale.x).tickSize(-scale.height())

    // X Axis
    svg.append("g")
      .classed("x axis muted", true)
      .attr('transform', `translate(0,${scale.height()})`)
      .call(xAxis)
      .call(g => g.selectAll('.tick line')
        .remove())
      .call(g => g.selectAll('.domain')
        .attr('d', `M0.5,0H${scale.width()}`))
  }

  _drawTitles (svg) {
    let scale = this.scale
    let th = scale.height() + this.label_font_size * 2 + 3

    // title
    if (this.title) {
      svg.append('text')
        .attr('transform', `translate(0, ${th})`)
        .style('font-size', this.label_font_size)
        .style('font-weight', '700')
        .text(this.title)
    }

    // x-axis label
    if (this.x_axis_label) {
      svg.append('text')
        .classed('axis-label muted', true)
        .attr('transform', `translate(${scale.width()}, ${th})`)
        .style('text-anchor', 'end')
        .style('font-size', this.label_font_size)
        .text(this.x_axis_label)
    }

    // overlay for event
    svg.append('rect')
      .attr('x', 0)
      .attr('y', th - this.label_font_size)
      .attr('width', scale.width() / 3)
      .attr('height', this.label_font_size)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseover', mouseover)
      .on('mouseout', mouseout)

    // event
    let data = this.data
    function mouseover() {
      bus.$emit('raw.mouseover',
        {uid: data.uid, x: d3.event.clientX, y: d3.event.clientY})
    }

    function mouseout() {
      bus.$emit('raw.mouseout')
    }
  }
}

export default RawPlot
