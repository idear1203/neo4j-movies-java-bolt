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
  movieNode: [],
  actorNode: [],
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
  function Node(id, labels, properties) {
    var key, value;
    this.id = id;
    this.labels = labels;
    this.propertyMap = properties;
    this.propertyList = (function() {
      var results;
      results = [];
      for (key in properties) {
        if (!hasProp.call(properties, key)) continue;
        value = properties[key];
        results.push({
          key: key,
          value: value
        });
      }
      return results;
    })();
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

  Graph.prototype.groupedRelationships = function() {
    var NodePair, groups, i, ignored, len, nodePair, pair, ref, ref1, relationship, results;
    NodePair = (function() {
      function NodePair(node1, node2) {
        this.relationships = [];
        if (node1.id < node2.id) {
          this.nodeA = node1;
          this.nodeB = node2;
        } else {
          this.nodeA = node2;
          this.nodeB = node1;
        }
      }

      NodePair.prototype.isLoop = function() {
        return this.nodeA === this.nodeB;
      };

      NodePair.prototype.toString = function() {
        return this.nodeA.id + ":" + this.nodeB.id;
      };

      return NodePair;

    })();
    groups = {};
    ref = this._relationships;
    for (i = 0, len = ref.length; i < len; i++) {
      relationship = ref[i];
      nodePair = new NodePair(relationship.source, relationship.target);
      nodePair = (ref1 = groups[nodePair]) != null ? ref1 : nodePair;
      nodePair.relationships.push(relationship);
      groups[nodePair] = nodePair;
    }
    results = [];
    for (ignored in groups) {
      pair = groups[ignored];
      results.push(pair);
    }
    return results;
  };

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
// Define collision detection
//
var aaron = true;
neo.collision = (function() {
  var collide, collision;
  collision = {};
  collide = function(node) {
    var nx1, nx2, ny1, ny2, r;
    r = node.radius + 10;
    nx1 = node.x - r;
    nx2 = node.x + r;
    ny1 = node.y - r;
    ny2 = node.y + r;
    return function(quad, x1, y1, x2, y2) {
      var l, x, y;
      if (quad.point && (quad.point !== node)) {
        if (isNaN(quad.point.x) || isNaN(quad.point.y)) {
          return false;
        }
        x = node.x - quad.point.x;
        y = node.y - quad.point.y;
        l = Math.sqrt(x * x + y * y);
        r = node.radius + 4 + quad.point.radius;
      }
      if (l < r) {
        l = (l - r) / l * .5;
        node.x -= x *= l;
        node.y -= y *= l;
        quad.point.x += x;
        quad.point.y += y;
      }
      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    };
  };
  collision.avoidOverlap = function(nodes) {
    var i, len, n, q, results;
    q = d3.geom.quadtree(nodes);
    results = [];
    for (i = 0, len = nodes.length; i < len; i++) {
      n = nodes[i];
      results.push(q.visit(collide(n)));
    }
    return results;
  };
  return collision;
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
      var forceLayout, d3force, accelerateLayout, currentStats;
      forceLayout = {};
      linkDistance = 10;
      d3force = d3.layout.force().linkDistance(function(relationship) {
        return relationship.source.radius + relationship.target.radius + linkDistance;
      }).charge(-2000);
      newStatsBucket = function() {
        var bucket;
        bucket = {
          layoutTime: 0,
          layoutSteps: 0
        };
        return bucket;
      };
      //currentStats = newStatsBucket();
      accelerateLayout = function() {
        var d3Tick, maxAnimationFramesPerSecond, maxComputeTime, maxStepsPerTick, now;
        maxStepsPerTick = 10;
        maxAnimationFramesPerSecond = 60;
        maxComputeTime = 2000 / maxAnimationFramesPerSecond;
        now = window.performance && window.performance.now ? function() {
          return window.performance.now();
        } : function() {
          return Date.now();
        };
        d3Tick = d3force.tick;
        return d3force.tick = function() {
          var startCalcs, startTick, step;
          startTick = now();
          step = maxStepsPerTick;
          while (step-- && now() - startTick < maxComputeTime) {
            startCalcs = now();
            neo.collision.avoidOverlap(d3force.nodes());
            if (d3Tick()) {
              maxStepsPerTick = 2;
              return true;
            }
          }
          render();
          return false;
        }
      }
      accelerateLayout();
      oneRelationshipPerPairOfNodes = function(graph) {
        var i, len, pair, ref, results;
        ref = graph.groupedRelationships();
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          pair = ref[i];
          results.push(pair.relationships[0]);
        }
        return results;
      };
      forceLayout.update = function(graph, size) {
        var center, nodes, radius, relationships;
        nodes = neo.utils.cloneArray(graph.nodes());
        relationships = oneRelationshipPerPairOfNodes(graph);
        radius = nodes.length * linkDistance / (Math.PI * 2);
        center = {
          x: size[0] / 2,
          y: size[1] / 2
        };
        neo.utils.circularLayout(nodes, center, radius);
        return d3force.nodes(nodes).links(relationships).size(size).start();
      };
      forceLayout.drag = d3force.drag;
      return forceLayout;
    }
    return _force;
  }
  return _layout;
})();

