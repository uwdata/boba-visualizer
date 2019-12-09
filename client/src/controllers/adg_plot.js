import * as d3 from 'd3'
import _ from 'lodash'
import GraphScale from './vis/graph_scale'

/**
 * A plot for ADG.
 */
class ADGPlot {
  constructor () {
    this.outerWidth = 300
    this.outerHeight = 600
    this.margin = {
      top: 15,
      right: 15,
      bottom: 15,
      left: 15
    }
    this.background = '#fafafa'
    this.node_radius = 8

    // assigned when calling draw
    this.parent = ''
    this.nodes = []
    this.edges = []

    // components
    this.scale = null
  }

  draw (parent, data) {
    this.parent = parent
    this.nodes = data.nodes
    this.edges = data.edges

    let outerWidth = this.outerWidth
    let outerHeight = this.outerHeight
    let margin = this.margin

    let scale_params = {
      'outerWidth': this.outerWidth,
      'outerHeight': this.outerHeight,
      'margin': this.margin,
      'y_field': 'order',
      'node_radius': this.node_radius
    }
    let scale = new GraphScale(data.nodes, scale_params)
    this.scale = scale

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

    let objects = svg.append('svg')
      .classed('objects', true)
      .attr('width', scale.width())
      .attr('height', scale.height())

    // manually set each node's x position
    //fixme: only works if nodes have unique orders
    _.each(data.nodes, (d) => d._x = scale.width() * 0.3)

    // edges
    let node_map = {}
    _.each(data.nodes, (nd) => node_map[nd.id] = nd)

    let line = d3.line()
      .x((d) => node_map[d.node]._x)
      .y((d) => scale.y(node_map[d.node].order))
      .curve(d3.curveCatmullRom.alpha(0.5))

    // todo: should break into paths, each corresponding to a line
    // here I'm hard coding ...
    let path = _.map(data.nodes, (nd) => {
      return {node: nd.id}
    })

    objects.append('path')
      .datum(path)
      .classed('adg_edge', true)
      .attr('d', line)

    // nodes
    objects.selectAll('.adg_node')
      .data(data.nodes)
      .enter()
      .append('circle')
      .classed('adg_node', true)
      .attr('r', () => this.node_radius)
      .attr('cx', (d) => d._x)
      .attr('cy', (d) => scale.y(d.order))

    // node label
    objects.selectAll('.adg_node_label')
      .data(data.nodes)
      .enter()
      .append('text')
      .classed('adg_node_label', true)
      .text((d) => d.name)
      .attr('x', (d) => d._x + this.node_radius + 10)
      .attr('y', (d) => scale.y(d.order) + 5)
  }
}

export default ADGPlot
