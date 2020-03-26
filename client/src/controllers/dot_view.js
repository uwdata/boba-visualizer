import * as d3 from 'd3'
import _ from 'lodash'
import {bus, store, util} from './config'
import {COLOR_TYPE, sign} from './constants'

class DotView {
  constructor (caller, params) {
    params = params || {}

    this.dot_radius = params.dot_radius || 4
    this.jitter = true
    this.color = '#5D9FCD'

    // pass by caller
    this.parent = caller

    // internal
    this._y_step = this.dot_radius
    this._total_dots = 0
  }

  draw () {
    let that = this
    let scale = this.parent.scale
    let uncertainty = this.parent.uncertainty
    let svg = this.parent.svg.select('.objects')

    this._drawDensityDots(svg)  // replace different chart types here
      .on('mouseover', dotMouseover)
      .on('mouseout', dotMouseout)
      .on('click', dotClick)

    // dot callbacks
    function dotMouseover(d) {
      // highlight dot
      d3.select(this).classed('hovered', true)

      // draw pdf
      let u = uncertainty[d.uid]
      if (u) {
        let density = util.kde_smart(u)

        // figure out the y-scale
        let xr = scale.x.range()
        let xd = scale.x.domain()
        let x_ratio = (xr[1] - xr[0]) / (xd[1] - xd[0])
        let y_ratio = that.dot_radius * 2 * that._y_step *
          that._total_dots / x_ratio
        let emax = d3.max(density, (d) => d[1])
        let ys = d3.scaleLinear().domain([0, emax])
          .range([scale.height(), scale.height() - emax * y_ratio])

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
      bus.$emit('agg-vis.dot-click', d.uid, that.parent.data)
    }

    this.drawEnvelope()
  }

  getRange () {
    let data = this.parent.data

    let i = _.findIndex(data, (d) => d.diff >= sign)
    this._computeDensityDots(i, data.length, true)
    this._computeDensityDots(i - 1, -1, false)

    let dm = this.parent.scale.x.range()
    this._total_dots = 0
    let maxy = 0
    _.each(data, (d) => {
      if (d._x >= dm[0] && d._x <= dm[1]) {
        this._total_dots += 1
        maxy = Math.max(maxy, d._y)
      }
    })
    return [0, maxy]
  }

  updateScale () {
    this._drawDensityDots(this.parent.svg.select('.objects'), true)
    this.drawEnvelope(true)
  }

  updateColor (color) {
    let svg = this.parent.svg
    svg.selectAll('.dot')
      .classed('colored', false)
      .attr('fill', this.color)

    if (color === COLOR_TYPE.SIGN) {
      svg.selectAll('.dot')
        .filter((d) => d.diff < sign)
        .classed('colored', true)
    } else if (color === COLOR_TYPE.P) {
      svg.selectAll('.dot')
        .filter((d) => d[store.configs.agg_plot.p_value_field] < 0.05)
        .classed('colored', true)
    } else if (color === COLOR_TYPE.FIT) {
      // we do not use the lightest colors in the scheme
      let colormap = d3.scaleSequential(d3.interpolateBlues)
        .domain([1.2, 0])
      let name = store.configs.agg_plot.fit_field
      svg.selectAll('.dot')
        .attr('fill', (d) => colormap(Math.min(d[name], 1.0)))
    }
  }

  clearClicked () {
    let svg = this.parent.svg
    svg.selectAll('.dot.clicked').classed('clicked', false)
  }

  colorClicked () {
    this.clearClicked()

    let uids = this.parent.clicked_uids
    let dict = _.zipObject(uids)
    this.parent.svg.selectAll('.dot')
      .filter(d => d.uid in dict)
      .classed('clicked', true)
      .raise()
  }

  clear () {
    let svg = this.parent.svg
    svg.selectAll('.dot').remove()
    svg.selectAll('.envelope').remove()
  }

  getYLabel () {
    return 'Count'
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
    let area = d3.area()
      .x((d) => scale.x(d.x1))
      .y0(scale.height())
      .y1((d) => scale.height() - d.length * this._y_step * ratio)

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
   */
  _drawDensityDots (parent, redraw = false) {
    let scale = this.parent.scale
    let data = this.parent.data
    let maxy = this.parent.y_range[1]

    // sort by model fit
    let fit = store.configs.agg_plot.fit_field
    if (fit) {
      data = _.reduce(_.groupBy(data, '_x'), (res, ds) => {
        ds = _.map(_.sortBy(ds, fit), (d, i) => {
          d._y = i
          return d
        })
        return res.concat(ds)
      }, [])
    }

    // compute y based on counts
    let step = Math.min(scale.height() / (maxy + 1), this.dot_radius * 2)
    this._y_step = step
    _.each(data, (d) => {
      d._y = scale.height() - d._y * step - step * 0.5
    })

    let opacity = Math.max(0.3, Math.min(1, step / this.dot_radius * 0.75))
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
