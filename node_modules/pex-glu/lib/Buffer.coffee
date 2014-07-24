{ Vec2, Vec3, Vec4, Edge, Face3, Face4, FacePolygon } = require('pex-geom')
{ Color } = require('pex-color')
Context = require('./Context')

hasProperties = (obj, list) ->
  for prop in list
    if typeof(obj[prop]) == 'undefined'
      return false
  return true

class Buffer
  constructor: (target, type, data, usage) ->
    @gl = Context.currentContext
    @target = target
    @type = type
    @usage = usage || gl.STATIC_DRAW
    @dataBuf = null
    @update(data, @usage) if data

  dispose: () ->
    @gl.deleteBuffer(@handle)
    @handle = null

  update: (data, usage) ->
    @handle = @gl.createBuffer() if !@handle
    @usage = usage || @usage

    return if !data || data.length == 0

    if !isNaN(data[0])
      if !@dataBuf || @dataBuf.length != data.length
        @dataBuf = new @type(data.length)
      for v, i in data
        @dataBuf[i] = v
        @elementSize = 1

    else if hasProperties(data[0], ['x', 'y', 'z', 'w'])
      if !@dataBuf || @dataBuf.length != data.length * 4
        @dataBuf = new @type(data.length * 4)
        @elementSize = 4
      for v, i in data
        @dataBuf[i * 4 + 0] = v.x
        @dataBuf[i * 4 + 1] = v.y
        @dataBuf[i * 4 + 2] = v.z
        @dataBuf[i * 4 + 3] = v.w

    else if hasProperties(data[0], ['x', 'y', 'z'])
      if !@dataBuf || @dataBuf.length != data.length * 3
        @dataBuf = new @type(data.length * 3)
        @elementSize = 3
      for v, i in data
        @dataBuf[i * 3 + 0] = v.x
        @dataBuf[i * 3 + 1] = v.y
        @dataBuf[i * 3 + 2] = v.z

    else if hasProperties(data[0], ['x', 'y'])
      if !@dataBuf || @dataBuf.length != data.length * 2
        @dataBuf = new @type(data.length * 2)
        @elementSize = 2
      for v, i in data
        @dataBuf[i * 2 + 0] = v.x
        @dataBuf[i * 2 + 1] = v.y

    else if hasProperties(data[0], ['r', 'g', 'b', 'a'])
      if !@dataBuf || @dataBuf.length != data.length * 4
        @dataBuf = new @type(data.length * 4)
        @elementSize = 4
      for v, i in data
        @dataBuf[i * 4 + 0] = v.r
        @dataBuf[i * 4 + 1] = v.g
        @dataBuf[i * 4 + 2] = v.b
        @dataBuf[i * 4 + 3] = v.a

    else if data[0].length == 2
      if !@dataBuf || @dataBuf.length != data.length * 2
        @dataBuf = new @type(data.length * 2)
        @elementSize = 1
      for e, i in data
        @dataBuf[i * 2 + 0] = e[0]
        @dataBuf[i * 2 + 1] = e[1]

    else if data[0].length >= 3
      numIndices = 0
      for face in data
        numIndices += 3 if face.length == 3
        numIndices += 6 if face.length == 4
        throw 'FacePolygons ' + face.length + ' + are not supported in RenderableGeometry Buffers' if face.length > 4
      if !@dataBuf || @dataBuf.length != numIndices
        @dataBuf = new @type(numIndices)
        @elementSize = 1
      index = 0
      for face in data
        if face.length == 3
          @dataBuf[index + 0] = face[0]
          @dataBuf[index + 1] = face[1]
          @dataBuf[index + 2] = face[2]
          index += 3
        if face.length == 4
          @dataBuf[index + 0] = face[0]
          @dataBuf[index + 1] = face[1]
          @dataBuf[index + 2] = face[3]
          @dataBuf[index + 3] = face[3]
          @dataBuf[index + 4] = face[1]
          @dataBuf[index + 5] = face[2]
          index += 6

    else console.log('Buffer.unknown type', data.name, data[0])

    @gl.bindBuffer(@target, @handle)
    @gl.bufferData(@target, @dataBuf, @usage)

module.exports = Buffer
