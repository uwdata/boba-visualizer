import * as d3 from 'd3'
import * as dagre from 'dagre'
import _ from 'lodash'
import GraphScale from './vis/graph_scale'
import {bus, store} from './config'

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
    this.node_radius = 10
    this.node_stroke_width = 2
    this.font_size = 14

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
      .attr('width', Math.max(outerWidth, graph.graph().width))
      .attr('height', Math.max(outerHeight, graph.graph().height))

    // arrow
    svg.append('svg:defs').append('svg:marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)  // so it comes towards the center
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5')

    // edge
    _.each(graph._edgeLabels, (ed) => {
      let line = d3.line()
        .x((d) => d.x)
        .y((d) => d.y)
        .curve(d3.curveBasis)

      // force the edge to start and end from node center
      ed.points.unshift(_.pick(graph.node(ed.v), ['x', 'y']))
      if (ed.type !== 'procedural') {
        ed.points.push(_.pick(graph.node(ed.w), ['x', 'y']))
      }

      let path = objects.append('path')
        .datum(ed.points)
        .classed('adg_edge', true)
        .classed('edge_' + ed.type, true)
        .attr('d', line)

      if (ed.type === 'procedural') {
        path.attr('marker-end', () => "url(#arrow)")
      } else {
        path.attr('stroke-width', ed.stroke_width)
      }
    })

    // find the nodes that are not alone on a rank so we can place label closer
    let nodes = _.map(graph._nodes, (nd) => nd)
    nodes = _.sortBy(nodes, (nd) => nd.y)
    nodes = _.map(nodes, (nd, i) => {
      let s = i > 0 ? Math.abs(nodes[i - 1].y - nd.y) < 15 : false
      s = s || (i + 1 < nodes.length ? Math.abs(nodes[i + 1].y - nd.y) < 15 : false)
      return _.assign({single: !s}, nd)
    })

    // nodes
    objects.selectAll('.adg_node')
      .data(nodes)
      .enter()
      .append('circle')
      .classed('adg_node', true)
      .attr('r', (d) => d.radius - this.node_stroke_width)
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
      .attr('x', (d) => d.x + d.radius + (d.single ? 10 : 3))
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
      ranksep: this.node_radius  // number of pixels between each rank
    })

    // Default to assigning a new object as a label for each new edge.
    g.setDefaultEdgeLabel(() => {return {}})

    // Add nodes to the graph.
    _.each(this.nodes, (nd) => {
      let dec = store.getDecisionByName(nd.name)

      // node size encodes the number of options
      let scale = Math.sqrt(dec.options.length / 2)
      let r = Math.round(this.node_radius * scale)

      g.setNode(nd.id, {
        label: nd.name,
        options: dec.options,
        radius: r,
        width: r * 2,
        height: r * 2})
    })

    // Add edges to the graph
    let label_w = Math.max(..._.map(this.nodes, (nd) => nd.name.length))
      * this.font_size * 0.7
    _.each(this.edges, (ed) => {
      g.setEdge(ed.source, ed.target, {
        v: ed.source + '',
        w: ed.target + '',
        type: ed.type,
        width: label_w,
        labeloffset: 25})
    })

    // compute edge width
    _.each(g.sinks(), (nd) => {
      this._accumulateSize(nd, g)
    })
    _.each(g.nodes(), (nd) => {
      let size = Math.log2(g.node(nd).acc_count) * 2
      _.each(g.outEdges(nd), (ed) => {
        let params = g.edge(ed.v, ed.w)
        g.setEdge(ed.v, ed.w, _.assign({stroke_width: Math.round(size)}, params))
      })
    })

    // compute layout
    dagre.layout(g)

    return g
  }

  _nodeClick (d) {
    bus.$emit('adg-node-click', d.label)
  }

  /**
   * A recursive function to compute the accumulated number of options
   * @param node The current node id.
   * @param g The graph object.
   * @private
   */
  _accumulateSize (node, g) {
    let n = g.node(node)
    if (n.acc_count != null) {
      return
    }

    let preds = g.predecessors(node)
    if (!preds.length) {
      let size = n.options.length
      g.setNode(node, _.assign({'acc_count': size}, n))
      return
    }

    _.each(preds, (p) => {
      this._accumulateSize(p, g)
    })

    preds = _.map(preds, (p) => g.node(p).acc_count)
    let size = n.options.length * _.reduce(preds, (sum, n) => sum + n, 0)
    g.setNode(node, _.assign({'acc_count': size}, n))
  }
}

export default ADGPlot
