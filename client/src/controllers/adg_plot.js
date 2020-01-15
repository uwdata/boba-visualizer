import * as d3 from 'd3'
import * as dagre from 'dagre'
import _ from 'lodash'
import GraphScale from './vis/graph_scale'
import {bus} from './config'

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
    this.node_stroke_width = 2

    // assigned when calling draw
    this.parent = ''
    this.nodes = []
    this.edges = []

    // components
    this.scale = null
    this.svg = null
    this.zoom = null
    this.graph = null
  }

  draw (parent, data) {
    this.parent = parent
    this.nodes = data.nodes
    this.edges = data.edges

    this.graph = this._layoutGraph()
    this._renderGraph()
  }

  /**
   * Render the graph after the layout is computed.
   * @private
   */
  _renderGraph () {
    let outerWidth = this.outerWidth
    let outerHeight = this.outerHeight
    let graph = this.graph

    let svg = d3.select(this.parent)
      .append('svg')
      .attr('width', outerWidth)
      .attr('height', outerHeight)
    this.svg = svg
    let inner = svg.append('g')

    // set up zoom support
    let zoom = d3.zoom().on('zoom', () => {
      inner.attr('transform', d3.event.transform)
    })
    svg.call(zoom)
    this.zoom = zoom

    let objects = inner.append('svg')
      .classed('objects', true)
      .attr('width', outerWidth)
      .attr('height', outerHeight)

    // edge
    _.each(graph._edgeLabels, (ed) => {
      let line = d3.line()
        .x((d) => d.x)
        .y((d) => d.y)
        .curve(d3.curveCatmullRom.alpha(0.5))

      objects.append('path')
        .datum(ed.points)
        .classed('adg_edge', true)
        .attr('d', line)
    })

    // nodes
    let nodes = _.map(graph._nodes, (nd) => nd)
    objects.selectAll('.adg_node')
      .data(nodes)
      .enter()
      .append('circle')
      .classed('adg_node', true)
      .attr('r', () => this.node_radius - this.node_stroke_width)
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .on('click', this._nodeClick)

    // node label
    objects.selectAll('.adg_node_label')
      .data(nodes)
      .enter()
      .append('text')
      .classed('adg_node_label', true)
      .text((d) => d.label)
      .attr('x', (d) => d.x + this.node_radius + 10)
      .attr('y', (d) => d.y + 5)
      .on('click', this._nodeClick)

    // center the graph
    this._fitGraph()
  }

  /**
   * Center and scale the graph such that it fits the view.
   * @private
   */
  _fitGraph () {
    let graph = this.graph.graph()
    let margin = this.margin
    let w = this.outerWidth - margin.left - margin.right
    let h = this.outerHeight - margin.top - margin.bottom

    // compute scaling
    let initial_scale = Math.min(h / graph.height, w / graph.width, 1)
    let left = (w - graph.width * initial_scale) / 2 + margin.left
    let top = (h - graph.height * initial_scale) / 2 + margin.top
    let zooming = d3.zoomIdentity.translate(left, top)
      .scale(initial_scale)
    this.svg.call(this.zoom.transform, zooming)
  }

  /**
   * Use a layout algorithm to compute the coordinates of nodes and edges.
   * @returns {dagre.graphlib.Graph}
   * @private
   */
  _layoutGraph () {
    // Create a new directed graph
    let g = new dagre.graphlib.Graph()

    // Set an object for the graph label
    g.setGraph({
      nodesep: 10, // number of pixels that separate nodes horizontally
      ranksep: this.node_radius * 4  // number of pixels between each rank
    })

    // Default to assigning a new object as a label for each new edge.
    g.setDefaultEdgeLabel(() => {return {}})

    // Add nodes to the graph.
    _.each(this.nodes, (nd) => {
      g.setNode(nd.id, {label: nd.name, width: this.node_radius * 2,
        height: this.node_radius * 2})
    })

    // Add edges to the graph
    _.each(this.edges, (ed) => {
      g.setEdge(ed.source, ed.target)
    })

    // compute layout
    dagre.layout(g)

    return g
  }

  _nodeClick (d) {
    bus.$emit('adg-node-click', d.label)
  }
}

export default ADGPlot
