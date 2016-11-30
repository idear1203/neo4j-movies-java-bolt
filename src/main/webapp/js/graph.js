// Keep it simple and stupid!!

// TODO:
// 1. Style selection
// 2. multiple relationships between adjacent nodes
// 3. Collision dection

var hasProp = {}.hasOwnProperty;
var neo = {};
neo.models = {};

// Utils
neo.utils = {
  extend: function(dest, src) {
    var k, v;
    if (!neo.utils.isObject(dest) && neo.utils.isObject(src)) {
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
neo.renderers = {
  node: [],
  relationship: [],
  menu: []
};

// Render
neo.Renderer = (function() {
  function Renderer(opts) {
    if (opts == null) {
      opts = {};
    }
    neo.utils.extend(this, opts);
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
neo.models.Node = (function() {
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
neo.models.Relationship = (function() {
  function Relationship (id, source, target, type) {
    this.id = id;
    this.source = source;
    this.target = target;
    this.type = type;
  }

  return Relationship;
})();

//
// Graph
//
neo.models.Graph = (function() {
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
neo.layout = (function() {
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

var slice = [].slice;

neo.viz = function(elem, graph, layout) {
  var viz, svg, force, render, ref, ref1, layoutDimension, width, height, onNodeClick, onNodeDblClick, onNodeMouseOut, onNodeMouseOver, clickHandler;
  viz = {};
  svg = d3.select(elem).append("svg").attr("pointer-events", "all");
  width = window.innerWidth, height = window.innerHeight;
  svg.attr("width", width).attr("height", height);
  layoutDimension = 400;
  viz.trigger = function() {
    var args, event;
    event = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
  };
  onNodeClick = (function(_this) {
    return function(node) {
      updateViz = false;
      return viz.trigger('nodeClicked', node);
    };
  })(this);
  onNodeDblClick = (function(_this) {
    return function(node) {
      return viz.trigger('nodeDblClicked', node);
    };
  })(this);
  onNodeMouseOver = function(node) {
    return viz.trigger('nodeMouseOver', node);
  };
  onNodeMouseOut = function(node) {
    return viz.trigger('nodeMouseOut', node);
  };
  render = function() {
    var i, j, nodeGroups, relationshipGroups, ref, ref1;
    nodeGroups = svg.selectAll('g.node').attr('transform', function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    });
    ref = neo.renderers.node;
    for (i = 0, len = ref.length; i < len; i++) {
      renderer = ref[i];
      nodeGroups.call(renderer.onTick, viz);
    }
    relationshipGroups = svg.selectAll('g.relationship');
    ref1 = neo.renderers.relationship;
    for (j = 0; j < ref1.length; j++) {
      renderer = ref1[j];
      relationshipGroups.call(renderer.onTick, viz);
    }
  };

  force = layout.init(render);

  viz.update = function() {
    var layers, relationshipGroups, nodeGroups, ref, ref1, ref2;
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
    ref = neo.renderers.relationship;
    for (i = 0, len = ref.length; i < len; i++) {
      renderer = ref[i];
      relationshipGroups.call(renderer.onGraphChange, viz);
    }
    relationshipGroups.exit().remove();
    nodeGroups = svg.select("g.layer.nodes").selectAll("g.node").data(nodes, function(d) {
      return d.id;
    });
    nodeGroups.enter().append("g").attr("class", "node").call(force.drag).call(clickHandler).on('mouseover', onNodeMouseOver).on('mouseout', onNodeMouseOut);
    nodeGroups.classed("selected", function(node) {
      return node.selected;
    });
    ref1 = neo.renderers.node;
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      renderer = ref1[j];
      nodeGroups.call(renderer.onGraphChange, viz);
    }
    ref2 = neo.renderers.menu;
    for (k = 0, len2 = ref2.length; k < len2; k++) {
      renderer = ref2[k];
      nodeGroups.call(renderer.onGraphChange, viz);
    }
    nodeGroups.exit().remove();
    nodeGroups.exit().remove();
    force.update(graph, [300, 300]);
    return true;
  };
  clickHandler = neo.utils.clickHandler();
  clickHandler.on('click', onNodeClick);
  clickHandler.on('dblclick', onNodeDblClick);
  return viz;
}

neo.GraphView = (function() {
  function graphView(graph) {
    var callbacks;
    this.layout = neo.layout.force();
    this.graph = graph;
    this.viz = neo.viz('#graph', this.graph, this.layout);
    this.callbacks = {};
    callbacks = this.callbacks;
    this.viz.trigger = (function() {
      return function() {
        var args, callback, event, i, len, ref, results;
        event = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
        ref = callbacks[event] || [];
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          callback = ref[i];
          results.push(callback.apply(null, args));
        }
        return results;
      };
    })();
  }

  graphView.prototype.on = function(event, callback) {
    var base;
    ((base = this.callbacks)[event] != null ? base[event] : base[event] = []).push(callback);
    return this;
  };

  graphView.prototype.update = function() {
    this.viz.update();
    return this;
  };

  return graphView;
})();

var GraphConverter = function(){};
GraphConverter.convertNode = function(node, idx){
    node.id = idx;
    return new neo.models.Node(node.id, node.label, node.title);
};

GraphConverter.convertRelationship = function(graph) {
  return function(relationship, idx) {
    var source, target;
    source = graph.findNode(relationship.source);
    target = graph.findNode(relationship.target);
    relationship.id = idx;
    return new neo.models.Relationship(relationship.id, source, target, relationship.type);
  }
};

var GetGraph = function(response) {
  var graph, nodes, relationships;
  console.log(response);
  graph = new neo.models.Graph(); 
  
  // Convert response data to graph models
  nodes = response.nodes.map(GraphConverter.convertNode);
  graph.addNodes(nodes);
  relationships = response.links.map(GraphConverter.convertRelationship(graph));
  graph.addRelationships(relationships);
  return graph;
}

var d3callback = function(error, response) {
  if (error) return;
  var graph, graphView, nodeClicked, toggleSelection, selectedItem;
  graph = GetGraph(response);
  graphView = new neo.GraphView(graph);
  selectedItem = null;
  toggleSelection = (function(_this) {
    return function(d) {
      if (d === selectedItem) {
        if (d != null) {
          d.selected = false;
        }
        selectedItem = null;
      } else {
        if (selectedItem != null) {
          selectedItem.selected = false;
        }
        if (d != null) {
          d.selected = true;
        }
        selectedItem = d;
      }
      graphView.update();
      return null;
    };
  })(this);
  nodeClicked = function(d) {
    d.fixed = true;
    return toggleSelection(d);
  };
  graphView.on('nodeClicked', function(d) {
    if (!d.contextMenuEvent) {
      nodeClicked(d);
    }
    return d.contextMenuEvent = false;
  }).on('nodeClose', function(d) {
    d.contextMenuEvent = true;
    GraphExplorer.removeNodesAndRelationships(d, graph);
    return toggleSelection(d);
  }).on('nodeUnlock', function(d) {
    d.contextMenuEvent = true;
    d.fixed = false;
    return toggleSelection(null);
  }).on('nodeDblClicked', function(d) {
    d.minified = false;
    if (d.expanded) {
      return;
    }
    getNodeNeigbours(d);
    //if (!$rootScope.$$phase) {
    //  return $rootScope.$apply();
    //}
  })
  graphView.update();
}

d3.json("/graph", d3callback);

// Concrete Renderers
(function() {
  var nodeOutline, nodeIcon, noop, nodeCaption, relLink;
  noop = function() {};
  nodeOutline = new neo.Renderer({
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
  nodeCaption = new neo.Renderer({
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
  arrowPath = new neo.Renderer({
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
  relLink = new neo.Renderer({
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
  neo.renderers.node.push(nodeOutline);
  neo.renderers.node.push(nodeCaption);
  neo.renderers.relationship.push(relLink);
})();

(function() {
  var arc, attachContextEvent, createMenuItem, donutExpandNode, donutRemoveNode, donutUnlockNode, getSelectedNode, noop, numberOfItemsInContextMenu;
  noop = function() {};
  numberOfItemsInContextMenu = 3;
  arc = function(radius, itemNumber, width) {
    var endAngle, innerRadius, startAngle;
    if (width == null) {
      width = 30;
    }
    itemNumber = itemNumber - 1;
    startAngle = ((2 * Math.PI) / numberOfItemsInContextMenu) * itemNumber;
    endAngle = startAngle + ((2 * Math.PI) / numberOfItemsInContextMenu);
    innerRadius = Math.max(radius + 8, 20);
    return d3.svg.arc().innerRadius(innerRadius).outerRadius(innerRadius + width).startAngle(startAngle).endAngle(endAngle).padAngle(.03);
  };
  getSelectedNode = function(node) {
    if (node.selected) {
      return [node];
    } else {
      return [];
    }
  };
  attachContextEvent = function(event, elems, viz, content, label) {
    var elem, i, len, results;
    results = [];
    for (i = 0, len = elems.length; i < len; i++) {
      elem = elems[i];
      elem.on('mousedown.drag', function() {
        d3.event.stopPropagation();
        return null;
      });
      elem.on('mouseup', function(node) {
        return viz.trigger(event, node);
      });
      elem.on('mouseover', function(node) {
        node.contextMenu = {
          menuSelection: event,
          menuContent: content,
          label: label
        };
        return viz.trigger('menuMouseOver', node);
      });
      results.push(elem.on('mouseout', function(node) {
        delete node.contextMenu;
        return viz.trigger('menuMouseOut', node);
      }));
    }
    return results;
  };
  createMenuItem = function(selection, viz, eventName, itemNumber, className, position, textValue, helpValue) {
    var path, tab, text, textpath;
    path = selection.selectAll('path.' + className).data(getSelectedNode);
    textpath = selection.selectAll('text.' + className).data(getSelectedNode);
    tab = path.enter().append('path').classed(className, true).classed('context-menu-item', true).attr({
      d: function(node) {
        return arc(node.radius, itemNumber, 1)();
      }
    });
    text = textpath.enter().append('text').classed('context-menu-item', true).text(textValue).attr("transform", "scale(0.1)").attr({
      'font-family': 'FontAwesome',
      fill: function(node) {
        return '#FFFFFF';
      },
      x: function(node) {
        return arc(node.radius, itemNumber).centroid()[0] + position[0];
      },
      y: function(node) {
        return arc(node.radius, itemNumber).centroid()[1] + position[1];
      }
    });
    attachContextEvent(eventName, [tab, text], viz, helpValue, textValue);
    tab.transition().duration(200).attr({
      d: function(node) {
        return arc(node.radius, itemNumber)();
      }
    });
    text.attr("transform", "scale(1)");
    path.exit().transition().duration(200).attr({
      d: function(node) {
        return arc(node.radius, itemNumber, 1)();
      }
    }).remove();
    return textpath.exit().attr("transform", "scale(0)").remove();
  };
  donutRemoveNode = new neo.Renderer({
    onGraphChange: function(selection, viz) {
      return createMenuItem(selection, viz, 'nodeClose', 1, 'remove_node', [-4, 0], '\uf00d', 'Remove node from the visualization');
    },
    onTick: noop
  });
  donutExpandNode = new neo.Renderer({
    onGraphChange: function(selection, viz) {
      return createMenuItem(selection, viz, 'nodeDblClicked', 2, 'expand_node', [0, 4], '\uf0b2', 'Expand child relationships');
    },
    onTick: noop
  });
  donutUnlockNode = new neo.Renderer({
    onGraphChange: function(selection, viz) {
      return createMenuItem(selection, viz, 'nodeUnlock', 3, 'unlock_node', [4, 0], '\uf09c', 'Unlock the node to re-layout the graph');
    },
    onTick: noop
  });
  neo.renderers.menu.push(donutExpandNode);
  neo.renderers.menu.push(donutRemoveNode);
  return neo.renderers.menu.push(donutUnlockNode);
})();

neo.utils.clickHandler = function() {
  var cc, event;
  cc = function(selection) {
    var dist, down, tolerance, wait;
    dist = function(a, b) {
      return Math.sqrt(Math.pow(a[0] - b[0], 2), Math.pow(a[1] - b[1], 2));
    };
    down = void 0;
    tolerance = 5;
    wait = null;
    selection.on("mousedown", function() {
      d3.event.target.__data__.fixed = true;
      down = d3.mouse(document.body);
      return d3.event.stopPropagation();
    });
    return selection.on("mouseup", function() {
      if (dist(down, d3.mouse(document.body)) > tolerance) {

      } else {
        if (wait) {
          window.clearTimeout(wait);
          wait = null;
          return event.dblclick(d3.event.target.__data__);
        } else {
          event.click(d3.event.target.__data__);
          return wait = window.setTimeout((function(e) {
            return function() {
              return wait = null;
            };
          })(d3.event), 250);
        }
      }
    });
  };
  event = d3.dispatch("click", "dblclick");
  return d3.rebind(cc, event, "on");
};

