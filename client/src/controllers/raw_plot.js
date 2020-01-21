import * as d3 from 'd3'
import RawScale from './vis/raw_scale'

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
    this.title = ''
    this.x_axis_label = 'Log2(Death)'
    this.label_font_size = 11

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

    // make space for labels
    margin.bottom += (this.x_axis_label || this.title) ? this.label_font_size : 0

    // scale
    let scale_params = {
      'outerWidth': this.outerWidth,
      'outerHeight': this.outerHeight,
      'margin': this.margin
    }

    let scale = new RawScale(_.concat(data.actual, data.pred), scale_params)
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
    objects.selectAll('.raw-dot')
      .data(data.actual)
      .enter()
      .append('circle')
      .classed('raw-dot', true)
      .attr('r', () => this.dot_radius)
      .attr('cx', (d) => scale.x(d))
      .attr('cy', () => {
        let y = scale.y('actual')
        let j = Math.random() * scale.y.bandwidth()
        return y + j
      })
      .attr('fill', '#17a2b8')
      .attr('fill-opacity', 0.3)

    // then draw the predicted data as dots
    objects.selectAll('.pred-dot')
      .data(data.pred)
      .enter()
      .append('circle')
      .classed('pred-dot', true)
      .attr('r', () => this.dot_radius)
      .attr('cx', (d) => scale.x(d))
      .attr('cy', () => {
        let y = scale.y('pred')
        let j = Math.random() * scale.y.bandwidth()
        return y + j
      })
      .attr('fill', '#f58518')
      .attr('fill-opacity', 0.3)
  }

  _drawAxis (svg) {
    let scale = this.scale
    let xAxis = d3.axisBottom(scale.x).tickSize(-scale.height())

    // X Axis
    svg.append("g")
      .classed("x axis", true)
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
        .attr('transform', `translate(${scale.width()}, ${th})`)
        .style('text-anchor', 'end')
        .style('font-size', this.label_font_size)
        .text(this.x_axis_label)
    }
  }
}

export default RawPlot
