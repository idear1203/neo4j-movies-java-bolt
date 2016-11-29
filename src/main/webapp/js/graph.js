// Keep it simple and stupid!!

// TODO:
// 1. Style selection
// 2. Multiple relationships between adjacent nodes

var hasProp = {}.hasOwnProperty;
var explorer = {};
explorer.models = {};

// Utils
explorer.utils = {
  extend: function(dest, src) {
    var k, v;
    if (!explorer.utils.isObject(dest) && explorer.utils.isObject(src)) {
      return;
    }
    for (k in src) {
      if (!hasProp.call(src, k)) continue;
      v = src[k];
      dest[k] = v;
    }
    return dest;
  },
  isArray: Array.isArray || function(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  },
  isObject: function(obj) {
    return Object(obj) === obj;
  }
};

// Renderers
explorer.renderers = {
  node: [],
  relationship: []
};

// Render
explorer.Renderer = (function() {
  function Renderer(opts) {
    if (opts == null) {
      opts = {};
    }
    explorer.utils.extend(this, opts);
    if (this.onGraphChange == null) {
      this.onGraphChange = function() {};
    }
    if (this.onTick == null) {
      this.onTick = function() {};
    }
  }

  return Renderer;

})();

//
// Node
//
explorer.models.Node = (function() {
  function Node (id, label, title) {
    this.id = id;
    this.label = label;
    this.title = title;
  }

  return Node;
})();

//
// Relationship
//
explorer.models.Relationship = (function() {
  function Relationship (id, source, target) {
    this.id = id;
    this.source = source;
    this.target = target;
  }

  return Relationship;
})();

//
// Graph
//
explorer.models.Graph = (function() {
  function Graph() {
    //
    // Map id -> node
    //
    this.nodeMap = {};

    //
    // nodes as array
    //
    this._nodes = [];
    
    //
    // Map id -> relationship
    //
    this.relationshipMap = {};

    //
    // relatioships as array
    //
    this._relationships = [];
  }

  //
  // Return nodes array
  //
  Graph.prototype.nodes = function() {
    return this._nodes;
  }

  //
  // Return relationships array
  //
  Graph.prototype.relationships = function() {
    return this._relationships;
  }

  //
  // Add nodes
  //
  Graph.prototype.addNodes = function(nodes) {
    var i, len, node;
    for (i = 0, len = nodes.length; i < len; i++) {
      node = nodes[i];
      if (this.findNode(node.id) == null) {
        this.nodeMap[node.id] = node;
        this._nodes.push(node);
      }
    }
    return this;
  };

  //
  // Add relationships
  //
  Graph.prototype.addRelationships = function(relationships) {
    var i, len, relationship;
    for (i = 0, len = relationships.length; i < len; i++) {
      relationship = relationships[i];
      if (this.findRelationship(relationship.id) == null) {
        this.relationshipMap[relationship.id] = relationship;
        this._relationships.push(relationship);
      }
    }

    return this;
  };

  //
  // Find a node by id
  //
  Graph.prototype.findNode = function(id) {
    return this.nodeMap[id];
  };

  //
  // Find relationship by id
  //
  Graph.prototype.findRelationship = function(id) {
    return this.relationshipMap[id];
  };

  return Graph;
})();

//
// Define layout
//
explorer.layout = (function() {
  var _layout;
  _layout = {};
  _layout.force = function() {
    var _force;
    _force = {};
    _force.init = function(render) {
      var forceLayout, d3force, accelerateLayout;
      forceLayout = {};
      linkDistance = 45;
      d3force = d3.layout.force().linkDistance(
          linkDistance
      ).charge(-1000);
      accelerateLayout = function() {
        var d3Tick;
        d3Tick = d3force.tick;
        return d3force.tick = function() {
          // TODO: collision detection
          if (d3Tick()){
            return true;
          }
          render();
          return false;
        }
      }
      accelerateLayout();
      forceLayout.update = function(graph, size) {
        var nodes, relationships;
        nodes = graph.nodes();
        relationships = graph.relationships();
        return d3force.nodes(nodes).links(relationships).size(size).start();
      };
      forceLayout.drag = d3force.drag;
      return forceLayout;
    }
    return _force;
  }
  return _layout;
})();

explorer.viz = function(elem, graph, layout) {
  var viz, svg, force, render, ref, ref1, layoutDimension, width, height;
  viz = {};
  svg = d3.select(elem).append("svg").attr("pointer-events", "all");
  width = window.innerWidth, height = window.innerHeight;
  svg.attr("width", width).attr("height", height);
  layoutDimension = 400;
  viz.trigger = function() {
    var args, event;
    event = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
  };
  render = function() {
    var i, j, nodeGroups, relationshipGroups, ref, ref1;
    nodeGroups = svg.selectAll('g.node').attr('transform', function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    });
    ref = explorer.renderers.node;
    for (i = 0, len = ref.length; i < len; i++) {
      renderer = ref[i];
      nodeGroups.call(renderer.onTick, viz);
    }
    relationshipGroups = svg.selectAll('g.relationship');
    ref1 = explorer.renderers.relationship;
    for (j = 0; j < ref1.length; j++) {
      renderer = ref1[j];
      relationshipGroups.call(renderer.onTick, viz);
    }
  };

  force = layout.init(render);

  viz.update = function() {
    var layers, relationshipGroups, nodeGroups;
    layers = svg.selectAll("g.layer").data(["relationships", "nodes"]);
    layers.enter().append("g").attr("class", function(d) {
      return "layer " + d;
    });
    nodes = graph.nodes();
    relationships = graph.relationships();
    relationshipGroups = svg.select("g.layer.relationships").selectAll("g.relationship").data(relationships, function(d) {
      return d.id; // Why not just provide data?
    });
    relationshipGroups.enter().append("g").attr("class", "relationship");
    ref = explorer.renderers.relationship;
    for (i = 0, len = ref.length; i < len; i++) {
      renderer = ref[i];
      relationshipGroups.call(renderer.onGraphChange, viz);
    }
    relationshipGroups.exit().remove();
    nodeGroups = svg.select("g.layer.nodes").selectAll("g.node").data(nodes, function(d) {
      return d.id;
    });
    nodeGroups.enter().append("g").attr("class", "node").call(force.drag);
    ref1 = explorer.renderers.node;
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      renderer = ref1[j];
      nodeGroups.call(renderer.onGraphChange, viz);
    }
    nodeGroups.exit().remove();
    force.update(graph, [300, 300]);
    return true;
  };
  return viz;
}