NeoD3Geometry = (function() {
  var addShortenedNextWord, fitCaptionIntoCircle, noEmptyLines, square;

  square = function(distance) {
    return distance * distance;
  };

  function NeoD3Geometry(style1) {
    this.style = style1;
  }

  addShortenedNextWord = function(line, word, measure) {
    var results;
    results = [];
    while (!(word.length <= 2)) {
      word = word.substr(0, word.length - 2) + '\u2026';
      if (measure(word) < line.remainingWidth) {
        line.text += " " + word;
        break;
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  noEmptyLines = function(lines) {
    var i, len, line;
    for (i = 0, len = lines.length; i < len; i++) {
      line = lines[i];
      if (line.text.length === 0) {
        return false;
      }
    }
    return true;
  };

  fitCaptionIntoCircle = function(node) {
    var candidateLines, candidateWords, captionText, consumedWords, emptyLine, fitOnFixedNumberOfLines, fontFamily, fontSize, i, lineCount, lineHeight, lines, maxLines, measure, ref, ref1, ref2, template, words, graphStyle;
    template = '{id}';
    graphStyle = new GraphStyle();
    captionText = graphStyle.interpolate(template, node);
    fontFamily = 'sans-serif';
    fontSize = parseFloat("10px");
    lineHeight = fontSize;
    measure = function(text) {
      return neo.utils.measureText(text, fontFamily, fontSize);
    };
    words = captionText.split(" ");
    emptyLine = function(lineCount, iLine) {
      var baseline, constainingHeight, lineWidth;
      baseline = (1 + iLine - lineCount / 2) * lineHeight;
      constainingHeight = iLine < lineCount / 2 ? baseline - lineHeight : baseline;
      lineWidth = Math.sqrt(square(node.radius) - square(constainingHeight)) * 2;
      return {
        node: node,
        text: '',
        baseline: baseline,
        remainingWidth: lineWidth
      };
    };
    fitOnFixedNumberOfLines = function(lineCount) {
      var i, iLine, iWord, line, lines, ref;
      lines = [];
      iWord = 0;
      for (iLine = i = 0, ref = lineCount - 1; 0 <= ref ? i <= ref : i >= ref; iLine = 0 <= ref ? ++i : --i) {
        line = emptyLine(lineCount, iLine);
        while (iWord < words.length && measure(" " + words[iWord]) < line.remainingWidth) {
          line.text += " " + words[iWord];
          line.remainingWidth -= measure(" " + words[iWord]);
          iWord++;
        }
        lines.push(line);
      }
      if (iWord < words.length) {
        addShortenedNextWord(lines[lineCount - 1], words[iWord], measure);
      }
      return [lines, iWord];
    };
    consumedWords = 0;
    maxLines = node.radius * 2 / fontSize;
    lines = [emptyLine(1, 0)];
    for (lineCount = i = 1, ref = maxLines; 1 <= ref ? i <= ref : i >= ref; lineCount = 1 <= ref ? ++i : --i) {
      ref1 = fitOnFixedNumberOfLines(lineCount), candidateLines = ref1[0], candidateWords = ref1[1];
      if (noEmptyLines(candidateLines)) {
        ref2 = [candidateLines, candidateWords], lines = ref2[0], consumedWords = ref2[1];
      }
      if (consumedWords >= words.length) {
        return lines;
      }
    }
    return lines;
  };

  NeoD3Geometry.prototype.formatNodeCaptions = function(nodes) {
    var i, len, node, results;
    results = [];
    for (i = 0, len = nodes.length; i < len; i++) {
      node = nodes[i];
      results.push(node.caption = fitCaptionIntoCircle(node));
    }
    return results;
  };

  NeoD3Geometry.prototype.setNodeRadii = function(nodes) {
    var i, len, node, results;
    results = [];
    for (i = 0, len = nodes.length; i < len; i++) {
      node = nodes[i];
      results.push(node.radius = 50);
    }
    return results;
  };

  NeoD3Geometry.prototype.onGraphChange = function(graph) {
    this.setNodeRadii(graph.nodes());
    return this.formatNodeCaptions(graph.nodes());
  };

  return NeoD3Geometry;

})();

var slice = [].slice;

neo.viz = function(elem, measureSize, graph, layout) {
  var viz, svg, force, render, ref, ref1, layoutDimension, width, height, onNodeClick, onNodeDblClick, onNodeMouseOut, onNodeMouseOver, clickHandler, geometry;
  viz = {};
  geometry = new NeoD3Geometry(null);
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

    ref = neo.renderers.movieNode;
    for (i = 0, len = ref.length; i < len; i++) {
      renderer = ref[i];
      nodeGroups.call(renderer.onTick, viz);
    }

    ref = neo.renderers.actorNode;
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
    var layers, relationshipGroups, nodeGroups, movieGroups, actorGroups, ref, ref1, ref2;
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
    geometry.onGraphChange(graph);
    relationshipGroups.exit().remove();
    nodeGroups = svg.select("g.layer.nodes").selectAll("g.node").data(nodes, function(d) {
      return d.id;
    });
    nodeGroups.enter().append("g").attr("class", function(d) { return "node " + d.labels; }).call(force.drag).call(clickHandler).on('mouseover', onNodeMouseOver).on('mouseout', onNodeMouseOut);
    nodeGroups.classed("selected", function(node) {
      return node.selected;
    });

    movieGroups = svg.select("g.layer.nodes").selectAll("g.node.movie");
    ref1 = neo.renderers.movieNode;
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      renderer = ref1[j];
      movieGroups.call(renderer.onGraphChange, viz);
    }

    actorGroups = svg.select("g.layer.nodes").selectAll("g.node.actor");
    ref1 = neo.renderers.actorNode;
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      renderer = ref1[j];
      actorGroups.call(renderer.onGraphChange, viz);
    }

    ref2 = neo.renderers.menu;
    for (k = 0, len2 = ref2.length; k < len2; k++) {
      renderer = ref2[k];
      nodeGroups.call(renderer.onGraphChange, viz);
    }
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
  function graphView(element, measureSize, graph) {
    var callbacks;
    this.layout = neo.layout.force();
    this.graph = graph;
    this.viz = neo.viz(element, measureSize, this.graph, this.layout);
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
    node.properties = {};
    node.properties["id"] = node.title;
    node.properties["title"] = node.title;
    return new neo.models.Node(node.id, node.label, node.properties);
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
  var graph, graphView, nodeClicked, toggleSelection, selectedItem, $element,
    measureSize;
  graph = GetGraph(response);
  $element = $('#graph');
  measureSize = function() {
    return {
      width: $element.width(),
      height: $element.height()
    };
  };
  graphView = new neo.GraphView($element[0], measureSize, graph);
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
    window.open('http://stackoverflow.com/', '_blank')
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
  })
  graphView.update();
}

