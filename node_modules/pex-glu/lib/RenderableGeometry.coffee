{ Geometry } = require('pex-geom')
Context = require('./Context')
Buffer = require('./Buffer')

indexTypes = ['faces', 'edges', 'indices']

RenderableGeometry =
  compile: () ->
    @gl ?= Context.currentContext
    for attribName, attrib of @attribs
      if !attrib.buffer
        usage = if attrib.dynamic then @gl.DYNAMIC_DRAW else @gl.STATIC_DRAW
        attrib.buffer = new Buffer(@gl.ARRAY_BUFFER, Float32Array, null, usage)
        attrib.dirty = true
      if attrib.dirty
        attrib.buffer.update(attrib)
        attrib.dirty = false

    for indexName in indexTypes
      if @[indexName]
        if !@[indexName].buffer
          usage = if @[indexName].dynamic then @gl.DYNAMIC_DRAW else @gl.STATIC_DRAW
          @[indexName].buffer = new Buffer(@gl.ELEMENT_ARRAY_BUFFER, Uint16Array, null, usage)
          @[indexName].dirty = true
        if @[indexName].dirty
          @[indexName].buffer.update(@[indexName])
          @[indexName].dirty = false

  dispose: () ->
    for attribName, attrib of @attribs
      attrib.buffer.dispose() if attrib and attrib.buffer

    for indexName in indexTypes
      @[indexName].buffer.dispose() if @[indexName] and @[indexName].buffer

module.exports = RenderableGeometry #nothing to export
