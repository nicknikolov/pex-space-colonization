(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require("FWaASH"))
},{"FWaASH":3}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],4:[function(require,module,exports){
module.exports.Color = require('./lib/Color');
},{"./lib/Color":5}],5:[function(require,module,exports){
var clamp = function(value, min, max) {
  return Math.max(min, Math.min(value, max));
};

var lerp = function(a, b, t) {
  return a + (b - a) * t;
};

function Color(r, g, b, a) {
  this.r = (r != null) ? r : 0;
  this.g = (g != null) ? g : 0;
  this.b = (b != null) ? b : 0;
  this.a = (a != null) ? a : 1;
}

Color.create = function(r, g, b, a) {
  return new Color(r, g, b, a);
};

Color.fromRGB = Color.create;

Color.fromHSV = function(h, s, v, a) {
  var c = new Color();
  c.setHSV(h, s, v, a);
  return c;
};

Color.fromHSL = function(h, s, l, a) {
  var c = new Color();
  c.setHSL(h, s, l, a);
  return c;
};

Color.prototype.set = function(r, g, b, a) {
  this.r = r;
  this.g = g;
  this.b = b;
  this.a = (a != null) ? a : 1;

  return this;
};

Color.prototype.hash = function() {
  return 1 * this.r + 12 * this.g + 123 * this.b + 1234 * this.a;
};

Color.prototype.setHSV = function(h, s, v, a) {
  a = (a != null) ? a : 1;

  var i = Math.floor(h * 6);
  var f = h * 6 - i;
  var p = v * (1 - s);
  var q = v * (1 - f * s);
  var t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: this.r = v, this.g = t, this.b = p; break;
    case 1: this.r = q, this.g = v, this.b = p; break;
    case 2: this.r = p, this.g = v, this.b = t; break;
    case 3: this.r = p, this.g = q, this.b = v; break;
    case 4: this.r = t, this.g = p, this.b = v; break;
    case 5: this.r = v, this.g = p, this.b = q; break;
  }

  this.a = a;
  return this;
};

Color.prototype.getHSV = function() {
  var r = this.r;
  var g = this.g;
  var b = this.b;
  var max = Math.max(r, g, b)
  var min = Math.min(r, g, b);
  var h;
  var v = max;
  var d = max - min;
  var s = max == 0 ? 0 : d / max;

  if (max == min) {
    h = 0; // achromatic
  }
  else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h, s: s, v: v, a: this.a };
}

//h 0..1
//s 0..1
//l 0..1
//a 0..1
//https://gist.github.com/mjijackson/5311256
Color.prototype.setHSL = function(h, s, l, a) {
  a = (a != null) ? a : 1;

  if (s == 0) {
    this.r = this.g = this.b = l; // achromatic
  }
  else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;

    this.r = hue2rgb(p, q, h + 1/3);
    this.g = hue2rgb(p, q, h);
    this.b = hue2rgb(p, q, h - 1/3);
    this.a = a;
  }
};

//https://gist.github.com/mjijackson/5311256
Color.prototype.getHSL = function() {
  var r = this.r;
  var g = this.g;
  var b = this.b;
  var max = Math.max(r, g, b)
  var min = Math.min(r, g, b);
  var l = (max + min) / 2;
  var h;
  var s;

  if (max == min) {
    h = s = 0; // achromatic
  }
  else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return { h: h, s: s, l: l, a: this.a };
};

Color.prototype.copy = function(c) {
  this.r = c.r;
  this.g = c.g;
  this.b = c.b;
  this.a = c.a;

  return this;
};

Color.prototype.clone = function(c) {
  return new Color(this.r, this.g, this.b, this.a);
};

Color.lerp = function(startColor, endColor, t, mode) {
  mode = mode || 'rgb';

  if (mode == 'rgb') {
    return Color.fromRGB(
      lerp(startColor.r, endColor.r, t),
      lerp(startColor.g, endColor.g, t),
      lerp(startColor.b, endColor.b, t),
      lerp(startColor.a, endColor.a, t)
    )
  }
  else if (mode == 'hsv') {
    var startHSV = startColor.getHSV();
    var endHSV = endColor.getHSV();
    return Color.fromHSV(
      lerp(startHSV.h, endHSV.h, t),
      lerp(startHSV.s, endHSV.s, t),
      lerp(startHSV.v, endHSV.v, t),
      lerp(startHSV.a, endHSV.a, t)
    )
  }
  else if (mode == 'hsl') {
    var startHSL = startColor.getHSL();
    var endHSL = endColor.getHSL();
    return Color.fromHSL(
      lerp(startHSL.h, endHSL.h, t),
      lerp(startHSL.s, endHSL.s, t),
      lerp(startHSL.l, endHSL.l, t),
      lerp(startHSL.a, endHSL.a, t)
    )
  }
  else {
    return startColor;
  }
};

Color.Transparent = new Color(0, 0, 0, 0);
Color.None = new Color(0, 0, 0, 0);
Color.Black = new Color(0, 0, 0, 1);
Color.White = new Color(1, 1, 1, 1);
Color.DarkGrey = new Color(0.25, 0.25, 0.25, 1);
Color.Grey = new Color(0.5, 0.5, 0.5, 1);
Color.Red = new Color(1, 0, 0, 1);
Color.Green = new Color(0, 1, 0, 1);
Color.Blue = new Color(0, 0, 1, 1);
Color.Yellow = new Color(1, 1, 0, 1);
Color.Pink = new Color(1, 0, 1, 1);
Color.Cyan = new Color(0, 1, 1, 1);
Color.Orange = new Color(1, 0.5, 0, 1);

