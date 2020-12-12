import * as d3 from 'd3'
import _ from 'lodash'
import {store} from '../controllers/config'
import {SCHEMA} from '../controllers/constants'

class ParallelLinePlot {
  constructor () {
    this.outerWidth = 450
    this.outerHeight = 400
    this.margin = {
      top: 15,
      right: 15,
      bottom: 60,
      left: 70
    }

    this.y_label = 'p-value'
    this.y_levels = ['p < 0.05', 'p >= 0.05']
    this.x_label = ''

    // internal
    this.dec = ''
    this.x_levels = []
  }

  wrangle (data) {
    this.x_levels = store.getDecisionByName(this.dec).options
    let stride = this.x_levels.length

    // we need to find all universe groups that differ only by the decision
    // first, combine decisions and outcomes
    data = _.map(data, (d) => {
      let uni = store.getUniverseById(d.uid)
      let y = d[SCHEMA.P] < 0.05 ? this.y_levels[0] : this.y_levels[1]
      return _.defaults({'y': y}, uni)
    })

    // sort by all other decisions
    let decs = _.keys(store.decisions)
    _.remove(decs, (d) => d === this.dec)
    data = _.sortBy(data, decs)

    // create a map to make the x order consistent
    let lookup = _.zipObject(this.x_levels, _.range(stride))

    // combine into lines
    let res = []
    for (let i = 0; i < data.length; i += stride) {
      // sort the group
      let line = []
      for (let j = 0; j < stride; j++) {
        let datum = data[i + j]
        line[lookup[datum[this.dec]]] = datum
      }

      // fixme: here we throw away any incomplete line
      let complete = true
      line = _.map(line, (d) => {
        if (!d) {
          complete = false
          return {}
        }
        return {y: d.y, x: d[this.dec]}
      })
      if (complete) {
        res.push(line)
      }
    }

    return res
  }

  draw (parent, data, dec) {
    this.dec = dec
    data = this.wrangle(data)

    // prepare the canvas
    let height = this.outerHeight - this.margin.top - this.margin.bottom
    let width = this.outerWidth - this.margin.left - this.margin.right
    let raw = d3.select(parent)
      .append('svg')
      .attr('width', this.outerWidth)
      .attr('height', this.outerHeight)
    let svg = raw.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`)

    // scale
    let xs = d3.scaleBand()
      .domain(this.x_levels)
      .range([0, width])
    let ys = d3.scaleBand()
      .domain(this.y_levels)
      .range([height, 0])

    // draw the lines
    let jitter = ys.step() * 0.2
    let line = d3.line()
      .x((d) => xs(d.x) + xs.step() * 0.5)
      .y((d) => ys(d.y) + ys.step() * 0.5 + _.random(0, jitter) - jitter * 0.5)
    svg.selectAll('.para-line')
      .data(data).enter()
      .append('path')
      .attr('d', (d) => line(d))
      .attr('fill', 'none')
      .attr('stroke', '#000')
      .attr('stroke-opacity', 0.2)

    // axis
    svg.append('g')
      .attr('transform', 'translate(0,' + height + ')')
      .call(d3.axisBottom(xs))
    svg.append('g')
      .call(d3.axisLeft(ys))

    // axis label
    svg.append('text')
      .attr('y', height + 38)
      .attr('x', width / 2)
      .style('text-anchor', 'middle')
      .text(this.x_label || this.dec)

    // prepare the annotation data
    data = _.flatten(data)
    let count = []
    _.each(this.x_levels, (x, i) => {
      _.each(this.y_levels, (y) => {
        let n = _.filter(data, (d) => d.x === x && d.y === y).length
        let left = i < 1
        count.push({x: x, y: y, n: n, align_left: left})
      })
    })
    console.log(count)

    // draw annotations
    svg.selectAll('.para-text')
      .data(count).enter()
      .append('text')
      .attr('x', (d) => {
        let padding = d.align_left ? -10 : 10
        return xs(d.x) + xs.step() * 0.5 + padding
      })
      .attr('y', (d) => ys(d.y) + ys.step() * 0.5)
      .attr('font-size', 9)
      .attr('text-anchor', (d) => d.align_left ? 'end' : 'start')
      .text((d) => `N=${d.n}`)
  }
}

export default ParallelLinePlot
