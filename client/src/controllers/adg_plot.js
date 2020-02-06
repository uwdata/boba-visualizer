import * as d3 from 'd3'
import * as dagre from 'dagre'
import _ from 'lodash'
import {bus, store, util} from './config'

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
    this.font_family = 'system-ui'

    // drawing individual options
    this.show_options = 1 // 0 - simple, 1 - annotated options, 2 - options inside nodes
    this.max_options = 3
    this.option_font_size = 9
    this.max_node_width = 100
    this.annotation_width = 100

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
      .attr('width', Math.max(outerWidth, graph.graph().width + 5))
      .attr('height', Math.max(outerHeight, graph.graph().height + 5))

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
    nodes = _.sortBy(nodes, ['y', 'x'])
    nodes = _.map(nodes, (nd, i) => {
      let leftmost = i > 0 ? Math.abs(nodes[i - 1].y - nd.y) > 15 : true
      let rightmost = i + 1 < nodes.length ? Math.abs(nodes[i + 1].y - nd.y) > 15 : true
      return _.assign({leftmost: leftmost, rightmost: rightmost}, nd)
    })

    if (this.show_options < 2) {
      // color scale
      let colormap = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(this.nodes, (nd) => nd.sensitivity) * 1.2])

      // nodes
      objects.selectAll('.adg_node')
        .data(nodes)
        .enter()
        .append('circle')
        .classed('adg_node', true)
        .attr('r', (d) => d.radius - this.node_stroke_width)
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y)
        .attr('fill', (d) => colormap(d.sensitivity))
        // .attr('fill', "#fff")
        .on('click', this._nodeClick)
        .on('mouseover', this._nodeHover.bind(this, true))
        .on('mouseout', this._nodeHover.bind(this, false))

      // node label
      objects.selectAll('.adg_node_label')
        .data(nodes)
        .enter()
        .append('text')
        .classed('adg_node_label', true)
        .text((d) => d.label)
        .attr('x', (d) => d.x + d.radius + (d.rightmost && d.leftmost ? 10 : 3))
        .attr('y', (d) => d.y + 5)
        .on('click', this._nodeClick)
        .on('mouseover', this._nodeHover.bind(this, true))
        .on('mouseout', this._nodeHover.bind(this, false))
    }

    if (this.show_options === 1) {
      let w_edge = 10
      let r_node = 2
      let padding = 3
      let w_text = this.annotation_width - w_edge - r_node * 2 - padding

      // draw options beside each node
      _.each(nodes, (nd) => {
        // skip nodes that do not have space on the left ...
        // fixme
        if (!nd.leftmost) {
          return
        }

        let total = Math.min(this.max_options + 1, nd.options.length)
        let x_start = nd.x - nd.radius
        let y_start = nd.y - (total - 1) * this.option_font_size / 2
        let max_char = Math.floor(w_text / (this.option_font_size * 0.6))

        _.each(nd.options, (opt, idx) => {
          if (idx < total) {
            let xx = x_start
            let yy = y_start + idx * this.option_font_size
            let dummy = nd.options.length > this.max_options && idx === this.max_options

            // draw things from right to left
            // first is the edge
            objects.append('path')
              .classed('adg_edge', true)
              .classed('edge_option', true)
              .attr('d', `M${xx} ${nd.y} L ${xx - w_edge} ${yy}`)

            // then, draw the symbol
            if (!dummy) {
              xx -= w_edge + r_node
              objects.append('circle')
                .classed('adg_option', true)
                .attr('cx', xx)
                .attr('cy', yy)
                .attr('r', r_node)
            }

            // last, draw the option label
            if (dummy) {
              opt = `... ${nd.options.length - this.max_options} more  `
            }
            opt = opt.length > max_char ? opt.substring(0, max_char - 3) + '...' : opt
            let tw = util.getTextWidth(opt, `${this.option_font_size}px ${this.font_family}`)
            xx -= padding + tw
            objects.append('text')
              .text(opt)
              .classed('adg_option_label', true)
              .attr('x', xx)
              .attr('y', yy + 3)
          }
        })
      })
    }

    if (this.show_options === 2) {
      // nodes
      objects.selectAll('.adg_node')
        .data(nodes)
        .enter()
        .append('rect')
        .classed('adg_node', true)
        .attr('x', (d) => d.x - d.width / 2 + 1)
        .attr('y', (d) => d.y - d.height / 2 + 1)
        .attr('width', (d) => d.width)
        .attr('height', (d) => d.height)
        .attr('rx', () => this.font_size)
        .on('click', this._nodeClick)

      // title
      objects.selectAll('.adg_node_label')
        .data(nodes)
        .enter()
        .append('text')
        .classed('adg_node_label', true)
        .text((d) => d.label)
        .attr('x', (d) => d.x - d.width / 2 + (d.width -
          util.getTextWidth(d.label, `${this.font_size}px ${this.font_family}`)) / 2)
        .attr('y', (d) => d.y - d.height / 2 + this.font_size + 5)

      // options
      _.each(nodes, (nd) => {
        let x_start = nd.x - nd.width / 2
        let y_start = nd.y - nd.height / 2 + this.font_size * 2 - this.option_font_size + 5

        let tp = objects.append('text')
          .classed('adg_option_label', true)
          .attr('y', y_start)

        // render each option as tspan
        let max_char = Math.floor(this.max_node_width / (this.option_font_size * 0.6))
        _.each(nd.options, (opt, idx) => {
          if (idx < this.max_options) {
            opt = opt.length > max_char ? opt.substring(0, max_char - 3) + '...' : opt

            tp.append('tspan')
              .text(opt)
              .attr('x',  x_start + 20)
              .attr('dy', '1em')

            // also draw a symbol
            objects.append('rect')
              .classed('adg_option', true)
              .attr('x', x_start + 10)
              .attr('y', y_start + this.option_font_size * idx + 4)
              .attr('height', 5)
              .attr('width', 5)
              .attr('rx', 2)
          }
        })

        // clip
        if (nd.options.length > this.max_options) {
          tp.append('tspan')
            .text(`... ${nd.options.length - this.max_options} more`)
            .attr('x', x_start + 20)
            .attr('dy', '1em')
        }
      })
    }

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

  _createGraphSimple (g) {
    // Set an object for the graph label
    g.setGraph({
      nodesep: 10, // number of pixels that separate nodes horizontally
      ranksep: this.node_radius  // number of pixels between each rank
    })

    // Add nodes to the graph.
    _.each(this.nodes, (nd) => {
      let dec = store.getDecisionByName(nd.name)

      // node size encodes the number of options
      let scale = Math.sqrt(dec.options.length / 2)
      let r = Math.round(this.node_radius * scale)
      let params = {
        label: nd.name,
        options: dec.options,
        radius: r,
        width: r * 2,
        height: r * 2
      }

      g.setNode(nd.id, _.assign(nd, params))
    })

    // Add edges to the graph
    let label_w = Math.max(..._.map(this.nodes, (nd) =>
      util.getTextWidth(nd.name, `${this.font_size}px ${this.font_family}`)))
    _.each(this.edges, (ed) => {
      let params = {
        v: ed.source + '',
        w: ed.target + '',
        type: ed.type,
        width: label_w + 25,
        labeloffset: 25
      }

      g.setEdge(ed.source, ed.target, params)
    })
  }

  _createGraphWithOptions (g) {
    // Set an object for the graph label
    g.setGraph({
      nodesep: 10, // number of pixels that separate nodes horizontally
      ranksep: this.node_radius * 2  // number of pixels between each rank
    })

    // Add nodes to the graph.
    _.each(this.nodes, (nd) => {
      let dec = store.getDecisionByName(nd.name)
      let lo = Math.max(..._.map(dec.options, (opt) =>
        util.getTextWidth(opt, `${this.option_font_size} ${this.font_family}`)))
      let nw = Math.min(this.max_node_width, 20 +
        Math.max(util.getTextWidth(nd.name, `${this.font_size}px ${this.font_family}`), lo))
      let nh = 20 + this.font_size + Math.min(this.max_options + 1,
        dec.options.length) * this.option_font_size
      let params = {
        label: nd.name,
        options: dec.options,
        width: nw,
        height: nh
      }

      g.setNode(nd.id, _.assign(nd, params))
    })

    // Add edges to the graph
    _.each(this.edges, (ed) => {
      let params = {
        v: ed.source + '',
        w: ed.target + '',
        type: ed.type
      }

      g.setEdge(ed.source, ed.target, params)
    })
  }

  /**
   * Use a layout algorithm to compute the coordinates of nodes and edges.
   * @returns {dagre.graphlib.Graph}
   * @private
   */
  _layoutGraph () {
    // Create a new directed graph
    let g = new dagre.graphlib.Graph()

    // Default to assigning a new object as a label for each new edge.
    g.setDefaultEdgeLabel(() => {return {}})

    // Add nodes and edges to the graph, depending on vis type.
    if (this.show_options === 2) {
      this._createGraphWithOptions(g)
    } else {
      this._createGraphSimple(g)
    }

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

    // hack to create space for annotation
    if (this.show_options === 1) {
      this._shiftGraph(g, this.annotation_width, 0)
    }

    return g
  }

  /**
   * A helper function to move the graph after layout is computed.
   * Expect a non-negative value for both dx and dy.
   * @param g
   * @param dx
   * @param dy
   * @private
   */
  _shiftGraph (g, dx, dy) {
    // move nodes
    _.each(g.nodes(), (id) => {
      let n = g.node(id)
      n.x += dx
      n.y += dy
      g.setNode(id, n)
    })

    // move edges
    _.each(g.edges(), (ed) => {
      let edge = g.edge(ed.v, ed.w)
      edge.points = _.map(edge.points, (pt) => {
        return {x: pt.x + dx, y: pt.y + dy}
      })
      g.setEdge(ed.v, ed.w, edge)
    })

    // edit graph width and height
    let labels = g.graph()
    labels.width += dx
    labels.height += dy
    g.setGraph(labels)
  }

  _nodeClick (d) {
    bus.$emit('adg-node-click', d.label, d3.event)
  }

  _nodeHover (flag, datum) {
    this.svg.selectAll('.adg_node')
      .filter((d) => d.label === datum.label)
      .classed('hovered', flag)
  }

  /**
   * Update the appearance of nodes to indicate those in facet
   * @param facet
   */
  updateFacet (facet) {
    this.svg.selectAll('.adg_node_facet_label').remove()
    this.svg.selectAll('.adg_node')
      .classed('facet', false)
    this.svg.selectAll('.adg_node')
      .filter((d) => d.label === facet[0] || d.label === facet[1])
      .classed('facet', true)
      .each((d) => {
        let t = d.label === facet[0] ? 'X' : 'Y'
        this._drawNodeFacetLabel(d, t)
      })
  }

  /**
   * Draw a text label within the node to indicate the facet axis
   * @param d
   * @param t
   * @private
   */
  _drawNodeFacetLabel (d, t) {
    this.svg.select('.objects').append('text')
      .datum(d)
      .classed('adg_node_facet_label', true)
      .attr('x', d.x)
      .attr('y', d.y + 3)
      .text(t)
      .on('click', this._nodeClick)
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