module.exports = Color;

},{}],6:[function(require,module,exports){
module.exports.Cube = require('./lib/Cube');
module.exports.Box = require('./lib/Box');
module.exports.Sphere = require('./lib/Sphere');
module.exports.Plane = require('./lib/Plane');
module.exports.LineBuilder = require('./lib/LineBuilder');
module.exports.Loft = require('./lib/Loft');
module.exports.IsoSurface = require('./lib/IsoSurface');
},{"./lib/Box":7,"./lib/Cube":8,"./lib/IsoSurface":9,"./lib/LineBuilder":10,"./lib/Loft":11,"./lib/Plane":12,"./lib/Sphere":13}],7:[function(require,module,exports){
//Like cube but not subdivided and continuous on edges

//## Parent class : [Geometry](../Geometry.html)

//## Example use
//      var cube = new Box(1, 1, 1);
//      var cubeMesh = new Mesh(cube, new Materials.TestMaterial());

var geom = require('pex-geom');
var Vec2 = geom.Vec2;
var Vec3 = geom.Vec3;
var Geometry = geom.Geometry;

//### Box ( sx, sy, sz )
//`sx` - size x / width *{ Number }*  
//`sy` - size y / height *{ Number }*  
//`sz` - size z / depth *{ Number }*  
function Box(sx, sy, sz) {
  sx = sx != null ? sx : 1;
  sy = sy != null ? sy : sx != null ? sx : 1;
  sz = sz != null ? sz : sx != null ? sx : 1;

  Geometry.call(this, { vertices: true, faces: true });

  var vertices = this.vertices;
  var faces = this.faces;

  var x = sx/2;
  var y = sy/2;
  var z = sz/2;

  //bottom
  vertices.push(new Vec3(-x, -y, -z));
  vertices.push(new Vec3(-x, -y,  z));
  vertices.push(new Vec3( x, -y,  z));
  vertices.push(new Vec3( x, -y, -z));

  //top
  vertices.push(new Vec3(-x,  y, -z));
  vertices.push(new Vec3(-x,  y,  z));
  vertices.push(new Vec3( x,  y,  z));
  vertices.push(new Vec3( x,  y, -z));

  //     4----7
  //    /:   /|
  //   5----6 |
  //   | 0..|.3
  //   |,   |/
  //   1----2

  faces.push([0, 3, 2, 1]); //bottom
  faces.push([4, 5, 6, 7]); //top
  faces.push([0, 1, 5, 4]); //left
  faces.push([2, 3, 7, 6]); //right
  faces.push([1, 2, 6, 5]); //front
  faces.push([3, 0, 4, 7]); //back

  this.computeNormals();
}

Box.prototype = Object.create(Geometry.prototype);

module.exports = Box;

},{"pex-geom":15}],8:[function(require,module,exports){
//Cube geometry generator.

//## Parent class : [Geometry](../Geometry.html)

//## Example use
//      var cube = new Cube(1, 1, 1, 10, 10, 10);
//      var cubeMesh = new Mesh(cube, new Materials.TestMaterial());

var geom = require('pex-geom');
var Vec2 = geom.Vec2;
var Vec3 = geom.Vec3;
var Geometry = geom.Geometry;

//### Cube ( sx, sy, sz, nx, ny, nz )
//`sx` - size x / width *{ Number }*  
//`sy` - size y / height *{ Number }*  
//`sz` - size z / depth *{ Number }*  
//`nx` - number of subdivisions on x axis *{ Number/Int }*  
//`ny` - number of subdivisions on y axis *{ Number/Int }*  
//`nz` - number of subdivisions on z axis *{ Number/Int }*
function Cube(sx, sy, sz, nx, ny, nz) {
  sx = sx != null ? sx : 1;
  sy = sy != null ? sy : sx != null ? sx : 1;
  sz = sz != null ? sz : sx != null ? sx : 1;
  nx = nx || 1;
  ny = ny || 1;
  nz = nz || 1;

  Geometry.call(this, { vertices: true, normals: true, texCoords: true, faces: true });

  var vertices = this.vertices;
  var texCoords = this.texCoords;
  var normals = this.normals;
  var faces = this.faces;

  var vertexIndex = 0;

  // How faces are constructed:
  //
  //     0-----1 . . 2       n  <----  n+1
  //     |   / .     .       |         A
  //     | /   .     .       V         |
  //     3 . . 4 . . 5      n+nu --> n+nu+1
  //     .     .     .
  //     .     .     .
  //     6 . . 7 . . 8
  //
  function makePlane(u, v, w, su, sv, nu, nv, pw, flipu, flipv) {
    var vertShift = vertexIndex;
    for (var j=0; j<=nv; j++) {
      for (var i=0; i<=nu; i++) {
        vert = vertices[vertexIndex] = Vec3.create();
        vert[u] = (-su / 2 + i * su / nu) * flipu;
        vert[v] = (-sv / 2 + j * sv / nv) * flipv;
        vert[w] = pw;
        normal = normals[vertexIndex] = Vec3.create();
        normal[u] = 0;
        normal[v] = 0;
        normal[w] = pw / Math.abs(pw);
        texCoord = texCoords[vertexIndex] = Vec2.create();
        texCoord.x = i / nu;
        texCoord.y = 1.0 - j / nv;
        ++vertexIndex;
      }
    }
    for (var j=0; j<=nv-1; j++) {
      for (var i=0; i<=nu-1; i++) {
        var n = vertShift + j * (nu + 1) + i;
        faces.push([n, n + nu + 1, n + nu + 2, n + 1]);
      }
    }
  }

  makePlane('x', 'y', 'z', sx, sy, nx, ny, sz / 2, 1, -1);
  makePlane('x', 'y', 'z', sx, sy, nx, ny, -sz / 2, -1, -1);
  makePlane('z', 'y', 'x', sz, sy, nz, ny, -sx / 2, 1, -1);
  makePlane('z', 'y', 'x', sz, sy, nz, ny, sx / 2, -1, -1);
  makePlane('x', 'z', 'y', sx, sz, nx, nz, sy / 2, 1, 1);
  makePlane('x', 'z', 'y', sx, sz, nx, nz, -sy / 2, 1, -1);
}

Cube.prototype = Object.create(Geometry.prototype);

module.exports = Cube;

},{"pex-geom":15}],9:[function(require,module,exports){
var geom = require('pex-geom');
var Vec2 = geom.Vec2;
var Vec3 = geom.Vec3;
var Geometry = geom.Geometry;

function IsoSurface(gridres, size) {
  size = size || 1;
  this.numOfGridPts = gridres;

  this.tresholdValue = 1;

  this.makeGrid(size);
}

IsoSurface.prototype.makeGrid = function(size) {
  var numOfPts2 = 2/(this.numOfGridPts-1);

  this.grid = [];
  for(var x=0; x<this.numOfGridPts; x++) {
    this.grid[x] = [];
    for(var y=0; y<this.numOfGridPts; y++) {
      this.grid[x][y] = [];
      for(var z=0; z<this.numOfGridPts; z++) {
        this.grid[x][y][z] = {
          value: 0,
          position: new Vec3((x/(this.numOfGridPts-1) - 0.5)*size, (y/(this.numOfGridPts-1) - 0.5)*size, (z/(this.numOfGridPts-1) - 0.5)*size),
          normal: new Vec3(0,0,0)
        };
      }
    }
  }

  this.cubes = [];
  for (var x=0; x<this.numOfGridPts-1; x++) {
    this.cubes[x] = [];
    for (var y=0; y<this.numOfGridPts-1; y++) {
      this.cubes[x][y] = [];
      for (var z=0; z<this.numOfGridPts-1; z++) {
        this.cubes[x][y][z] = { vert: [] };
        this.cubes[x][y][z].vert[0] = this.grid[x  ][y  ][z  ];
        this.cubes[x][y][z].vert[1] = this.grid[x+1][y  ][z  ];
        this.cubes[x][y][z].vert[2] = this.grid[x+1][y  ][z+1];
        this.cubes[x][y][z].vert[3] = this.grid[x  ][y  ][z+1];
        this.cubes[x][y][z].vert[4] = this.grid[x  ][y+1][z  ];
        this.cubes[x][y][z].vert[5] = this.grid[x+1][y+1][z  ];
        this.cubes[x][y][z].vert[6] = this.grid[x+1][y+1][z+1];
        this.cubes[x][y][z].vert[7] = this.grid[x  ][y+1][z+1];
      }
    }
  }
}

IsoSurface.prototype.update = function(spheres) {
  var grid = this.grid;

  for (var x=0; x<this.numOfGridPts; x++) {
    for (var y=0; y<this.numOfGridPts; y++) {
      for (var z=0; z<this.numOfGridPts; z++) {
        grid[x][y][z].value = this.findValue(grid[x][y][z].position, spheres);
      }
    }
  }

  for (x=1; x<this.numOfGridPts-1; x++) {
    for (y=1; y<this.numOfGridPts-1; y++) {
      for (z=1; z<this.numOfGridPts-1; z++) {
        grid[x][y][z].normal.x = grid[x-1][y][z].value - grid[x+1][y][z].value;
        grid[x][y][z].normal.y = grid[x][y-1][z].value - grid[x][y+1][z].value;
        grid[x][y][z].normal.z = grid[x][y][z-1].value - grid[x][y][z+1].value;
        //grid[x][y][z].normal.normalize();
      }
    }
  }

  if (!this.geom) {
    this.geom = new Geometry({vertices: true, normals: true, texCoords: true, faces: true});
  }
  else {
    this.geom.vertices.length = 0;
    this.geom.normals.length = 0;
    this.geom.texCoords.length = 0;
    this.geom.faces.length = 0;
    this.geom.vertices.dirty = true;
    this.geom.normals.dirty = true;
    this.geom.texCoords.dirty = true;
    this.geom.faces.dirty = true;
  }
  for (var x=0; x<this.numOfGridPts-1; x++) {
    for (var y=0; y<this.numOfGridPts-1; y++) {
      for (var z=0; z<this.numOfGridPts-1; z++) {
        this.marchCube(x,y,z);
      }
    }
  }
  return this.geom;
};

IsoSurface.prototype.marchCube = function(iX, iY, iZ) {
  var cubeindex = 0;
  var edgeFlags;
  var tri;
  var v;
  var EdgeVertex = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];
  var d1,d2,normal;
  var cube = this.cubes[iX][iY][iZ];

  if (cube.vert[0].value > this.tresholdValue) cubeindex |= 1;
  if (cube.vert[1].value > this.tresholdValue) cubeindex |= 2;
  if (cube.vert[2].value > this.tresholdValue) cubeindex |= 4;
  if (cube.vert[3].value > this.tresholdValue) cubeindex |= 8;
  if (cube.vert[4].value > this.tresholdValue) cubeindex |= 16;
  if (cube.vert[5].value > this.tresholdValue) cubeindex |= 32;
  if (cube.vert[6].value > this.tresholdValue) cubeindex |= 64;
  if (cube.vert[7].value > this.tresholdValue) cubeindex |= 128;

  edgeFlags = CubeEdgeFlags[cubeindex];

  if (edgeFlags == 0)
    return;

  if (edgeFlags & 1   )   this.interpolate(cube.vert[0], cube.vert[1], EdgeVertex[0 ]);
  if (edgeFlags & 2   )   this.interpolate(cube.vert[1], cube.vert[2], EdgeVertex[1 ]);
  if (edgeFlags & 4   )   this.interpolate(cube.vert[2], cube.vert[3], EdgeVertex[2 ]);
  if (edgeFlags & 8   )   this.interpolate(cube.vert[3], cube.vert[0], EdgeVertex[3 ]);
  if (edgeFlags & 16  )   this.interpolate(cube.vert[4], cube.vert[5], EdgeVertex[4 ]);
  if (edgeFlags & 32  )   this.interpolate(cube.vert[5], cube.vert[6], EdgeVertex[5 ]);
  if (edgeFlags & 64  )   this.interpolate(cube.vert[6], cube.vert[7], EdgeVertex[6 ]);
  if (edgeFlags & 128 )   this.interpolate(cube.vert[7], cube.vert[4], EdgeVertex[7 ]);
  if (edgeFlags & 256 )   this.interpolate(cube.vert[0], cube.vert[4], EdgeVertex[8 ]);
  if (edgeFlags & 512 )   this.interpolate(cube.vert[1], cube.vert[5], EdgeVertex[9 ]);
  if (edgeFlags & 1024)   this.interpolate(cube.vert[2], cube.vert[6], EdgeVertex[10]);
  if (edgeFlags & 2048)   this.interpolate(cube.vert[3], cube.vert[7], EdgeVertex[11]);

  var i = this.geom.vertices.length;
  //rysujemy trojkaty, moze ich byc max 5
  for(tri = 0;tri<5;tri++) {
    if (TriangleConnectionTable[cubeindex][3*tri] < 0)
      break;

    var ab = EdgeVertex[TriangleConnectionTable[cubeindex][3*tri+1]].position.dup().sub(EdgeVertex[TriangleConnectionTable[cubeindex][3*tri+0]].position);
    var ac = EdgeVertex[TriangleConnectionTable[cubeindex][3*tri+2]].position.dup().sub(EdgeVertex[TriangleConnectionTable[cubeindex][3*tri+0]].position);
    var n = ab.dup().cross(ac);

    for(var v=0;v<3;v++) {
      d2 = EdgeVertex[TriangleConnectionTable[cubeindex][3*tri+v]];
      this.geom.vertices.push(d2.position);
      this.geom.normals.push(d2.normal);
      this.geom.texCoords.push(new Vec2(d2.normal.x*0.5+0.5, d2.normal.y*0.5+0.5));
    }

    this.geom.faces.push([i++, i++, i++]);
  }
}

IsoSurface.prototype.interpolate = function(gridPkt1, gridPkt2, vect) {
  var delta = gridPkt2.value - gridPkt1.value;

  if (delta == 0) delta = 0.0;

  var m = (this.tresholdValue - gridPkt1.value)/delta;

  vect.position = gridPkt1.position.dup().add((gridPkt2.position.dup().sub(gridPkt1.position)).dup().scale(m));
  vect.normal = gridPkt1.normal.dup().add((gridPkt2.normal.dup().sub(gridPkt1.normal)).dup().scale(m)); //position.dup().scale(0.5)
  var len = vect.normal.length();
  (len==0) ? (len=1) : (len = 1.0/len);

  vect.normal = vect.normal.dup().scale(len);
}

IsoSurface.prototype.findValue = function(position, spheres) {
  var fResult = 0;

  for(var i=0;i<spheres.length;i++) {
    var distanceSqr = position.squareDistance(spheres[i].position);
    if (distanceSqr == 0) len = 1;
    var r = spheres[i].radius;
    var f = spheres[i].force;
    fResult += f * r * r * spheres[i].radius / distanceSqr;
  }

  return fResult;
};

var CubeEdgeFlags = [
  0x000, 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c, 0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03, 0xe09, 0xf00,
  0x190, 0x099, 0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c, 0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
  0x230, 0x339, 0x033, 0x13a, 0x636, 0x73f, 0x435, 0x53c, 0xa3c, 0xb35, 0x83f, 0x936, 0xe3a, 0xf33, 0xc39, 0xd30,
  0x3a0, 0x2a9, 0x1a3, 0x0aa, 0x7a6, 0x6af, 0x5a5, 0x4ac, 0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0,
  0x460, 0x569, 0x663, 0x76a, 0x066, 0x16f, 0x265, 0x36c, 0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a, 0x963, 0xa69, 0xb60,
  0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0x0ff, 0x3f5, 0x2fc, 0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0,
  0x650, 0x759, 0x453, 0x55a, 0x256, 0x35f, 0x055, 0x15c, 0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53, 0x859, 0x950,
  0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0x0cc, 0xfcc, 0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0,
  0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc6, 0xdcf, 0xec5, 0xfcc, 0x0cc, 0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9, 0x7c0,
  0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c, 0x15c, 0x055, 0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650,
  0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6, 0xfff, 0xcf5, 0xdfc, 0x2fc, 0x3f5, 0x0ff, 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
  0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c, 0x36c, 0x265, 0x16f, 0x066, 0x76a, 0x663, 0x569, 0x460,
  0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af, 0xaa5, 0xbac, 0x4ac, 0x5a5, 0x6af, 0x7a6, 0x0aa, 0x1a3, 0x2a9, 0x3a0,
  0xd30, 0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c, 0x53c, 0x435, 0x73f, 0x636, 0x13a, 0x033, 0x339, 0x230,
  0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895, 0x99c, 0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x099, 0x190,
  0xf00, 0xe09, 0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c, 0x70c, 0x605, 0x50f, 0x406, 0x30a, 0x203, 0x109, 0x000
];

var TriangleConnectionTable = [
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 1, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 8, 3, 9, 8, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 2, 10, 0, 2, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [2, 8, 3, 2, 10, 8, 10, 9, 8, -1, -1, -1, -1, -1, -1, -1],
  [3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 11, 2, 8, 11, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 9, 0, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 11, 2, 1, 9, 11, 9, 8, 11, -1, -1, -1, -1, -1, -1, -1],
  [3, 10, 1, 11, 10, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 10, 1, 0, 8, 10, 8, 11, 10, -1, -1, -1, -1, -1, -1, -1],
  [3, 9, 0, 3, 11, 9, 11, 10, 9, -1, -1, -1, -1, -1, -1, -1],
  [9, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 3, 0, 7, 3, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 1, 9, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 1, 9, 4, 7, 1, 7, 3, 1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [3, 4, 7, 3, 0, 4, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1],
  [9, 2, 10, 9, 0, 2, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
  [2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, -1, -1, -1, -1],
  [8, 4, 7, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [11, 4, 7, 11, 2, 4, 2, 0, 4, -1, -1, -1, -1, -1, -1, -1],
  [9, 0, 1, 8, 4, 7, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
  [4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1, -1, -1, -1, -1],
  [3, 10, 1, 3, 11, 10, 7, 8, 4, -1, -1, -1, -1, -1, -1, -1],
  [1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4, -1, -1, -1, -1],
  [4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3, -1, -1, -1, -1],
  [4, 7, 11, 4, 11, 9, 9, 11, 10, -1, -1, -1, -1, -1, -1, -1],
  [9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 5, 4, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 5, 4, 1, 5, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [8, 5, 4, 8, 3, 5, 3, 1, 5, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [3, 0, 8, 1, 2, 10, 4, 9, 5, -1, -1, -1, -1, -1, -1, -1],
  [5, 2, 10, 5, 4, 2, 4, 0, 2, -1, -1, -1, -1, -1, -1, -1],
  [2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, -1, -1, -1, -1],
  [9, 5, 4, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 11, 2, 0, 8, 11, 4, 9, 5, -1, -1, -1, -1, -1, -1, -1],
  [0, 5, 4, 0, 1, 5, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
  [2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, -1, -1, -1, -1],
  [10, 3, 11, 10, 1, 3, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1],
  [4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, -1, -1, -1, -1],
  [5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, -1, -1, -1, -1],
  [5, 4, 8, 5, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1],
  [9, 7, 8, 5, 7, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 3, 0, 9, 5, 3, 5, 7, 3, -1, -1, -1, -1, -1, -1, -1],
  [0, 7, 8, 0, 1, 7, 1, 5, 7, -1, -1, -1, -1, -1, -1, -1],
  [1, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 7, 8, 9, 5, 7, 10, 1, 2, -1, -1, -1, -1, -1, -1, -1],
  [10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, -1, -1, -1, -1],
  [8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, -1, -1, -1, -1],
  [2, 10, 5, 2, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1],
  [7, 9, 5, 7, 8, 9, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1],
  [9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, -1, -1, -1, -1],
  [2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, -1, -1, -1, -1],
  [11, 2, 1, 11, 1, 7, 7, 1, 5, -1, -1, -1, -1, -1, -1, -1],
  [9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, -1, -1, -1, -1],
  [5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, -1],
  [11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, -1],
  [11, 10, 5, 7, 11, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 0, 1, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 8, 3, 1, 9, 8, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1],
  [1, 6, 5, 2, 6, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 6, 5, 1, 2, 6, 3, 0, 8, -1, -1, -1, -1, -1, -1, -1],
  [9, 6, 5, 9, 0, 6, 0, 2, 6, -1, -1, -1, -1, -1, -1, -1],
  [5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, -1, -1, -1, -1],
  [2, 3, 11, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [11, 0, 8, 11, 2, 0, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1],
  [0, 1, 9, 2, 3, 11, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1],
  [5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, -1, -1, -1, -1],
  [6, 3, 11, 6, 5, 3, 5, 1, 3, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, -1, -1, -1, -1],
  [3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, -1, -1, -1, -1],
  [6, 5, 9, 6, 9, 11, 11, 9, 8, -1, -1, -1, -1, -1, -1, -1],
  [5, 10, 6, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 3, 0, 4, 7, 3, 6, 5, 10, -1, -1, -1, -1, -1, -1, -1],
  [1, 9, 0, 5, 10, 6, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
  [10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, -1, -1, -1, -1],
  [6, 1, 2, 6, 5, 1, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, -1, -1, -1, -1],
  [8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, -1, -1, -1, -1],
  [7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, -1],
  [3, 11, 2, 7, 8, 4, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1],
  [5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11, -1, -1, -1, -1],
  [0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6, -1, -1, -1, -1],
  [9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6, -1],
  [8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6, -1, -1, -1, -1],
  [5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11, -1],
  [0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7, -1],
  [6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9, -1, -1, -1, -1],
  [10, 4, 9, 6, 4, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 10, 6, 4, 9, 10, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1],
  [10, 0, 1, 10, 6, 0, 6, 4, 0, -1, -1, -1, -1, -1, -1, -1],
  [8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, -1, -1, -1, -1],
  [1, 4, 9, 1, 2, 4, 2, 6, 4, -1, -1, -1, -1, -1, -1, -1],
  [3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, -1, -1, -1, -1],
  [0, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [8, 3, 2, 8, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1],
  [10, 4, 9, 10, 6, 4, 11, 2, 3, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, -1, -1, -1, -1],
  [3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, -1, -1, -1, -1],
  [6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, -1],
  [9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, -1, -1, -1, -1],
  [8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, -1],
  [3, 11, 6, 3, 6, 0, 0, 6, 4, -1, -1, -1, -1, -1, -1, -1],
  [6, 4, 8, 11, 6, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [7, 10, 6, 7, 8, 10, 8, 9, 10, -1, -1, -1, -1, -1, -1, -1],
  [0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, -1, -1, -1, -1],
  [10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, -1, -1, -1, -1],
  [10, 6, 7, 10, 7, 1, 1, 7, 3, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, -1, -1, -1, -1],
  [2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, -1],
  [7, 8, 0, 7, 0, 6, 6, 0, 2, -1, -1, -1, -1, -1, -1, -1],
  [7, 3, 2, 6, 7, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7, -1, -1, -1, -1],
  [2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, -1],
  [1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, -1],
  [11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, -1, -1, -1, -1],
  [8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6, -1],
  [0, 9, 1, 11, 6, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0, -1, -1, -1, -1],
  [7, 11, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [7, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [3, 0, 8, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 1, 9, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [8, 1, 9, 8, 3, 1, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1],
  [10, 1, 2, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, 3, 0, 8, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1],
  [2, 9, 0, 2, 10, 9, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1],
  [6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8, -1, -1, -1, -1],
  [7, 2, 3, 6, 2, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [7, 0, 8, 7, 6, 0, 6, 2, 0, -1, -1, -1, -1, -1, -1, -1],
  [2, 7, 6, 2, 3, 7, 0, 1, 9, -1, -1, -1, -1, -1, -1, -1],
  [1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, -1, -1, -1, -1],
  [10, 7, 6, 10, 1, 7, 1, 3, 7, -1, -1, -1, -1, -1, -1, -1],
  [10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8, -1, -1, -1, -1],
  [0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, -1, -1, -1, -1],
  [7, 6, 10, 7, 10, 8, 8, 10, 9, -1, -1, -1, -1, -1, -1, -1],
  [6, 8, 4, 11, 8, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [3, 6, 11, 3, 0, 6, 0, 4, 6, -1, -1, -1, -1, -1, -1, -1],
  [8, 6, 11, 8, 4, 6, 9, 0, 1, -1, -1, -1, -1, -1, -1, -1],
  [9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6, -1, -1, -1, -1],
  [6, 8, 4, 6, 11, 8, 2, 10, 1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6, -1, -1, -1, -1],
  [4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9, -1, -1, -1, -1],
  [10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3, -1],
  [8, 2, 3, 8, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1, -1],
  [0, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8, -1, -1, -1, -1],
  [1, 9, 4, 1, 4, 2, 2, 4, 6, -1, -1, -1, -1, -1, -1, -1],
  [8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1, -1, -1, -1, -1],
  [10, 1, 0, 10, 0, 6, 6, 0, 4, -1, -1, -1, -1, -1, -1, -1],
  [4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3, -1],
  [10, 9, 4, 6, 10, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 9, 5, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, 4, 9, 5, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1],
  [5, 0, 1, 5, 4, 0, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1],
  [11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5, -1, -1, -1, -1],
  [9, 5, 4, 10, 1, 2, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1],
  [6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5, -1, -1, -1, -1],
  [7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2, -1, -1, -1, -1],
  [3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6, -1],
  [7, 2, 3, 7, 6, 2, 5, 4, 9, -1, -1, -1, -1, -1, -1, -1],
  [9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7, -1, -1, -1, -1],
  [3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0, -1, -1, -1, -1],
  [6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8, -1],
  [9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7, -1, -1, -1, -1],
  [1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4, -1],
  [4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10, -1],
  [7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, -1, -1, -1, -1],
  [6, 9, 5, 6, 11, 9, 11, 8, 9, -1, -1, -1, -1, -1, -1, -1],
  [3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5, -1, -1, -1, -1],
  [0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11, -1, -1, -1, -1],
  [6, 11, 3, 6, 3, 5, 5, 3, 1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6, -1, -1, -1, -1],
  [0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10, -1],
  [11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5, -1],
  [6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3, -1, -1, -1, -1],
  [5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, -1, -1, -1, -1],
  [9, 5, 6, 9, 6, 0, 0, 6, 2, -1, -1, -1, -1, -1, -1, -1],
  [1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8, -1],
  [1, 5, 6, 2, 1, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6, -1],
  [10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0, -1, -1, -1, -1],
  [0, 3, 8, 5, 6, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [10, 5, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [11, 5, 10, 7, 5, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [11, 5, 10, 11, 7, 5, 8, 3, 0, -1, -1, -1, -1, -1, -1, -1],
  [5, 11, 7, 5, 10, 11, 1, 9, 0, -1, -1, -1, -1, -1, -1, -1],
  [10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1, -1, -1, -1, -1],
  [11, 1, 2, 11, 7, 1, 7, 5, 1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11, -1, -1, -1, -1],
  [9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7, -1, -1, -1, -1],
  [7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2, -1],
  [2, 5, 10, 2, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1, -1],
  [8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5, -1, -1, -1, -1],
  [9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2, -1, -1, -1, -1],
  [9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2, -1],
  [1, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 7, 0, 7, 1, 1, 7, 5, -1, -1, -1, -1, -1, -1, -1],
  [9, 0, 3, 9, 3, 5, 5, 3, 7, -1, -1, -1, -1, -1, -1, -1],
  [9, 8, 7, 5, 9, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [5, 8, 4, 5, 10, 8, 10, 11, 8, -1, -1, -1, -1, -1, -1, -1],
  [5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0, -1, -1, -1, -1],
  [0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5, -1, -1, -1, -1],
  [10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4, -1],
  [2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8, -1, -1, -1, -1],
  [0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11, -1],
  [0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5, -1],
  [9, 4, 5, 2, 11, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4, -1, -1, -1, -1],
  [5, 10, 2, 5, 2, 4, 4, 2, 0, -1, -1, -1, -1, -1, -1, -1],
  [3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9, -1],
  [5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2, -1, -1, -1, -1],
  [8, 4, 5, 8, 5, 3, 3, 5, 1, -1, -1, -1, -1, -1, -1, -1],
  [0, 4, 5, 1, 0, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5, -1, -1, -1, -1],
  [9, 4, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 11, 7, 4, 9, 11, 9, 10, 11, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11, -1, -1, -1, -1],
  [1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11, -1, -1, -1, -1],
  [3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4, -1],
  [4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2, -1, -1, -1, -1],
  [9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3, -1],
  [11, 7, 4, 11, 4, 2, 2, 4, 0, -1, -1, -1, -1, -1, -1, -1],
  [11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, -1, -1, -1, -1],
  [2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9, -1, -1, -1, -1],
  [9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7, -1],
  [3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10, -1],
  [1, 10, 2, 8, 7, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 9, 1, 4, 1, 7, 7, 1, 3, -1, -1, -1, -1, -1, -1, -1],
  [4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1, -1, -1, -1, -1],
  [4, 0, 3, 7, 4, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 8, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 10, 8, 10, 11, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [3, 0, 9, 3, 9, 11, 11, 9, 10, -1, -1, -1, -1, -1, -1, -1],
  [0, 1, 10, 0, 10, 8, 8, 10, 11, -1, -1, -1, -1, -1, -1, -1],
  [3, 1, 10, 11, 3, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 11, 1, 11, 9, 9, 11, 8, -1, -1, -1, -1, -1, -1, -1],
  [3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9, -1, -1, -1, -1],
  [0, 2, 11, 8, 0, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [3, 2, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [2, 3, 8, 2, 8, 10, 10, 8, 9, -1, -1, -1, -1, -1, -1, -1],
  [9, 10, 2, 0, 9, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8, -1, -1, -1, -1],
  [1, 10, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 3, 8, 9, 1, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 9, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 3, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
];

module.exports = IsoSurface;
},{"pex-geom":15}],10:[function(require,module,exports){
var geom = require('pex-geom');
var Vec3 = geom.Vec3;
var Geometry = geom.Geometry;

function LineBuilder() {
  Geometry.call(this, { vertices: true, colors: true })
}

LineBuilder.prototype = Object.create(Geometry.prototype);

LineBuilder.prototype.addLine = function(a, b, colorA, colorB) {
  colorA = colorA || { r: 1, g: 1, b: 1, a: 1 };
  colorB = colorB || colorA;
  this.vertices.push(Vec3.create().copy(a));
  this.vertices.push(Vec3.create().copy(b));
  this.colors.push(colorA);
  this.colors.push(colorB);
  this.vertices.dirty = true;
  this.colors.dirty = true;
  return this;
};

LineBuilder.prototype.addPath = function(path, color, numSamples, showPoints) {
  numSamples = numSamples || path.points.length;
  color = color || { r: 1, g: 1, b: 1, a: 1 };

  var prevPoint = path.getPointAt(0);
  if (showPoints) this.addCross(prevPoint, 0.1, color);
  for(var i=1; i<numSamples; i++) {
    var point;
    if (path.points.length == numSamples) {
      point = path.getPoint(i/(numSamples-1));
    }
    else {
      point = path.getPointAt(i/(numSamples-1));
    }
    this.addLine(prevPoint, point, color);
    prevPoint = point;
    if (showPoints) this.addCross(prevPoint, 0.1, color);
  }
  this.vertices.dirty = true;
  this.colors.dirty = true;
  return this;
}

LineBuilder.prototype.addCross = function(pos, size, color) {
  size = size || 0.1;
  var halfSize = size / 2;
  color = color || { r: 1, g: 1, b: 1, a: 1 };
  this.vertices.push(Vec3.create().set(pos.x - halfSize, pos.y, pos.z));
  this.vertices.push(Vec3.create().set(pos.x + halfSize, pos.y, pos.z));
  this.vertices.push(Vec3.create().set(pos.x, pos.y - halfSize, pos.z));
  this.vertices.push(Vec3.create().set(pos.x, pos.y + halfSize, pos.z));
  this.vertices.push(Vec3.create().set(pos.x, pos.y, pos.z - halfSize));
  this.vertices.push(Vec3.create().set(pos.x, pos.y, pos.z + halfSize));
  this.colors.push(color);
  this.colors.push(color);
  this.colors.push(color);
  this.colors.push(color);
  this.colors.push(color);
  this.colors.push(color);
  return this;
};

LineBuilder.prototype.reset = function() {
  this.vertices.length = 0;
  this.colors.length = 0;
  this.vertices.dirty = true;
  this.colors.dirty = true;
  return this;
};

module.exports = LineBuilder;

},{"pex-geom":15}],11:[function(require,module,exports){
var merge = require('merge');
var geom = require('pex-geom');
var Geometry = geom.Geometry;
var Vec2 = geom.Vec2;
var Vec3 = geom.Vec3;
var Mat4 = geom.Mat4;
var Quat = geom.Quat;
var Path = geom.Path;
var Spline1D = geom.Spline1D;
var Spline3D = geom.Spline3D;
var acos = Math.acos;
var PI = Math.PI;
var min = Math.min;
var LineBuilder = require('./LineBuilder');

// Version history
// 1. Naive implementation
// https://gist.github.com/roxlu/2859605
// 2. Fixed twists
// http://www.lab4games.net/zz85/blog/2012/04/24/spline-extrusions-tubes-and-knots-of-sorts/
// http://www.cs.cmu.edu/afs/andrew/scs/cs/15-462/web/old/asst2camera.html

var EPSILON = 0.00001;

function Loft(path, options) {
  options = options || {};
  Geometry.call(this, { vertices: true, normals: true, texCoords: true, edges: false, faces: true });
  var defaults = {
    numSteps: 200,
    numSegments: 8,
    r: 0.3,
    shapePath: null,
    xShapeScale: 1,
    caps: false,
    initialNormal: null,
    adjustAngle: 0
  };
  path.samplesCount = 5000;
  if (options.shapePath && !options.numSegments) {
    options.numSegments = options.shapePath.points.length;
  }
  this.options = options = merge(defaults, options);
  this.path = path;
  if (path.isClosed()) options.caps = false;
  this.shapePath = options.shapePath || this.makeShapePath(options.numSegments);
  this.adjustAngle = options.adjustAngle;
  this.rfunc = this.makeRadiusFunction(options.r);
  this.rufunc = options.ru ? this.makeRadiusFunction(options.ru) : this.rfunc;
  this.rvfunc = options.rv ? this.makeRadiusFunction(options.rv) : (options.ru ? this.rufunc : this.rfunc);
  this.points = this.samplePoints(path, options.numSteps, path.isClosed());
  this.tangents = this.sampleTangents(path, options.numSteps, path.isClosed());
  this.frames = this.makeFrames(this.points, this.tangents, path.isClosed());
  this.buildGeometry(options.caps);
}

Loft.prototype = Object.create(Geometry.prototype);

Loft.prototype.buildGeometry = function(caps) {
  caps = typeof caps !== 'undefined' ? caps : false;

  var index = 0;
  var numSteps = this.options.numSteps;
  var numSegments = this.options.numSegments;

  for (var i=0; i<this.frames.length; i++) {
    var frame = this.frames[i];
    var ru = this.rufunc(i, numSteps);
    var rv = this.rvfunc(i, numSteps);
    for (var j=0; j<numSegments; j++) {
      if (numSegments == this.shapePath.points.length) {
        p = this.shapePath.getPoint(j / (numSegments-1));
      }
      else {
        p = this.shapePath.getPointAt(j / (numSegments-1));
      }
      p.x *= ru;
      p.y *= rv;
      p = p.transformMat4(frame.m).add(frame.position);
      this.vertices.push(p);
      this.texCoords.push(new Vec2(j / numSegments, i / numSteps));
      this.normals.push(p.dup().sub(frame.position).normalize());
    }
  }

  if (caps) {
    this.vertices.push(this.frames[0].position);
    this.texCoords.push(new Vec2(0, 0));
    this.normals.push(this.frames[0].tangent.dup().scale(-1));
    this.vertices.push(this.frames[this.frames.length - 1].position);
    this.texCoords.push(new Vec2(0, 0));
    this.normals.push(this.frames[this.frames.length - 1].tangent.dup().scale(-1));
  }

  index = 0;
  for (var i=0; i<this.frames.length; i++) {
    for (var j=0; j<numSegments; j++) {
      if (i < numSteps - 1) {
        this.faces.push([index + (j + 1) % numSegments + numSegments, index + (j + 1) % numSegments, index + j, index + j + numSegments ]);
      }
    }
    index += numSegments;
  }
  if (this.path.isClosed()) {
    index -= numSegments;
    for (var j=0; j<numSegments; j++) {
      this.faces.push([(j + 1) % numSegments, index + (j + 1) % numSegments, index + j, j]);
    }
  }
  if (caps) {
    for (var j=0; j<numSegments; j++) {
      this.faces.push([j, (j + 1) % numSegments, this.vertices.length - 2]);
      this.faces.push([this.vertices.length - 1, index - numSegments + (j + 1) % numSegments, index - numSegments + j]);
    }
  }
};

Loft.prototype.makeShapePath = function(numSegments) {
  var shapePath = new Path();
  for (var i=0; i<numSegments; i++) {
    var t = i / numSegments;
    var a = t * 2 * Math.PI;
    var p = new Vec3(Math.cos(a), Math.sin(a), 0);
    shapePath.addPoint(p);
  }
  shapePath.close();
  return shapePath;
};

Loft.prototype.makeFrames = function(points, tangents, closed, rot) {
  if (rot == null) {
    rot = 0;
  }
  var tangent = tangents[0];
  var atx = Math.abs(tangent.x);
  var aty = Math.abs(tangent.y);
  var atz = Math.abs(tangent.z);
  var v = null;
  if (atz > atx && atz >= aty) {
    v = tangent.dup().cross(new Vec3(0, 1, 0));
  }
  else if (aty > atx && aty >= atz) {
    v = tangent.dup().cross(new Vec3(1, 0, 0));
  }
  else {
    v = tangent.dup().cross(new Vec3(0, 0, 1));
  }
  var normal = this.options.initialNormal || Vec3.create().asCross(tangent, v).normalize();
  var binormal = Vec3.create().asCross(tangent, normal).normalize();
  var prevBinormal = null;
  var prevNormal = null;
  var frames = [];
  var rotation = new Quat();
  v = new Vec3();
  for (var i = 0; i<this.points.length; i++) {
    var position = points[i];
    tangent = tangents[i];
    if (i > 0) {
      normal = normal.dup();
      binormal = binormal.dup();
      prevTangent = tangents[i - 1];
      v.asCross(prevTangent, tangent);
      if (v.length() > EPSILON) {
        v.normalize();
        theta = acos(prevTangent.dot(tangent));
        rotation.setAxisAngle(v, theta * 180 / PI);
        normal.transformQuat(rotation);
      }
      binormal.asCross(tangent, normal);
    }
    var m = new Mat4().set4x4r(binormal.x, normal.x, tangent.x, 0, binormal.y, normal.y, tangent.y, 0, binormal.z, normal.z, tangent.z, 0, 0, 0, 0, 1);
    frames.push({
      tangent: tangent,
      normal: normal,
      binormal: binormal,
      position: position,
      m: m
    });
  }
  if (closed) {
    firstNormal = frames[0].normal;
    lastNormal = frames[frames.length - 1].normal;
    theta = Math.acos(firstNormal.dot(lastNormal));
    theta /= frames.length - 1;
    if (tangents[0].dot(v.asCross(firstNormal, lastNormal)) > 0) {
      theta = -theta;
    }
    frames.forEach(function(frame, frameIndex) {
      rotation.setAxisAngle(frame.tangent, theta * frameIndex * 180 / PI);
      frame.normal.transformQuat(rotation);
      frame.binormal.asCross(frame.tangent, frame.normal);
      frame.m.set4x4r(frame.binormal.x, frame.normal.x, frame.tangent.x, 0, frame.binormal.y, frame.normal.y, frame.tangent.y, 0, frame.binormal.z, frame.normal.z, frame.tangent.z, 0, 0, 0, 0, 1);
    });
  }
  return frames;
};

Loft.prototype.samplePoints = function(path, numSteps, closed) {
  var points = [];
  var N = closed ? numSteps : (numSteps - 1);
  for(var i=0; i<numSteps; i++) {
    points.push(path.getPointAt(i / N));
  }
  return points;
};

Loft.prototype.sampleTangents = function(path, numSteps, closed) {
  var points = [];
  var N = closed ? numSteps : (numSteps - 1);
  for(var i=0; i<numSteps; i++) {
    points.push(path.getTangentAt(i / N));
  }
  return points;
};

Loft.prototype.makeRadiusFunction = function(r) {
  var rfunc;
  if (r instanceof Spline1D) {
    return rfunc = function(t, n) {
      return r.getPointAt(t / (n - 1));
    };
  }
  else {
    return rfunc = function(t) {
      return r;
    };
  }
};

Loft.prototype.toDebugLines = function(lineLength) {
  lineLength = lineLength || 0.5
  var lineBuilder = new LineBuilder();
  var red = { r: 1, g: 0, b: 0, a: 1};
  var green = { r: 0, g: 1, b: 0, a: 1};
  var blue = { r: 0, g: 0.5, b: 1, a: 1};
  this.frames.forEach(function(frame, frameIndex) {
    lineBuilder.addLine(frame.position, frame.position.dup().add(frame.tangent.dup().scale(lineLength)), red, red);
    lineBuilder.addLine(frame.position, frame.position.dup().add(frame.normal.dup().scale(lineLength)), green, green);
    lineBuilder.addLine(frame.position, frame.position.dup().add(frame.binormal.dup().scale(lineLength)), blue, blue);
  });
  return lineBuilder;
}


module.exports = Loft;

},{"./LineBuilder":10,"merge":14,"pex-geom":15}],12:[function(require,module,exports){
//Plane geometry generator.
 
//## Parent class : [Geometry](../core/Geometry.html)
 
//## Example use
//      var plane = new Plane(1, 1, 10, 10, 'x', 'y');
//      var planeMesh = new Mesh(plane, new Materials.TestMaterial());
 
var geom = require('pex-geom');
var Vec2 = geom.Vec2;
var Vec3 = geom.Vec3;
var Geometry = geom.Geometry;

//## Reference
//### Plane ( sx, sy, nx, ny, u, v)
//`su` - size u / width *{ Number }*  
//`sv` - size v / height *{ Number }*  
//`nu` - number of subdivisions on u axis *{ Number/Int }*  
//`nv` - number of subdivisions on v axis *{ Number/Int }*  
//`u` - first axis *{ String }* = "x"
//`v` - second axis *{ Number/Int }* = "y"
function Plane(su, sv, nu, nv, u, v) {
  su = su || 1;
  sv = sv || su || 1;
  nu = nu || 1;
  nv = nv || nu || 1;
  u = u || 'x';
  v = v || 'y';    

  Geometry.call(this, { vertices: true, normals: true, texCoords: true, faces: true, edges: true });
   
  var w = ['x', 'y', 'z'];
  w.splice(w.indexOf(u), 1);
  w.splice(w.indexOf(v), 1);
  w = w[0];

  var vertices = this.vertices;
  var texCoords = this.texCoords;
  var normals = this.normals;
  var faces = this.faces;
  var edges = this.edges;

  // How faces are constructed:
  //
  //     0-----1 . . 2       n  <----  n+1
  //     |   / .     .       |         A
  //     | /   .     .       V         |
  //     3 . . 4 . . 5      n+nu --> n+nu+1
  //     .     .     .
  //     .     .     .
  //     6 . . 7 . . 8
  //
  var vertShift = vertices.length;
  for(var j=0; j<=nv; ++j) {
    for(var i=0; i<=nu; ++i) {
      var vert = new Vec3();
      vert[u] = (-su/2 + i*su/nu);
      vert[v] = (-sv/2 + j*sv/nv);
      vert[w] = 0;
      vertices.push(vert);

      var texCoord = new Vec2(i/nu, 1.0 - j/nv);
      texCoords.push(texCoord);

      var normal = new Vec3();
      normal[u] = 0;
      normal[v] = 0;
      normal[w] = 1;
      normals.push(normal);
    }
  }
  for(var j=0; j<nv; ++j) {
    for(var i=0; i<nu; ++i) {
      var n = vertShift + j * (nu + 1) + i;
      var face = [n, n + nu  + 1, n + nu + 2, n + 1];
       
      edges.push([n, n + 1]);
      edges.push([n, n + nu + 1]);
       
      if (j == nv - 1) {
        edges.push([n + nu + 1, n + nu + 2]);
      }
      if (i == nu - 1) {
        edges.push([n + 1, n + nu + 2]);
      }
      faces.push(face);
    }
  }
}

Plane.prototype = Object.create(Geometry.prototype);
 
module.exports = Plane;
},{"pex-geom":15}],13:[function(require,module,exports){
//Sphere geometry generator.

//## Parent class : [Geometry](../Geometry.html)

//## Example use
//      var sphere = new Sphere(1, 36, 36);
//      var sphereMesh = new Mesh(sphere, new Materials.TestMaterial());

var geom = require('pex-geom');
var Vec2 = geom.Vec2;
var Vec3 = geom.Vec3;
var Geometry = geom.Geometry;

//### Sphere ( r, nsides, nsegments )
//`r` - radius of the sphere *{ Number }*  
//`nsides` - number of subdivisions on XZ axis *{ Number }*  
//`nsegments` - number of subdivisions on Y axis *{ Number }*
function Sphere(r, nsides, nsegments) {
  r = r || 0.5;
  nsides = nsides || 36;
  nsegments = nsegments || 18;

  Geometry.call(this, { vertices: true, normals: true, texCoords: true, faces: true });

  var vertices = this.vertices;
  var texCoords = this.texCoords;
  var normals = this.normals;
  var faces = this.faces;

  var degToRad = 1/180.0 * Math.PI;

  var dphi   = 360.0/nsides;
  var dtheta = 180.0/nsegments;

  function evalPos(theta, phi) {
    var pos = new Vec3();
    pos.x = r * Math.sin(theta * degToRad) * Math.sin(phi * degToRad);
    pos.y = r * Math.cos(theta * degToRad);
    pos.z = r * Math.sin(theta * degToRad) * Math.cos(phi * degToRad);
    return pos;
  }

  for (var segment=0; segment<=nsegments; ++segment) {
    var theta = segment * dtheta;
    for (var side=0; side<=nsides; ++side) {
      var phi = side * dphi;
      var pos = evalPos(theta, phi);
      var normal = pos.dup().normalize();
      var texCoord = new Vec2(phi/360.0, theta/180.0);

      vertices.push(pos);
      normals.push(normal);
      texCoords.push(texCoord);

      if (segment == nsegments) continue;
      if (side == nsides) continue;

      faces.push([
        (segment  )*(nsides+1) + side,
        (segment+1)*(nsides+1) + side,
        (segment+1)*(nsides+1) + side + 1
      ]);

      faces.push([
        (segment  )*(nsides+1) + side,
        (segment+1)*(nsides+1) + side + 1,
        (segment  )*(nsides+1) + side + 1
      ]);
    }
  }
}

Sphere.prototype = Object.create(Geometry.prototype);

module.exports = Sphere;

},{"pex-geom":15}],14:[function(require,module,exports){
/*!
 * @name JavaScript/NodeJS Merge v1.1.3
 * @author yeikos
 * @repository https://github.com/yeikos/js.merge

 * Copyright 2014 yeikos - MIT license
 * https://raw.github.com/yeikos/js.merge/master/LICENSE
 */

;(function(isNode) {

	function merge() {

		var items = Array.prototype.slice.call(arguments),
			result = items.shift(),
			deep = (result === true),
			size = items.length,
			item, index, key;

		if (deep || typeOf(result) !== 'object')

			result = {};

		for (index=0;index<size;++index)

			if (typeOf(item = items[index]) === 'object')

				for (key in item)

					result[key] = deep ? clone(item[key]) : item[key];

		return result;

	}

	function clone(input) {

		var output = input,
			type = typeOf(input),
			index, size;

		if (type === 'array') {

			output = [];
			size = input.length;

			for (index=0;index<size;++index)

				output[index] = clone(input[index]);

		} else if (type === 'object') {

			output = {};

			for (index in input)

				output[index] = clone(input[index]);

		}

		return output;

	}

	function typeOf(input) {

		return ({}).toString.call(input).match(/\s([\w]+)/)[1].toLowerCase();

	}

	if (isNode) {

		module.exports = merge;

	} else {

		window.merge = merge;

	}

})(typeof module === 'object' && module && typeof module.exports === 'object' && module.exports);
},{}],15:[function(require,module,exports){
module.exports.Vec2 = require('./lib/Vec2');
module.exports.Vec3 = require('./lib/Vec3');
module.exports.Vec4 = require('./lib/Vec4');
module.exports.Mat4 = require('./lib/Mat4');
module.exports.Quat = require('./lib/Quat');
module.exports.Path = require('./lib/Path');
module.exports.Rect = require('./lib/Rect');
module.exports.Spline3D = require('./lib/Spline3D');
module.exports.Spline2D = require('./lib/Spline2D');
module.exports.Spline1D = require('./lib/Spline1D');
module.exports.Ray = require('./lib/Ray');
module.exports.Plane = require('./lib/Plane');
module.exports.Geometry = require('./lib/Geometry');
module.exports.Random = require('./lib/Random');
module.exports.BoundingBox = require('./lib/BoundingBox');
module.exports.Triangle2D = require('./lib/Triangle2D');

//unpack Random methods to geom package
for(var funcName in module.exports.Random) {
  module.exports[funcName] = module.exports.Random[funcName];
}
},{"./lib/BoundingBox":16,"./lib/Geometry":17,"./lib/Mat4":18,"./lib/Path":19,"./lib/Plane":20,"./lib/Quat":21,"./lib/Random":22,"./lib/Ray":23,"./lib/Rect":24,"./lib/Spline1D":25,"./lib/Spline2D":26,"./lib/Spline3D":27,"./lib/Triangle2D":28,"./lib/Vec2":29,"./lib/Vec3":30,"./lib/Vec4":31}],16:[function(require,module,exports){
var Vec3 = require('./Vec3');

function BoundingBox(min, max) {
  this.min = min;
  this.max = max;
}

BoundingBox.fromPositionSize = function(pos, size) {
  return new BoundingBox(Vec3.create(pos.x - size.x / 2, pos.y - size.y / 2, pos.z - size.z / 2), Vec3.create(pos.x + size.x / 2, pos.y + size.y / 2, pos.z + size.z / 2));
};

BoundingBox.fromPoints = function(points) {
  var bbox = new BoundingBox(points[0].clone(), points[0].clone());
  points.forEach(bbox.addPoint.bind(bbox));
  return bbox;
};

BoundingBox.prototype.isEmpty = function() {
  if (!this.min || !this.max) return true;
  else return false;
};

BoundingBox.prototype.addPoint = function(p) {
  if (this.isEmpty()) {
    this.min = p.clone();
    this.max = p.clone();
  }
  if (p.x < this.min.x) this.min.x = p.x;
  if (p.y < this.min.y) this.min.y = p.y;
  if (p.z < this.min.z) this.min.z = p.z;
  if (p.x > this.max.x) this.max.x = p.x;
  if (p.y > this.max.y) this.max.y = p.y;
  if (p.z > this.max.z) this.max.z = p.z;
};

BoundingBox.prototype.getSize = function() {
  return Vec3.create(this.max.x - this.min.x, this.max.y - this.min.y, this.max.z - this.min.z);
};

BoundingBox.prototype.getCenter = function(out) {
  return Vec3.create(this.min.x + (this.max.x - this.min.x) / 2, this.min.y + (this.max.y - this.min.y) / 2, this.min.z + (this.max.z - this.min.z) / 2);
};

module.exports = BoundingBox;
},{"./Vec3":30}],17:[function(require,module,exports){
var Vec3 = require('./Vec3');

function Geometry(o) {
  o = o || {};
  this.attribs = {};

  if (o.vertices) this.addAttrib('vertices', 'position', o.vertices, false);
  if (o.normals) this.addAttrib('normals', 'normal', o.normals, false);
  if (o.texCoords) this.addAttrib('texCoords', 'texCoord', o.texCoords, false);
  if (o.tangents) this.addAttrib('tangents', 'tangent', o.tangents, false);
  if (o.colors) this.addAttrib('colors', 'color', o.colors, false);
  if (o.indices) this.addIndices(o.indices);
  if (o.edges) this.addEdges(o.edges);
  if (o.faces) this.addFaces(o.faces);
}

Geometry.prototype.addAttrib = function(propertyName, attributeName, data, dynamic) {
  if (data == null) {
    data = null;
  }
  if (dynamic == null) {
    dynamic = false;
  }
  this[propertyName] = data && data.length ? data : [];
  this[propertyName].name = attributeName;
  this[propertyName].dirty = true;
  this[propertyName].dynamic = dynamic;
  this.attribs[propertyName] = this[propertyName];
  return this;
};

Geometry.prototype.addFaces = function(data, dynamic) {
  if (data == null) {
    data = null;
  }
  if (dynamic == null) {
    dynamic = false;
  }
  this.faces = data && data.length ? data : [];
  this.faces.dirty = true;
  this.faces.dynamic = false;
  return this;
};

Geometry.prototype.addEdges = function(data, dynamic) {
  if (data == null) {
    data = null;
  }
  if (dynamic == null) {
    dynamic = false;
  }
  this.edges = data && data.length ? data : [];
  this.edges.dirty = true;
  this.edges.dynamic = false;
  return this;
};

Geometry.prototype.addIndices = function(data, dynamic) {
  if (data == null) {
    data = null;
  }
  if (dynamic == null) {
    dynamic = false;
  }
  this.indices = data && data.length ? data : [];
  this.indices.dirty = true;
  this.indices.dynamic = false;
  return this;
};

Geometry.prototype.isDirty = function(attibs) {
  var dirty = false;
  dirty || (dirty = this.faces && this.faces.dirty);
  dirty || (dirty = this.edges && this.edges.dirty);
  for (attribAlias in this.attribs) {
    var attrib = this.attribs[attribAlias];
    dirty || (dirty = attrib.dirty);
  }
  return dirty;
};

Geometry.prototype.addEdge = function(a, b) {
  if (!this.edges) {
    this.addEdges();
  }
  if (!this.edgeHash) {
    this.edgeHash = [];
  }
  var ab = a + '_' + b;
  var ba = b + '_' + a;
  if (!this.edgeHash[ab] && !this.edgeHash[ba]) {
    this.edges.push([a, b]);
    return this.edgeHash[ab] = this.edgeHash[ba] = true;
  }
};

Geometry.prototype.computeEdges = function() {
  if (!this.edges) {
    this.addEdges();
  }
  else {
    this.edges.length = 0;
  }

  if (this.faces && this.faces.length) {
    this.faces.forEach(function(face) {
      if (face.length === 3) {
        this.addEdge(face[0], face[1]);
        this.addEdge(face[1], face[2]);
        this.addEdge(face[2], face[0]);
      }
      else if (face.length === 4) {
        this.addEdge(face[0], face[1]);
        this.addEdge(face[1], face[2]);
        this.addEdge(face[2], face[3]);
        this.addEdge(face[3], face[0]);
      }
    }.bind(this));
  }
  else {
    for (var i=0; i<this.vertices.length-1; i++) {
      this.addEdge(i, i+1);
    }
  }
};

Geometry.prototype.computeNormals = function() {
  if (!this.faces) {
    throw 'Geometry[2]omputeSmoothNormals no faces found';
  }
  if (!this.normals) {
    this.addAttrib('normals', 'normal', null, false);
  }

  if (this.normals.length > this.vertices.length) {
    this.normals.length = vertices.length;
  }
  else {
    while (this.normals.length < this.vertices.length) {
      this.normals.push(new Vec3(0, 0, 0));
    }
  }

  var count = [];
  this.vertices.forEach(function(v, i) {
    count[i] = 0;
  }.bind(this));

  var ab = new Vec3();
  var ac = new Vec3();
  var n = new Vec3();

  this.faces.forEach(function(f) {
    var a = this.vertices[f[0]];
    var b = this.vertices[f[1]];
    var c = this.vertices[f[2]];
    ab.asSub(b, a).normalize();
    ac.asSub(c, a).normalize();
    n.asCross(ab, ac);
    for(var i=0; i<f.length; i++) {
      this.normals[f[i]].add(n);
      count[f[i]]++;
    }
  }.bind(this));

  this.normals.forEach(function(n, i) {
    n.normalize();
  });
};

Geometry.prototype.toFlatGeometry = function() {
  var g = new Geometry({ vertices: true, faces: true });

  var vertices = this.vertices;

  this.faces.forEach(function(face) {
    var newFace = [];
    face.forEach(function(vi) {
      newFace.push(g.vertices.length);
      g.vertices.push(vertices[vi]);
    });
    g.faces.push(newFace);
  });

  return g;
}

module.exports = Geometry;

},{"./Vec3":30}],18:[function(require,module,exports){
var Vec3 = require('./Vec3');

function Mat4() {
  this.reset();
}

Mat4.create = function() {
  return new Mat4();
};

Mat4.prototype.equals = function(m, tolerance) {
  if (tolerance == null) {
    tolerance = 0.0000001;
  }
  return (Math.abs(m.a11 - this.a11) <= tolerance) && (Math.abs(m.a12 - this.a12) <= tolerance) && (Math.abs(m.a13 - this.a13) <= tolerance) && (Math.abs(m.a14 - this.a14) <= tolerance) && (Math.abs(m.a21 - this.a21) <= tolerance) && (Math.abs(m.a22 - this.a22) <= tolerance) && (Math.abs(m.a23 - this.a23) <= tolerance) && (Math.abs(m.a24 - this.a24) <= tolerance) && (Math.abs(m.a31 - this.a31) <= tolerance) && (Math.abs(m.a32 - this.a32) <= tolerance) && (Math.abs(m.a33 - this.a33) <= tolerance) && (Math.abs(m.a34 - this.a34) <= tolerance) && (Math.abs(m.a41 - this.a41) <= tolerance) && (Math.abs(m.a42 - this.a42) <= tolerance) && (Math.abs(m.a43 - this.a43) <= tolerance) && (Math.abs(m.a44 - this.a44) <= tolerance);
};

Mat4.prototype.hash = function() {
  return this.a11 * 0.01 + this.a12 * 0.02 + this.a13 * 0.03 + this.a14 * 0.04 + this.a21 * 0.05 + this.a22 * 0.06 + this.a23 * 0.07 + this.a24 * 0.08 + this.a31 * 0.09 + this.a32 * 0.10 + this.a33 * 0.11 + this.a34 * 0.12 + this.a41 * 0.13 + this.a42 * 0.14 + this.a43 * 0.15 + this.a44 * 0.16;
};

Mat4.prototype.set4x4r = function(a11, a12, a13, a14, a21, a22, a23, a24, a31, a32, a33, a34, a41, a42, a43, a44) {
  this.a11 = a11;
  this.a12 = a12;
  this.a13 = a13;
  this.a14 = a14;
  this.a21 = a21;
  this.a22 = a22;
  this.a23 = a23;
  this.a24 = a24;
  this.a31 = a31;
  this.a32 = a32;
  this.a33 = a33;
  this.a34 = a34;
  this.a41 = a41;
  this.a42 = a42;
  this.a43 = a43;
  this.a44 = a44;
  return this;
};

Mat4.prototype.copy = function(m) {
  this.a11 = m.a11;
  this.a12 = m.a12;
  this.a13 = m.a13;
  this.a14 = m.a14;
  this.a21 = m.a21;
  this.a22 = m.a22;
  this.a23 = m.a23;
  this.a24 = m.a24;
  this.a31 = m.a31;
  this.a32 = m.a32;
  this.a33 = m.a33;
  this.a34 = m.a34;
  this.a41 = m.a41;
  this.a42 = m.a42;
  this.a43 = m.a43;
  this.a44 = m.a44;
  return this;
};

Mat4.prototype.dup = function() {
  return Mat4.create().copy(this);
};

Mat4.prototype.reset = function() {
  this.set4x4r(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  return this;
};

Mat4.prototype.identity = function() {
  this.reset();
  return this;
};

Mat4.prototype.mul4x4r = function(b11, b12, b13, b14, b21, b22, b23, b24, b31, b32, b33, b34, b41, b42, b43, b44) {
  var a11 = this.a11;
  var a12 = this.a12;
  var a13 = this.a13;
  var a14 = this.a14;
  var a21 = this.a21;
  var a22 = this.a22;
  var a23 = this.a23;
  var a24 = this.a24;
  var a31 = this.a31;
  var a32 = this.a32;
  var a33 = this.a33;
  var a34 = this.a34;
  var a41 = this.a41;
  var a42 = this.a42;
  var a43 = this.a43;
  var a44 = this.a44;
  this.a11 = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
  this.a12 = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
  this.a13 = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
  this.a14 = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;
  this.a21 = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
  this.a22 = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
  this.a23 = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
  this.a24 = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;
  this.a31 = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
  this.a32 = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
  this.a33 = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
  this.a34 = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;
  this.a41 = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
  this.a42 = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
  this.a43 = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
  this.a44 = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
  return this;
};

Mat4.prototype.perspective = function(fovy, aspect, znear, zfar) {
  var f = 1.0 / Math.tan(fovy / 180 * Math.PI / 2);
  var nf = 1.0 / (znear - zfar);
  this.mul4x4r(f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (zfar + znear) * nf, 2 * znear * zfar * nf, 0, 0, -1, 0);
  return this;
};

Mat4.prototype.ortho = function(l, r, b, t, n, f) {
  this.mul4x4r(2 / (r - l), 0, 0, (r + l) / (l - r), 0, 2 / (t - b), 0, (t + b) / (b - t), 0, 0, 2 / (n - f), (f + n) / (n - f), 0, 0, 0, 1);
  return this;
};

Mat4.prototype.lookAt = function(eye, target, up) {
  var z = (Vec3.create(eye.x - target.x, eye.y - target.y, eye.z - target.z)).normalize();
  var x = (Vec3.create(up.x, up.y, up.z)).cross(z).normalize();
  var y = Vec3.create().copy(z).cross(x).normalize();
  this.mul4x4r(x.x, x.y, x.z, 0, y.x, y.y, y.z, 0, z.x, z.y, z.z, 0, 0, 0, 0, 1);
  this.translate(-eye.x, -eye.y, -eye.z);
  return this;
};

Mat4.prototype.translate = function(dx, dy, dz) {
  this.mul4x4r(1, 0, 0, dx, 0, 1, 0, dy, 0, 0, 1, dz, 0, 0, 0, 1);
  return this;
};

Mat4.prototype.rotate = function(theta, x, y, z) {
  var s = Math.sin(theta);
  var c = Math.cos(theta);
  this.mul4x4r(x * x * (1 - c) + c, x * y * (1 - c) - z * s, x * z * (1 - c) + y * s, 0, y * x * (1 - c) + z * s, y * y * (1 - c) + c, y * z * (1 - c) - x * s, 0, x * z * (1 - c) - y * s, y * z * (1 - c) + x * s, z * z * (1 - c) + c, 0, 0, 0, 0, 1);
  return this;
};

Mat4.prototype.asMul = function(a, b) {
  var a11 = a.a11;
  var a12 = a.a12;
  var a13 = a.a13;
  var a14 = a.a14;
  var a21 = a.a21;
  var a22 = a.a22;
  var a23 = a.a23;
  var a24 = a.a24;
  var a31 = a.a31;
  var a32 = a.a32;
  var a33 = a.a33;
  var a34 = a.a34;
  var a41 = a.a41;
  var a42 = a.a42;
  var a43 = a.a43;
  var a44 = a.a44;
  var b11 = b.a11;
  var b12 = b.a12;
  var b13 = b.a13;
  var b14 = b.a14;
  var b21 = b.a21;
  var b22 = b.a22;
  var b23 = b.a23;
  var b24 = b.a24;
  var b31 = b.a31;
  var b32 = b.a32;
  var b33 = b.a33;
  var b34 = b.a34;
  var b41 = b.a41;
  var b42 = b.a42;
  var b43 = b.a43;
  var b44 = b.a44;
  this.a11 = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
  this.a12 = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
  this.a13 = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
  this.a14 = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;
  this.a21 = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
  this.a22 = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
  this.a23 = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
  this.a24 = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;
  this.a31 = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
  this.a32 = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
  this.a33 = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
  this.a34 = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;
  this.a41 = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
  this.a42 = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
  this.a43 = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
  this.a44 = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
  return this;
};

Mat4.prototype.mul = function(b) {
  return this.asMul(this, b);
};

Mat4.prototype.scale = function(sx, sy, sz) {
  this.mul4x4r(sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1);
  return this;
};

Mat4.prototype.invert = function() {
  var x0 = this.a11;
  var x1 = this.a12;
  var x2 = this.a13;
  var x3 = this.a14;
  var x4 = this.a21;
  var x5 = this.a22;
  var x6 = this.a23;
  var x7 = this.a24;
  var x8 = this.a31;
  var x9 = this.a32;
  var x10 = this.a33;
  var x11 = this.a34;
  var x12 = this.a41;
  var x13 = this.a42;
  var x14 = this.a43;
  var x15 = this.a44;
  var a0 = x0 * x5 - x1 * x4;
  var a1 = x0 * x6 - x2 * x4;
  var a2 = x0 * x7 - x3 * x4;
  var a3 = x1 * x6 - x2 * x5;
  var a4 = x1 * x7 - x3 * x5;
  var a5 = x2 * x7 - x3 * x6;
  var b0 = x8 * x13 - x9 * x12;
  var b1 = x8 * x14 - x10 * x12;
  var b2 = x8 * x15 - x11 * x12;
  var b3 = x9 * x14 - x10 * x13;
  var b4 = x9 * x15 - x11 * x13;
  var b5 = x10 * x15 - x11 * x14;
  var invdet = 1 / (a0 * b5 - a1 * b4 + a2 * b3 + a3 * b2 - a4 * b1 + a5 * b0);
  this.a11 = (+x5 * b5 - x6 * b4 + x7 * b3) * invdet;
  this.a12 = (-x1 * b5 + x2 * b4 - x3 * b3) * invdet;
  this.a13 = (+x13 * a5 - x14 * a4 + x15 * a3) * invdet;
  this.a14 = (-x9 * a5 + x10 * a4 - x11 * a3) * invdet;
  this.a21 = (-x4 * b5 + x6 * b2 - x7 * b1) * invdet;
  this.a22 = (+x0 * b5 - x2 * b2 + x3 * b1) * invdet;
  this.a23 = (-x12 * a5 + x14 * a2 - x15 * a1) * invdet;
  this.a24 = (+x8 * a5 - x10 * a2 + x11 * a1) * invdet;
  this.a31 = (+x4 * b4 - x5 * b2 + x7 * b0) * invdet;
  this.a32 = (-x0 * b4 + x1 * b2 - x3 * b0) * invdet;
  this.a33 = (+x12 * a4 - x13 * a2 + x15 * a0) * invdet;
  this.a34 = (-x8 * a4 + x9 * a2 - x11 * a0) * invdet;
  this.a41 = (-x4 * b3 + x5 * b1 - x6 * b0) * invdet;
  this.a42 = (+x0 * b3 - x1 * b1 + x2 * b0) * invdet;
  this.a43 = (-x12 * a3 + x13 * a1 - x14 * a0) * invdet;
  this.a44 = (+x8 * a3 - x9 * a1 + x10 * a0) * invdet;
  return this;
};

Mat4.prototype.transpose = function() {
  var a11 = this.a11;
  var a12 = this.a12;
  var a13 = this.a13;
  var a14 = this.a14;
  var a21 = this.a21;
  var a22 = this.a22;
  var a23 = this.a23;
  var a24 = this.a24;
  var a31 = this.a31;
  var a32 = this.a32;
  var a33 = this.a33;
  var a34 = this.a34;
  var a41 = this.a41;
  var a42 = this.a42;
  var a43 = this.a43;
  var a44 = this.a44;
  this.a11 = a11;
  this.a12 = a21;
  this.a13 = a31;
  this.a14 = a41;
  this.a21 = a12;
  this.a22 = a22;
  this.a23 = a32;
  this.a24 = a42;
  this.a31 = a13;
  this.a32 = a23;
  this.a33 = a33;
  this.a34 = a43;
  this.a41 = a14;
  this.a42 = a24;
  this.a43 = a34;
  this.a44 = a44;
  return this;
};

Mat4.prototype.toArray = function() {
  return [this.a11, this.a21, this.a31, this.a41, this.a12, this.a22, this.a32, this.a42, this.a13, this.a23, this.a33, this.a43, this.a14, this.a24, this.a34, this.a44];
};

Mat4.prototype.fromArray = function(a) {
  this.a11 = a[0](this.a21 = a[1](this.a31 = a[2](this.a41 = a[3])));
  this.a12 = a[4](this.a22 = a[5](this.a32 = a[6](this.a42 = a[7])));
  this.a13 = a[8](this.a23 = a[9](this.a33 = a[10](this.a43 = a[11])));
  this.a14 = a[12](this.a24 = a[13](this.a34 = a[14](this.a44 = a[15])));
  return this;
};

module.exports = Mat4;

},{"./Vec3":30}],19:[function(require,module,exports){
var Vec3 = require('./Vec3');

function Path(points, closed) {
  this.points = points || [];
  this.dirtyLength = true;
  this.closed = closed || false;
  this.samplesCount = 1000;
}

Path.prototype.addPoint = function(p) {
  return this.points.push(p);
};

Path.prototype.getPoint = function(t, debug) {
  var point = t * (this.points.length - 1);
  var intPoint = Math.floor(point);
  var weight = point - intPoint;
  var c0 = intPoint;
  var c1 = intPoint + 1;
  if (intPoint === this.points.length - 1) {
    c0 = intPoint;
    c1 = intPoint;
  }
  var vec = new Vec3();
  vec.x = this.points[c0].x + (this.points[c1].x - this.points[c0].x) * weight;
  vec.y = this.points[c0].y + (this.points[c1].y - this.points[c0].y) * weight;
  vec.z = this.points[c0].z + (this.points[c1].z - this.points[c0].z) * weight;
  return vec;
};

Path.prototype.getPointAt = function(d) {
  if (!this.closed) {
    d = Math.max(0, Math.min(d, 1));
  }
  if (this.dirtyLength) {
    this.precalculateLength();
  }
  var k = 0;
  for (var i=0; i<this.accumulatedLengthRatios.length; i++) {
    if (this.accumulatedLengthRatios[i] > d - 1/this.samplesCount) {
      k = this.accumulatedRatios[i];
      break;
    }
  }
  return this.getPoint(k, true);
};

//naive implementation
Path.prototype.getClosestPoint = function(point) {
  if (this.dirtyLength) {
    this.precalculateLength();
  }
  var closesPoint = this.precalculatedPoints.reduce(function(best, p) {
    var dist = point.squareDistance(p);
    if (dist < best.dist) {
      return { dist: dist, point: p };
    }
    else return best;
  }, { dist: Infinity, point: null });
  return closesPoint.point;
}

Path.prototype.getClosestPointRatio = function(point) {
  if (this.dirtyLength) {
    this.precalculateLength();
  }
  var closesPoint = this.precalculatedPoints.reduce(function(best, p, pIndex) {
    var dist = point.squareDistance(p);
    if (dist < best.dist) {
      return { dist: dist, point: p, index: pIndex };
    }
    else return best;
  }, { dist: Infinity, point: null, index: -1 });
  return this.accumulatedLengthRatios[closesPoint.index];
}

Path.prototype.close = function() {
  return this.closed = true;
};

Path.prototype.isClosed = function() {
  return this.closed;
};

Path.prototype.reverse = function() {
  this.points = this.points.reverse();
  return this.dirtyLength = true;
};

Path.prototype.precalculateLength = function() {
  this.accumulatedRatios = [];
  this.accumulatedLengthRatios = [];
  this.accumulatedLengths = [];
  this.precalculatedPoints = [];

  var step = 1 / this.samplesCount;
  var k = 0;
  var totalLength = 0;
  var point = null;
  var prevPoint = null;

  for (var i=0; i<this.samplesCount; i++) {
    prevPoint = point;
    point = this.getPoint(k);
    if (i > 0) {
      totalLength += point.dup().sub(prevPoint).length();;
    }
    this.accumulatedRatios.push(k);
    this.accumulatedLengths.push(totalLength);
    this.precalculatedPoints.push(point);
    k += step;
  }
  for (var i=0; i<this.accumulatedLengths.length - 1; i++) {
    this.accumulatedLengthRatios.push(this.accumulatedLengths[i] / totalLength);
  }
  this.length = totalLength;
  return this.dirtyLength = false;
};

module.exports = Path;

},{"./Vec3":30}],20:[function(require,module,exports){
var Vec2 = require('./Vec2');
var Vec3 = require('./Vec3');

function Plane(point, normal) {
  this.point = point;
  this.normal = normal;
  this.u = new Vec3();
  this.v = new Vec3();
  this.updateUV();
}

Plane.prototype.set = function(point, normal) {
  this.point = point;
  this.normal = normal;
}

Plane.prototype.setPoint = function(point) {
  this.point = point;
}

Plane.prototype.setNormal = function(normal) {
  this.normal = normal;
}

Plane.prototype.project = function(p) {
  var D = Vec3.create().asSub(p, this.point);
  var scale = D.dot(this.normal);
  var scaled = this.normal.clone().scale(scale);
  var projected = p.clone().sub(scaled);
  return projected;
}

Plane.prototype.intersectRay = function(ray) {
  return ray.hitTestPlane(this.point, this.normal)[0];
}

Plane.prototype.updateUV = function() {
  if (Math.abs(this.normal.x) > Math.abs(this.normal.y)) {
    var invLen = 1 / Math.sqrt(this.normal.x * this.normal.x + this.normal.z * this.normal.z);
    this.u.set( this.normal.x * invLen, 0, -this.normal.z * invLen);
  }
  else {
    var invLen = 1 / Math.sqrt(this.normal.y * this.normal.y + this.normal.z * this.normal.z);
    this.u.set( 0, this.normal.z * invLen, -this.normal.y * invLen);
  }

  this.v.setVec3(this.normal).cross(this.u);
}

Plane.prototype.project = function(p) {
  var D = Vec3.create().asSub(p, this.point);
  var scale = D.dot(this.normal);
  var scaled = this.normal.clone().scale(scale);
  var projected = p.clone().sub(scaled);
  return projected;
}

Plane.prototype.rebase = function(p) {
  var diff = p.dup().sub(this.point);
  var x = this.u.dot(diff);
  var y = this.v.dot(diff);
  return new Vec2(x, y);
}

module.exports = Plane;
},{"./Vec2":29,"./Vec3":30}],21:[function(require,module,exports){
var Mat4 = require('./Mat4');
var Vec3 = require('./Vec3');
var kEpsilon = Math.pow(2, -24);

function Quat(x, y, z, w) {
  this.x = x != null ? x : 0;
  this.y = y != null ? y : 0;
  this.z = z != null ? z : 0;
  this.w = w != null ? w : 1;
}

Quat.create = function(x, y, z, w) {
  return new Quat(x, y, z, w);
};

Quat.prototype.identity = function() {
  this.set(0, 0, 0, 1);
  return this;
};

Quat.prototype.equals = function(q, tolerance) {
  if (tolerance == null) {
    tolerance = 0.0000001;
  }
  return (Math.abs(q.x - this.x) <= tolerance) && (Math.abs(q.y - this.y) <= tolerance) && (Math.abs(q.z - this.z) <= tolerance) && (Math.abs(q.w - this.w) <= tolerance);
};

Quat.prototype.hash = function() {
  return 1 * this.x + 12 * this.y + 123 * this.z + 1234 * this.w;
};

Quat.prototype.copy = function(q) {
  this.x = q.x;
  this.y = q.y;
  this.z = q.z;
  this.w = q.w;
  return this;
};

Quat.prototype.clone = function() {
  return new Quat(this.x, this.y, this.z, this.w);
};

Quat.prototype.dup = function() {
  return this.clone();
};

Quat.prototype.setAxisAngle = function(v, a) {
  a = a * 0.5;
  var s = Math.sin(a / 180 * Math.PI);
  this.x = s * v.x;
  this.y = s * v.y;
  this.z = s * v.z;
  this.w = Math.cos(a / 180 * Math.PI);
  return this;
};

Quat.prototype.setQuat = function(q) {
  this.x = q.x;
  this.y = q.y;
  this.z = q.z;
  this.w = q.w;
  return this;
};

Quat.prototype.set = function(x, y, z, w) {
  this.x = x;
  this.y = y;
  this.z = z;
  this.w = w;
  return this;
};

Quat.prototype.asMul = function(p, q) {
  var px = p.x;
  var py = p.y;
  var pz = p.z;
  var pw = p.w;
  var qx = q.x;
  var qy = q.y;
  var qz = q.z;
  var qw = q.w;
  this.x = px * qw + pw * qx + py * qz - pz * qy;
  this.y = py * qw + pw * qy + pz * qx - px * qz;
  this.z = pz * qw + pw * qz + px * qy - py * qx;
  this.w = pw * qw - px * qx - py * qy - pz * qz;
  return this;
};

Quat.prototype.mul = function(q) {
  this.asMul(this, q);
  return this;
};

Quat.prototype.mul4 = function(x, y, z, w) {
  var ax = this.x;
  var ay = this.y;
  var az = this.z;
  var aw = this.w;
  this.x = w * ax + x * aw + y * az - z * ay;
  this.y = w * ay + y * aw + z * ax - x * az;
  this.z = w * az + z * aw + x * ay - y * ax;
  this.w = w * aw - x * ax - y * ay - z * az;
  return this;
};

Quat.prototype.length = function() {
  return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
};

Quat.prototype.normalize = function() {
  var len = this.length();
  if (len > kEpsilon) {
    this.x /= len;
    this.y /= len;
    this.z /= len;
    this.w /= len;
  }
  return this;
};

Quat.prototype.toMat4 = function(out) {
  var xs = this.x + this.x;
  var ys = this.y + this.y;
  var zs = this.z + this.z;
  var wx = this.w * xs;
  var wy = this.w * ys;
  var wz = this.w * zs;
  var xx = this.x * xs;
  var xy = this.x * ys;
  var xz = this.x * zs;
  var yy = this.y * ys;
  var yz = this.y * zs;
  var zz = this.z * zs;
  var m = out || new Mat4();
  return m.set4x4r(1 - (yy + zz), xy - wz, xz + wy, 0, xy + wz, 1 - (xx + zz), yz - wx, 0, xz - wy, yz + wx, 1 - (xx + yy), 0, 0, 0, 0, 1);
};

Quat.prototype.setDirection = function(direction, debug) {
  var dir = Vec3.create().copy(direction).normalize();

  var up = Vec3.create(0, 1, 0);

  var right = Vec3.create().asCross(up, dir);

  //if debug then console.log('right', right)

  if (right.length() == 0) {
    up.set(1, 0, 0)
    right.asCross(up, dir);
  }

  up.asCross(dir, right);
  right.normalize();
  up.normalize();

  if (debug) console.log('dir', dir);
  if (debug) console.log('up', up);
  if (debug) console.log('right', right);

  var m = new Mat4();
  m.set4x4r(
    right.x, right.y, right.z, 0,
    up.x, up.y, up.z, 0,
    dir.x, dir.y, dir.z, 0,
    0, 0, 0, 1
  );

  //Step 3. Build a quaternion from the matrix
  var q = new Quat()
  if (1.0 + m.a11 + m.a22 + m.a33 < 0.001) {
    if (debug) console.log('singularity');
    dir = direction.dup();
    dir.z *= -1;
    dir.normalize();
    up.set(0, 1, 0);
    right.asCross(up, dir);
    up.asCross(dir, right);
    right.normalize();
    up.normalize();
    m = new Mat4();
    m.set4x4r(
      right.x, right.y, right.z, 0,
      up.x, up.y, up.z, 0,
      dir.x, dir.y, dir.z, 0,
      0, 0, 0, 1
    );
    q.w = Math.sqrt(1.0 + m.a11 + m.a22 + m.a33) / 2.0;
    var dfWScale = q.w * 4.0;
    q.x = ((m.a23 - m.a32) / dfWScale);
    q.y = ((m.a31 - m.a13) / dfWScale);
    q.z = ((m.a12 - m.a21) / dfWScale);
    if (debug) console.log('dir', dir);
    if (debug) console.log('up', up);
    if (debug) console.log('right', right);

    q2 = new Quat();
    q2.setAxisAngle(new Vec3(0,1,0), 180)
    q2.mul(q);
    return q2;
  }
  q.w = Math.sqrt(1.0 + m.a11 + m.a22 + m.a33) / 2.0;
  dfWScale = q.w * 4.0;
  q.x = ((m.a23 - m.a32) / dfWScale);
  q.y = ((m.a31 - m.a13) / dfWScale);
  q.z = ((m.a12 - m.a21) / dfWScale);

  this.copy(q);
  return this;
}

Quat.fromAxisAngle = function(v, a) {
  return new Quat().setAxisAngle(v, a);
}

Quat.fromDirection = function(direction) {
  return new Quat().setDirection(direction);
}


module.exports = Quat;

},{"./Mat4":18,"./Vec3":30}],22:[function(require,module,exports){
var seedrandom = require('seedrandom');
var Vec2 = require('./Vec2');
var Vec3 = require('./Vec3');

function Random() {

}

Random.randomSeed = function(s) {
  Math.seedrandom(s);
};

Random.randomFloat = function(min, max) {
  if (typeof max == 'undefined') {
    min = 1;
  }
  if (typeof max == 'undefined') {
    max = min;
    min = 0;
  }
  return min + (max - min) * Math.random();
};

Random.randomInt = function(min, max) {
  return Math.floor(Random.randomFloat(min, max));
};

Random.randomVec3 = function(r) {
  r = r || 0.5;
  var x = 2 * Math.random() - 1;
  var y = 2 * Math.random() - 1;
  var z = 2 * Math.random() - 1;
  return Vec3.create(x * r, y * r, z * r);
};

Random.randomVec3InBoundingBox = function(bbox) {
  var x = bbox.min.x + Math.random() * (bbox.max.x - bbox.min.x);
  var y = bbox.min.y + Math.random() * (bbox.max.y - bbox.min.y);
  var z = bbox.min.z + Math.random() * (bbox.max.z - bbox.min.z);
  return Vec3.create(x, y, z);
};

Random.randomVec2InRect = function(rect) {
  return Vec2.create(rect.x + Math.random() * rect.width, rect.y + Math.random() * rect.height);
};

Random.randomChance = function(probability) {
  return Math.random() <= probability;
};

Random.randomElement = function(list) {
  return list[Math.floor(Math.random() * list.length)];
};

module.exports = Random;
},{"./Vec2":29,"./Vec3":30,"seedrandom":32}],23:[function(require,module,exports){
var Vec3 = require('./Vec3');

//A ray.  
//
//Consists of the starting point *origin* and the *direction* vector.  
//Used for collision detection.
//### Ray ( )
function Ray(origin, direction) {
  this.origin = origin || new Vec3(0, 0, 0);
  this.direction = direction || new Vec3(0, 0, 1);
}

//http://wiki.cgsociety.org/index.php/Ray_Sphere_Intersection
Ray.prototype.hitTestSphere = function (pos, r) {
  var hits = [];
  var d = this.direction;
  var o = this.origin;
  var osp = o.dup().sub(pos);
  var A = d.dot(d);
  if (A == 0) {
    return hits;
  }
  var B = 2 * osp.dot(d);
  var C = osp.dot(osp) - r * r;
  var sq = Math.sqrt(B * B - 4 * A * C);
  if (isNaN(sq)) {
    return hits;
  }
  var t0 = (-B - sq) / (2 * A);
  var t1 = (-B + sq) / (2 * A);
  hits.push(o.dup().add(d.dup().scale(t0)));
  if (t0 != t1) {
    hits.push(o.dup().add(d.dup().scale(t1)));
  }
  return hits;
};

//http://www.cs.princeton.edu/courses/archive/fall00/cs426/lectures/raycast/sld017.htm
//http://cgafaq.info/wiki/Ray_Plane_Intersection
Ray.prototype.hitTestPlane = function (pos, normal) {
  if (this.direction.dot(normal) == 0) {
    return [];
  }
  var t = normal.dup().scale(-1).dot(this.origin.dup().sub(pos)) / this.direction.dot(normal);
  return [this.origin.dup().add(this.direction.dup().scale(t))];
};

Ray.prototype.hitTestBoundingBox = function (bbox) {
  var hits = [];
  var self = this;
  function testFace(pos, size, normal, u, v) {
    var faceHits = self.hitTestPlane(pos, normal);
    if (faceHits.length > 0) {
      var hit = faceHits[0];
      if (hit[u] > pos[u] - size[u] / 2 && hit[u] < pos[u] + size[u] / 2 && hit[v] > pos[v] - size[v] / 2 && hit[v] < pos[v] + size[v] / 2) {
        hits.push(hit);
      }
    }
  }
  var bboxCenter = bbox.getCenter();
  var bboxSize = bbox.getSize();
  testFace(bboxCenter.dup().add(new Vec3(0, 0, bboxSize.z / 2)), bboxSize, new Vec3(0, 0, 1), 'x', 'y');
  testFace(bboxCenter.dup().add(new Vec3(0, 0, -bboxSize.z / 2)), bboxSize, new Vec3(0, 0, -1), 'x', 'y');
  testFace(bboxCenter.dup().add(new Vec3(bboxSize.x / 2, 0, 0)), bboxSize, new Vec3(1, 0, 0), 'y', 'z');
  testFace(bboxCenter.dup().add(new Vec3(-bboxSize.x / 2, 0, 0)), bboxSize, new Vec3(-1, 0, 0), 'y', 'z');
  testFace(bboxCenter.dup().add(new Vec3(0, bboxSize.y / 2, 0)), bboxSize, new Vec3(0, 1, 0), 'x', 'z');
  testFace(bboxCenter.dup().add(new Vec3(0, -bboxSize.y / 2, 0)), bboxSize, new Vec3(0, -1, 0), 'x', 'z');

  hits.forEach(function (hit) {
    hit._distance = hit.distance(self.origin);
  });

  hits.sort(function (a, b) {
    return a._distance - b._distance;
  });

  hits.forEach(function (hit) {
    delete hit._distance;
  });

  if (hits.length > 0) {
    hits = [hits[0]];
  }

  return hits;
};

module.exports = Ray;
},{"./Vec3":30}],24:[function(require,module,exports){
function Rect(x, y, width, height) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
}

Rect.prototype.set = function(x, y, width, height) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
};

Rect.prototype.contains = function(point) {
  return point.x >= this.x && point.x <= this.x + this.width && point.y >= this.y && point.y <= this.y + this.height;
};

module.exports = Rect;
},{}],25:[function(require,module,exports){
//Camtull-Rom spline implementation  
//Inspired by code from [Tween.js][1]
//[1]: http://sole.github.com/tween.js/examples/05_spline.html

//## Example use 
//
//     var points = [ 
//       -2, 
//       -1, 
//        1, 
//        2
//     ];
//
//     var spline = new Spline1D(points);
//
//     spline.getPointAt(0.25);

//## Reference

//### Spline1D ( points, [ closed ] )
//`points` - *{ Array of Vec3 }* = [ ]  
//`closed` - is the spline a closed loop? *{ Boolean }* = false
function Spline1D(points, closed) {
  this.points = points || [];
  this.dirtyLength = true;
  this.closed = closed || false;
  this.samplesCount = 2000;
}

//### getPoint ( t )
//Gets position based on t-value.
//It is fast, but resulting points will not be evenly distributed.
//
//`t` - *{ Number } <0, 1>*
Spline1D.prototype.getPoint = function ( t ) {
  if (this.closed) {
    t = (t + 1 ) % 1;
  }
  else {
    t = Math.max(0, Math.min(t, 1));
  }

  var points = this.points;
  var len = this.closed ? points.length : points.length - 1;
  var point = t * len;
  var intPoint = Math.floor( point );
  var weight = point - intPoint;

  var c0, c1, c2, c3;
  if (this.closed) {
    c0 = (intPoint - 1 + points.length ) % points.length;
    c1 = intPoint % points.length;
    c2 = (intPoint + 1 ) % points.length;
    c3 = (intPoint + 2 ) % points.length;
  }
  else {
    c0 = intPoint == 0 ? intPoint : intPoint - 1;
    c1 = intPoint;
    c2 = intPoint > points.length - 2 ? intPoint : intPoint + 1;
    c3 = intPoint > points.length - 3 ? intPoint : intPoint + 2;
  }

  return this.interpolate( points[ c0 ], points[ c1 ], points[ c2 ], points[ c3 ], weight );
}

//### addPoint ( p )
//Adds point to the spline
//
//`p` - point to be added *{ Vec3 }* 
Spline1D.prototype.addPoint = function ( p ) {
  this.dirtyLength = true;
  this.points.push(p)
}

//### getPointAt ( d )
//Gets position based on d-th of total length of the curve.
//Precise but might be slow at the first use due to need to precalculate length.
//
//`d` - *{ Number } <0, 1>*
Spline1D.prototype.getPointAt = function ( d ) {
  if (this.closed) {
    d = (d + 1 ) % 1;
  }
  else {
    d = Math.max(0, Math.min(d, 1));
  }

  if (this.dirtyLength) {
    this.precalculateLength();
  }

  //TODO: try binary search
  var k = 0;
  for(var i=0; i<this.accumulatedLengthRatios.length; i++) {
    if (this.accumulatedLengthRatios[i] > d - 1/this.samplesCount) {
      k = this.accumulatedRatios[i];
      break;
    }
  }

  return this.getPoint(k);
}

//### getPointAtIndex ( i )
//Returns position of i-th point forming the curve
//
//`i` - *{ Number } <0, Spline1D.points.length)*
Spline1D.prototype.getPointAtIndex = function ( i ) {
  if (i < this.points.length) {
    return this.points[i];
  }
  else {
    return null;
  }
}

//### getNumPoints ( )
//Return number of base points in the spline
Spline1D.prototype.getNumPoints = function() {
  return this.points.length;
}

//### getLength ( )
//Returns the total length of the spline.
Spline1D.prototype.getLength = function() {
  if (this.dirtyLength) {
    this.precalculateLength();
  }
  return this.length;
}

//### precalculateLength ( )
//Goes through all the segments of the curve and calculates total length and
//the ratio of each segment.
Spline1D.prototype.precalculateLength = function() {
  var step = 1/this.samplesCount;
  var k = 0;
  var totalLength = 0;
  this.accumulatedRatios = [];
  this.accumulatedLengthRatios = [];
  this.accumulatedLengths = [];

  var point;
  var prevPoint;
  var k = 0;
  for(var i=0; i<this.samplesCount; i++) {
    prevPoint = point;
    point = this.getPoint(k);

    if (i > 0) {
      var len = Math.sqrt(1 + (point - prevPoint)*(point - prevPoint));
      totalLength += len;
    }

    this.accumulatedRatios.push(k);
    this.accumulatedLengths.push(totalLength)

    k += step;
  }

  for(var i=0; i<this.samplesCount; i++) {
    this.accumulatedLengthRatios.push(this.accumulatedLengths[i] / totalLength);
  }

  this.length = totalLength;
  this.dirtyLength = false;
}

//### close ( )
//Closes the spline. It will form a closed now.
Spline1D.prototype.close = function( ) {
  this.closed = true;
}

//### isClosed ( )
//Returns true if spline is closed (forms a closed) *{ Boolean }*
Spline1D.prototype.isClosed = function() {
  return this.closed;
}

//### interpolate ( p0, p1, p2, p3, t)
//Helper function to calculate Catmul-Rom spline equation  
//
//`p0` - previous value *{ Number }*  
//`p1` - current value *{ Number }*  
//`p2` - next value *{ Number }*  
//`p3` - next next value *{ Number }*  
//`t` - parametric distance between p1 and p2 *{ Number } <0, 1>*
Spline1D.prototype.interpolate = function(p0, p1, p2, p3, t) {
  var v0 = ( p2 - p0 ) * 0.5;
  var v1 = ( p3 - p1 ) * 0.5;
  var t2 = t * t;
  var t3 = t * t2;
  return ( 2 * p1 - 2 * p2 + v0 + v1 ) * t3 + ( - 3 * p1 + 3 * p2 - 2 * v0 - v1 ) * t2 + v0 * t + p1;
}

module.exports = Spline1D;

},{}],26:[function(require,module,exports){
//Camtull-Rom spline implementation  
//Inspired by code from [Tween.js][1]
//[1]: http://sole.github.com/tween.js/examples/05_spline.html
//## Example use 
//
//     var points = [ 
//       new Vec2(-2,  0), 
//       new Vec2(-1,  0), 
//       new Vec2( 1,  1), 
//       new Vec2( 2, -1) 
//     ];
//
//     var spline = new Spline2D(points);
//
//     spline.getPointAt(0.25);
//## Reference

var Vec2 = require('./Vec2');

//### Spline2D ( points, [ closed ] )
//`points` - *{ Array of Vec2 }* = [ ]  
//`closed` - is the spline a closed loop? *{ Boolean }* = false
function Spline2D(points, closed) {
  this.points = points || [];
  this.dirtyLength = true;
  this.closed = closed || false;
  this.samplesCount = 100;
}
//### getPoint ( t )
//Gets position based on t-value.
//It is fast, but resulting points will not be evenly distributed.
//
//`t` - *{ Number } <0, 1>*
//returns [Vec2](Vec2.html)
Spline2D.prototype.getPoint = function (t) {
  if (this.closed) {
    t = (t + 1) % 1;
  } else {
    t = Math.max(0, Math.min(t, 1));
  }
  var points = this.points;
  var len = this.closed ? points.length : points.length - 1;
  var point = t * len;
  var intPoint = Math.floor(point);
  var weight = point - intPoint;
  var c0, c1, c2, c3;
  if (this.closed) {
    c0 = (intPoint - 1 + points.length) % points.length;
    c1 = intPoint % points.length;
    c2 = (intPoint + 1) % points.length;
    c3 = (intPoint + 2) % points.length;
  } else {
    c0 = intPoint == 0 ? intPoint : intPoint - 1;
    c1 = intPoint;
    c2 = intPoint > points.length - 2 ? intPoint : intPoint + 1;
    c3 = intPoint > points.length - 3 ? intPoint : intPoint + 2;
  }
  var vec = new Vec2();
  vec.x = this.interpolate(points[c0].x, points[c1].x, points[c2].x, points[c3].x, weight);
  vec.y = this.interpolate(points[c0].y, points[c1].y, points[c2].y, points[c3].y, weight);
  return vec;
};
//### addPoint ( p )
//Adds point to the spline
//
//`p` - point to be added *{ Vec2 }* 
Spline2D.prototype.addPoint = function (p) {
  this.dirtyLength = true;
  this.points.push(p);
};
//### getPointAt ( d )
//Gets position based on d-th of total length of the curve.
//Precise but might be slow at the first use due to need to precalculate length.
//
//`d` - *{ Number } <0, 1>*
Spline2D.prototype.getPointAt = function (d) {
  if (this.closed) {
    d = (d + 1) % 1;
  } else {
    d = Math.max(0, Math.min(d, 1));
  }
  if (this.dirtyLength) {
    this.precalculateLength();
  }
  //TODO: try binary search
  var k = 0;
  for (var i = 0; i < this.accumulatedLengthRatios.length; i++) {
    if (this.accumulatedLengthRatios[i] > d - 1/this.samplesCount) {
      k = this.accumulatedRatios[i];
      break;
    }
  }
  return this.getPoint(k);
};

//naive implementation
Spline2D.prototype.getClosestPoint = function(point) {
  if (this.dirtyLength) {
    this.precalculateLength();
  }
  var closesPoint = this.precalculatedPoints.reduce(function(best, p) {
    var dist = point.squareDistance(p);
    if (dist < best.dist) {
      return { dist: dist, point: p };
    }
    else return best;
  }, { dist: Infinity, point: null });
  return closesPoint.point;
}

Spline2D.prototype.getClosestPointRatio = function(point) {
  if (this.dirtyLength) {
    this.precalculateLength();
  }
  var closesPoint = this.precalculatedPoints.reduce(function(best, p, pIndex) {
    var dist = point.squareDistance(p);
    if (dist < best.dist) {
      return { dist: dist, point: p, index: pIndex };
    }
    else return best;
  }, { dist: Infinity, point: null, index: -1 });
  return this.accumulatedLengthRatios[closesPoint.index];
}

//### getPointAtIndex ( i )
//Returns position of i-th point forming the curve
//
//`i` - *{ Number } <0, Spline2D.points.length)*
Spline2D.prototype.getPointAtIndex = function (i) {
  if (i < this.points.length) {
    return this.points[i];
  } else {
    return null;
  }
};
//### getNumPoints ( )
//Return number of base points in the spline
Spline2D.prototype.getNumPoints = function () {
  return this.points.length;
};
//### getLength ( )
//Returns the total length of the spline.
Spline2D.prototype.getLength = function () {
  if (this.dirtyLength) {
    this.precalculateLength();
  }
  return this.length;
};
//### precalculateLength ( )
//Goes through all the segments of the curve and calculates total length and
//the ratio of each segment.
Spline2D.prototype.precalculateLength = function () {
  var step = 1 / this.samplesCount;
  var k = 0;
  var totalLength = 0;
  this.accumulatedRatios = [];
  this.accumulatedLengthRatios = [];
  this.accumulatedLengths = [];
  this.precalculatedPoints = [];
  var point;
  var prevPoint;
  for (var i = 0; i < this.samplesCount; i++) {
    prevPoint = point;
    point = this.getPoint(k);
    if (i > 0) {
      var len = point.dup().sub(prevPoint).length();
      totalLength += len;
    }
    this.accumulatedRatios.push(k);
    this.accumulatedLengths.push(totalLength);
    this.precalculatedPoints.push(point);
    k += step;
  }
  for (var i = 0; i < this.samplesCount; i++) {
    this.accumulatedLengthRatios.push(this.accumulatedLengths[i] / totalLength);
  }
  this.length = totalLength;
  this.dirtyLength = false;
};
//### close ( )
//Closes the spline. It will form a closed now.
Spline2D.prototype.close = function () {
  this.closed = true;
};
//### isClosed ( )
//Returns true if spline is closed (forms a closed) *{ Boolean }*
Spline2D.prototype.isClosed = function () {
  return this.closed;
};
//### interpolate ( p0, p1, p2, p3, t)
//Helper function to calculate Catmul-Rom spline equation  
//
//`p0` - previous value *{ Number }*  
//`p1` - current value *{ Number }*  
//`p2` - next value *{ Number }*  
//`p3` - next next value *{ Number }*  
//`t` - parametric distance between p1 and p2 *{ Number } <0, 1>*
Spline2D.prototype.interpolate = function (p0, p1, p2, p3, t) {
  var v0 = (p2 - p0) * 0.5;
  var v1 = (p3 - p1) * 0.5;
  var t2 = t * t;
  var t3 = t * t2;
  return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
};

module.exports = Spline2D;
},{"./Vec2":29}],27:[function(require,module,exports){
//Camtull-Rom spline implementation  
//Inspired by code from [Tween.js][1]
//[1]: http://sole.github.com/tween.js/examples/05_spline.html
//## Example use 
//
//     var points = [ 
//       new Vec3(-2,  0, 0), 
//       new Vec3(-1,  0, 0), 
//       new Vec3( 1,  1, 0), 
//       new Vec3( 2, -1, 0) 
//     ];
//
//     var spline = new Spline3D(points);
//
//     spline.getPointAt(0.25);
//## Reference

var Vec3 = require('./Vec3');

//### Spline3D ( points, [ closed ] )
//`points` - *{ Array of Vec3 }* = [ ]  
//`closed` - is the spline a closed loop? *{ Boolean }* = false
function Spline3D(points, closed) {
  this.points = points || [];
  this.dirtyLength = true;
  this.closed = closed || false;
  this.samplesCount = 1000;
}
//### getPoint ( t )
//Gets position based on t-value.
//It is fast, but resulting points will not be evenly distributed.
//
//`t` - *{ Number } <0, 1>*
//returns [Vec3](Vec3.html)
Spline3D.prototype.getPoint = function (t) {
  if (this.closed) {
    t = (t + 1) % 1;
  } else {
    t = Math.max(0, Math.min(t, 1));
  }
  var points = this.points;
  var len = this.closed ? points.length : points.length - 1;
  var point = t * len;
  var intPoint = Math.floor(point);
  var weight = point - intPoint;
  var c0, c1, c2, c3;
  if (this.closed) {
    c0 = (intPoint - 1 + points.length) % points.length;
    c1 = intPoint % points.length;
    c2 = (intPoint + 1) % points.length;
    c3 = (intPoint + 2) % points.length;
  } else {
    c0 = intPoint == 0 ? intPoint : intPoint - 1;
    c1 = intPoint;
    c2 = intPoint > points.length - 2 ? intPoint : intPoint + 1;
    c3 = intPoint > points.length - 3 ? intPoint : intPoint + 2;
  }
  var vec = new Vec3();
  vec.x = this.interpolate(points[c0].x, points[c1].x, points[c2].x, points[c3].x, weight);
  vec.y = this.interpolate(points[c0].y, points[c1].y, points[c2].y, points[c3].y, weight);
  vec.z = this.interpolate(points[c0].z, points[c1].z, points[c2].z, points[c3].z, weight);
  return vec;
};
//### addPoint ( p )
//Adds point to the spline
//
//`p` - point to be added *{ Vec3 }* 
Spline3D.prototype.addPoint = function (p) {
  this.dirtyLength = true;
  this.points.push(p);
};
//### getPointAt ( d )
//Gets position based on d-th of total length of the curve.
//Precise but might be slow at the first use due to need to precalculate length.
//
//`d` - *{ Number } <0, 1>*
Spline3D.prototype.getPointAt = function (d) {
  if (this.closed) {
    d = (d + 1) % 1;
  } else {
    d = Math.max(0, Math.min(d, 1));
  }
  if (this.dirtyLength) {
    this.precalculateLength();
  }
  //TODO: try binary search
  var k = 0;
  for (var i = 0; i < this.accumulatedLengthRatios.length; i++) {
    if (this.accumulatedLengthRatios[i] > d - 1/this.samplesCount) {
      k = this.accumulatedRatios[i];
      break;
    }
  }
  return this.getPoint(k);
};

//naive implementation
Spline3D.prototype.getClosestPoint = function(point) {
  if (this.dirtyLength) {
    this.precalculateLength();
  }
  var closesPoint = this.precalculatedPoints.reduce(function(best, p) {
    var dist = point.squareDistance(p);
    if (dist < best.dist) {
      return { dist: dist, point: p };
    }
    else return best;
  }, { dist: Infinity, point: null });
  return closesPoint.point;
}

Spline3D.prototype.getClosestPointRatio = function(point) {
  if (this.dirtyLength) {
    this.precalculateLength();
  }
  var closesPoint = this.precalculatedPoints.reduce(function(best, p, pIndex) {
    var dist = point.squareDistance(p);
    if (dist < best.dist) {
      return { dist: dist, point: p, index: pIndex };
    }
    else return best;
  }, { dist: Infinity, point: null, index: -1 });
  return this.accumulatedLengthRatios[closesPoint.index];
}

//### getTangentAt ( t )
Spline3D.prototype.getTangentAt = function(t) {
  var currT = (t < 0.99) ? t : t - 0.01;
  var nextT  = (t < 0.99) ? t + 0.01 : t;
  var p = this.getPointAt(currT);
  var np = this.getPointAt(nextT);
  return Vec3.create().asSub(np, p).normalize();
};
//### getPointAtIndex ( i )
//Returns position of i-th point forming the curve
//
//`i` - *{ Number } <0, Spline3D.points.length)*
Spline3D.prototype.getPointAtIndex = function (i) {
  if (i < this.points.length) {
    return this.points[i];
  } else {
    return null;
  }
};
//### getNumPoints ( )
//Return number of base points in the spline
Spline3D.prototype.getNumPoints = function () {
  return this.points.length;
};
//### getLength ( )
//Returns the total length of the spline.
Spline3D.prototype.getLength = function () {
  if (this.dirtyLength) {
    this.precalculateLength();
  }
  return this.length;
};
//### precalculateLength ( )
//Goes through all the segments of the curve and calculates total length and
//the ratio of each segment.
Spline3D.prototype.precalculateLength = function () {
  var step = 1 / this.samplesCount;
  var k = 0;
  var totalLength = 0;
  this.accumulatedRatios = [];
  this.accumulatedLengthRatios = [];
  this.accumulatedLengths = [];
  this.precalculatedPoints = [];
  var point;
  var prevPoint;
  for (var i = 0; i < this.samplesCount; i++) {
    prevPoint = point;
    point = this.getPoint(k);
    if (i > 0) {
      var len = point.dup().sub(prevPoint).length();
      totalLength += len;
    }
    this.accumulatedRatios.push(k);
    this.accumulatedLengths.push(totalLength);
    this.precalculatedPoints.push(point);
    k += step;
  }
  for (var i = 0; i < this.samplesCount; i++) {
    this.accumulatedLengthRatios.push(this.accumulatedLengths[i] / totalLength);
  }
  this.length = totalLength;
  this.dirtyLength = false;
};
//### close ( )
//Closes the spline. It will form a closed now.
Spline3D.prototype.close = function () {
  this.closed = true;
};
//### isClosed ( )
//Returns true if spline is closed (forms a closed) *{ Boolean }*
Spline3D.prototype.isClosed = function () {
  return this.closed;
};
//### interpolate ( p0, p1, p2, p3, t)
//Helper function to calculate Catmul-Rom spline equation  
//
//`p0` - previous value *{ Number }*  
//`p1` - current value *{ Number }*  
//`p2` - next value *{ Number }*  
//`p3` - next next value *{ Number }*  
//`t` - parametric distance between p1 and p2 *{ Number } <0, 1>*
Spline3D.prototype.interpolate = function (p0, p1, p2, p3, t) {
  var v0 = (p2 - p0) * 0.5;
  var v1 = (p3 - p1) * 0.5;
  var t2 = t * t;
  var t3 = t * t2;
  return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
};

module.exports = Spline3D;
},{"./Vec3":30}],28:[function(require,module,exports){
function sign(a, b, c) {
  return (a.x - c.x) * (b.y - c.y) - (b.x - c.x) * (a.y - c.y);
}

function Triangle2D(a, b, c) {
  this.a = a;
  this.b = b;
  this.c = c;
}

//http://stackoverflow.com/a/2049593
//doesn't properly handle points on the edge of the triangle
Triangle2D.prototype.contains = function (p) {
  var signAB = sign(this.a, this.b, p) < 0;
  var signBC = sign(this.b, this.c, p) < 0;
  var signCA = sign(this.c, this.a, p) < 0;
  return signAB == signBC && signBC == signCA;
};

module.exports = Triangle2D;
},{}],29:[function(require,module,exports){
function Vec2(x, y) {
  this.x = x != null ? x : 0;
  this.y = y != null ? y : 0;
}

Vec2.create = function(x, y) {
  return new Vec2(x, y);
};

Vec2.prototype.set = function(x, y) {
  this.x = x;
  this.y = y;
  return this;
};

Vec2.prototype.equals = function(v, tolerance) {
  if (tolerance == null) {
    tolerance = 0.0000001;
  }
  return (Math.abs(v.x - this.x) <= tolerance) && (Math.abs(v.y - this.y) <= tolerance);
};

Vec2.prototype.hash = function() {
  return 1 * this.x + 12 * this.y;
};

Vec2.prototype.setVec2 = function(v) {
  this.x = v.x;
  this.y = v.y;
  return this;
};

Vec2.prototype.add = function(v) {
  this.x += v.x;
  this.y += v.y;
  return this;
};

Vec2.prototype.sub = function(v) {
  this.x -= v.x;
  this.y -= v.y;
  return this;
};

Vec2.prototype.scale = function(f) {
  this.x *= f;
  this.y *= f;
  return this;
};

Vec2.prototype.distance = function(v) {
  var dx = v.x - this.x;
  var dy = v.y - this.y;
  return Math.sqrt(dx * dx + dy * dy);
};

Vec2.prototype.squareDistance = function(v) {
  var dx = v.x - this.x;
  var dy = v.y - this.y;
  return dx * dx + dy * dy;
};

Vec2.prototype.dot = function(b) {
  return this.x * b.x + this.y * b.y;
};

Vec2.prototype.copy = function(v) {
  this.x = v.x;
  this.y = v.y;
  return this;
};

Vec2.prototype.clone = function() {
  return new Vec2(this.x, this.y);
};

Vec2.prototype.dup = function() {
  return this.clone();
};

Vec2.prototype.asAdd = function(a, b) {
  this.x = a.x + b.x;
  this.y = a.y + b.y;
  return this;
};

Vec2.prototype.asSub = function(a, b) {
  this.x = a.x - b.x;
  this.y = a.y - b.y;
  return this;
};

Vec2.prototype.length = function() {
  return Math.sqrt(this.x * this.x + this.y * this.y);
};

Vec2.prototype.normalize = function() {
  var len = this.length();
  if (len > 0) {
    this.scale(1 / len);
  }
  return this;
};

Vec2.prototype.toString = function() {
  return "{" + Math.floor(this.x*1000)/1000 + ", " + Math.floor(this.y*1000)/1000 + "}";
};

module.exports = Vec2;

},{}],30:[function(require,module,exports){
function Vec3(x, y, z) {
  this.x = x != null ? x : 0;
  this.y = y != null ? y : 0;
  this.z = z != null ? z : 0;
}

Vec3.create = function(x, y, z) {
  return new Vec3(x, y, z);
};

Vec3.prototype.hash = function() {
  return 1 * this.x + 12 * this.y + 123 * this.z;
};

Vec3.prototype.set = function(x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
  return this;
};

Vec3.prototype.add = function(v) {
  this.x += v.x;
  this.y += v.y;
  this.z += v.z;
  return this;
};

Vec3.prototype.sub = function(v) {
  this.x -= v.x;
  this.y -= v.y;
  this.z -= v.z;
  return this;
};

Vec3.prototype.scale = function(f) {
  this.x *= f;
  this.y *= f;
  this.z *= f;
  return this;
};

Vec3.prototype.distance = function(v) {
  var dx = v.x - this.x;
  var dy = v.y - this.y;
  var dz = v.z - this.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

Vec3.prototype.squareDistance = function(v) {
  var dx = v.x - this.x;
  var dy = v.y - this.y;
  var dz = v.z - this.z;
  return dx * dx + dy * dy + dz * dz;
};

Vec3.prototype.copy = function(v) {
  this.x = v.x;
  this.y = v.y;
  this.z = v.z;
  return this;
};

Vec3.prototype.setVec3 = function(v) {
  this.x = v.x;
  this.y = v.y;
  this.z = v.z;
  return this;
};

Vec3.prototype.clone = function() {
  return new Vec3(this.x, this.y, this.z);
};

Vec3.prototype.dup = function() {
  return this.clone();
};

Vec3.prototype.cross = function(v) {
  var x = this.x;
  var y = this.y;
  var z = this.z;
  var vx = v.x;
  var vy = v.y;
  var vz = v.z;
  this.x = y * vz - z * vy;
  this.y = z * vx - x * vz;
  this.z = x * vy - y * vx;
  return this;
};

Vec3.prototype.dot = function(b) {
  return this.x * b.x + this.y * b.y + this.z * b.z;
};

Vec3.prototype.asAdd = function(a, b) {
  this.x = a.x + b.x;
  this.y = a.y + b.y;
  this.z = a.z + b.z;
  return this;
};

Vec3.prototype.asSub = function(a, b) {
  this.x = a.x - b.x;
  this.y = a.y - b.y;
  this.z = a.z - b.z;
  return this;
};

Vec3.prototype.asCross = function(a, b) {
  return this.copy(a).cross(b);
};

Vec3.prototype.addScaled = function(a, f) {
  this.x += a.x * f;
  this.y += a.y * f;
  this.z += a.z * f;
  return this;
};

Vec3.prototype.length = function() {
  return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
};

Vec3.prototype.lengthSquared = function() {
  return this.x * this.x + this.y * this.y + this.z * this.z;
};

Vec3.prototype.normalize = function() {
  var len = this.length();
  if (len > 0) {
    this.scale(1 / len);
  }
  return this;
};

Vec3.prototype.transformQuat = function(q) {
  var x = this.x;
  var y = this.y;
  var z = this.z;
  var qx = q.x;
  var qy = q.y;
  var qz = q.z;
  var qw = q.w;
  var ix = qw * x + qy * z - qz * y;
  var iy = qw * y + qz * x - qx * z;
  var iz = qw * z + qx * y - qy * x;
  var iw = -qx * x - qy * y - qz * z;
  this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
  this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
  this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
  return this;
};

Vec3.prototype.transformMat4 = function(m) {
  var x = m.a14 + m.a11 * this.x + m.a12 * this.y + m.a13 * this.z;
  var y = m.a24 + m.a21 * this.x + m.a22 * this.y + m.a23 * this.z;
  var z = m.a34 + m.a31 * this.x + m.a32 * this.y + m.a33 * this.z;
  this.x = x;
  this.y = y;
  this.z = z;
  return this;
};

Vec3.prototype.equals = function(v, tolerance) {
  tolerance = tolerance != null ? tolerance : 0.0000001;
  return (Math.abs(v.x - this.x) <= tolerance) && (Math.abs(v.y - this.y) <= tolerance) && (Math.abs(v.z - this.z) <= tolerance);
};

Vec3.prototype.toString = function() {
  return "{" + Math.floor(this.x*1000)/1000 + ", " + Math.floor(this.y*1000)/1000 + ", " + Math.floor(this.z*1000)/1000 + "}";
};

Vec3.Zero = new Vec3(0, 0, 0);

module.exports = Vec3;

},{}],31:[function(require,module,exports){
function Vec4(x, y, z, w) {
  this.x = x != null ? x : 0;
  this.y = y != null ? y : 0;
  this.z = z != null ? z : 0;
  this.w = w != null ? w : 0;
}

Vec4.prototype.equals = function(v, tolerance) {
  if (tolerance == null) {
    tolerance = 0.0000001;
  }
  return (Math.abs(v.x - this.x) <= tolerance) && (Math.abs(v.y - this.y) <= tolerance) && (Math.abs(v.z - this.z) <= tolerance) && (Math.abs(v.w - this.w) <= tolerance);
};

Vec4.prototype.hash = function() {
  return 1 * this.x + 12 * this.y + 123 * this.z + 1234 * this.w;
};

Vec4.create = function(x, y, z, w) {
  return new Vec4(x, y, z, w);
};

Vec4.prototype.set = function(x, y, z, w) {
  this.x = x;
  this.y = y;
  this.z = z;
  this.w = w;
  return this;
};

Vec4.prototype.setVec4 = function(v) {
  this.x = v.x;
  this.y = v.y;
  this.z = v.z;
  this.w = v.w;
  return this;
};

Vec4.prototype.transformMat4 = function(m) {
  var x = m.a14 * this.w + m.a11 * this.x + m.a12 * this.y + m.a13 * this.z;
  var y = m.a24 * this.w + m.a21 * this.x + m.a22 * this.y + m.a23 * this.z;
  var z = m.a34 * this.w + m.a31 * this.x + m.a32 * this.y + m.a33 * this.z;
  var w = m.a44 * this.w + m.a41 * this.x + m.a42 * this.y + m.a43 * this.z;
  this.x = x;
  this.y = y;
  this.z = z;
  this.w = w;
  return this;
};

Vec4.prototype.toString = function() {
  return "{" + Math.floor(this.x*1000)/1000 + ", " + Math.floor(this.y*1000)/1000 + ", " + Math.floor(this.z*1000)/1000 + ", " + Math.floor(this.w*1000)/1000 + "}";
};

module.exports = Vec4;

},{}],32:[function(require,module,exports){
// seedrandom.js version 2.3.4
// Author: David Bau
// Date: 2014 Mar 9
//
// Defines a method Math.seedrandom() that, when called, substitutes
// an explicitly seeded RC4-based algorithm for Math.random().  Also
// supports automatic seeding from local or network sources of entropy.
// Can be used as a node.js or AMD module.  Can be called with "new"
// to create a local PRNG without changing Math.random.
//
// Basic usage:
//
//   <script src=http://davidbau.com/encode/seedrandom.min.js></script>
//
//   Math.seedrandom('yay.');  // Sets Math.random to a function that is
//                             // initialized using the given explicit seed.
//
//   Math.seedrandom();        // Sets Math.random to a function that is
//                             // seeded using the current time, dom state,
//                             // and other accumulated local entropy.
//                             // The generated seed string is returned.
//
//   Math.seedrandom('yowza.', true);
//                             // Seeds using the given explicit seed mixed
//                             // together with accumulated entropy.
//
//   <script src="https://jsonlib.appspot.com/urandom?callback=Math.seedrandom">
//   </script>                 <!-- Seeds using urandom bits from a server. -->
//
//   Math.seedrandom("hello.");           // Behavior is the same everywhere:
//   document.write(Math.random());       // Always 0.9282578795792454
//   document.write(Math.random());       // Always 0.3752569768646784
//
// Math.seedrandom can be used as a constructor to return a seeded PRNG
// that is independent of Math.random:
//
//   var myrng = new Math.seedrandom('yay.');
//   var n = myrng();          // Using "new" creates a local prng without
//                             // altering Math.random.
//
// When used as a module, seedrandom is a function that returns a seeded
// PRNG instance without altering Math.random:
//
//   // With node.js (after "npm install seedrandom"):
//   var seedrandom = require('seedrandom');
//   var rng = seedrandom('hello.');
//   console.log(rng());                  // always 0.9282578795792454
//
//   // With require.js or other AMD loader:
//   require(['seedrandom'], function(seedrandom) {
//     var rng = seedrandom('hello.');
//     console.log(rng());                // always 0.9282578795792454
//   });
//
// More examples:
//
//   var seed = Math.seedrandom();        // Use prng with an automatic seed.
//   document.write(Math.random());       // Pretty much unpredictable x.
//
//   var rng = new Math.seedrandom(seed); // A new prng with the same seed.
//   document.write(rng());               // Repeat the 'unpredictable' x.
//
//   function reseed(event, count) {      // Define a custom entropy collector.
//     var t = [];
//     function w(e) {
//       t.push([e.pageX, e.pageY, +new Date]);
//       if (t.length < count) { return; }
//       document.removeEventListener(event, w);
//       Math.seedrandom(t, true);        // Mix in any previous entropy.
//     }
//     document.addEventListener(event, w);
//   }
//   reseed('mousemove', 100);            // Reseed after 100 mouse moves.
//
// The callback third arg can be used to get both the prng and the seed.
// The following returns both an autoseeded prng and the seed as an object,
// without mutating Math.random:
//
//   var obj = Math.seedrandom(null, false, function(prng, seed) {
//     return { random: prng, seed: seed };
//   });
//
// Version notes:
//
// The random number sequence is the same as version 1.0 for string seeds.
// * Version 2.0 changed the sequence for non-string seeds.
// * Version 2.1 speeds seeding and uses window.crypto to autoseed if present.
// * Version 2.2 alters non-crypto autoseeding to sweep up entropy from plugins.
// * Version 2.3 adds support for "new", module loading, and a null seed arg.
// * Version 2.3.1 adds a build environment, module packaging, and tests.
// * Version 2.3.3 fixes bugs on IE8, and switches to MIT license.
// * Version 2.3.4 fixes documentation to contain the MIT license.
//
// The standard ARC4 key scheduler cycles short keys, which means that
// seedrandom('ab') is equivalent to seedrandom('abab') and 'ababab'.
// Therefore it is a good idea to add a terminator to avoid trivial
// equivalences on short string seeds, e.g., Math.seedrandom(str + '\0').
// Starting with version 2.0, a terminator is added automatically for
// non-string seeds, so seeding with the number 111 is the same as seeding
// with '111\0'.
//
// When seedrandom() is called with zero args or a null seed, it uses a
// seed drawn from the browser crypto object if present.  If there is no
// crypto support, seedrandom() uses the current time, the native rng,
// and a walk of several DOM objects to collect a few bits of entropy.
//
// Each time the one- or two-argument forms of seedrandom are called,
// entropy from the passed seed is accumulated in a pool to help generate
// future seeds for the zero- and two-argument forms of seedrandom.
//
// On speed - This javascript implementation of Math.random() is several
// times slower than the built-in Math.random() because it is not native
// code, but that is typically fast enough.  Some details (timings on
// Chrome 25 on a 2010 vintage macbook):
//
// seeded Math.random()          - avg less than 0.0002 milliseconds per call
// seedrandom('explicit.')       - avg less than 0.2 milliseconds per call
// seedrandom('explicit.', true) - avg less than 0.2 milliseconds per call
// seedrandom() with crypto      - avg less than 0.2 milliseconds per call
//
// Autoseeding without crypto is somewhat slower, about 20-30 milliseconds on
// a 2012 windows 7 1.5ghz i5 laptop, as seen on Firefox 19, IE 10, and Opera.
// Seeded rng calls themselves are fast across these browsers, with slowest
// numbers on Opera at about 0.0005 ms per seeded Math.random().
//
// LICENSE (MIT):
//
// Copyright (c)2014 David Bau.
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
// CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

/**
 * All code is in an anonymous closure to keep the global namespace clean.
 */
(function (
    global, pool, math, width, chunks, digits, module, define, rngname) {

//
// The following constants are related to IEEE 754 limits.
//
var startdenom = math.pow(width, chunks),
    significance = math.pow(2, digits),
    overflow = significance * 2,
    mask = width - 1,

//
// seedrandom()
// This is the seedrandom function described above.
//
impl = math['seed' + rngname] = function(seed, use_entropy, callback) {
  var key = [];

  // Flatten the seed string or build one from local entropy if needed.
  var shortseed = mixkey(flatten(
    use_entropy ? [seed, tostring(pool)] :
    (seed == null) ? autoseed() : seed, 3), key);

  // Use the seed to initialize an ARC4 generator.
  var arc4 = new ARC4(key);

  // Mix the randomness into accumulated entropy.
  mixkey(tostring(arc4.S), pool);

  // Calling convention: what to return as a function of prng, seed, is_math.
  return (callback ||
      // If called as a method of Math (Math.seedrandom()), mutate Math.random
      // because that is how seedrandom.js has worked since v1.0.  Otherwise,
      // it is a newer calling convention, so return the prng directly.
      function(prng, seed, is_math_call) {
        if (is_math_call) { math[rngname] = prng; return seed; }
        else return prng;
      })(

  // This function returns a random double in [0, 1) that contains
  // randomness in every bit of the mantissa of the IEEE 754 value.
  function() {
    var n = arc4.g(chunks),             // Start with a numerator n < 2 ^ 48
        d = startdenom,                 //   and denominator d = 2 ^ 48.
        x = 0;                          //   and no 'extra last byte'.
    while (n < significance) {          // Fill up all significant digits by
      n = (n + x) * width;              //   shifting numerator and
      d *= width;                       //   denominator and generating a
      x = arc4.g(1);                    //   new least-significant-byte.
    }
    while (n >= overflow) {             // To avoid rounding up, before adding
      n /= 2;                           //   last byte, shift everything
      d /= 2;                           //   right using integer math until
      x >>>= 1;                         //   we have exactly the desired bits.
    }
    return (n + x) / d;                 // Form the number within [0, 1).
  }, shortseed, this == math);
};

//
// ARC4
//
// An ARC4 implementation.  The constructor takes a key in the form of
// an array of at most (width) integers that should be 0 <= x < (width).
//
// The g(count) method returns a pseudorandom integer that concatenates
// the next (count) outputs from ARC4.  Its return value is a number x
// that is in the range 0 <= x < (width ^ count).
//
/** @constructor */
function ARC4(key) {
  var t, keylen = key.length,
      me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];

  // The empty key [] is treated as [0].
  if (!keylen) { key = [keylen++]; }

  // Set up S using the standard key scheduling algorithm.
  while (i < width) {
    s[i] = i++;
  }
  for (i = 0; i < width; i++) {
    s[i] = s[j = mask & (j + key[i % keylen] + (t = s[i]))];
    s[j] = t;
  }

  // The "g" method returns the next (count) outputs as one number.
  (me.g = function(count) {
    // Using instance members instead of closure state nearly doubles speed.
    var t, r = 0,
        i = me.i, j = me.j, s = me.S;
    while (count--) {
      t = s[i = mask & (i + 1)];
      r = r * width + s[mask & ((s[i] = s[j = mask & (j + t)]) + (s[j] = t))];
    }
    me.i = i; me.j = j;
    return r;
    // For robust unpredictability discard an initial batch of values.
    // See http://www.rsa.com/rsalabs/node.asp?id=2009
  })(width);
}

//
// flatten()
// Converts an object tree to nested arrays of strings.
//
function flatten(obj, depth) {
  var result = [], typ = (typeof obj), prop;
  if (depth && typ == 'object') {
    for (prop in obj) {
      try { result.push(flatten(obj[prop], depth - 1)); } catch (e) {}
    }
  }
  return (result.length ? result : typ == 'string' ? obj : obj + '\0');
}

//
// mixkey()
// Mixes a string seed into a key that is an array of integers, and
// returns a shortened string seed that is equivalent to the result key.
//
function mixkey(seed, key) {
  var stringseed = seed + '', smear, j = 0;
  while (j < stringseed.length) {
    key[mask & j] =
      mask & ((smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++));
  }
  return tostring(key);
}

//
// autoseed()
// Returns an object for autoseeding, using window.crypto if available.
//
/** @param {Uint8Array|Navigator=} seed */
function autoseed(seed) {
  try {
    global.crypto.getRandomValues(seed = new Uint8Array(width));
    return tostring(seed);
  } catch (e) {
    return [+new Date, global, (seed = global.navigator) && seed.plugins,
            global.screen, tostring(pool)];
  }
}

//
// tostring()
// Converts an array of charcodes to a string
//
function tostring(a) {
  return String.fromCharCode.apply(0, a);
}

//
// When seedrandom.js is loaded, we immediately mix a few bits
// from the built-in RNG into the entropy pool.  Because we do
// not want to intefere with determinstic PRNG state later,
// seedrandom will not call math.random on its own again after
// initialization.
//
mixkey(math[rngname](), pool);

//
// Nodejs and AMD support: export the implemenation as a module using
// either convention.
//
if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
}

// End anonymous scope, and pass initial values.
})(
  this,   // global window object
  [],     // pool: entropy pool starts empty
  Math,   // math: package containing random, pow, and seedrandom
  256,    // width: each RC4 output is 0 <= x < 256
  6,      // chunks: at least six RC4 outputs for each double
  52,     // digits: there are 52 significant digits in a double
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define,  // present with an AMD loader
  'random'// rngname: name for Math.random and Math.seedrandom
);

},{}],33:[function(require,module,exports){
module.exports.Context = require('./lib/Context');
module.exports.Texture2D = require('./lib/Texture2D');
module.exports.TextureCube = require('./lib/TextureCube');
module.exports.Program = require('./lib/Program');
module.exports.Material = require('./lib/Material');
module.exports.Mesh = require('./lib/Mesh');
module.exports.OrthographicCamera = require('./lib/OrthographicCamera');
module.exports.PerspectiveCamera = require('./lib/PerspectiveCamera');
module.exports.Arcball = require('./lib/Arcball');
module.exports.ScreenImage = require('./lib/ScreenImage');
module.exports.RenderTarget = require('./lib/RenderTarget');

//export all functions from Utils to module exports
var Utils = require('./lib/Utils');
for(var funcName in Utils) {
  module.exports[funcName] = Utils[funcName];
}


},{"./lib/Arcball":34,"./lib/Context":36,"./lib/Material":37,"./lib/Mesh":38,"./lib/OrthographicCamera":39,"./lib/PerspectiveCamera":40,"./lib/Program":41,"./lib/RenderTarget":42,"./lib/ScreenImage":44,"./lib/Texture2D":46,"./lib/TextureCube":47,"./lib/Utils":48}],34:[function(require,module,exports){
// Generated by CoffeeScript 1.7.1
var Arcball, Mat4, Plane, Quat, Vec2, Vec3, Vec4, _ref;

_ref = require('pex-geom'), Vec2 = _ref.Vec2, Vec3 = _ref.Vec3, Vec4 = _ref.Vec4, Quat = _ref.Quat, Mat4 = _ref.Mat4, Plane = _ref.Plane;

Arcball = (function() {
  function Arcball(window, camera, distance) {
    this.camera = camera;
    this.window = window;
    this.radius = Math.min(window.width / 2, window.height / 2) * 2;
    this.center = Vec2.create(window.width / 2, window.height / 2);
    this.currRot = Quat.create();
    this.currRot.setAxisAngle(Vec3.create(0, 1, 0), 0);
    this.clickRot = Quat.create();
    this.dragRot = Quat.create();
    this.clickPos = Vec3.create();
    this.clickPosWindow = Vec2.create();
    this.dragPos = Vec3.create();
    this.dragPosWindow = Vec2.create();
    this.rotAxis = Vec3.create();
    this.allowZooming = true;
    this.enabled = true;
    this.clickTarget = Vec3.create(0, 0, 0);
    this.setDistance(distance || 2);
    this.updateCamera();
    this.addEventHanlders();
  }

  Arcball.prototype.setTarget = function(target) {
    this.camera.setTarget(target);
    return this.updateCamera();
  };

  Arcball.prototype.setOrientation = function(dir) {
    this.currRot.setDirection(dir);
    this.currRot.w *= -1;
    this.updateCamera();
    return this;
  };

  Arcball.prototype.setPosition = function(pos) {
    var dir;
    dir = Vec3.create().asSub(pos, this.camera.getTarget());
    this.setOrientation(dir.dup().normalize());
    this.setDistance(dir.length());
    return this.updateCamera();
  };

  Arcball.prototype.addEventHanlders = function() {
    this.window.on('leftMouseDown', (function(_this) {
      return function(e) {
        if (e.handled || !_this.enabled) {
          return;
        }
        return _this.down(e.x, e.y, e.shift);
      };
    })(this));
    this.window.on('leftMouseUp', (function(_this) {
      return function(e) {
        return _this.up(e.x, e.y, e.shift);
      };
    })(this));
    this.window.on('mouseDragged', (function(_this) {
      return function(e) {
        if (e.handled || !_this.enabled) {
          return;
        }
        return _this.drag(e.x, e.y, e.shift);
      };
    })(this));
    return this.window.on('scrollWheel', (function(_this) {
      return function(e) {
        if (e.handled || !_this.enabled) {
          return;
        }
        if (!_this.allowZooming) {
          return;
        }
        _this.distance = Math.min(_this.maxDistance, Math.max(_this.distance + e.dy / 100 * (_this.maxDistance - _this.minDistance), _this.minDistance));
        return _this.updateCamera();
      };
    })(this));
  };

  Arcball.prototype.mouseToSphere = function(x, y) {
    var dist, v;
    y = this.window.height - y;
    v = Vec3.create((x - this.center.x) / this.radius, (y - this.center.y) / this.radius, 0);
    dist = v.x * v.x + v.y * v.y;
    if (dist > 1) {
      v.normalize();
    } else {
      v.z = Math.sqrt(1.0 - dist);
    }
    return v;
  };

  Arcball.prototype.down = function(x, y, shift) {
    var target, targetInViewSpace;
    this.dragging = true;
    this.clickPos = this.mouseToSphere(x, y);
    this.clickRot.copy(this.currRot);
    this.updateCamera();
    if (shift) {
      this.clickPosWindow.set(x, y);
      target = this.camera.getTarget();
      this.clickTarget = target.dup();
      targetInViewSpace = target.dup().transformMat4(this.camera.getViewMatrix());
      this.panPlane = new Plane(targetInViewSpace, new Vec3(0, 0, 1));
      this.clickPosPlane = this.panPlane.intersectRay(this.camera.getViewRay(this.clickPosWindow.x, this.clickPosWindow.y, this.window.width, this.window.height));
      return this.dragPosPlane = this.panPlane.intersectRay(this.camera.getViewRay(this.dragPosWindow.x, this.dragPosWindow.y, this.window.width, this.window.height));
    } else {
      return this.panPlane = null;
    }
  };

  Arcball.prototype.up = function(x, y, shift) {
    this.dragging = false;
    return this.panPlane = null;
  };

  Arcball.prototype.drag = function(x, y, shift) {
    var invViewMatrix, theta;
    if (!this.dragging) {
      return;
    }
    if (shift && this.panPlane) {
      this.dragPosWindow.set(x, y);
      this.clickPosPlane = this.panPlane.intersectRay(this.camera.getViewRay(this.clickPosWindow.x, this.clickPosWindow.y, this.window.width, this.window.height));
      this.dragPosPlane = this.panPlane.intersectRay(this.camera.getViewRay(this.dragPosWindow.x, this.dragPosWindow.y, this.window.width, this.window.height));
      invViewMatrix = this.camera.getViewMatrix().dup().invert();
      this.clickPosWorld = this.clickPosPlane.dup().transformMat4(invViewMatrix);
      this.dragPosWorld = this.dragPosPlane.dup().transformMat4(invViewMatrix);
      this.diffWorld = this.dragPosWorld.dup().sub(this.clickPosWorld);
      this.camera.setTarget(this.clickTarget.dup().sub(this.diffWorld));
      this.updateCamera();
    } else {
      this.dragPos = this.mouseToSphere(x, y);
      this.rotAxis.asCross(this.clickPos, this.dragPos);
      theta = this.clickPos.dot(this.dragPos);
      this.dragRot.set(this.rotAxis.x, this.rotAxis.y, this.rotAxis.z, theta);
      this.currRot.asMul(this.dragRot, this.clickRot);
    }
    return this.updateCamera();
  };

  Arcball.prototype.updateCamera = function() {
    var eye, offset, q, target, up;
    q = this.currRot.clone();
    q.w *= -1;
    target = this.camera.getTarget();
    offset = Vec3.create(0, 0, this.distance).transformQuat(q);
    eye = Vec3.create().asAdd(target, offset);
    up = Vec3.create(0, 1, 0).transformQuat(q);
    return this.camera.lookAt(target, eye, up);
  };

  Arcball.prototype.disableZoom = function() {
    return this.allowZooming = false;
  };

  Arcball.prototype.setDistance = function(distance) {
    this.distance = distance || 2;
    this.minDistance = distance / 2 || 0.3;
    this.maxDistance = distance * 2 || 5;
    return this.updateCamera();
  };

  return Arcball;

})();

module.exports = Arcball;

},{"pex-geom":15}],35:[function(require,module,exports){
// Generated by CoffeeScript 1.7.1
var Buffer, Color, Context, Edge, Face3, Face4, FacePolygon, Vec2, Vec3, Vec4, hasProperties, _ref;

_ref = require('pex-geom'), Vec2 = _ref.Vec2, Vec3 = _ref.Vec3, Vec4 = _ref.Vec4, Edge = _ref.Edge, Face3 = _ref.Face3, Face4 = _ref.Face4, FacePolygon = _ref.FacePolygon;

Color = require('pex-color').Color;

Context = require('./Context');

hasProperties = function(obj, list) {
  var prop, _i, _len;
  for (_i = 0, _len = list.length; _i < _len; _i++) {
    prop = list[_i];
    if (typeof obj[prop] === 'undefined') {
      return false;
    }
  }
  return true;
};

Buffer = (function() {
  function Buffer(target, type, data, usage) {
    this.gl = Context.currentContext;
    this.target = target;
    this.type = type;
    this.usage = usage || gl.STATIC_DRAW;
    this.dataBuf = null;
    if (data) {
      this.update(data, this.usage);
    }
  }

  Buffer.prototype.dispose = function() {
    this.gl.deleteBuffer(this.handle);
    return this.handle = null;
  };

  Buffer.prototype.update = function(data, usage) {
    var e, face, i, index, numIndices, v, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _len6, _len7, _m, _n, _o, _p;
    if (!this.handle) {
      this.handle = this.gl.createBuffer();
    }
    this.usage = usage || this.usage;
    if (!data || data.length === 0) {
      return;
    }
    if (!isNaN(data[0])) {
      if (!this.dataBuf || this.dataBuf.length !== data.length) {
        this.dataBuf = new this.type(data.length);
      }
      for (i = _i = 0, _len = data.length; _i < _len; i = ++_i) {
        v = data[i];
        this.dataBuf[i] = v;
        this.elementSize = 1;
      }
    } else if (hasProperties(data[0], ['x', 'y', 'z', 'w'])) {
      if (!this.dataBuf || this.dataBuf.length !== data.length * 4) {
        this.dataBuf = new this.type(data.length * 4);
        this.elementSize = 4;
      }
      for (i = _j = 0, _len1 = data.length; _j < _len1; i = ++_j) {
        v = data[i];
        this.dataBuf[i * 4 + 0] = v.x;
        this.dataBuf[i * 4 + 1] = v.y;
        this.dataBuf[i * 4 + 2] = v.z;
        this.dataBuf[i * 4 + 3] = v.w;
      }
    } else if (hasProperties(data[0], ['x', 'y', 'z'])) {
      if (!this.dataBuf || this.dataBuf.length !== data.length * 3) {
        this.dataBuf = new this.type(data.length * 3);
        this.elementSize = 3;
      }
      for (i = _k = 0, _len2 = data.length; _k < _len2; i = ++_k) {
        v = data[i];
        this.dataBuf[i * 3 + 0] = v.x;
        this.dataBuf[i * 3 + 1] = v.y;
        this.dataBuf[i * 3 + 2] = v.z;
      }
    } else if (hasProperties(data[0], ['x', 'y'])) {
      if (!this.dataBuf || this.dataBuf.length !== data.length * 2) {
        this.dataBuf = new this.type(data.length * 2);
        this.elementSize = 2;
      }
      for (i = _l = 0, _len3 = data.length; _l < _len3; i = ++_l) {
        v = data[i];
        this.dataBuf[i * 2 + 0] = v.x;
        this.dataBuf[i * 2 + 1] = v.y;
      }
    } else if (hasProperties(data[0], ['r', 'g', 'b', 'a'])) {
      if (!this.dataBuf || this.dataBuf.length !== data.length * 4) {
        this.dataBuf = new this.type(data.length * 4);
        this.elementSize = 4;
      }
      for (i = _m = 0, _len4 = data.length; _m < _len4; i = ++_m) {
        v = data[i];
        this.dataBuf[i * 4 + 0] = v.r;
        this.dataBuf[i * 4 + 1] = v.g;
        this.dataBuf[i * 4 + 2] = v.b;
        this.dataBuf[i * 4 + 3] = v.a;
      }
    } else if (data[0].length === 2) {
      if (!this.dataBuf || this.dataBuf.length !== data.length * 2) {
        this.dataBuf = new this.type(data.length * 2);
        this.elementSize = 1;
      }
      for (i = _n = 0, _len5 = data.length; _n < _len5; i = ++_n) {
        e = data[i];
        this.dataBuf[i * 2 + 0] = e[0];
        this.dataBuf[i * 2 + 1] = e[1];
      }
    } else if (data[0].length >= 3) {
      numIndices = 0;
      for (_o = 0, _len6 = data.length; _o < _len6; _o++) {
        face = data[_o];
        if (face.length === 3) {
          numIndices += 3;
        }
        if (face.length === 4) {
          numIndices += 6;
        }
        if (face.length > 4) {
          throw 'FacePolygons ' + face.length + ' + are not supported in RenderableGeometry Buffers';
        }
      }
      if (!this.dataBuf || this.dataBuf.length !== numIndices) {
        this.dataBuf = new this.type(numIndices);
        this.elementSize = 1;
      }
      index = 0;
      for (_p = 0, _len7 = data.length; _p < _len7; _p++) {
        face = data[_p];
        if (face.length === 3) {
          this.dataBuf[index + 0] = face[0];
          this.dataBuf[index + 1] = face[1];
          this.dataBuf[index + 2] = face[2];
          index += 3;
        }
        if (face.length === 4) {
          this.dataBuf[index + 0] = face[0];
          this.dataBuf[index + 1] = face[1];
          this.dataBuf[index + 2] = face[3];
          this.dataBuf[index + 3] = face[3];
          this.dataBuf[index + 4] = face[1];
          this.dataBuf[index + 5] = face[2];
          index += 6;
        }
      }
    } else {
      console.log('Buffer.unknown type', data.name, data[0]);
    }
    this.gl.bindBuffer(this.target, this.handle);
    return this.gl.bufferData(this.target, this.dataBuf, this.usage);
  };

  return Buffer;

})();

module.exports = Buffer;

},{"./Context":36,"pex-color":4,"pex-geom":15}],36:[function(require,module,exports){
var sys = require('pex-sys');

var currentGLContext = null;

var Context = {
};

Object.defineProperty(Context, 'currentContext', {
  get: function() { 
    if (currentGLContext) {
      return currentGLContext;
    }
    else if (sys.Window.currentWindow) {
      return sys.Window.currentWindow.gl;
    }
    else {
      return null;
    }
  },
  set: function(gl) {
    currentGLContext = gl;
  },
  enumerable: true,
  configurable: true
});

module.exports = Context;
},{"pex-sys":67}],37:[function(require,module,exports){
var Context = require('./Context');

function Material(program, uniforms) {
  this.gl = Context.currentContext;
  this.program = program;
  this.uniforms = uniforms || {};
  this.prevUniforms = {};
}

Material.prototype.use = function () {
  this.program.use();
  var numTextures = 0;
  for (var name in this.uniforms) {
    if (this.program.uniforms[name]) {
      if (this.program.uniforms[name].type == this.gl.SAMPLER_2D || this.program.uniforms[name].type == this.gl.SAMPLER_CUBE) {
        this.gl.activeTexture(this.gl.TEXTURE0 + numTextures);
        if (this.uniforms[name].width > 0 && this.uniforms[name].height > 0) {
          this.gl.bindTexture(this.uniforms[name].target, this.uniforms[name].handle);
          this.program.uniforms[name](numTextures);
        }
        numTextures++;
      } else {
        var newValue = this.uniforms[name];
        var oldValue = this.prevUniforms[name];
        var newHash = null;
        if (oldValue !== null) {
          if (newValue.hash) {
            newHash = newValue.hash();
            if (newHash == oldValue) {
              continue;
            }
          } else if (newValue == oldValue) {
            continue;
          }
        }
        this.program.uniforms[name](this.uniforms[name]);
        this.prevUniforms[name] = newHash ? newHash : newValue;
      }
    }
  }
};

module.exports = Material;
},{"./Context":36}],38:[function(require,module,exports){
// Generated by CoffeeScript 1.7.1
var BoundingBox, Context, Mat4, Mesh, Quat, RenderableGeometry, Vec3, merge, _ref;

merge = require('merge');

_ref = require('pex-geom'), Vec3 = _ref.Vec3, Quat = _ref.Quat, Mat4 = _ref.Mat4, BoundingBox = _ref.BoundingBox;

Context = require('./Context');

RenderableGeometry = require('./RenderableGeometry');

Mesh = (function() {
  function Mesh(geometry, material, options) {
    this.gl = Context.currentContext;
    this.geometry = merge(geometry, RenderableGeometry);
    this.material = material;
    options = options || {};
    this.primitiveType = options.primitiveType;
    if (this.primitiveType == null) {
      this.primitiveType = this.gl.TRIANGLES;
    }
    if (options.lines) {
      this.primitiveType = this.gl.LINES;
    }
    if (options.triangles) {
      this.primitiveType = this.gl.TRIANGLES;
    }
    if (options.points) {
      this.primitiveType = this.gl.POINTS;
    }
    this.position = Vec3.create(0, 0, 0);
    this.rotation = Quat.create();
    this.scale = Vec3.create(1, 1, 1);
    this.projectionMatrix = Mat4.create();
    this.viewMatrix = Mat4.create();
    this.invViewMatrix = Mat4.create();
    this.modelWorldMatrix = Mat4.create();
    this.modelViewMatrix = Mat4.create();
    this.rotationMatrix = Mat4.create();
    this.normalMatrix = Mat4.create();
  }

  Mesh.prototype.draw = function(camera) {
    var num;
    if (this.geometry.isDirty()) {
      this.geometry.compile();
    }
    if (camera) {
      this.updateMatrices(camera);
      this.updateMatricesUniforms(this.material);
    }
    this.material.use();
    this.bindAttribs();
    if (this.geometry.faces && this.geometry.faces.length > 0 && this.primitiveType !== this.gl.LINES && this.primitiveType !== this.gl.POINTS) {
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.geometry.faces.buffer.handle);
      this.gl.drawElements(this.primitiveType, this.geometry.faces.buffer.dataBuf.length, this.gl.UNSIGNED_SHORT, 0);
    } else if (this.geometry.edges && this.geometry.edges.length > 0 && this.primitiveType === this.gl.LINES) {
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.geometry.edges.buffer.handle);
      this.gl.drawElements(this.primitiveType, this.geometry.edges.buffer.dataBuf.length, this.gl.UNSIGNED_SHORT, 0);
    } else if (this.geometry.vertices) {
      num = this.geometry.vertices.length;
      this.gl.drawArrays(this.primitiveType, 0, num);
    }
    return this.unbindAttribs();
  };

  Mesh.prototype.drawInstances = function(camera, instances) {
    var instance, num, _i, _j, _k, _len, _len1, _len2;
    if (this.geometry.isDirty()) {
      this.geometry.compile();
    }
    this.material.use();
    this.bindAttribs();
    if (this.geometry.faces && this.geometry.faces.length > 0 && !this.useEdges) {
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.geometry.faces.buffer.handle);
      for (_i = 0, _len = instances.length; _i < _len; _i++) {
        instance = instances[_i];
        if (camera) {
          this.updateMatrices(camera, instance);
          this.updateMatricesUniforms(this.material);
          this.updateUniforms(this.material, instance);
          this.material.use();
        }
        this.gl.drawElements(this.primitiveType, this.geometry.faces.buffer.dataBuf.length, this.gl.UNSIGNED_SHORT, 0);
      }
    } else if (this.geometry.edges && this.useEdges) {
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.geometry.edges.buffer.handle);
      for (_j = 0, _len1 = instances.length; _j < _len1; _j++) {
        instance = instances[_j];
        if (camera) {
          this.updateMatrices(camera, instance);
          this.updateMatricesUniforms(this.material);
          this.updateUniforms(this.material, instance);
          this.material.use();
        }
        this.gl.drawElements(this.primitiveType, this.geometry.edges.buffer.dataBuf.length, this.gl.UNSIGNED_SHORT, 0);
      }
    } else if (this.geometry.vertices) {
      num = this.geometry.vertices.length;
      for (_k = 0, _len2 = instances.length; _k < _len2; _k++) {
        instance = instances[_k];
        if (camera) {
          this.updateMatrices(camera, instance);
          this.updateMatricesUniforms(this.material);
          this.updateUniforms(this.material, instance);
          this.material.use();
        }
        this.gl.drawArrays(this.primitiveType, 0, num);
      }
    }
    return this.unbindAttribs();
  };

  Mesh.prototype.bindAttribs = function() {
    var attrib, name, program, _ref1, _results;
    program = this.material.program;
    _ref1 = this.geometry.attribs;
    _results = [];
    for (name in _ref1) {
      attrib = _ref1[name];
      attrib.location = this.gl.getAttribLocation(program.handle, attrib.name);
      if (attrib.location >= 0) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, attrib.buffer.handle);
        this.gl.vertexAttribPointer(attrib.location, attrib.buffer.elementSize, this.gl.FLOAT, false, 0, 0);
        _results.push(this.gl.enableVertexAttribArray(attrib.location));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  Mesh.prototype.unbindAttribs = function() {
    var attrib, name, _ref1, _results;
    _ref1 = this.geometry.attribs;
    _results = [];
    for (name in _ref1) {
      attrib = _ref1[name];
      if (attrib.location >= 0) {
        _results.push(this.gl.disableVertexAttribArray(attrib.location));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  Mesh.prototype.resetAttribLocations = function() {
    var attrib, name, _results;
    _results = [];
    for (name in this.attributes) {
      attrib = this.attributes[name];
      _results.push(attrib.location = -1);
    }
    return _results;
  };

  Mesh.prototype.updateMatrices = function(camera, instance) {
    var position, rotation, scale;
    position = instance && instance.position ? instance.position : this.position;
    rotation = instance && instance.rotation ? instance.rotation : this.rotation;
    scale = instance && instance.scale ? instance.scale : this.scale;
    rotation.toMat4(this.rotationMatrix);
    this.modelWorldMatrix.identity().translate(position.x, position.y, position.z).mul(this.rotationMatrix).scale(scale.x, scale.y, scale.z);
    if (camera) {
      this.projectionMatrix.copy(camera.getProjectionMatrix());
      this.viewMatrix.copy(camera.getViewMatrix());
      this.invViewMatrix.copy(camera.getViewMatrix().dup().invert());
      this.modelViewMatrix.copy(camera.getViewMatrix()).mul(this.modelWorldMatrix);
      return this.normalMatrix.copy(this.modelViewMatrix).invert().transpose();
    }
  };

  Mesh.prototype.updateUniforms = function(material, instance) {
    var uniformName, uniformValue, _ref1, _results;
    _ref1 = instance.uniforms;
    _results = [];
    for (uniformName in _ref1) {
      uniformValue = _ref1[uniformName];
      _results.push(material.uniforms[uniformName] = uniformValue);
    }
    return _results;
  };

  Mesh.prototype.updateMatricesUniforms = function(material) {
    var materialUniforms, programUniforms;
    programUniforms = this.material.program.uniforms;
    materialUniforms = this.material.uniforms;
    if (programUniforms.projectionMatrix) {
      materialUniforms.projectionMatrix = this.projectionMatrix;
    }
    if (programUniforms.viewMatrix) {
      materialUniforms.viewMatrix = this.viewMatrix;
    }
    if (programUniforms.invViewMatrix) {
      materialUniforms.invViewMatrix = this.invViewMatrix;
    }
    if (programUniforms.modelWorldMatrix) {
      materialUniforms.modelWorldMatrix = this.modelWorldMatrix;
    }
    if (programUniforms.modelViewMatrix) {
      materialUniforms.modelViewMatrix = this.modelViewMatrix;
    }
    if (programUniforms.normalMatrix) {
      return materialUniforms.normalMatrix = this.normalMatrix;
    }
  };

  Mesh.prototype.getMaterial = function() {
    return this.material;
  };

  Mesh.prototype.setMaterial = function(material) {
    this.material = material;
    return this.resetAttribLocations();
  };

  Mesh.prototype.getProgram = function() {
    return this.material.program;
  };

  Mesh.prototype.setProgram = function(program) {
    this.material.program = program;
    return this.resetAttribLocations();
  };

  Mesh.prototype.dispose = function() {
    return this.geometry.dispose();
  };

  Mesh.prototype.getBoundingBox = function() {
    if (!this.boundingBox) {
      this.updateBoundingBox();
    }
    return this.boundingBox;
  };

  Mesh.prototype.updateBoundingBox = function() {
    this.updateMatrices();
    return this.boundingBox = BoundingBox.fromPoints(this.geometry.vertices.map((function(_this) {
      return function(v) {
        return v.dup().transformMat4(_this.modelWorldMatrix);
      };
    })(this)));
  };

  return Mesh;

})();

module.exports = Mesh;

},{"./Context":36,"./RenderableGeometry":43,"merge":49,"pex-geom":15}],39:[function(require,module,exports){
// Generated by CoffeeScript 1.7.1
var Mat4, OrthographicCamera, Ray, Vec2, Vec3, Vec4, _ref;

_ref = require('pex-geom'), Vec2 = _ref.Vec2, Vec3 = _ref.Vec3, Vec4 = _ref.Vec4, Mat4 = _ref.Mat4, Ray = _ref.Ray;

OrthographicCamera = (function() {
  var projected;

  function OrthographicCamera(x, y, width, height, near, far, position, target, up) {
    var b, l, r, t;
    l = x;
    r = x + width;
    t = y;
    b = y + height;
    this.left = l;
    this.right = r;
    this.bottom = b;
    this.top = t;
    this.near = near || 0.1;
    this.far = far || 100;
    this.position = position || Vec3.create(0, 0, 5);
    this.target = target || Vec3.create(0, 0, 0);
    this.up = up || Vec3.create(0, 1, 0);
    this.projectionMatrix = Mat4.create();
    this.viewMatrix = Mat4.create();
    this.updateMatrices();
  }

  OrthographicCamera.prototype.getFov = function() {
    return this.fov;
  };

  OrthographicCamera.prototype.getAspectRatio = function() {
    return this.aspectRatio;
  };

  OrthographicCamera.prototype.getNear = function() {
    return this.near;
  };

  OrthographicCamera.prototype.getFar = function() {
    return this.far;
  };

  OrthographicCamera.prototype.getPosition = function() {
    return this.position;
  };

  OrthographicCamera.prototype.getTarget = function() {
    return this.target;
  };

  OrthographicCamera.prototype.getUp = function() {
    return this.up;
  };

  OrthographicCamera.prototype.getViewMatrix = function() {
    return this.viewMatrix;
  };

  OrthographicCamera.prototype.getProjectionMatrix = function() {
    return this.projectionMatrix;
  };

  OrthographicCamera.prototype.setFov = function(fov) {
    this.fov = fov;
    return this.updateMatrices();
  };

  OrthographicCamera.prototype.setAspectRatio = function(ratio) {
    this.aspectRatio = ratio;
    return this.updateMatrices();
  };

  OrthographicCamera.prototype.setFar = function(far) {
    this.far = far;
    return this.updateMatrices();
  };

  OrthographicCamera.prototype.setNear = function(near) {
    this.near = near;
    return this.updateMatrices();
  };

  OrthographicCamera.prototype.setPosition = function(position) {
    this.position = position;
    return this.updateMatrices();
  };

  OrthographicCamera.prototype.setTarget = function(target) {
    this.target = target;
    return this.updateMatrices();
  };

  OrthographicCamera.prototype.setUp = function(up) {
    this.up = up;
    return this.updateMatrices();
  };

  OrthographicCamera.prototype.lookAt = function(target, eyePosition, up) {
    if (target) {
      this.target = target;
    }
    if (eyePosition) {
      this.position = eyePosition;
    }
    if (up) {
      this.up = up;
    }
    return this.updateMatrices();
  };

  OrthographicCamera.prototype.updateMatrices = function() {
    this.projectionMatrix.identity().ortho(this.left, this.right, this.bottom, this.top, this.near, this.far);
    return this.viewMatrix.identity().lookAt(this.position, this.target, this.up);
  };

  projected = Vec4.create();

  OrthographicCamera.prototype.getScreenPos = function(point, windowWidth, windowHeight) {
    var out;
    projected.set(point.x, point.y, point.z, 1.0);
    projected.transformMat4(this.viewMatrix);
    projected.transformMat4(this.projectionMatrix);
    out = Vec2.create().set(projected.x, projected.y);
    out.x /= projected.w;
    out.y /= projected.w;
    out.x = out.x * 0.5 + 0.5;
    out.y = out.y * 0.5 + 0.5;
    out.x *= windowWidth;
    out.y *= windowHeight;
    return out;
  };

  OrthographicCamera.prototype.getWorldRay = function(x, y, windowWidth, windowHeight) {
    var hNear, invViewMatrix, vOrigin, vTarget, wDirection, wNear, wOrigin, wTarget;
    x = (x - windowWidth / 2) / (windowWidth / 2);
    y = -(y - windowHeight / 2) / (windowHeight / 2);
    hNear = 2 * Math.tan(this.getFov() / 180 * Math.PI / 2) * this.getNear();
    wNear = hNear * this.getAspectRatio();
    x *= wNear / 2;
    y *= hNear / 2;
    vOrigin = new Vec3(0, 0, 0);
    vTarget = new Vec3(x, y, -this.getNear());
    invViewMatrix = this.getViewMatrix().dup().invert();
    wOrigin = vOrigin.dup().transformMat4(invViewMatrix);
    wTarget = vTarget.dup().transformMat4(invViewMatrix);
    wDirection = wTarget.dup().sub(wOrigin);
    return new Ray(wOrigin, wDirection);
  };

  return OrthographicCamera;

})();

module.exports = OrthographicCamera;

},{"pex-geom":15}],40:[function(require,module,exports){
// Generated by CoffeeScript 1.7.1
var Mat4, PerspectiveCamera, Ray, Vec2, Vec3, Vec4, _ref;

_ref = require('pex-geom'), Vec2 = _ref.Vec2, Vec3 = _ref.Vec3, Vec4 = _ref.Vec4, Mat4 = _ref.Mat4, Ray = _ref.Ray;

PerspectiveCamera = (function() {
  var projected;

  function PerspectiveCamera(fov, aspectRatio, near, far, position, target, up) {
    this.fov = fov || 60;
    this.aspectRatio = aspectRatio || 4 / 3;
    this.near = near || 0.1;
    this.far = far || 100;
    this.position = position || Vec3.create(0, 0, 5);
    this.target = target || Vec3.create(0, 0, 0);
    this.up = up || Vec3.create(0, 1, 0);
    this.projectionMatrix = Mat4.create();
    this.viewMatrix = Mat4.create();
    this.updateMatrices();
  }

  PerspectiveCamera.prototype.getFov = function() {
    return this.fov;
  };

  PerspectiveCamera.prototype.getAspectRatio = function() {
    return this.aspectRatio;
  };

  PerspectiveCamera.prototype.getNear = function() {
    return this.near;
  };

  PerspectiveCamera.prototype.getFar = function() {
    return this.far;
  };

  PerspectiveCamera.prototype.getPosition = function() {
    return this.position;
  };

  PerspectiveCamera.prototype.getTarget = function() {
    return this.target;
  };

  PerspectiveCamera.prototype.getUp = function() {
    return this.up;
  };

  PerspectiveCamera.prototype.getViewMatrix = function() {
    return this.viewMatrix;
  };

  PerspectiveCamera.prototype.getProjectionMatrix = function() {
    return this.projectionMatrix;
  };

  PerspectiveCamera.prototype.setFov = function(fov) {
    this.fov = fov;
    return this.updateMatrices();
  };

  PerspectiveCamera.prototype.setAspectRatio = function(ratio) {
    this.aspectRatio = ratio;
    return this.updateMatrices();
  };

  PerspectiveCamera.prototype.setFar = function(far) {
    this.far = far;
    return this.updateMatrices();
  };

  PerspectiveCamera.prototype.setNear = function(near) {
    this.near = near;
    return this.updateMatrices();
  };

  PerspectiveCamera.prototype.setPosition = function(position) {
    this.position = position;
    return this.updateMatrices();
  };

  PerspectiveCamera.prototype.setTarget = function(target) {
    this.target = target;
    return this.updateMatrices();
  };

  PerspectiveCamera.prototype.setUp = function(up) {
    this.up = up;
    return this.updateMatrices();
  };

  PerspectiveCamera.prototype.lookAt = function(target, eyePosition, up) {
    if (target) {
      this.target = target;
    }
    if (eyePosition) {
      this.position = eyePosition;
    }
    if (up) {
      this.up = up;
    }
    return this.updateMatrices();
  };

  PerspectiveCamera.prototype.updateMatrices = function() {
    this.projectionMatrix.identity().perspective(this.fov, this.aspectRatio, this.near, this.far);
    return this.viewMatrix.identity().lookAt(this.position, this.target, this.up);
  };

  projected = Vec4.create();

  PerspectiveCamera.prototype.getScreenPos = function(point, windowWidth, windowHeight) {
    var out;
    projected.set(point.x, point.y, point.z, 1.0);
    projected.transformMat4(this.viewMatrix);
    projected.transformMat4(this.projectionMatrix);
    out = Vec2.create().set(projected.x, projected.y);
    out.x /= projected.w;
    out.y /= projected.w;
    out.x = out.x * 0.5 + 0.5;
    out.y = out.y * 0.5 + 0.5;
    out.x *= windowWidth;
    out.y *= windowHeight;
    return out;
  };

  PerspectiveCamera.prototype.getViewRay = function(x, y, windowWidth, windowHeight) {
    var hNear, px, py, vDirection, vOrigin, vTarget, wNear;
    px = (x - windowWidth / 2) / (windowWidth / 2);
    py = -(y - windowHeight / 2) / (windowHeight / 2);
    hNear = 2 * Math.tan(this.getFov() / 180 * Math.PI / 2) * this.getNear();
    wNear = hNear * this.getAspectRatio();
    px *= wNear / 2;
    py *= hNear / 2;
    vOrigin = new Vec3(0, 0, 0);
    vTarget = new Vec3(px, py, -this.getNear());
    vDirection = vTarget.dup().sub(vOrigin).normalize();
    return new Ray(vOrigin, vDirection);
  };

  PerspectiveCamera.prototype.getWorldRay = function(x, y, windowWidth, windowHeight) {
    var hNear, invViewMatrix, vOrigin, vTarget, wDirection, wNear, wOrigin, wTarget;
    x = (x - windowWidth / 2) / (windowWidth / 2);
    y = -(y - windowHeight / 2) / (windowHeight / 2);
    hNear = 2 * Math.tan(this.getFov() / 180 * Math.PI / 2) * this.getNear();
    wNear = hNear * this.getAspectRatio();
    x *= wNear / 2;
    y *= hNear / 2;
    vOrigin = new Vec3(0, 0, 0);
    vTarget = new Vec3(x, y, -this.getNear());
    invViewMatrix = this.getViewMatrix().dup().invert();
    wOrigin = vOrigin.dup().transformMat4(invViewMatrix);
    wTarget = vTarget.dup().transformMat4(invViewMatrix);
    wDirection = wTarget.dup().sub(wOrigin);
    return new Ray(wOrigin, wDirection);
  };

  return PerspectiveCamera;

})();

module.exports = PerspectiveCamera;

},{"pex-geom":15}],41:[function(require,module,exports){
var Context = require('./Context');
var sys = require('pex-sys');
var IO = sys.IO;

var kVertexShaderPrefix = '' +
  '#ifdef GL_ES\n' +
  'precision highp float;\n' +
  '#endif\n' +
  '#define VERT\n';

var kFragmentShaderPrefix = '' +
  '#ifdef GL_ES\n' +
  '#ifdef GL_FRAGMENT_PRECISION_HIGH\n' +
  '  precision highp float;\n' +
  '#else\n' +
  '  precision mediump float;\n' +
  '#endif\n' +
  '#endif\n' +
  '#define FRAG\n';

function Program(vertSrc, fragSrc) {
  this.gl = Context.currentContext;
  this.handle = this.gl.createProgram();
  this.uniforms = {};
  this.attributes = {};
  this.addSources(vertSrc, fragSrc);
  this.ready = false;
  if (this.vertShader && this.fragShader) {
    this.link();
  }
}

Program.prototype.addSources = function(vertSrc, fragSrc) {
  if (fragSrc == null) {
    fragSrc = vertSrc;
  }
  if (vertSrc) {
    this.addVertexSource(vertSrc);
  }
  if (fragSrc) {
    return this.addFragmentSource(fragSrc);
  }
};

Program.prototype.addVertexSource = function(vertSrc) {
  this.vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
  this.gl.shaderSource(this.vertShader, kVertexShaderPrefix + vertSrc + '\n');
  this.gl.compileShader(this.vertShader);
  if (!this.gl.getShaderParameter(this.vertShader, this.gl.COMPILE_STATUS)) {
    throw this.gl.getShaderInfoLog(this.vertShader);
  }
};

Program.prototype.addFragmentSource = function(fragSrc) {
  this.fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
  this.gl.shaderSource(this.fragShader, kFragmentShaderPrefix + fragSrc + '\n');
  this.gl.compileShader(this.fragShader);
  if (!this.gl.getShaderParameter(this.fragShader, this.gl.COMPILE_STATUS)) {
    throw this.gl.getShaderInfoLog(this.fragShader);
  }
};

Program.prototype.link = function() {
  this.gl.attachShader(this.handle, this.vertShader);
  this.gl.attachShader(this.handle, this.fragShader);
  this.gl.linkProgram(this.handle);

  if (!this.gl.getProgramParameter(this.handle, this.gl.LINK_STATUS)) {
    throw this.gl.getProgramInfoLog(this.handle);
  }

  var numUniforms = this.gl.getProgramParameter(this.handle, this.gl.ACTIVE_UNIFORMS);

  for (var i=0; i<numUniforms; i++) {
    var info = this.gl.getActiveUniform(this.handle, i);
    if (info.size > 1) {
      for (var j=0; j<info.size; j++) {
        var arrayElementName = info.name.replace(/\[\d+\]/, '[' + j + ']');
        var location = this.gl.getUniformLocation(this.handle, arrayElementName);
        this.uniforms[arrayElementName] = Program.makeUniformSetter(this.gl, info.type, location);
      }
    } else {
      var location = this.gl.getUniformLocation(this.handle, info.name);
      this.uniforms[info.name] = Program.makeUniformSetter(this.gl, info.type, location);
    }
  }

  var numAttributes = this.gl.getProgramParameter(this.handle, this.gl.ACTIVE_ATTRIBUTES);
  for (var i=0; i<numAttributes; i++) {
    info = this.gl.getActiveAttrib(this.handle, i);
    var location = this.gl.getAttribLocation(this.handle, info.name);
    this.attributes[info.name] = location;
  }
  this.ready = true;
  return this;
};

Program.prototype.use = function() {
  if (Program.currentProgram !== this.handle) {
    Program.currentProgram = this.handle;
    return this.gl.useProgram(this.handle);
  }
};

Program.prototype.dispose = function() {
  this.gl.deleteShader(this.vertShader);
  this.gl.deleteShader(this.fragShader);
  return this.gl.deleteProgram(this.handle);
};

Program.load = function(url, callback, options) {
  var program;
  program = new Program();
  IO.loadTextFile(url, function(source) {
    console.log("Program.Compiling " + url);
    program.addSources(source);
    program.link();
    if (callback) {
      callback();
    }
    if (options && options.autoreload) {
      return IO.watchTextFile(url, function(source) {
        var e;
        try {
          program.gl.detachShader(program.handle, program.vertShader);
          program.gl.detachShader(program.handle, program.fragShader);
          program.addSources(source);
          return program.link();
        } catch (_error) {
          e = _error;
          console.log("Program.load : failed to reload " + url);
          return console.log(e);
        }
      });
    }
  });
  return program;
};

Program.makeUniformSetter = function(gl, type, location) {
  var setterFun = null;
  switch (type) {
    case gl.BOOL:
    case gl.INT:
      setterFun = function(value) {
        return gl.uniform1i(location, value);
      };
      break;
    case gl.SAMPLER_2D:
    case gl.SAMPLER_CUBE:
      setterFun = function(value) {
        return gl.uniform1i(location, value);
      };
      break;
    case gl.FLOAT:
      setterFun = function(value) {
        return gl.uniform1f(location, value);
      };
      break;
    case gl.FLOAT_VEC2:
      setterFun = function(v) {
        return gl.uniform2f(location, v.x, v.y);
      };
      break;
    case gl.FLOAT_VEC3:
      setterFun = function(v) {
        return gl.uniform3f(location, v.x, v.y, v.z);
      };
      break;
    case gl.FLOAT_VEC4:
      setterFun = function(v) {
        if (v.r != null) {
          gl.uniform4f(location, v.r, v.g, v.b, v.a);
        }
        if (v.x != null) {
          return gl.uniform4f(location, v.x, v.y, v.z, v.w);
        }
      };
      break;
    case gl.FLOAT_MAT4:
      var mv = new Float32Array(16);
      setterFun = function(m) {
        mv[0] = m.a11;
        mv[1] = m.a21;
        mv[2] = m.a31;
        mv[3] = m.a41;
        mv[4] = m.a12;
        mv[5] = m.a22;
        mv[6] = m.a32;
        mv[7] = m.a42;
        mv[8] = m.a13;
        mv[9] = m.a23;
        mv[10] = m.a33;
        mv[11] = m.a43;
        mv[12] = m.a14;
        mv[13] = m.a24;
        mv[14] = m.a34;
        mv[15] = m.a44;
        return gl.uniformMatrix4fv(location, false, mv);
      };
  }
  if (setterFun) {
    setterFun.type = type;
    return setterFun;
  } else {
    return function() {
      throw "Unknown uniform type: " + type;
    };
  }
};

module.exports = Program;
},{"./Context":36,"pex-sys":67}],42:[function(require,module,exports){
var Context = require('./Context');
var Texture2D = require('./Texture2D');

function RenderTarget(width, height, options) {
  var gl = this.gl = Context.currentContext;
  this.width = width;
  this.height = height;
  this.oldBinding = gl.getParameter(gl.FRAMEBUFFER_BINDING);
  this.handle = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.handle);
  this.colorAttachements = [];
  if (options && options.depth) {
    var oldRenderBufferBinding = gl.getParameter(gl.RENDERBUFFER_BINDING);
    var depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.getError();
    //reset error
    if (gl.DEPTH_COMPONENT24) {
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, this.width, this.height);
    }
    if (gl.getError() || !gl.DEPTH_COMPONENT24) {
      //24 bit depth buffer might be not available, trying with 16
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
    }
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    this.depthBuffer = depthBuffer;
    gl.bindRenderbuffer(gl.RENDERBUFFER, oldRenderBufferBinding);
  }
  var texture = Texture2D.create(width, height, options);
  texture.bind();
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + this.colorAttachements.length, texture.target, texture.handle, 0);
  this.colorAttachements.push(texture);
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.oldBinding);
  this.oldBinding = null;
}

RenderTarget.prototype.bind = function () {
  var gl = this.gl;
  this.oldBinding = gl.getParameter(gl.FRAMEBUFFER_BINDING);
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.handle);
};

RenderTarget.prototype.bindAndClear = function () {
  var gl = this.gl;
  this.bind();
  gl.clearColor(0, 0, 0, 1);
  if (this.depthBuffer)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  else
    gl.clear(gl.COLOR_BUFFER_BIT);
};

RenderTarget.prototype.unbind = function () {
  var gl = this.gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.oldBinding);
  this.oldBinding = null;
};

RenderTarget.prototype.getColorAttachement = function (index) {
  index = index || 0;
  return this.colorAttachements[index];
};

 module.exports = RenderTarget;
},{"./Context":36,"./Texture2D":46}],43:[function(require,module,exports){
// Generated by CoffeeScript 1.7.1
var Buffer, Context, Geometry, RenderableGeometry, indexTypes;

Geometry = require('pex-geom').Geometry;

Context = require('./Context');

Buffer = require('./Buffer');

indexTypes = ['faces', 'edges', 'indices'];

RenderableGeometry = {
  compile: function() {
    var attrib, attribName, indexName, usage, _i, _len, _ref, _results;
    if (this.gl == null) {
      this.gl = Context.currentContext;
    }
    _ref = this.attribs;
    for (attribName in _ref) {
      attrib = _ref[attribName];
      if (!attrib.buffer) {
        usage = attrib.dynamic ? this.gl.DYNAMIC_DRAW : this.gl.STATIC_DRAW;
        attrib.buffer = new Buffer(this.gl.ARRAY_BUFFER, Float32Array, null, usage);
        attrib.dirty = true;
      }
      if (attrib.dirty) {
        attrib.buffer.update(attrib);
        attrib.dirty = false;
      }
    }
    _results = [];
    for (_i = 0, _len = indexTypes.length; _i < _len; _i++) {
      indexName = indexTypes[_i];
      if (this[indexName]) {
        if (!this[indexName].buffer) {
          usage = this[indexName].dynamic ? this.gl.DYNAMIC_DRAW : this.gl.STATIC_DRAW;
          this[indexName].buffer = new Buffer(this.gl.ELEMENT_ARRAY_BUFFER, Uint16Array, null, usage);
          this[indexName].dirty = true;
        }
        if (this[indexName].dirty) {
          this[indexName].buffer.update(this[indexName]);
          _results.push(this[indexName].dirty = false);
        } else {
          _results.push(void 0);
        }
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  },
  dispose: function() {
    var attrib, attribName, indexName, _i, _len, _ref, _results;
    _ref = this.attribs;
    for (attribName in _ref) {
      attrib = _ref[attribName];
      if (attrib && attrib.buffer) {
        attrib.buffer.dispose();
      }
    }
    _results = [];
    for (_i = 0, _len = indexTypes.length; _i < _len; _i++) {
      indexName = indexTypes[_i];
      if (this[indexName] && this[indexName].buffer) {
        _results.push(this[indexName].buffer.dispose());
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  }
};

module.exports = RenderableGeometry;

},{"./Buffer":35,"./Context":36,"pex-geom":15}],44:[function(require,module,exports){
var geom = require('pex-geom');
var Vec2 = geom.Vec2;
var Geometry = geom.Geometry;
var Program = require('./Program');
var Material = require('./Material');
var Mesh = require('./Mesh');


var ScreenImageGLSL = "#ifdef VERT\n\nattribute vec2 position;\nattribute vec2 texCoord;\nuniform vec2 screenSize;\nuniform vec2 pixelPosition;\nuniform vec2 pixelSize;\nvarying vec2 vTexCoord;\n\nvoid main() {\n  float tx = position.x * 0.5 + 0.5; //-1 -> 0, 1 -> 1\n  float ty = -position.y * 0.5 + 0.5; //-1 -> 1, 1 -> 0\n  //(x + 0)/sw * 2 - 1, (x + w)/sw * 2 - 1\n  float x = (pixelPosition.x + pixelSize.x * tx)/screenSize.x * 2.0 - 1.0;  //0 -> -1, 1 -> 1\n  //1.0 - (y + h)/sh * 2, 1.0 - (y + h)/sh * 2\n  float y = 1.0 - (pixelPosition.y + pixelSize.y * ty)/screenSize.y * 2.0;  //0 -> 1, 1 -> -1\n  gl_Position = vec4(x, y, 0.0, 1.0);\n  vTexCoord = texCoord;\n}\n\n#endif\n\n#ifdef FRAG\n\nvarying vec2 vTexCoord;\nuniform sampler2D image;\nuniform float alpha;\n\nvoid main() {\n  gl_FragColor = texture2D(image, vTexCoord);\n  gl_FragColor.a *= alpha;\n}\n\n#endif";

function ScreenImage(image, x, y, w, h, screenWidth, screenHeight) {
  x = x !== undefined ? x : 0;
  y = y !== undefined ? y : 0;
  w = w !== undefined ? w : 1;
  h = h !== undefined ? h : 1;
  screenWidth = screenWidth !== undefined ? screenWidth : 1;
  screenHeight = screenHeight !== undefined ? screenHeight : 1;
  this.image = image;
  var program = new Program(ScreenImageGLSL);
  var uniforms = {
    screenSize: Vec2.create(screenWidth, screenHeight),
    pixelPosition: Vec2.create(x, y),
    pixelSize: Vec2.create(w, h),
    alpha: 1
  };
  if (image) {
    uniforms.image = image;
  }
  var material = new Material(program, uniforms);
  var vertices = [
    new Vec2(-1, 1),
    new Vec2(-1, -1),
    new Vec2(1, -1),
    new Vec2(1, 1)
  ];
  var texCoords = [
    new Vec2(0, 1),
    new Vec2(0, 0),
    new Vec2(1, 0),
    new Vec2(1, 1)
  ];
  var geometry = new Geometry({
    vertices: vertices,
    texCoords: texCoords,
    faces: true
  });
  // 0----3  0,1   1,1
  // | \  |      u
  // |  \ |      v
  // 1----2  0,0   0,1
  geometry.faces.push([0, 1, 2]);
  geometry.faces.push([0, 2, 3]);
  this.mesh = new Mesh(geometry, material);
}

ScreenImage.prototype.setAlpha = function (alpha) {
  this.mesh.material.uniforms.alpha = alpha;
};

ScreenImage.prototype.setPosition = function (position) {
  this.mesh.material.uniforms.pixelPosition = position;
};

ScreenImage.prototype.setSize = function (size) {
  this.mesh.material.uniforms.pixelSize = size;
};

ScreenImage.prototype.setWindowSize = function (size) {
  this.mesh.material.uniforms.windowSize = size;
};

ScreenImage.prototype.setBounds = function (bounds) {
  this.mesh.material.uniforms.pixelPosition.x = bounds.x;
  this.mesh.material.uniforms.pixelPosition.y = bounds.y;
  this.mesh.material.uniforms.pixelSize.x = bounds.width;
  this.mesh.material.uniforms.pixelSize.y = bounds.height;
};

ScreenImage.prototype.setImage = function (image) {
  this.image = image;
  this.mesh.material.uniforms.image = image;
};

ScreenImage.prototype.draw = function (image, program) {
  var oldImage = null;
  if (image) {
    oldImage = this.mesh.material.uniforms.image;
    this.mesh.material.uniforms.image = image;
  }
  var oldProgram = null;
  if (program) {
    oldProgram = this.mesh.getProgram();
    this.mesh.setProgram(program);
  }
  this.mesh.draw();
  if (oldProgram) {
    this.mesh.setProgram(oldProgram);
  }
  if (oldImage) {
    this.mesh.material.uniforms.image = oldImage;
  }
};

module.exports = ScreenImage;
},{"./Material":37,"./Mesh":38,"./Program":41,"pex-geom":15}],45:[function(require,module,exports){
var Context = require('./Context');

function Texture(target) {
  if (target) {
    this.init(target);
  }
}

Texture.RGBA32F = 34836;

Texture.prototype.init = function(target) {
  this.gl = Context.currentContext;
  this.target = target;
  this.handle = this.gl.createTexture();
};

//### bind ( unit )
//Binds the texture to the current GL context.
//`unit` - texture unit in which to place the texture *{ Number/Int }* = 0

Texture.prototype.bind = function(unit) {
  unit = unit ? unit : 0;
  this.gl.activeTexture(this.gl.TEXTURE0 + unit);
  this.gl.bindTexture(this.target, this.handle);
};

module.exports = Texture;
},{"./Context":36}],46:[function(require,module,exports){
var sys = require('pex-sys');
var merge = require('merge');
var IO = sys.IO;
var Context = require('./Context');
var Texture = require('./Texture');

function Texture2D() {
  this.gl = Context.currentContext;
  Texture.call(this, this.gl.TEXTURE_2D);
}

Texture2D.prototype = Object.create(Texture.prototype);

Texture2D.create = function(w, h, options) {
  var defaultOptions = {
    repeat: false,
    mipmap: false,
    nearest: false
  };
  options = merge(defaultOptions, options);

  var texture = new Texture2D();
  texture.bind();
  var gl = texture.gl;
  var isWebGL = gl.getExtension ? true : false;
  var internalFloatFormat = isWebGL ? gl.RGBA : 34836;
  if (options.bpp == 32) {
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFloatFormat, w, h, 0, gl.RGBA, gl.FLOAT, null);
  }
  else {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }

  var wrapS = options.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
  var wrapT = options.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
  var magFilter = gl.LINEAR;
  var minFilter = gl.LINEAR;


  if (options.nearest) {
    magFilter = gl.NEAREST;
    minFilter = gl.NEAREST;
  }

  if (options.mipmap) {
    minFilter = gl.LINEAR_MIPMAP_LINEAR;
  }

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
  gl.bindTexture(gl.TEXTURE_2D, null);

  texture.width = w;
  texture.height = h;
  texture.target = gl.TEXTURE_2D;
  return texture;
};

Texture2D.prototype.bind = function(unit) {
  unit = unit ? unit : 0;
  this.gl.activeTexture(this.gl.TEXTURE0 + unit);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.handle);
};

Texture2D.genNoise = function(w, h) {
  w = w || 256;
  h = h || 256;
  var gl = Context.currentContext;
  var texture = new Texture2D();
  texture.bind();
  //TODO: should check unpack alignment as explained here https://groups.google.com/forum/#!topic/webgl-dev-list/wuUZP7iTr9Q
  var b = new ArrayBuffer(w * h * 2);
  var pixels = new Uint8Array(b);
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      pixels[y * w + x] = Math.floor(Math.random() * 255);
    }
  }
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, w, h, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, pixels);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);
  texture.width = w;
  texture.height = h;
  return texture;
};

Texture2D.genNoiseRGBA = function(w, h) {
  w = w || 256;
  h = h || 256;
  var gl = Context.currentContext;
  var handle = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, handle);
  var b = new ArrayBuffer(w * h * 4);
  var pixels = new Uint8Array(b);
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      pixels[(y * w + x) * 4 + 0] = y;
      pixels[(y * w + x) * 4 + 1] = Math.floor(255 * Math.random());
      pixels[(y * w + x) * 4 + 2] = Math.floor(255 * Math.random());
      pixels[(y * w + x) * 4 + 3] = Math.floor(255 * Math.random());
    }
  }
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);
  var texture = new Texture2D();
  texture.handle = handle;
  texture.width = w;
  texture.height = h;
  texture.target = gl.TEXTURE_2D;
  texture.gl = gl;
  return texture;
};

Texture2D.load = function(src, options, callback) {
  if (!callback && typeof(options) == 'function') {
    callback = options;
    optiosn = null;
  }
  var defaultOptions = {
    repeat: false,
    mipmap: false,
    nearest: false
  };
  options = merge(defaultOptions, options);

  var gl = Context.currentContext;
  var texture = Texture2D.create(0, 0, options);
  IO.loadImageData(gl, texture.handle, texture.target, src, { flip: true, crossOrigin: options.crossOrigin }, function(image) {
    if (!image) {
      texture.dispose();
      var noise = Texture2D.getNoise();
      texture.handle = noise.handle;
      texture.width = noise.width;
      texture.height = noise.height;
    }
    if (options.mipmap) {
      texture.generateMipmap();
    }
    gl.bindTexture(texture.target, null);
    texture.width = image.width;
    texture.height = image.height;
    if (callback) {
      callback(texture);
    }
  });
  return texture;
};

Texture2D.prototype.dispose = function() {
  if (this.handle) {
    this.gl.deleteTexture(this.handle);
    this.handle = null;
  }
};

Texture2D.prototype.generateMipmap = function() {
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.handle);
  this.gl.generateMipmap(this.gl.TEXTURE_2D);
}

module.exports = Texture2D;
},{"./Context":36,"./Texture":45,"merge":49,"pex-sys":67}],47:[function(require,module,exports){
var sys = require('pex-sys');
var IO = sys.IO;
var Context = require('./Context');
var Texture = require('./Texture');
  
//### TextureCube ( )
//Does nothing, use *load()* method instead.
function TextureCube() {
  this.gl = Context.currentContext;
  Texture.call(this, this.gl.TEXTURE_CUBE_MAP);
}

TextureCube.prototype = Object.create(Texture.prototype);

//### load ( src )
//Load texture from file (in Plask) or url (in the web browser).
//
//`src` - path to file or url (e.g. *path/file_####.jpg*) *{ String }*
//
//Returns the loaded texture *{ Texture2D }*
//
//*Note* the path or url must contain #### that will be replaced by
//id (e.g. *posx*) of the cube side*
//
//*Note: In Plask the texture is ready immediately, in the web browser it's
//first black until the file is loaded and texture can be populated with the image data.*
TextureCube.load = function (src, postfixes) {
  var gl = Context.currentContext;
  var texture = new TextureCube();
  var cubeMapTargets = [
    gl.TEXTURE_CUBE_MAP_POSITIVE_X,
    postfixes ? postfixes[0] : 'posx',
    gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
    postfixes ? postfixes[1] : 'negx',
    gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
    postfixes ? postfixes[2] : 'posy',
    gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    postfixes ? postfixes[3] : 'negy',
    gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
    postfixes ? postfixes[4] : 'posz',
    gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    postfixes ? postfixes[5] : 'negz'
  ];
  gl.bindTexture(texture.target, texture.handle);
  gl.texParameteri(texture.target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(texture.target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(texture.target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(texture.target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  for (var i = 0; i < cubeMapTargets.length; i += 2) {
    var path = src.replace('####', cubeMapTargets[i + 1]);
    IO.loadImageData(gl, texture.handle, cubeMapTargets[i], path, { flip: true }, function (image) {
      texture.width = image.width;
      texture.height = image.height;
    });
  }
  return texture;
};

TextureCube.loadLod = function (src, postfixes, lods) {
  var gl = Context.currentContext;
  var texture = new TextureCube();
  var cubeMapTargets = [
    gl.TEXTURE_CUBE_MAP_POSITIVE_X,
    postfixes ? postfixes[0] : 'posx',
    gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
    postfixes ? postfixes[1] : 'negx',
    gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
    postfixes ? postfixes[2] : 'posy',
    gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    postfixes ? postfixes[3] : 'negy',
    gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
    postfixes ? postfixes[4] : 'posz',
    gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    postfixes ? postfixes[5] : 'negz'
  ];
  var TEXTURE_BASE_LEVEL = 0x813C;
  var TEXTURE_MAX_LEVEL = 0x813D;
  gl.bindTexture(texture.target, texture.handle);
  gl.texParameteri(texture.target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(texture.target, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(texture.target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(texture.target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(texture.target, TEXTURE_BASE_LEVEL, 0);
  gl.texParameteri(texture.target, TEXTURE_MAX_LEVEL, lods.length-1);
  for (var lod=0; lod<lods.length; lod++) {
    for (var i = 0; i < cubeMapTargets.length; i += 2) {
      var path = src.replace('####', cubeMapTargets[i + 1]).replace('LOD', lods[lod]);
      IO.loadImageData(gl, texture.handle, cubeMapTargets[i], path, { flip: false, lod: lod }, function (image) {
        texture.width = image.width;
        texture.height = image.height;
      });
    }
  }
  return texture;
};

//### dispose ( )
//Frees the texture data.
TextureCube.prototype.dispose = function () {
  if (this.handle) {
    this.gl.deleteTexture(this.handle);
    this.handle = null;
  }
};

module.exports = TextureCube;

},{"./Context":36,"./Texture":45,"pex-sys":67}],48:[function(require,module,exports){
var Context = require('./Context');

module.exports.getCurrentContext = function() {
  return Context.currentContext;
}

module.exports.clearColor = function(color) {
  var gl = Context.currentContext;
  if (color)
    gl.clearColor(color.r, color.g, color.b, color.a);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return this;
};

module.exports.clearDepth = function() {
  var gl = Context.currentContext;
  gl.clear(gl.DEPTH_BUFFER_BIT);
  return this;
};

module.exports.clearColorAndDepth = function(color) {
  var gl = Context.currentContext;
  color = color || { r: 0, g:0, b:0, a: 1};
  gl.clearColor(color.r, color.g, color.b, color.a);
  gl.depthMask(1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  return this;
};

module.exports.enableDepthReadAndWrite = function(depthRead, depthWrite) {
  if (arguments.length == 2) {
    //do nothing, just use the values
  }
  else if (arguments.length == 1) {
    //use the same value for both read and write
    depthWrite = depthRead;
  }
  else {
    //defaults
    depthRead = true;
    depthWrite = true;
  }

  var gl = Context.currentContext;

  if (depthWrite) gl.depthMask(1);
  else gl.depthMask(0);

  if (depthRead) gl.enable(gl.DEPTH_TEST);
  else gl.disable(gl.DEPTH_TEST);

  return this;
};

module.exports.enableAdditiveBlending = function() {
  return this.enableBlending("ONE", "ONE");
};

module.exports.enableAlphaBlending = function(src, dst) {
  return this.enableBlending("SRC_ALPHA", "ONE_MINUS_SRC_ALPHA");
};

module.exports.enableBlending = function(src, dst) {
  var gl = Context.currentContext;
  if (src === false) {
    gl.disable(gl.BLEND);
    return this;
  }
  gl.enable(gl.BLEND);
  gl.blendFunc(gl[src], gl[dst]);
  return this;
};

//OpenGL viewport 0,0 is in bottom left corner
//
//  0,h-----w,h
//   |       |
//   |       |
//  0,0-----w,0
//
module.exports.viewport = function(x, y, w, h) {
  var gl = Context.currentContext;
  gl.viewport(x, y, w, h);
  return this;
};

module.exports.scissor = function(x, y, w, h) {
  var gl = Context.currentContext;
  if (x === false) {
    gl.disable(gl.SCISSOR_TEST);
  }
  else if (x.width != null) {
    var rect = x;
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(rect.x, rect.y, rect.width, rect.height);
  }
  else {
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(x, y, w, h);
  }
  return this;
};

module.exports.cullFace = function(enabled) {
  enabled = (enabled !== undefined) ? enabled : true
  var gl = Context.currentContext;
  if (enabled)
    gl.enable(gl.CULL_FACE);
  else
    gl.disable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  return this;
};

module.exports.lineWidth = function(width) {
  var gl = Context.currentContext;
  gl.lineWidth(width);
  return this;
}
},{"./Context":36}],49:[function(require,module,exports){
module.exports=require(14)
},{}],50:[function(require,module,exports){
module.exports.SolidColor = require('./lib/SolidColor');
module.exports.ShowNormals = require('./lib/ShowNormals');
module.exports.ShowColors = require('./lib/ShowColors');
module.exports.ShowPosition = require('./lib/ShowPosition');
module.exports.Textured = require('./lib/Textured');
module.exports.TexturedTriPlanar = require('./lib/TexturedTriPlanar');
module.exports.TexturedCubeMap = require('./lib/TexturedCubeMap');
module.exports.TexturedEnvMap = require('./lib/TexturedEnvMap');
module.exports.SkyBox = require('./lib/SkyBox');
module.exports.SkyBoxEnvMap = require('./lib/SkyBoxEnvMap');
module.exports.FlatToonShading = require('./lib/FlatToonShading');
module.exports.MatCap = require('./lib/MatCap');
module.exports.Diffuse = require('./lib/Diffuse');
module.exports.BlinnPhong = require('./lib/BlinnPhong');
module.exports.ShowDepth = require('./lib/ShowDepth');
},{"./lib/BlinnPhong":51,"./lib/Diffuse":52,"./lib/FlatToonShading":53,"./lib/MatCap":54,"./lib/ShowColors":55,"./lib/ShowDepth":56,"./lib/ShowNormals":57,"./lib/ShowPosition":58,"./lib/SkyBox":59,"./lib/SkyBoxEnvMap":60,"./lib/SolidColor":61,"./lib/Textured":62,"./lib/TexturedCubeMap":63,"./lib/TexturedEnvMap":64,"./lib/TexturedTriPlanar":65}],51:[function(require,module,exports){
var glu = require('pex-glu');
var color = require('pex-color');
var geom = require('pex-geom');
var Context = glu.Context;
var Material = glu.Material;
var Program = glu.Program;
var Color = color.Color;
var Vec3 = geom.Vec3;
var merge = require('merge');


var BlinnPhongGLSL = "#ifdef VERT\n\nuniform mat4 projectionMatrix;\nuniform mat4 modelViewMatrix;\nuniform mat4 modelWorldMatrix;\nuniform mat4 viewMatrix;\nuniform mat4 normalMatrix;\nuniform float pointSize;\nuniform vec3 lightPos;\nuniform vec3 cameraPos;\nattribute vec3 position;\nattribute vec3 normal;\nvarying vec3 vNormal;\nvarying vec3 vLightPos;\nvarying vec3 vEyePos;\n\nvoid main() {\n  vec4 worldPos = modelWorldMatrix * vec4(position, 1.0);\n  vec4 eyePos = modelViewMatrix * vec4(position, 1.0);\n  gl_Position = projectionMatrix * eyePos;\n  vEyePos = eyePos.xyz;\n  gl_PointSize = pointSize;\n  vNormal = (normalMatrix * vec4(normal, 0.0)).xyz;\n  vLightPos = (viewMatrix * vec4(lightPos, 1.0)).xyz;\n}\n\n#endif\n\n#ifdef FRAG\n\nuniform vec4 ambientColor;\nuniform vec4 diffuseColor;\nuniform vec4 specularColor;\nuniform float shininess;\nuniform float wrap;\nuniform bool useBlinnPhong;\nvarying vec3 vNormal;\nvarying vec3 vLightPos;\nvarying vec3 vEyePos;\n\nfloat phong(vec3 L, vec3 E, vec3 N) {\n  vec3 R = reflect(-L, N);\n  return max(0.0, dot(R, E));\n}\n\nfloat blinnPhong(vec3 L, vec3 E, vec3 N) {\n  vec3 halfVec = normalize(L + E);\n  return max(0.0, dot(halfVec, N));\n}\n\nvoid main() {\n  vec3 L = normalize(vLightPos - vEyePos); //lightDir\n  vec3 E = normalize(-vEyePos); //viewDir\n  vec3 N = normalize(vNormal); //normal\n\n  float NdotL = max(0.0, (dot(N, L) + wrap) / (1.0 + wrap));\n  vec4 color = ambientColor + NdotL * diffuseColor;\n\n  float specular = 0.0;\n  if (useBlinnPhong)\n    specular = blinnPhong(L, E, N);\n  else\n    specular = phong(L, E, N);\n\n  color += max(pow(specular, shininess), 0.0) * specularColor;\n\n  gl_FragColor = color;\n}\n\n#endif\n";

function BlinnPhong(uniforms) {
  this.gl = Context.currentContext;
  var program = new Program(BlinnPhongGLSL);
  var defaults = {
    wrap: 0,
    pointSize: 1,
    lightPos: Vec3.create(10, 20, 30),
    ambientColor: Color.create(0, 0, 0, 1),
    diffuseColor: Color.create(0.9, 0.9, 0.9, 1),
    specularColor: Color.create(1, 1, 1, 1),
    shininess: 256,
    useBlinnPhong: true
  };
  uniforms = merge(defaults, uniforms);
  Material.call(this, program, uniforms);
}

BlinnPhong.prototype = Object.create(Material.prototype);

module.exports = BlinnPhong;

},{"merge":66,"pex-color":4,"pex-geom":15,"pex-glu":33}],52:[function(require,module,exports){
var glu = require('pex-glu');
var color = require('pex-color');
var geom = require('pex-geom');
var Context = glu.Context;
var Material = glu.Material;
var Program = glu.Program;
var Color = color.Color;
var Vec3 = geom.Vec3;
var merge = require('merge');


var DiffuseGLSL = "#ifdef VERT\n\nuniform mat4 projectionMatrix;\nuniform mat4 modelViewMatrix;\nuniform mat4 normalMatrix;\nuniform mat4 viewMatrix;\nuniform float pointSize;\nuniform vec3 lightPos;\nattribute vec3 position;\nattribute vec3 normal;\nvarying vec3 vNormal;\nvarying vec3 vLightPos;\nvarying vec3 vPosition;\n\n\nvoid main() {\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n  gl_PointSize = pointSize;\n  vNormal = (normalMatrix * vec4(normal, 1.0)).xyz;\n  vLightPos = (viewMatrix * vec4(lightPos, 1.0)).xyz;\n  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;\n}\n\n#endif\n\n#ifdef FRAG\n\nuniform vec4 ambientColor;\nuniform vec4 diffuseColor;\nuniform float wrap;\nvarying vec3 vNormal;\nvarying vec3 vLightPos;\nvarying vec3 vPosition;\n\nvoid main() {\n  vec3 L = normalize(vLightPos - vPosition);\n  vec3 N = normalize(vNormal);\n  float NdotL = max(0.0, (dot(N, L) + wrap) / (1.0 + wrap));\n  gl_FragColor = ambientColor + NdotL * diffuseColor;\n}\n\n#endif\n";

function Diffuse(uniforms) {
  this.gl = Context.currentContext;
  var program = new Program(DiffuseGLSL);
  var defaults = {
    wrap: 0,
    pointSize: 1,
    lightPos: Vec3.create(10, 20, 30),
    ambientColor: Color.create(0, 0, 0, 1),
    diffuseColor: Color.create(1, 1, 1, 1)
  };
  uniforms = merge(defaults, uniforms);
  Material.call(this, program, uniforms);
}

Diffuse.prototype = Object.create(Material.prototype);

module.exports = Diffuse;
},{"merge":66,"pex-color":4,"pex-geom":15,"pex-glu":33}],53:[function(require,module,exports){
var glu = require('pex-glu');
var color = require('pex-color');
var geom = require('pex-geom');
var Context = glu.Context;
var Material = glu.Material;
var Program = glu.Program;
var Color = color.Color;
var Vec3 = geom.Vec3;
var merge = require('merge');


var FlatToonShadingGLSL = "#ifdef VERT\n\nuniform mat4 projectionMatrix;\nuniform mat4 modelViewMatrix;\nuniform float pointSize;\nattribute vec3 position;\nattribute vec3 normal;\nvarying vec3 vNormal;\n\nvoid main() {\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n  gl_PointSize = pointSize;\n  vNormal = normal;\n}\n\n#endif\n\n#ifdef FRAG\n\nuniform vec4 ambientColor;\nuniform vec4 diffuseColor;\nuniform vec3 lightPos;\nuniform sampler2D colorBands;\nuniform float wrap;\nvarying vec3 vNormal;\n\nvoid main() {\n  vec3 L = normalize(lightPos);\n  vec3 N = normalize(vNormal);\n  float NdotL = max(0.0, (dot(N, L) + wrap) / (1.0 + wrap));\n  gl_FragColor = ambientColor + NdotL * diffuseColor;\n  gl_FragColor.rgb = N*0.5 + vec3(0.5);\n  gl_FragColor.rgb = vec3(NdotL);\n\n  gl_FragColor = texture2D(colorBands, vec2(NdotL, 0.5));\n}\n\n#endif\n";

function FlatToonShading(uniforms) {
  this.gl = Context.currentContext.gl;
  var program = new Program(FlatToonShadingGLSL);

  var defaults = {
    wrap: 1,
    pointSize : 1,
    lightPos : Vec3.create(10, 20, 30)
  };

  var uniforms = merge(defaults, uniforms);

  Material.call(this, program, uniforms);
}

FlatToonShading.prototype = Object.create(Material.prototype);

module.exports = FlatToonShading;
},{"merge":66,"pex-color":4,"pex-geom":15,"pex-glu":33}],54:[function(require,module,exports){
//http://www.clicktorelease.com/blog/creating-spherical-environment-mapping-shader

var glu = require('pex-glu');
var color = require('pex-color');
var Context = glu.Context;
var Material = glu.Material;
var Program = glu.Program;
var Color = color.Color;
var merge = require('merge');


var MatCapGLSL = "#ifdef VERT\n\nuniform mat4 projectionMatrix;\nuniform mat4 modelViewMatrix;\nuniform mat4 normalMatrix;\nuniform float pointSize;\nattribute vec3 position;\nattribute vec3 normal;\n\nvarying vec3 e;\nvarying vec3 n;\n\nvoid main() {\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n\n  e = normalize(vec3(modelViewMatrix * vec4(position, 1.0)));\n  n = normalize(vec3(normalMatrix * vec4(normal, 1.0)));\n}\n\n#endif\n\n#ifdef FRAG\n\nuniform sampler2D texture;\n\nvarying vec3 e;\nvarying vec3 n;\n\nvoid main() {\n  vec3 r = reflect(e, n);\n  float m = 2.0 * sqrt(\n    pow(r.x, 2.0) +\n    pow(r.y, 2.0) +\n    pow(r.z + 1.0, 2.0)\n  );\n  vec2 N = r.xy / m + 0.5;\n  vec3 base = texture2D( texture, N ).rgb;\n  gl_FragColor = vec4( base, 1.0 );\n}\n\n#endif\n";

function MatCap(uniforms) {
  this.gl = Context.currentContext;
  var program = new Program(MatCapGLSL);
  var defaults = {};
  uniforms = merge(defaults, uniforms);
  Material.call(this, program, uniforms);
}

MatCap.prototype = Object.create(Material.prototype);

module.exports = MatCap;

},{"merge":66,"pex-color":4,"pex-glu":33}],55:[function(require,module,exports){
var glu = require('pex-glu');
var color = require('pex-color');
var Context = glu.Context;
var Material = glu.Material;
var Program = glu.Program;
var Color = color.Color;
var merge = require('merge');


var ShowColorsGLSL = "#ifdef VERT\n\nuniform mat4 projectionMatrix;\nuniform mat4 modelViewMatrix;\nuniform float pointSize;\nattribute vec3 position;\nattribute vec4 color;\nvarying vec4 vColor;\nvoid main() {\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n  gl_PointSize = pointSize;\n  vColor = color;\n}\n\n#endif\n\n#ifdef FRAG\n\nvarying vec4 vColor;\n\nvoid main() {\n  gl_FragColor = vColor;\n}\n\n#endif\n";

function ShowColors(uniforms) {
  this.gl = Context.currentContext;
  var program = new Program(ShowColorsGLSL);
  var defaults = { pointSize: 1 };
  uniforms = merge(defaults, uniforms);
  Material.call(this, program, uniforms);
}

ShowColors.prototype = Object.create(Material.prototype);

module.exports = ShowColors;
},{"merge":66,"pex-color":4,"pex-glu":33}],56:[function(require,module,exports){
var glu = require('pex-glu');
var color = require('pex-color');
var geom = require('pex-geom');
var Context = glu.Context;
var Material = glu.Material;
var Program = glu.Program;
var Color = color.Color;
var Vec3 = geom.Vec3;
var merge = require('merge');


var ShowDepthGLSL = "#ifdef VERT\n\nuniform mat4 projectionMatrix;\nuniform mat4 modelViewMatrix;\nuniform float near;\nuniform float far;\nuniform vec4 farColor;\nuniform vec4 nearColor;\nattribute vec3 position;\nattribute vec3 normal;\nvarying vec4 vColor;\nvoid main() {\n  vec4 pos = modelViewMatrix * vec4(position, 1.0);\n  gl_Position = projectionMatrix * pos;\n  float depth = (length(pos.xyz) - near)/(far - near);\n  vColor.rgb = vec3(depth);\n  vColor.a = length(pos.xyz);\n}\n\n#endif\n\n#ifdef FRAG\n\nvarying vec4 vColor;\nuniform float far;\n\nvoid main() {\n  gl_FragColor.rgb = vColor.rgb;\n  gl_FragColor.a = vColor.a;\n}\n\n#endif\n";

function ShowDepth(uniforms) {
  this.gl = Context.currentContext;
  var program = new Program(ShowDepthGLSL);
  var defaults = {
    near: 0,
    far: 10,
    nearColor: Color.create(0, 0, 0, 1),
    farColor: Color.create(1, 1, 1, 1)
  };
  uniforms = merge(defaults, uniforms);
  Material.call(this, program, uniforms);
}

ShowDepth.prototype = Object.create(Material.prototype);

module.exports = ShowDepth;
},{"merge":66,"pex-color":4,"pex-geom":15,"pex-glu":33}],57:[function(require,module,exports){
var glu = require('pex-glu');
var color = require('pex-color');
var Context = glu.Context;
var Material = glu.Material;
var Program = glu.Program;
var Color = color.Color;
var merge = require('merge');


var ShowNormalsGLSL = "#ifdef VERT\n\nuniform mat4 projectionMatrix;\nuniform mat4 modelViewMatrix;\nuniform mat4 normalMatrix;\nuniform float pointSize;\nattribute vec3 position;\nattribute vec3 normal;\nvarying vec4 vColor;\nvoid main() {\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n  gl_PointSize = pointSize;\n  vec3 N = normalize((normalMatrix * vec4(normal, 1.0)).xyz);\n  vColor = vec4(N * 0.5 + 0.5, 1.0);\n}\n\n#endif\n\n#ifdef FRAG\n\nvarying vec4 vColor;\n\nvoid main() {\n  gl_FragColor = vColor;\n}\n\n#endif\n";

function ShowNormals(uniforms) {
  this.gl = Context.currentContext;
  var program = new Program(ShowNormalsGLSL);
  var defaults = { pointSize: 1 };
  uniforms = merge(defaults, uniforms);
  Material.call(this, program, uniforms);
}

ShowNormals.prototype = Object.create(Material.prototype);

module.exports = ShowNormals;
},{"merge":66,"pex-color":4,"pex-glu":33}],58:[function(require,module,exports){
var glu = require('pex-glu');
var color = require('pex-color');
var geom = require('pex-geom');
var Context = glu.Context;
var Material = glu.Material;
var Program = glu.Program;
var Color = color.Color;
var Vec3 = geom.Vec3;
var merge = require('merge');


var ShowPositionGLSL = "#ifdef VERT\n\nuniform mat4 projectionMatrix;\nuniform mat4 modelViewMatrix;\nattribute vec3 position;\nvarying vec4 vColor;\nvoid main() {\n  vec4 pos = modelViewMatrix * vec4(position, 1.0);\n  gl_Position = projectionMatrix * pos;\n  vColor = pos;\n}\n\n#endif\n\n#ifdef FRAG\n\nvarying vec4 vColor;\n\nvoid main() {\n  gl_FragColor = vColor;\n}\n\n#endif\n";

function ShowPosition(uniforms) {
  this.gl = Context.currentContext;
  var program = new Program(ShowPositionGLSL);
  var defaults = {
  };
  uniforms = merge(defaults, uniforms);
  Material.call(this, program, uniforms);
}

ShowPosition.prototype = Object.create(Material.prototype);

module.exports = ShowPosition;
},{"merge":66,"pex-color":4,"pex-geom":15,"pex-glu":33}],59:[function(require,module,exports){
var glu = require('pex-glu');
var color = require('pex-color');
var Context = glu.Context;
var Material = glu.Material;
var Program = glu.Program;
var Color = color.Color;
var merge = require('merge');


var SkyBoxGLSL = "#ifdef VERT\n\nuniform mat4 projectionMatrix;\nuniform mat4 modelViewMatrix;\nattribute vec3 position;\nattribute vec3 normal;\nvarying vec3 vNormal;\n\nvoid main() {\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n  vNormal = position * vec3(1.0, 1.0, 1.0);\n}\n\n#endif\n\n#ifdef FRAG\n\nuniform samplerCube texture;\nvarying vec3 vNormal;\n\nvoid main() {\n  vec3 N = normalize(vNormal);\n  gl_FragColor = textureCube(texture, N);\n}\n\n#endif\n";

function SkyBox(uniforms) {
  this.gl = Context.currentContext;
  var program = new Program(SkyBoxGLSL);
  var defaults = {};
  uniforms = merge(defaults, uniforms);
  Material.call(this, program, uniforms);
}

SkyBox.prototype = Object.create(Material.prototype);

module.exports = SkyBox;

},{"merge":66,"pex-color":4,"pex-glu":33}],60:[function(require,module,exports){
var glu = require('pex-glu');
var color = require('pex-color');
var Context = glu.Context;
var Material = glu.Material;
var Program = glu.Program;
var Color = color.Color;
var merge = require('merge');


var SkyBoxEnvMapGLSL = "#ifdef VERT\n\nuniform mat4 projectionMatrix;\nuniform mat4 modelViewMatrix;\nattribute vec3 position;\nattribute vec3 normal;\nvarying vec3 vNormal;\n\nvoid main() {\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n  vNormal = position;\n}\n\n#endif\n\n#ifdef FRAG\n\nuniform sampler2D texture;\nvarying vec3 vNormal;\n\nvoid main() {\n  vec3 N = normalize(vNormal);\n  vec2 texCoord = vec2((1.0 + atan(-N.z, N.x)/3.14159265359)/2.0, acos(-N.y)/3.14159265359);\n\n  gl_FragColor = texture2D(texture, texCoord);\n}\n\n#endif\n";

function SkyBoxEnvMap(uniforms) {
  this.gl = Context.currentContext;
  var program = new Program(SkyBoxEnvMapGLSL);
  var defaults = {};
  uniforms = merge(defaults, uniforms);
  Material.call(this, program, uniforms);
}

SkyBoxEnvMap.prototype = Object.create(Material.prototype);

module.exports = SkyBoxEnvMap;

},{"merge":66,"pex-color":4,"pex-glu":33}],61:[function(require,module,exports){
var glu = require('pex-glu');
var color = require('pex-color');
var Context = glu.Context;
var Material = glu.Material;
var Program = glu.Program;
var Color = color.Color;
var merge = require('merge');


var SolidColorGLSL = "#ifdef VERT\n\nuniform mat4 projectionMatrix;\nuniform mat4 modelViewMatrix;\nuniform float pointSize;\nattribute vec3 position;\n\nvoid main() {\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n  gl_PointSize = pointSize;\n}\n\n#endif\n\n#ifdef FRAG\n\nuniform vec4 color;\nuniform bool premultiplied;\n\nvoid main() {\n  gl_FragColor = color;\n  if (premultiplied) {\n    gl_FragColor.rgb *= color.a;\n  }\n}\n\n#endif\n";

function SolidColor(uniforms) {
  this.gl = Context.currentContext;
  var program = new Program(SolidColorGLSL);
  var defaults = {
    color: Color.create(1, 1, 1, 1),
    pointSize: 1,
    premultiplied: 0
  };
  uniforms = merge(defaults, uniforms);
  Material.call(this, program, uniforms);
}

SolidColor.prototype = Object.create(Material.prototype);

module.exports = SolidColor;
},{"merge":66,"pex-color":4,"pex-glu":33}],62:[function(require,module,exports){
var glu = require('pex-glu');
var color = require('pex-color');
var geom = require('pex-geom');
var Context = glu.Context;
var Material = glu.Material;
var Program = glu.Program;
var Color = color.Color;
var Vec2 = geom.Vec2;
var merge = require('merge');


var TexturedGLSL = "#ifdef VERT\n\nuniform mat4 projectionMatrix;\nuniform mat4 modelViewMatrix;\nattribute vec3 position;\nattribute vec2 texCoord;\nvarying vec2 vTexCoord;\n\nvoid main() {\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n  vTexCoord = texCoord;\n}\n\n#endif\n\n#ifdef FRAG\n\nuniform sampler2D texture;\nuniform vec2 scale;\nuniform vec4 color;\nvarying vec2 vTexCoord;\n\nvoid main() {\n  gl_FragColor = texture2D(texture, vTexCoord * scale) * color;\n}\n\n#endif\n";

function Textured(uniforms) {
  this.gl = Context.currentContext;
  var program = new Program(TexturedGLSL);
  var defaults = {
    scale: new Vec2(1, 1),
    color: new Color(1, 1, 1, 1)
  };
  uniforms = merge(defaults, uniforms);
  Material.call(this, program, uniforms);
}

Textured.prototype = Object.create(Material.prototype);

module.exports = Textured;

},{"merge":66,"pex-color":4,"pex-geom":15,"pex-glu":33}],63:[function(require,module,exports){
var glu = require('pex-glu');
var color = require('pex-color');
var Context = glu.Context;
var Material = glu.Material;
var Program = glu.Program;
var Color = color.Color;
var merge = require('merge');


var TexturedCubeMapGLSL = "#ifdef VERT\n\nuniform mat4 projectionMatrix;\nuniform mat4 modelViewMatrix;\nuniform mat4 normalMatrix;\nattribute vec3 position;\nattribute vec3 normal;\nvarying vec3 vTexCoord;\n\nvoid main() {\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n  vTexCoord = (normalMatrix * vec4(normal, 1.0)).xyz;\n}\n\n#endif\n\n#ifdef FRAG\n\nuniform samplerCube texture;\nvarying vec3 vTexCoord;\n\nvoid main() {\n  vec3 reflectedDirection = reflect(vec3(0.0, 0.0, 1.0), normalize(vTexCoord));\n  reflectedDirection.y *= -1.0;\n  gl_FragColor = textureCube(texture, reflectedDirection);\n}\n\n#endif\n";

function TexturedCubeMap(uniforms) {
  this.gl = Context.currentContext;
  var program = new Program(TexturedCubeMapGLSL);
  var defaults = {};
  uniforms = merge(defaults, uniforms);
  Material.call(this, program, uniforms);
}

TexturedCubeMap.prototype = Object.create(Material.prototype);

module.exports = TexturedCubeMap;

},{"merge":66,"pex-color":4,"pex-glu":33}],64:[function(require,module,exports){
var glu = require('pex-glu');
var color = require('pex-color');
var Context = glu.Context;
var Material = glu.Material;
var Program = glu.Program;
var Color = color.Color;
var merge = require('merge');


var TexturedEnvMapGLSL = "#ifdef VERT\n\nuniform mat4 projectionMatrix;\nuniform mat4 modelViewMatrix;\nuniform mat4 normalMatrix;\nattribute vec3 position;\nattribute vec3 normal;\nvarying vec3 vNormal;\n\nvoid main() {\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n  vNormal = (normalMatrix * vec4(normal, 1.0)).xyz;\n}\n\n#endif\n\n#ifdef FRAG\n\nuniform sampler2D texture;\nvarying vec3 vNormal;\n\nvoid main() {\n  vec3 N = normalize(vNormal);\n  vec2 texCoord = vec2((1.0 + atan(-N.z, N.x)/3.14159265359)/2.0, acos(-N.y)/3.14159265359);\n  gl_FragColor = texture2D(texture, texCoord);\n}\n\n#endif\n";

function TexturedEnvMap(uniforms) {
  this.gl = Context.currentContext;
  var program = new Program(TexturedEnvMapGLSL);
  var defaults = {};
  uniforms = merge(defaults, uniforms);
  Material.call(this, program, uniforms);
}

TexturedEnvMap.prototype = Object.create(Material.prototype);

module.exports = TexturedEnvMap;

},{"merge":66,"pex-color":4,"pex-glu":33}],65:[function(require,module,exports){
var glu = require('pex-glu');
var color = require('pex-color');
var geom = require('pex-geom');
var Context = glu.Context;
var Material = glu.Material;
var Program = glu.Program;
var Color = color.Color;
var Vec3 = geom.Vec3;
var merge = require('merge');


var TexturedTriPlanarGLSL = "#ifdef VERT\n\nuniform mat4 projectionMatrix;\nuniform mat4 modelViewMatrix;\nuniform mat4 modelWorldMatrix;\nattribute vec3 position;\nattribute vec3 normal;\nvarying vec3 wcNormal;\nvarying vec3 wcCoords;\n\nvoid main() {\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n  wcNormal = normal; //this is not correct, shoud go from model -> world\n  wcCoords = (modelWorldMatrix * vec4(position, 1.0)).xyz;\n}\n\n#endif\n\n#ifdef FRAG\n\nuniform sampler2D texture;\nuniform float scale;\nvarying vec3 wcNormal;\nvarying vec3 wcCoords;\n\nvoid main() {\n  vec3 blending = abs( normalize(wcNormal) );\n  blending = normalize(max(blending, 0.00001)); // Force weights to sum to 1.0\n  float b = (blending.x + blending.y + blending.z);\n  blending /= vec3(b, b, b);\n\n  vec4 xaxis = texture2D( texture, wcCoords.zy * scale);\n  vec4 yaxis = texture2D( texture, wcCoords.xz * scale);\n  vec4 zaxis = texture2D( texture, wcCoords.xy * scale);\n  // blend the results of the 3 planar projections.\n  vec4 tex = xaxis * blending.x + yaxis * blending.y + zaxis * blending.z;\n\n  gl_FragColor = tex;\n}\n\n#endif\n";

function TexturedTriPlanar(uniforms) {
  this.gl = Context.currentContext;
  var program = new Program(TexturedTriPlanarGLSL);
  var defaults = {
    scale: 1
  };
  uniforms = merge(defaults, uniforms);
  Material.call(this, program, uniforms);
}

TexturedTriPlanar.prototype = Object.create(Material.prototype);

module.exports = TexturedTriPlanar;

},{"merge":66,"pex-color":4,"pex-geom":15,"pex-glu":33}],66:[function(require,module,exports){
module.exports=require(14)
},{}],67:[function(require,module,exports){
module.exports.Platform = require('./lib/Platform');
module.exports.Window = require('./lib/Window');
module.exports.Time = require('./lib/Time');
module.exports.IO = require('./lib/IO');
module.exports.Log = require('./lib/Log');
},{"./lib/IO":69,"./lib/Log":70,"./lib/Platform":71,"./lib/Time":72,"./lib/Window":73}],68:[function(require,module,exports){
var Platform = require('./Platform');
var Log = require('./Log');

var requestAnimFrameFps = 60;

if (Platform.isBrowser) {
  window.requestAnimFrame = function() {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback, element) {
      window.setTimeout(callback, 1000 / requestAnimFrameFps);
    };
  }();
}
var eventListeners = [];
function fireEvent(eventType, event) {
  for (var i = 0; i < eventListeners.length; i++) {
    if (eventListeners[i].eventType == eventType) {
      eventListeners[i].handler(event);
    }
  }
}

function registerEvents(canvas) {
  makeMouseDownHandler(canvas);
  makeMouseUpHandler(canvas);
  makeMouseDraggedHandler(canvas);
  makeMouseMovedHandler(canvas);
  makeScrollWheelHandler(canvas);
  makeTouchDownHandler(canvas);
  makeTouchUpHandler(canvas);
  makeTouchMoveHandler(canvas);
  makeKeyDownHandler(canvas);
}

function makeMouseDownHandler(canvas) {
  canvas.addEventListener('mousedown', function(e) {
    fireEvent('leftMouseDown', {
      x: (e.offsetX || e.layerX || e.clientX - e.target.offsetLeft) * window.devicePixelRatio,
      y: (e.offsetY || e.layerY || e.clientY - e.target.offsetTop) * window.devicePixelRatio,
      option: e.altKey,
      shift: e.shiftKey,
      control: e.ctrlKey
    });
  });
}

function makeMouseUpHandler(canvas) {
  canvas.addEventListener('mouseup', function(e) {
    fireEvent('leftMouseUp', {
      x: (e.offsetX || e.layerX || e.clientX - e.target.offsetLeft) * window.devicePixelRatio,
      y: (e.offsetY || e.layerY || e.clientY - e.target.offsetTop) * window.devicePixelRatio,
      option: e.altKey,
      shift: e.shiftKey,
      control: e.ctrlKey
    });
  });
}

function makeMouseDraggedHandler(canvas) {
  var down = false;
  var px = 0;
  var py = 0;
  canvas.addEventListener('mousedown', function(e) {
    down = true;
    px = (e.offsetX || e.layerX || e.clientX - e.target.offsetLeft) * window.devicePixelRatio;
    py = (e.offsetY || e.layerY || e.clientY - e.target.offsetTop) * window.devicePixelRatio;
  });
  canvas.addEventListener('mouseup', function(e) {
    down = false;
  });
  canvas.addEventListener('mousemove', function(e) {
    if (down) {
      var x = (e.offsetX || e.layerX || e.clientX - e.target.offsetLeft) * window.devicePixelRatio;
      var y = (e.offsetY || e.layerY || e.clientY - e.target.offsetTop) * window.devicePixelRatio;
      fireEvent('mouseDragged', {
        x: x,
        y: y,
        dx: x - px,
        dy: y - py,
        option: e.altKey,
        shift: e.shiftKey,
        control: e.ctrlKey
      });
      px = x;
      py = y;
    }
  });
}

function makeMouseMovedHandler(canvas) {
  canvas.addEventListener('mousemove', function(e) {
    fireEvent('mouseMoved', {
      x: (e.offsetX || e.layerX || e.clientX - e.target.offsetLeft) * window.devicePixelRatio,
      y: (e.offsetY || e.layerY || e.clientY - e.target.offsetTop) * window.devicePixelRatio,
      option: e.altKey,
      shift: e.shiftKey,
      control: e.ctrlKey
    });
  });
}

function makeScrollWheelHandler(canvas) {
  var mousewheelevt = /Firefox/i.test(navigator.userAgent) ? 'DOMMouseScroll' : 'mousewheel';
  document.addEventListener(mousewheelevt, function(e) {
    fireEvent('scrollWheel', {
      x: (e.offsetX || e.layerX) * window.devicePixelRatio,
      y: (e.offsetY || e.layerY) * window.devicePixelRatio,
      dy: e.wheelDelta / 10 || -e.detail / 10,
      option: e.altKey,
      shift: e.shiftKey,
      control: e.ctrlKey
    });
  });
}
var lastTouch = null;
function makeTouchDownHandler(canvas) {
  canvas.addEventListener('touchstart', function(e) {
    lastTouch = {
      clientX: e.touches[0].clientX * window.devicePixelRatio,
      clientY: e.touches[0].clientY * window.devicePixelRatio
    };
    var touches = e.touches.map(function(touch) {
      touch.x = touch.clientX * window.devicePixelRatio;
      touch.y = touch.clientY * window.devicePixelRatio;
      return touch;
    });
    fireEvent('leftMouseDown', {
      x: e.touches[0].clientX * window.devicePixelRatio,
      y: e.touches[0].clientY * window.devicePixelRatio,
      option: false,
      shift: false,
      control: false,
      touches: touches
    });
  });
}

function makeTouchUpHandler(canvas) {
  canvas.addEventListener('touchend', function(e) {
    var touches = e.touches.map(function(touch) {
      touch.x = touch.clientX * window.devicePixelRatio;
      touch.y = touch.clientY * window.devicePixelRatio;
      return touch;
    });
    fireEvent('leftMouseUp', {
      x: lastTouch ? lastTouch.clientX : 0,
      y: lastTouch ? lastTouch.clientY : 0,
      option: false,
      shift: false,
      control: false,
      touches: touches
    });
    lastTouch = null;
  });
}

function makeTouchMoveHandler(canvas) {
  canvas.addEventListener('touchmove', function(e) {
    lastTouch = {
      clientX: e.touches[0].clientX * window.devicePixelRatio,
      clientY: e.touches[0].clientY * window.devicePixelRatio
    };
    var touches = e.touches.map(function(touch) {
      touch.x = touch.clientX * window.devicePixelRatio;
      touch.y = touch.clientY * window.devicePixelRatio;
      return touch;
    });
    fireEvent('mouseDragged', {
      x: e.touches[0].clientX * window.devicePixelRatio,
      y: e.touches[0].clientY * window.devicePixelRatio,
      option: false,
      shift: false,
      control: false,
      touches: touches
    });
  });
}

function makeKeyDownHandler(canvas) {
  var timeout = 0;
  window.addEventListener('keydown', function(e) {
    timeout = setTimeout(function() {
      fireEvent('keyDown', {
        str: '',
        keyCode: e.keyCode,
        option: e.altKey,
        shift: e.shiftKey,
        control: e.ctrlKey
      }, 1);
    });
  });
  window.addEventListener('keypress', function(e) {
    if (timeout) {
      clearTimeout(timeout);
      timeout = 0;
    }
    fireEvent('keyDown', {
      str: String.fromCharCode(e.charCode),
      keyCode: e.keyCode,
      option: e.altKey,
      shift: e.shiftKey,
      control: e.ctrlKey
    });
  });
}

function simpleWindow(obj) {
  var canvas = obj.settings.canvas;
  if (obj.settings.fullscreen) {
    obj.settings.width = window.innerWidth;
    obj.settings.height = window.innerHeight;
  }
  if (!canvas) {
    canvas = document.getElementById('canvas');
  }
  else if (obj.settings.width && obj.settings.height) {
    canvas.width = obj.settings.width;
    canvas.height = obj.settings.height;
  }
  else {
    obj.settings.width = canvas.width;
    obj.settings.height = canvas.height;
  }
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = obj.settings.width;
    canvas.height = obj.settings.height;
  }
  if (window.devicePixelRatio == 2) {
    canvas.width = obj.settings.width * 2;
    canvas.height = obj.settings.height * 2;
    canvas.style.width = obj.settings.width + 'px';
    canvas.style.height = obj.settings.height + 'px';
    canvas.msaaEnabled = true;
    canvas.msaaSamples = 2;
    obj.settings.width *= 2;
    obj.settings.height *= 2;
  }
  obj.width = obj.settings.width;
  obj.height = obj.settings.height;
  obj.canvas = canvas;
  canvas.style.backgroundColor = '#000000';
  function go() {
    if (obj.stencil === undefined)
      obj.stencil = false;
    if (obj.settings.fullscreen) {
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.overflow = 'hidden';
    }
    var gl = null;
    var ctx = null;
    if (obj.settings.type == '3d') {
      try {
        gl = canvas.getContext('experimental-webgl', { antialias: true, premultipliedAlpha : true, stencil: obj.settings.stencil });
      }
      catch (err) {
        Log.error(err.message);
        return;
      }
      if (gl === null) {
        throw 'No WebGL context is available.';
      }
    }else if (obj.settings.type == '2d') {
      ctx = canvas.getContext('2d');
    }
    obj.framerate = function(fps) {
      requestAnimFrameFps = fps;
    };
    obj.on = function(eventType, handler) {
      eventListeners.push({
        eventType: eventType,
        handler: handler
      });
    };
    registerEvents(canvas);
    obj.dispose = function() {
      obj.__disposed = true;
    };
    obj.gl = gl;
    obj.ctx = ctx;
    obj.init();
    function drawloop() {
      if (!obj.__disposed) {
        obj.draw();
        requestAnimFrame(drawloop);
      }
    }
    requestAnimFrame(drawloop);
  }
  if (!canvas.parentNode) {
    if (document.body) {
      document.body.appendChild(canvas);
      go();
    }else {
      window.addEventListener('load', function() {
        document.body.appendChild(canvas);
        go();
      }, false);
    }
  }
  else {
    go();
  }
  return obj;
}

var BrowserWindow = { simpleWindow: simpleWindow };

module.exports = BrowserWindow;
},{"./Log":70,"./Platform":71}],69:[function(require,module,exports){
(function (process){
var Platform = require('./Platform');
var Log = require('./Log');
var plask = require('plask');
var path = require('path');

var merge = require('merge');

var PlaskIO = function() {
  function IO() {
  }

  IO.loadTextFile = function (file, callback) {
    var fullPath = path.resolve(IO.getWorkingDirectory(), file);
    if (!fs.existsSync(fullPath)) {
      if (callback) {
        return callback(null);
      }
    }
    var data = fs.readFileSync(fullPath, 'utf8');
    if (callback) {
      callback(data);
    }
  };

  IO.getWorkingDirectory = function () {
    return path.dirname(process.mainModule.filename);
  };

  IO.loadImageData = function (gl, textureHandle, target, file, options, callback) {
    var defaultOptions = { flip: false, lod: 0 };
    options = merge(defaultOptions, options);
    var fullPath = path.resolve(IO.getWorkingDirectory(), file);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(target, textureHandle);
    var canvas = plask.SkCanvas.createFromImage(fullPath);
    if (options.flip) {
      gl.texImage2DSkCanvas(target, options.lod, canvas);
    }
    else {
      gl.texImage2DSkCanvasNoFlip(target, options.lod, canvas);
    }
    if (callback) {
      callback(canvas);
    }
  };

  IO.watchTextFile = function (file, callback) {
    fs.watch(file, {}, function (event, fileName) {
      if (event == 'change') {
        var data = fs.readFileSync(file, 'utf8');
        if (callback) {
          callback(data);
        }
      }
    });
  };

  IO.saveTextFile = function (file, data) {
    fs.writeFileSync(file, data);
  };
  return IO;
};

var WebIO = function () {
  function IO() {
  }

  IO.getWorkingDirectory = function () {
    return '.';
  };

  IO.loadTextFile = function (url, callback) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.onreadystatechange = function (e) {
      if (request.readyState == 4) {
        if (request.status == 200) {
          if (callback) {
            callback(request.responseText);
          }
        } else {
          Log.error('WebIO.loadTextFile error : ' + request.statusText);
        }
      }
    };
    request.send(null);
  };

  IO.loadImageData = function (gl, textureHandle, target, url, options, callback) {
    var defaultOptions = { flip: false, lod: 0 };
    options = merge(defaultOptions, options);
    var image = new Image();
    if (options.crossOrigin) image.crossOrigin = options.crossOrigin;
    image.onload = function () {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(target, textureHandle);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, options.flip);
      gl.texImage2D(target, options.lod, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      if (callback) {
        callback(image);
      }
    };
    image.src = url;
  };

  IO.watchTextFile = function () {
    console.log('Warning: WebIO.watch is not implemented!');
  };

  IO.saveTextFile = function (url, data, callback) {
    var request = new XMLHttpRequest();
    request.open('POST', url, true);
    request.onreadystatechange = function (e) {
      if (request.readyState == 4) {
        if (request.status == 200) {
          if (callback) {
            callback(request.responseText, request);
          }
        } else {
          Log.error('WebIO.saveTextFile error : ' + request.statusText);
        }
      }
    };
    request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    request.send('data=' + encodeURIComponent(data));
  };

  return IO;
};

if (Platform.isPlask) module.exports = PlaskIO();
else if (Platform.isBrowser) module.exports = WebIO();
}).call(this,require("FWaASH"))
},{"./Log":70,"./Platform":71,"FWaASH":3,"merge":74,"path":2,"plask":1}],70:[function(require,module,exports){
function Log() {
}

Log.message = function(msg) {
  if (console !== undefined) {
    var msgs = Array.prototype.slice.call(arguments);
    console.log(msgs.join(' '));
  }
};

Log.error = function(msg) {
  var msgs = Array.prototype.slice.call(arguments);
  if (console !== undefined) {
    console.log('ERROR: ' + msgs.join(' '));
  }
};

module.exports = Log;
},{}],71:[function(require,module,exports){
(function (process){
module.exports.isPlask = typeof window === 'undefined' && typeof process === 'object';
module.exports.isBrowser = typeof window === 'object' && typeof document === 'object';
module.exports.isEjecta = typeof ejecta === 'object' && typeof ejecta.include === 'function';

}).call(this,require("FWaASH"))
},{"FWaASH":3}],72:[function(require,module,exports){
var Log = require('./Log');

var Time = {
    now: 0,
    prev: 0,
    delta: 0,
    seconds: 0,
    frameNumber: 0,
    fpsFrames: 0,
    fpsTime: 0,
    fps: 0,
    fpsFrequency: 3,
    paused: false,
    verbose: false
};

Time.update = function(delta) {
  if (Time.paused) {
    return;
  }

  if (Time.prev === 0) {
    Time.prev = Date.now();
  }

  Time.now = Date.now();
  Time.delta = (delta !== undefined) ? delta : (Time.now - Time.prev) / 1000;

  //More than 1s = probably switched back from another window so we have big jump now
  if (Time.delta > 1) {
    Time.delta = 0;
  }

  Time.prev = Time.now;
  Time.seconds += Time.delta;
  Time.fpsTime += Time.delta;
  Time.frameNumber++;
  Time.fpsFrames++;

  if (Time.fpsTime > Time.fpsFrequency) {
    Time.fps = Time.fpsFrames / Time.fpsTime;
    Time.fpsTime = 0;
    Time.fpsFrames = 0;
    if (this.verbose)
      Log.message('FPS: ' + Time.fps);
  }
  return Time.seconds;

};

var startOfMeasuredTime = 0;

Time.startMeasuringTime = function() {
  startOfMeasuredTime = Date.now();
};

Time.stopMeasuringTime = function(msg) {
  var now = Date.now();
  var seconds = (now - startOfMeasuredTime) / 1000;
  if (msg) {
    console.log(msg + seconds);
  }
  return seconds;
};

Time.pause = function() {
  Time.paused = true;
};

Time.togglePause = function() {
  Time.paused = !Time.paused;
};

module.exports = Time;
},{"./Log":70}],73:[function(require,module,exports){
var Platform = require('./Platform');
var BrowserWindow = require('./BrowserWindow');
var Time = require('./Time');
var Log = require('./Log');
var merge = require('merge');
var plask = require('plask');

var DefaultSettings = {
  'width': 1280,
  'height': 720,
  'type': '3d',
  'vsync': true,
  'multisample': true,
  'fullscreen': false,
  'center': true,
  'hdpi': 1,
  'stencil': false
};

var Window = {
  currentWindow: null,
  create: function(obj) {
    obj.settings = obj.settings || {};
    obj.settings = merge(DefaultSettings, obj.settings);

    obj.__init = obj.init;
    obj.init = function() {
      Window.currentWindow = this;
      obj.framerate(60);
      if (obj.__init) {
        obj.__init();
      }
    }

    obj.__draw = obj.draw;
    obj.draw = function() {
      Window.currentWindow = this;
      //FIXME: this will cause Time update n times, where n is number of Window instances opened
      Time.update();
      if (obj.__draw) {
        obj.__draw();
      }
    }

    if (Platform.isPlask) {
      plask.simpleWindow(obj);
    }
    else if (Platform.isBrowser || Platform.isEjecta) {
      BrowserWindow.simpleWindow(obj);
    }
  }
};

module.exports = Window;
},{"./BrowserWindow":68,"./Log":70,"./Platform":71,"./Time":72,"merge":74,"plask":1}],74:[function(require,module,exports){
module.exports=require(14)
},{}],75:[function(require,module,exports){
if(!Array.prototype.lastElement) {
    Array.prototype.lastElement = function() {
        return this[this.length - 1];
    }
}

var sys             = require('pex-sys');
var glu             = require('pex-glu');
var geom            = require('pex-geom');
var gen             = require('pex-gen');
var materials       = require('pex-materials');
var color           = require('pex-color');

var Time            = sys.Time;
var Vec2            = geom.Vec2;
var Vec3            = geom.Vec3;
var Sphere          = gen.Sphere;
var LineBuilder     = gen.LineBuilder;
var Mesh            = glu.Mesh;
var SolidColor      = materials.SolidColor;
var ShowColors      = materials.ShowColors;
var Diffuse         = materials.Diffuse;
var PCamera         = glu.PerspectiveCamera;
var Arcball         = glu.Arcball;
var Color           = color.Color;
var Rect            = geom.Rect;

var deadIterations  = 0;
var hormoneSize     = 0.05;
var hormoneDeadZone = 0.2;
var budSize         = 0.04;
var growthStep      = 0.1;
var splitChance     = 0.4;
var margin          = 5;
var numHormones     = 300;

var center; 
var centerRadius;


sys.Window.create({
    settings: {
        width:  800,
        height: 600,
        type:   '3d'
    },

    init: function() {
        center              = new Vec3(0, 0, 0);
        centerRadius        = 1;

        this.lineBuilder    = new LineBuilder();
        this.buds           = generateBuds(1);
        this.hormones       = generateHormones(numHormones, centerRadius, center);
        this.camera         = new PCamera(60, this.width / this.height);
        this.arcball        = new Arcball(this, this.camera);

        this.hormoneMesh    = generateSphereMesh();
        this.budMesh        = generateSphereMesh();
        this.lineMesh       = new Mesh(this.lineBuilder, new ShowColors(), {lines: true});
        
    },

    draw: function() {
        
        if (Time.frameNumber % 40 == 0) {
            this.iterObject = spaceColonIter(this.buds, this.hormones);
        }

        if (!this.iterObject) return;

        this.hormones   = this.iterObject.hormones;
        this.buds       = this.iterObject.buds;

        var deadZoneObjects         = [];
        var aliveHormoneObjects     = [];
        var deadHormoneObjects      = [];
        var aliveBudObjects         = [];
        var deadBudObjects          = [];

        var that = this;
        
        this.hormones.forEach(function(hormone) {
            if (hormone.state == 0) {

                deadZoneObjects.push({
                    scale:      new Vec3(hormoneDeadZone, hormoneDeadZone, hormoneDeadZone),
                    uniforms:   {
                        diffuseColor: Color.fromRGB(255/255, 220/255, 220/255, 0.2),
                        ambientColor: Color.fromRGB(0,0,0,0)
                    }, 
                    position:   hormone.position
                });

                aliveHormoneObjects.push({
                    scale:  new Vec3(hormoneSize, hormoneSize, hormoneSize),
                    uniforms: {
                        diffuseColor: Color.fromRGB(255/255, 100/255, 100/255, 1)
                    }, 
                    position: hormone.position
                });

            }

            else if (hormone.state == 1) {
                deadHormoneObjects.push({
                    scale:  new Vec3(hormoneSize, hormoneSize, hormoneSize),
                    uniforms: {
                        diffuseColor: Color.fromRGB(0/255, 255/255, 255/255, 1)
                    },
                    position: hormone.position
                });
            }
        });

        
        this.lineBuilder.reset(); 
        
        this.buds.forEach(function(bud, i) {
            if (!bud.color) bud.color = Color.fromHSL(Math.random(), 1, 0.5);
            

            if (bud.hormones) {
                bud.hormones.forEach(function(hormone) {
                    that.lineBuilder.addLine(bud.position, hormone.position, bud.color);
                });
            }
            
            if (bud.parent) {

                that.lineBuilder.addLine(bud.position, bud.parent.position, Color.White, Color.Yellow);
            }               


            if (bud.state == 0) {

                aliveBudObjects.push({
                    scale:      new Vec3(budSize, budSize, budSize),
                    position:   bud.position,
                    uniforms:   {
                        diffuseColor: Color.fromRGB(100/255, 200/255, 0/255, 1)
                    }
                });

            }

            else if (bud.state == 1) {

                deadBudObjects.push({
                    scale:      new Vec3(budSize/10, budSize/10, budSize/10),
                    position:   bud.position,
                    uniforms:   {
                        diffuseColor: Color.fromRGB(100/255, 50/255, 200/255, 1)
                    }
                });
            }
        });


        glu.clearColorAndDepth(Color.DarkGrey);
        glu.enableDepthReadAndWrite(true, false);
        glu.enableAlphaBlending(true);
        glu.cullFace(true);
        this.hormoneMesh.drawInstances(this.camera, deadZoneObjects);

        
        glu.enableBlending(false);
        glu.enableDepthReadAndWrite(true, true);

        this.hormoneMesh.drawInstances(this.camera, deadHormoneObjects);
        this.hormoneMesh.drawInstances(this.camera, aliveHormoneObjects);
    
        this.budMesh.drawInstances(this.camera, deadBudObjects);
        this.budMesh.drawInstances(this.camera, aliveBudObjects);
        this.lineMesh.draw(this.camera);
        
    }
});

function generateBuds(numBuds) {
    var buds = [];

    for(var i=0; i<numBuds; i++) {
        var pos = new Vec3(
            Math.random() - 0.5, 
            Math.random() - 0.5,
            Math.random() - 0.
        );

        pos.normalize().scale(centerRadius);
        pos.add(center);
        buds.push({
            state:      0, 
            position:  new Vec3(pos.x, pos.y, pos.z),
            parent:     null
        });
   }
   
    return buds;
}

function generateHormones(numHormones, centerRadius, center) {
    var hormones = [];
    for(var i=0; i<numHormones; i++) {
        var pos = geom.randomVec3(centerRadius).add(center);
        //pos.z = 0;        
        if (pos.sub(center).length() > centerRadius) {
            i--;
            continue;
        }
        hormones.push({
            state:      0,
            position:   new Vec3(pos.x, pos.y, pos.z)
        });
    }
    return hormones;
}

function generateSphereMesh() {
    var sphereGeometry = new Sphere();
    var sphereMaterial = new Diffuse({ diffuseColor: Color.Red });
    return new Mesh(sphereGeometry, sphereMaterial);
}

function iterate(buds, hormones) {


    var hormonesForBud = [];
    for(var i=0; i<buds.length; i++) {
        hormonesForBud.push([]);
    }
    hormones.forEach(function(hormone, i) {

        if (hormone.state != 0) return;

        var minDist = 0.8;
        var minDistIndex = -1;
            
        buds.forEach(function(bud, j) {
            if (bud.state > 0) return;
            var dubPos = bud.position.clone();
            var dist = hormone.position.distance(bud.position);
            if (dist < minDist) {
                minDist = dist;
                minDistIndex = j;
            }
        });
        
        if (minDistIndex == -1) return;

        hormonesForBud[minDistIndex].push(i);

        if (minDist < hormoneDeadZone && minDistIndex != -1) {
            hormone.state++;
        }
    });

    
    buds.forEach(function(bud, i) {

        if (hormonesForBud[i].length == 0) {
            bud.hormones = [];
            return;
        }

        
        var budPos      = bud.position.clone();
        var avgPos      = new Vec3(0, 0, 0);
        var avgPosCount = 0;
        
        hormonesForBud[i].forEach(function(hormoneIndex) {
        
            avgPos.add(hormones[hormoneIndex].position);
            avgPosCount++;
        
        });

        bud.hormones = hormonesForBud[i].map(function(index) { return hormones[index]; });
        
        avgPos.scale(1/avgPosCount);
        var dir = avgPos.sub(budPos);
        dir.normalize().scale(growthStep);
        var nextPos = budPos.add(dir);
        
        bud.state++;
        
        buds.push({
            state:      0,
            position:   nextPos,
            parent:     bud
        });


        if (Math.random() > (1.0 - splitChance)) {
            buds.push({
                state:      0,
                position:   nextPos,
                parent:     null
            });
        };
    });


}

    
function spaceColonIter(buds, hormones) {
    var newBuds     = buds;
    var newHormones = hormones;

    iterate(newBuds, newHormones); 

    return { 
       buds:     newBuds,
       hormones: newHormones 
   }
}


},{"pex-color":4,"pex-gen":6,"pex-geom":15,"pex-glu":33,"pex-materials":50,"pex-sys":67}]},{},[75])