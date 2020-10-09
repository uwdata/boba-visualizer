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
    this.color_func = this.colorP

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

  colorP (num) {
    return num < 0.05 ? '#333' : '#fff'
  }

  prepareMatrix () {
    let decs = store.decisions
    let middle = Math.ceil(_.size(decs) / 2)
    let i = 0
    let step = 1
    let role = 'x'

    _.each(decs, (options, dec) => {
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
        this.matrix[key] = {'axis': role, 'index': idx, 'layer': i}
      })

      // increment
      i += 1
      step *= options.length
    })

    this.total_y = step
    this.levels_y = i
  }

  draw (parent, data, column) {
    this.parent = parent
    this.data = data
    this.column = column

    // compute matrix layout
    this.prepareMatrix()
    console.log(data[0], store.universes[0])
    console.log(this.matrix, this.levels_x, this.levels_y)

    // compute width and height
    let w = this.total_x * this.cell_width
    let h = this.total_y * this.cell_height
    let label_h = (this.levels_x * 2 - 1) * this.cell_height
    let label_w = (this.levels_y * 2 - 1) * this.cell_width

    // prepare the canvas
    let raw = d3.select(parent)
      .append('svg')
      .attr('width', w + label_h + this.margin.left + this.margin.right)
      .attr('height', h + label_w + this.margin.top + this.margin.bottom)
    this.svg = raw.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`)

    // upper label
    let upper = this.svg.append('g')
      .classed('upper', true)
      .attr('width', w)
      .attr('height', label_h)

    // cells
    let cells = this.svg.append('g')
      .attr('transform', `translate(0,${label_h})`)
      .append('svg')
      .classed('lower', true)
      .attr('width', w)
      .attr('height', h)
    this.drawCells(cells)
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