explorer.GraphView = (function() {
  function graphView(graph) {
    this.layout = explorer.layout.force();
    this.graph = graph;
    this.viz = explorer.viz('#graph', this.graph, this.layout);
  }

  graphView.prototype.update = function() {
    this.viz.update();
    return this;
  };

  return graphView;
})();

var GraphConverter = function(){};
GraphConverter.convertNode = function(node, idx){
    node.id = idx;
    return new explorer.models.Node(node.id, node.label, node.title);
};

GraphConverter.convertRelationship = function(graph) {
  return function(relationship, idx) {
    var source, target;
    source = graph.findNode(relationship.source);
    target = graph.findNode(relationship.target);
    relationship.id = idx;
    return new explorer.models.Relationship(relationship.id, source, target);
  }
};

var GetGraph = function(response) {
  var graph, nodes, relationships;
  console.log(response);
  graph = new explorer.models.Graph(); 
  
  // Convert response data to graph models
  nodes = response.nodes.map(GraphConverter.convertNode);
  graph.addNodes(nodes);
  relationships = response.links.map(GraphConverter.convertRelationship(graph));
  graph.addRelationships(relationships);
  return graph;
}

var d3callback = function(error, response) {
  if (error) return;
  var graph = GetGraph(response);
  var graphView = new explorer.GraphView(graph);
  graphView.update();
}

d3.json("/graph", d3callback);

// Concrete Renderers
(function() {
  var nodeOutline, nodeIcon, noop;
  noop = function() {};
  nodeOutline = new explorer.Renderer({
    onGraphChange: function(selection, viz) {
      var circles;
      circles = selection.selectAll('circle.outline').data(function(node) {
        return [node];
      });
      circles.enter().append('circle').classed('outline', true).attr({
        cx: 0,
        cy: 0
      });
      circles.attr({
        r: function(node) {
          return node.radius = 29;
        },
        fill: function(node) {
          return "#68BDF6";
        },
        stroke: function(node) {
          return "#5CA8DB";
        },
        'stroke-width': function(node) {
          return "2px";
        }
      });
      return circles.exit().remove();
    },
    onTick: noop
  });
  nodeCaption = new explorer.Renderer({
    onGraphChange: function(selection, viz) {
      var text;
      text = selection.selectAll('text').data(function(node) {
        return [node];
      });
      text.enter().append('text').attr({
        'text-anchor': 'middle'
      }).attr({
        'pointer-events': 'none'
      });
      text.text(function(node) {
        return node.title;
      }).attr('y', function(line) {
        return 0;
      }).attr('font-size', function(line) {
        return "10px";
      }).attr({
        'fill': function(line) {
          return "#FFFFFF";
        }
      });
      return text.exit().remove();
    },
    onTick: noop
  });
  arrowPath = new explorer.Renderer({
    name: 'arrowPath',
    onGraphChange: function(selection, viz) {
      var paths;
      paths = selection.selectAll('path.outline').data(function(rel) {
        return [rel];
      });
      paths.enter().append('path').classed('outline', true);
      paths.attr('fill', function(rel) {
        return "#A5ABB6";
      }).attr('stroke', 'none');
      return paths.exit().remove();
    },
    onTick: noop
  });
  arrowPath = new explorer.Renderer({
    name: 'arrowPath',
    onGraphChange: function(selection, viz) {
      var paths;
      paths = selection.selectAll('path.outline').data(function(rel) {
        return [rel];
      });
      paths.enter().append('path').classed('outline', true);
      paths.attr('fill', function(rel) {
        return "#6DCE9E";
      }).attr('stroke', 'none');
      return paths.exit().remove();
    },
    onTick: noop
  });
  relLink = new explorer.Renderer({
    name: 'relLink',
    onGraphChange: function(selection, viz) {
      var links;
      links = selection.selectAll('.link').data(function(rel) {
        return [rel];
      });
      links.enter().append("line").attr("class", "link");
      links.attr('stroke', '#999')
        .attr('stroke-opacity', '0.6px')
        .attr('stroke-width', '1px');
      return links.exit().remove();
    },
    onTick: function(selection, viz) {
      return selection.selectAll('line')
        .attr('x1', function(rel) { return rel.source.x })
        .attr('y1', function(rel) { return rel.source.y })
        .attr('x2', function(rel) { return rel.target.x })
        .attr('y2', function(rel) { return rel.target.y });
    }
  });
  explorer.renderers.node.push(nodeOutline);
  explorer.renderers.node.push(nodeCaption);
  return explorer.renderers.relationship.push(relLink);
})();
