import * as d3 from 'd3'
import _ from 'lodash'
import {store} from '../controllers/config'

class GridPlot {
  constructor () {
    this.margin = {
      top: 2,
      right: 30,
      bottom: 20,
      left: 250
    }
    this.cell_width = 36
    this.cell_height = 24
    this.text_height = 15
    this.text_width = 26
    this.color_func = GridPlot.colorP

    // assigned in calling draw
    this.parent = ''
    this.data = []
    this.column = ''

    // intermediate
    this.matrix = {}
    this.total_x = 0
    this.total_y = 0
    this.levels_x = 0
    this.levels_y = 0

    // components
    this.svg = null
  }

  static colorP (num) {
    return num < 0.05 ? '#333' : '#fff'
  }

  prepareMatrix () {
    let decs = store.decisions
    let middle = Math.ceil(_.size(decs) / 2)
    let i = 0
    let step = 1
    let role = 'x'

    // optimize the layout a bit
    // first sort by the number of options
    let sorted = _.map(decs, (opts, dec) => {
      return {'decision': dec, 'length': opts.length}
    })
    sorted = _.sortBy(sorted, 'length')

    // now interleave
    let order = []
    for (let k = 0; k < sorted.length; k++) {
      if (k % 2 === 0) {
        order[k / 2] = sorted[k]
      } else {
        order[middle + (k - 1) / 2] = sorted[k]
      }
    }
    order = _.map(order, 'decision')

    // assign decisions to x- and y-axis
    _.each(order, (dec) => {
      let options = decs[dec]

      // the first N/2 decisions will belong to the x-axis
      if (role === 'x' && i >= middle) {
        this.total_x = step
        this.levels_x = i
        role = 'y'
        step = 1
        i = 0
      }

      _.each(options, (opt, j) => {
        let key = dec + ':' + opt
        let idx = j * step
        this.matrix[key] = {'axis': role, 'index': idx, 'layer': i,
          'step': step}
      })

      // increment
      i += 1
      step *= options.length
    })

    this.total_y = step
    this.levels_y = i
  }


  wrangleMatrix (axis) {
    // ok we need to wrangle the matrix data structure a bit
    // first extract the decision and option
    let matrix = _.map(this.matrix, (m, key) => {
      let i = key.search(':')
      m['decision'] = key.substring(0, i)
      m['option'] = key.substring(i + 1)
      return m
    })
    matrix = _.filter(matrix, (m) => m['axis'] === axis)

    // then group by level
    matrix = _.groupBy(matrix, 'layer')
    matrix = _.toArray(matrix)

    // create a shorthand for compact labeling
    matrix = _.map(matrix, (arr) => {
      return _.map(arr, (meta, i) => {
        meta['label'] = _.toUpper(meta['decision']).substring(0, 3) + (i + 1)
        return meta
      })
    })

    // now duplicate the labels
    let res = []
    _.each(matrix, (arr) => {
      let step = arr[0].step
      let stride = step * arr.length
      for(let j = 0; j < this.total_x / stride; j+=1) {
        res.push(_.map(arr, (m) => {
          return {'label': m.label, 'index': m.index + j * stride,
            'step': m.step, 'layer': m.layer, 'repeat': j}
        }))
      }
    })

    return _.flatten(res)
  }

  wrangleConnector (matrix) {
    // create the data structure for the connector lines
    let lines = []

    _.each(_.groupBy(matrix, 'layer'), (arr) => {
      let layer = arr[0].layer
      let step = arr[0].step

      arr = _.groupBy(arr, 'repeat')
      arr = _.sortBy(arr, 'repeat')

      _.each(arr, (group) => {
        group = _.map(group, (g) => g.index)
        lines.push({'layer': layer, 'i0': _.min(group), 'i1': _.max(group),
          'step': step})
      })
    })

    return lines
  }

