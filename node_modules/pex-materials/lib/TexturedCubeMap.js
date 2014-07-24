var glu = require('pex-glu');
var color = require('pex-color');
var Context = glu.Context;
var Material = glu.Material;
var Program = glu.Program;
var Color = color.Color;
var merge = require('merge');
var fs = require('fs');

var TexturedCubeMapGLSL = fs.readFileSync(__dirname + '/TexturedCubeMap.glsl', 'utf8');

function TexturedCubeMap(uniforms) {
  this.gl = Context.currentContext;
  var program = new Program(TexturedCubeMapGLSL);
  var defaults = {};
  uniforms = merge(defaults, uniforms);
  Material.call(this, program, uniforms);
}

TexturedCubeMap.prototype = Object.create(Material.prototype);

module.exports = TexturedCubeMap;
