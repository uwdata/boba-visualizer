import * as d3 from 'd3'
import _ from 'lodash'
import DotPlotScale from './vis/dot_plot_scale'
import BrushX from './vis/brushX'
import {bus, store, util} from './config'

const sign = 0

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
    this.jitter = true
    this.title = 'Overview Distribution'
    this.x_axis_label = 'Predicted Difference'
    this.y_axis_label = 'Count'
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

    // intermediate objects
    this.x_axis = null
    this.svg = null

    // to be persistent through view change
    this.color_by = null
    this.uncertainty_vis = null
    this.clicked_uids = []
  }

  draw (parent, data, uncertainty) {
    this.parent = parent
    this.data = data
    this.uncertainty = uncertainty

    let outerWidth = this.outerWidth
    let outerHeight = this.outerHeight
    let margin = this.margin
    let that = this

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

    let objects = this.svg.append('svg')
      .classed('objects', true)
      .attr('width', scale.width())
      .attr('height', scale.height())

    // dots
    this._drawDensityDots(objects)  // replace different chart types here
      .on('mouseover', dotMouseover)
      .on('mouseout', dotMouseout)
      .on('click', dotClick)
    this.updateColor(this.color_by)

    // uncertainty visualization
    this._drawUncertainty()

    // dot callbacks
    function dotMouseover(d) {
      bus.$emit('agg-vis.dot-mouseover',
        {data: d, x: d3.event.clientX, y: d3.event.clientY})
    }

    function dotMouseout(d) {
      bus.$emit('agg-vis.dot-mouseout', {data: d})
    }

    function dotClick(d) {
      // figuring out the nearest points here
      let uids = store.getNearestUid(d.uid, that.data)
      that.clicked_uids = uids
      that._colorSelectedUids('.dot')
      bus.$emit('agg-vis.dot-click', uids)
    }
  }

  updateScale () {
    let scale = this.scale
    scale.x.domain(store.x_range)

    this._drawXAxis(true)
    this._drawDensityDots(this.svg, true)
    this._drawUncertainty(true)
    this.brush.clear()
  }

  updateColor (color) {
    this.color_by = color
    this.svg.selectAll('.dot')
      .classed('colored', false)

    if (color === 'Sign') {
      this.svg.selectAll('.dot')
        .filter((d) => d.diff < sign)
        .classed('colored', true)
    } else if (color === 'P-value') {
      this.svg.selectAll('.dot')
        .filter((d) => d[store.configs.agg_plot.p_value_field] < 0.05)
        .classed('colored', true)
    }
  }

  updateUncertainty (u) {
    this.uncertainty_vis = u
    this._drawUncertainty(false, true)
  }

  clearClicked () {
    d3.selectAll('.dot.clicked').classed('clicked', false)
    d3.selectAll('.uncertainty-curve.clicked').classed('clicked', false)
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
        svg.append('text')
          .classed('axis-label muted', true)
          .attr('transform', 'rotate(-90)')
          .attr('x', 0 - (scale.height() / 2))
          .attr('y', -3)
          .style('text-anchor', 'middle')
          .style('font-size', this.label_font_size)
          .text(this.y_axis_label)
      }
    }
  }

  /**
   * Display uncertainty according to vis type
   */
  _drawUncertainty (redraw = false, view_change = false) {
    let uncertainty = this.uncertainty
    let svg = this.svg.select('.objects')

    if (view_change) {
      svg.selectAll('.uncertainty-curve').remove()
      svg.selectAll('.envelope').remove()
    }
    switch (this.uncertainty_vis) {
      case 'PDFs':
        this._drawCurves(svg, uncertainty, 0, redraw)
        this._switchView(1)
        break
      case 'CDFs':
        this._drawCurves(svg, uncertainty, 1, redraw)
        this._switchView(1)
        break
      case 'P-Box':
        this._drawPBox(svg, uncertainty, redraw)
        this._switchView(0)
        break
      case 'Aggregated':
        this._drawEnvelope(svg, uncertainty, redraw)
        this._switchView(0)
        break
    }
  }

  /**
   * Show uncertainty as a p-box
   */
  _drawPBox (svg, uncertainty, redraw = false) {
    if (!_.keys(uncertainty).length) {
      return
    }

    // todo: y-axis label
    let scale = this.scale
    let kernel_bw= 0.5
    let X = scale.x.ticks(40)
    let bounds = _.map(X, (x) => [x, 1, 0])
    _.each(uncertainty, (arr) => {
      let estimator = util.kde(util.epanechnikov(kernel_bw), X)
      let density = estimator(arr)
      density = util.toCdf(density)
      _.each(density, (d, i) => {
        bounds[i][1] = Math.min(bounds[i][1], d[1])
        bounds[i][2] = Math.max(bounds[i][2], d[1])
      })
    })

    // scale
    let h = Math.min(scale.height(), 100)
    let ys = d3.scaleLinear().range([scale.height(), scale.height() - h])
      .domain([0, 1])

    let area = d3.area()
      .x((d) => scale.x(d[0]))
      .y0((d) => ys(d[2]))
      .y1((d) => ys(d[1]))

    // plot the areas
    if (redraw) {
      svg.select('.envelope')
        .datum(bounds)
        .attr('d', area)
    } else {
      let el = svg.append('path')
        .attr('class', 'envelope')
        .datum(bounds)
        .attr('d', area)
      util.moveToBack(el)
    }
  }

  /**
   * To display uncertainty, overlay PDFs or CDFs from individual universes
   * Prototype 0: PDF curves, 1: CDF curves
   */
  _drawCurves (svg, uncertainty, prototype, redraw) {
    if (!_.keys(uncertainty).length) {
      return
    }

    if (redraw) {
      svg.selectAll('.uncertainty-curve').remove()
    }

    let scale = this.scale
    let kernel_bw= 0.5

    _.each(uncertainty, (arr, idx) => {
      let estimator = util.kde(util.epanechnikov(kernel_bw), scale.x.ticks(40))
      let density = estimator(arr)
      if (prototype === 1) {
        density = util.toCdf(density)
      }
      density.uid = Number(idx)

      // scale
      let h = prototype === 1 ? 100 : 300
      let ys = d3.scaleLinear().range([scale.height(), scale.height() - h])
        .domain([0, 1])

      // line
      let line = d3.line().curve(d3.curveBasis)
        .x((d) => scale.x(d[0]))
        .y((d) => ys(d[1]))

      // plot the curve
      svg.append('path')
        .attr('class', 'uncertainty-curve')
        .datum(density)
        .attr('d', line)
        .on('mouseover', curveMouseover)
        .on('mouseout', curveMouseout)
        .on('click', curveClick)
    })

    let that = this
    function curveMouseover () {
      d3.select(this).classed('hovered', true)
    }
    function curveMouseout() {
      d3.select(this).classed('hovered', false)
    }
    function curveClick(d) {
      // figuring out the nearest points here
      let uids = store.getNearestUid(d.uid, that.data)
      that.clicked_uids = uids
      that._colorSelectedUids('.uncertainty-curve')
      bus.$emit('agg-vis.dot-click', uids)
    }
  }

  /**
   * To display uncertainty, aggregate all possible outcomes from bootstrapping
   */
  _drawEnvelope (svg, uncertainty, redraw = false) {
    let dp = _.flatten(_.map(uncertainty, (arr) => arr))
    if (!dp.length) {
      return
    }

    let ratio = this.data.length / dp.length
    let scale = this.scale

    let dm = scale.x.domain()
    let step = (dm[1] - dm[0]) / (scale.width() / this.dot_radius / 2)
    let bins = _.range(dm[0], dm[1], step)
    let hist = d3.histogram().domain(this.scale.x.domain())
      .thresholds(bins)(dp)

    // area
    // fixme: height of a dot is not necessarily dot_radius
    let area = d3.area()
      .x((d) => scale.x(d.x1))
      .y0(scale.height())
      .y1((d) => scale.height() - d.length * this.dot_radius * 2 * ratio)

    // plot the upper curve
    if (!redraw) {
      let e = svg.append('path')
        .attr('class', 'envelope')
        .datum(hist)
        .attr('d', area)
      util.moveToBack(e)
    } else {
      svg.select('.envelope')
        .datum(hist)
        .transition().duration(1000)
        .attr('d', area)
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
      let xi = scale.x(data[i].diff)
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

  /**
   * Draw density dot plots (from Allison & Cicchetti, 1976) without smoothing
   * Opacity will be adjusted based on the amount of overlap
   * @param parent
   * @param redraw
   * @returns {*}
   * @private
   */
  _drawDensityDots (parent, redraw = false) {
    let scale = this.scale
    let data = this.data

    let i = _.findIndex(data, (d) => d.diff >= sign)
    this._computeDensityDots(i, data.length, true)
    this._computeDensityDots(i - 1, -1, false)

    // compute y based on counts
    let dm = scale.x.range()
    let maxy = d3.max(data, (d) => d._x >= dm[0] && d._x <= dm[1] ? d._y : 0)
    let step = Math.min(scale.height() / (maxy + 1), this.dot_radius * 2)
    _.each(data, (d) => {
      d._y = scale.height() - d._y * step - step * 0.5
    })

    let opacity = Math.max(0.3, Math.min(0.85, step / this.dot_radius * 0.5))
    let dots = parent.selectAll('.dot')
    if (!redraw) {
      return dots.data(data)
        .enter()
        .append('circle')
        .classed('dot', true)
        .attr('r', () => this.dot_radius)
        .attr('cx', (d) => d._x)
        .attr('cy', (d) => d._y)
        .attr('fill-opacity', opacity)
    } else {
      dots.transition()
        .duration(1000)
        .attr('cx', (d) => d._x)
        .attr('cy', (d) => d._y)
        .attr('fill-opacity', opacity)
    }
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


  /**
   * A helper function to color dots/curves in small multiples
   * @param selector
   * @private
   */
  _colorSelectedUids (selector) {
    let uids = this.clicked_uids
    this.clearClicked()

    let dict = _.zipObject(uids)
    d3.selectAll(selector)
      .filter(d => d.uid in dict)
      .classed('clicked', true)
      .raise()
  }

  /**
   * A helper function to properly switch between dot / curve view
   * @param view_id  0: dot, 1: curve
   * @private
   */
  _switchView (view_id) {
    let svg = this.svg
    if (view_id === 0) {
      // switching to a dot plot view
      svg.selectAll('.dot').classed('hidden', false)
      this._colorSelectedUids('.dot')
    } else {
      // switching to a curve view
      svg.selectAll('.dot').classed('hidden', true)
      this._colorSelectedUids('.uncertainty-curve')
    }
  }
}

export default StackedDotPlot