  draw (parent, data, column) {
    this.parent = parent
    this.data = data
    this.column = column

    // compute matrix layout
    this.prepareMatrix()

    // compute width and height
    let w = this.total_x * this.cell_width
    let h = this.total_y * this.cell_height
    let label_h = this.levels_x * (this.cell_height + this.text_height)
    let label_w = this.levels_y * (this.cell_width + this.text_width)

    // prepare the canvas
    let raw = d3.select(parent)
      .append('svg')
      .attr('width', w + label_w + this.margin.left + this.margin.right)
      .attr('height', h + label_h + this.margin.top + this.margin.bottom)
    this.svg = raw.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`)

    // upper label
    let upper = this.svg.append('g')
      .classed('upper', true)
      .attr('width', w)
      .attr('height', label_h)
    this.drawLabelTop(upper, label_h)

    // right label
    let right = this.svg.append('g')
      .attr('transform', `translate(${w},${label_h})`)
      .classed('right-panel', true)
      .attr('width', label_w)
      .attr('height', h)
    this.drawLabelRight(right)

    // cells
    let cells = this.svg.append('g')
      .attr('transform', `translate(0,${label_h})`)
      .append('svg')
      .classed('lower', true)
      .attr('width', w)
      .attr('height', h)
    this.drawCells(cells)
  }

  drawLabelRight (svg) {
    let matrix = this.wrangleMatrix('y')

    // draw the text label
    svg
      .selectAll('.grid-label.right')
      .data(matrix)
      .enter()
      .append('text')
      .classed('grid-label', true)
      .classed('right', true)
      .attr('x', (d) => d.layer * (2 * this.text_width) + 3)
      .attr('y', (d) => (d.index + d.step / 2) * this.cell_height + 3)
      .attr('dominant-baseline', 'hanging')
      .text((d) => d.label)

    // draw the horizontal lines
    svg
      .selectAll('.grid-guide.right-h')
      .data(matrix)
      .enter()
      .append('line')
      .classed('grid-guide', true)
      .classed('right-h', true)
      .attr('x1', (d) => Math.max(d.layer - 0.25, 0) * (2 * this.text_width))
      .attr('x2', (d) => (d.layer + 0.75) * (2 * this.text_width))
      .attr('y1', (d) => (d.index + d.step / 2) * this.cell_height)
      .attr('y2', (d) => (d.index + d.step / 2) * this.cell_height)

    // connect the lines
    let lines = this.wrangleConnector(matrix)

    svg
      .selectAll('.grid-guide.right-v')
      .data(lines)
      .enter()
      .append('line')
      .classed('grid-guide', true)
      .classed('right-v', true)
      .attr('x1', (d) => (d.layer + 0.75) * (2 * this.text_width))
      .attr('x2', (d) => (d.layer + 0.75) * (2 * this.text_width))
      .attr('y1', (d) => (d.i0 + d.step / 2) * this.cell_height)
      .attr('y2', (d) => (d.i1 + d.step / 2) * this.cell_height)
  }

  drawLabelTop (svg, label_h) {
    let matrix = this.wrangleMatrix('x')

    // draw the text label
    svg
      .selectAll('.grid-label.top')
      .data(matrix)
      .enter()
      .append('text')
      .classed('grid-label', true)
      .classed('top', true)
      .attr('x', (d) => (d.index + d.step / 2) * this.cell_width)
      .attr('y', (d) => label_h - (d.layer + 0.5) * (2* this.text_height) - 3)
      .attr('text-anchor', 'middle')
      .text((d) => d.label)

    // draw the vertical lines
    svg
      .selectAll('.grid-guide.top-v')
      .data(matrix)
      .enter()
      .append('line')
      .classed('grid-guide', true)
      .classed('top-v', true)
      .attr('x1', (d) => (d.index + d.step / 2) * this.cell_width)
      .attr('x2', (d) => (d.index + d.step / 2) * this.cell_width)
      .attr('y1', (d) => label_h - (d.layer + 0.5) * (2* this.text_height))
      .attr('y2', (d) => label_h - d.layer * (2* this.text_height)
        + Math.min(1, d.layer) * this.text_height)

    // connect the vertical lines
    let lines = this.wrangleConnector(matrix)

    svg
      .selectAll('.grid-guide.top-h')
      .data(lines)
      .enter()
      .append('line')
      .classed('grid-guide', true)
      .classed('top-h', true)
      .attr('x1', (d) => (d.i0 + d.step / 2) * this.cell_width)
      .attr('x2', (d) => (d.i1 + d.step / 2) * this.cell_width)
      .attr('y1', (d) => label_h - (d.layer + 0.5) * (2* this.text_height))
      .attr('y2', (d) => label_h - (d.layer + 0.5) * (2* this.text_height))
  }

  drawCells (svg) {
    let data = this.data

    // compute the layout
    data = _.map(data, (datum) => {
      let uni = store.getUniverseById(datum.uid)

      let ix = 0
      let iy = 0
      _.each(uni, (opt, dec) => {
        let key = dec + ':' + opt
        let meta = this.matrix[key] || {}

        ix += meta['axis'] === 'x' ? meta['index'] : 0
        iy += meta['axis'] === 'y' ? meta['index'] : 0
      })

      datum['ix'] = ix
      datum['iy'] = iy

      return datum
    })

    // first prepare a container per cell
    let container = svg
      .selectAll('.cell-container')
      .data(data)
      .enter()
      .append('svg')
      .classed('cell-container', true)
      .attr('x', (d) => d.ix * this.cell_width)
      .attr('y', (d) => d.iy * this.cell_height)
      .attr('width', this.cell_width)
      .attr('height', this.cell_height)

    // draw the boxes
    container
      .append('rect')
      .classed('cell', true)
      .attr('width', this.cell_width)
      .attr('height', this.cell_height)
      .attr('fill', (d) => this.color_func(d[this.column]))

    // draw the number inside the box
    container
      .append('text')
      .classed('cell-text', true)
      .text((d) => Number(d[this.column]).toFixed(2))
      .attr('x', '50%')
      .attr('y', '50%')
      .attr('alignment-baseline', 'middle')
      .attr('text-anchor', 'middle')
  }
}

export default GridPlot