d3.json("/graph", d3callback);

// Concrete Renderers
(function() {
  var nodeOutline, nodeIcon, noop, nodeCaption, relLink;
  noop = function() {};
  circleNodeOutline = new neo.Renderer({
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
          return node.radius = 50;
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
  rectNodeOutline = new neo.Renderer({
    onGraphChange: function(selection, viz) {
      var rects;
      rects = selection.selectAll('rect.outline').data(function(node) {
        return [node];
      });
      rects.enter().append('rect').classed('outline', true).attr({
        width: function(node) { return node.side = 80; },
        height: function(node) { return node.side; },
        x: function(node) { return -node.side / 2; },
        y: function(node) { return -node.side / 2; }
      });
      rects.attr({
        r: function(node) {
          return node.radius = node.side * Math.sqrt(2) / 2; 
        },
        fill: function(node) {
          return "#6DCE9E";
        },
        stroke: function(node) {
          return "#60B58B";
        },
        'stroke-width': function(node) {
          return "2px";
        }
      });
      return rects.exit().remove();
    },
    onTick: noop
  });
  //nodeCaption = new neo.Renderer({
  //  onGraphChange: function(selection, viz) {
  //    var text;
  //    text = selection.selectAll('text').data(function(node) {
  //      return [node];
  //    });
  //    text.enter().append('text').attr({
  //      'text-anchor': 'middle'
  //    }).attr({
  //      'pointer-events': 'none'
  //    });
  //    text.text(function(node) {
  //      return node.propertyMap["id"];
  //    }).attr('y', function(line) {
  //      return 0;
  //    }).attr('font-size', function(line) {
  //      return "10px";
  //    }).attr({
  //      'fill': function(line) {
  //        return "#FFFFFF";
  //      }
  //    });
  //    return text.exit().remove();
  //  },
  //  onTick: noop
  //});
  nodeCaption = new neo.Renderer({
    onGraphChange: function(selection, viz) {
      var text;
      text = selection.selectAll('text.caption').data(function(node) {
        return node.caption;
      });
      text.enter().append('text').classed('caption', true).attr({
        'text-anchor': 'middle'
      }).attr({
        'pointer-events': 'none'
      });
      text.text(function(line) {
        return line.text;
      }).attr('y', function(line) {
        return line.baseline;
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
  neo.renderers.movieNode.push(rectNodeOutline);
  neo.renderers.movieNode.push(nodeCaption);
  neo.renderers.actorNode.push(circleNodeOutline);
  neo.renderers.actorNode.push(nodeCaption);
  neo.renderers.relationship.push(relLink);
})();

(function() {
  var arc, attachContextEvent, createMenuItem, donutExpandNode, donutRemoveNode, donutUnlockNode, getSelectedNode, noop, numberOfItemsInContextMenu;
  noop = function() {};
  numberOfItemsInContextMenu = 3;
  arc = function(radius, itemNumber, width) {
    var endAngle, innerRadius, startAngle;
    if (width == null) {
      width = 50;
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
      return createMenuItem(selection, viz, 'nodeClose', 1, 'remove_node', [-4, 0], 'r', 'Remove node from the visualization');
    },
    onTick: noop
  });
  donutExpandNode = new neo.Renderer({
    onGraphChange: function(selection, viz) {
      return createMenuItem(selection, viz, 'nodeDblClicked', 2, 'expand_node', [0, 4], 'e', 'Expand child relationships');
    },
    onTick: noop
  });
  donutUnlockNode = new neo.Renderer({
    onGraphChange: function(selection, viz) {
      return createMenuItem(selection, viz, 'nodeUnlock', 3, 'unlock_node', [4, 0], 'u', 'Unlock the node to re-layout the graph');
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

neo.utils.circularLayout = function(nodes, center, radius) {
  var i, j, k, len, len1, n, node, results, unlocatedNodes;
  unlocatedNodes = [];
  for (j = 0, len = nodes.length; j < len; j++) {
    node = nodes[j];
    if (!((node.x != null) && (node.y != null))) {
      unlocatedNodes.push(node);
    }
  }
  results = [];
  for (i = k = 0, len1 = unlocatedNodes.length; k < len1; i = ++k) {
    n = unlocatedNodes[i];
    n.x = center.x + radius * Math.sin(2 * Math.PI * i / unlocatedNodes.length);
    results.push(n.y = center.y + radius * Math.cos(2 * Math.PI * i / unlocatedNodes.length));
  }
  return results;
};

neo.utils.cloneArray = function(original) {
  var clone, i, idx, len, node;
  clone = new Array(original.length);
  for (idx = i = 0, len = original.length; i < len; idx = ++i) {
    node = original[idx];
    clone[idx] = node;
  }
  return clone;
};

GraphStyle = (function() {
    function GraphStyle(storage1) {
      this.storage = storage1;
    }
  GraphStyle.prototype.interpolate = function(str, item) {
    return str.replace(/\{([^{}]*)\}/g, function(a, b) {
      var r;
      r = item.propertyMap['id'];
      if (typeof r === 'string' || typeof r === 'number') {
        return r;
      } else {
        return a;
      }
    });
  };

  return GraphStyle;
})();

neo.utils.measureText = (function() {
  var cache, measureUsingCanvas;
  measureUsingCanvas = function(text, font) {
    var canvas, canvasSelection, context;
    canvasSelection = d3.select('canvas#textMeasurementCanvas').data([this]);
    canvasSelection.enter().append('canvas').attr('id', 'textMeasurementCanvas').style('display', 'none');
    canvas = canvasSelection.node();
    context = canvas.getContext('2d');
    context.font = font;
    return context.measureText(text).width;
  };
  cache = (function() {
    var cacheSize, list, map;
    cacheSize = 10000;
    map = {};
    list = [];
    return function(key, calc) {
      var cached, result;
      cached = map[key];
      if (cached) {
        return cached;
      } else {
        result = calc();
        if (list.length > cacheSize) {
          delete map[list.splice(0, 1)];
          list.push(key);
        }
        return map[key] = result;
      }
    };
  })();
  return function(text, fontFamily, fontSize) {
    var font;
    font = 'normal normal normal ' + fontSize + 'px/normal ' + fontFamily;
    return cache(text + font, function() {
      return measureUsingCanvas(text, font);
    });
  };
})();
