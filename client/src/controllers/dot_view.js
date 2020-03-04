import * as d3 from 'd3'
import _ from 'lodash'
import {bus, store, util} from './config'

const sign = 0

class DotView {
  constructor (caller, params) {
    params = params || {}

    this.dot_radius = params.dot_radius || 4
    this.jitter = true

    // pass by caller
    this.parent = caller

    // flag
    this.active = true
  }

  draw (svg) {
    let that = this.parent
    let scale = this.parent.scale
    let uncertainty = this.parent.uncertainty

    this._drawDensityDots(svg)  // replace different chart types here
      .on('mouseover', dotMouseover)
      .on('mouseout', dotMouseout)
      .on('click', dotClick)

    // dot callbacks
    function dotMouseover(d) {
      // highlight dot
      d3.select(this).classed('hovered', true)

      // draw pdf
      if (uncertainty[d.uid]) {
        let estimator = util.kde(util.epanechnikov(0.5), scale.x.ticks(40))
        let density = estimator(uncertainty[d.uid])
        let h = 300
        let ys = d3.scaleLinear().range([scale.height(), scale.height() - h])
          .domain([0, 1])
        let line = d3.line().curve(d3.curveBasis)
          .x((d) => scale.x(d[0]))
          .y((d) => ys(d[1]))
        svg.append('path')
          .attr('class', 'uncertainty-curve from-dot')
          .datum(density)
          .attr('d', line)
      }
    }

    function dotMouseout(d) {
      bus.$emit('agg-vis.dot-mouseout', {data: d})
      d3.select(this).classed('hovered', false)
      svg.selectAll('.uncertainty-curve.from-dot').remove()
    }

    function dotClick(d) {
      // figuring out the nearest points here
      let uids = store.getNearestUid(d.uid, that.data)
      that.clicked_uids = uids
      that._colorSelectedUids('.dot')
      bus.$emit('update-small-multiples', uids)
    }

    this.drawEnvelope()
  }

  updateScale () {
    this._drawDensityDots(this.parent.svg.select('.objects'), true)
    this.drawEnvelope(true)
  }

  updateColor (color) {
    let svg = this.parent.svg
    svg.selectAll('.dot')
      .classed('colored', false)

    if (color === 'Sign') {
      svg.selectAll('.dot')
        .filter((d) => d.diff < sign)
        .classed('colored', true)
    } else if (color === 'P-value') {
      svg.selectAll('.dot')
        .filter((d) => d[store.configs.agg_plot.p_value_field] < 0.05)
        .classed('colored', true)
    }
  }

  clearClicked () {
    if (this.active) {
      d3.selectAll('.dot.clicked').classed('clicked', false)
    }
  }

  switchView () {
    let svg = this.parent.svg

    if (this.active) {
      svg.selectAll('.dot').classed('hidden', false)
      this.parent._colorSelectedUids('.dot')
    } else {
      svg.selectAll('.dot').classed('hidden', true)
    }
  }

  /**
   * To display uncertainty, aggregate all possible outcomes from bootstrapping
   */
  drawEnvelope (redraw = false) {
    let svg = this.parent.svg
    let uncertainty = this.parent.uncertainty

    let dp = _.flatten(_.map(uncertainty, (arr) => arr))
    if (!dp.length) {
      return
    }

    let ratio = this.parent.data.length / dp.length
    let scale = this.parent.scale

    let dm = scale.x.domain()
    let step = (dm[1] - dm[0]) / (scale.width() / this.dot_radius / 2)
    let bins = _.range(dm[0], dm[1], step)
    let hist = d3.histogram().domain(scale.x.domain())
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

  /**
   * Density dot algorithm, assuming data is sorted.
   * @param start
   * @param end
   * @param forward Whether start should be smaller than end.
   * @private
   */
  _computeDensityDots (start, end, forward) {
    let scale = this.parent.scale
    let data = this.parent.data
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
    let scale = this.parent.scale
    let data = this.parent.data

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
    let scale = this.parent.scale
    let data = this.parent.data

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
    let scale = this.parent.scale
    let data = this.parent.data

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

export default DotView
