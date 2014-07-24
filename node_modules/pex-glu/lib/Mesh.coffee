merge = require('merge')
{ Vec3, Quat, Mat4, BoundingBox } = require('pex-geom')
Context = require('./Context')
RenderableGeometry = require('./RenderableGeometry')

class Mesh
  constructor : (geometry, material, options) ->
    @gl = Context.currentContext
    @geometry = merge(geometry, RenderableGeometry)
    @material = material

    options = options or {}
    @primitiveType = options.primitiveType
    @primitiveType ?= @gl.TRIANGLES
    @primitiveType = @gl.LINES if options.lines
    @primitiveType = @gl.TRIANGLES if options.triangles
    @primitiveType = @gl.POINTS if options.points

    @position = Vec3.create(0, 0, 0)
    @rotation = Quat.create()
    @scale = Vec3.create(1, 1, 1)

    @projectionMatrix = Mat4.create()
    @viewMatrix = Mat4.create()
    @invViewMatrix = Mat4.create()
    @modelWorldMatrix = Mat4.create()
    @modelViewMatrix = Mat4.create()
    @rotationMatrix = Mat4.create()
    @normalMatrix = Mat4.create()


  draw: (camera) ->
    @geometry.compile() if @geometry.isDirty()

    if camera
      @updateMatrices camera
      @updateMatricesUniforms @material

    @material.use()

    @bindAttribs()

    if @geometry.faces && @geometry.faces.length > 0 && @primitiveType != @gl.LINES && @primitiveType != @gl.POINTS
      @gl.bindBuffer(@gl.ELEMENT_ARRAY_BUFFER, @geometry.faces.buffer.handle)
      @gl.drawElements(@primitiveType, @geometry.faces.buffer.dataBuf.length, @gl.UNSIGNED_SHORT, 0)
    else if @geometry.edges && this.geometry.edges.length > 0 && @primitiveType == @gl.LINES
      @gl.bindBuffer(@gl.ELEMENT_ARRAY_BUFFER, @geometry.edges.buffer.handle)
      @gl.drawElements(@primitiveType, @geometry.edges.buffer.dataBuf.length, @gl.UNSIGNED_SHORT, 0)
    else if @geometry.vertices
      num = @geometry.vertices.length
      @gl.drawArrays(@primitiveType, 0, num)

    @unbindAttribs()

  drawInstances: (camera, instances) ->
    @geometry.compile() if @geometry.isDirty()

    @material.use()

    @bindAttribs()

    if @geometry.faces && @geometry.faces.length > 0 && !@useEdges
      @gl.bindBuffer(@gl.ELEMENT_ARRAY_BUFFER, @geometry.faces.buffer.handle)
      for instance in instances
        if camera
          @updateMatrices camera, instance
          @updateMatricesUniforms @material
          @updateUniforms @material, instance
          @material.use()
        @gl.drawElements(@primitiveType, @geometry.faces.buffer.dataBuf.length, @gl.UNSIGNED_SHORT, 0)
    else if @geometry.edges && @useEdges
      @gl.bindBuffer(@gl.ELEMENT_ARRAY_BUFFER, @geometry.edges.buffer.handle)
      for instance in instances
        if camera
          @updateMatrices camera, instance
          @updateMatricesUniforms @material
          @updateUniforms @material, instance
          @material.use()
        @gl.drawElements(@primitiveType, @geometry.edges.buffer.dataBuf.length, @gl.UNSIGNED_SHORT, 0)
    else if @geometry.vertices
      num = @geometry.vertices.length
      for instance in instances
        if camera
          @updateMatrices camera, instance
          @updateMatricesUniforms @material
          @updateUniforms @material, instance
          @material.use()
        @gl.drawArrays(@primitiveType, 0, num)

    @unbindAttribs()

  bindAttribs: () ->
    program = @material.program

    for name, attrib of @geometry.attribs
      # TODO:this should go another way instad of searching for mesh atribs in shader look for required attribs by shader inside mesh
      attrib.location = @gl.getAttribLocation(program.handle, attrib.name) # if attrib.location is 'undefined' or attrib.location is -1
      if attrib.location >= 0
        @gl.bindBuffer(@gl.ARRAY_BUFFER, attrib.buffer.handle)
        @gl.vertexAttribPointer(attrib.location, attrib.buffer.elementSize, @gl.FLOAT, false, 0, 0)
        @gl.enableVertexAttribArray(attrib.location)

  unbindAttribs: () ->
    for name, attrib of @geometry.attribs
      @gl.disableVertexAttribArray attrib.location  if attrib.location >= 0

  resetAttribLocations: () ->
    for name of @attributes
      attrib = @attributes[name]
      attrib.location = -1

  updateMatrices: (camera, instance) ->
    position = if instance and instance.position then instance.position else @position
    rotation = if instance and instance.rotation then instance.rotation else @rotation
    scale = if instance and instance.scale then instance.scale else @scale

    rotation.toMat4(@rotationMatrix)
    @modelWorldMatrix.identity()
      .translate(position.x, position.y, position.z)
      .mul(@rotationMatrix)
      .scale(scale.x, scale.y, scale.z)

    if camera
      @projectionMatrix
        .copy(camera.getProjectionMatrix())

      @viewMatrix
        .copy(camera.getViewMatrix())

      @invViewMatrix
        .copy(camera.getViewMatrix().dup().invert())

      @modelViewMatrix
        .copy(camera.getViewMatrix())
        .mul(@modelWorldMatrix)

      @normalMatrix
        .copy(@modelViewMatrix)
        .invert()
        .transpose()

  updateUniforms: (material, instance) ->
    for uniformName, uniformValue of instance.uniforms
      material.uniforms[uniformName] = uniformValue

  updateMatricesUniforms: (material) ->
    programUniforms = @material.program.uniforms
    materialUniforms = @material.uniforms

    materialUniforms.projectionMatrix = @projectionMatrix if programUniforms.projectionMatrix
    materialUniforms.viewMatrix = @viewMatrix if programUniforms.viewMatrix
    materialUniforms.invViewMatrix = @invViewMatrix if programUniforms.invViewMatrix
    materialUniforms.modelWorldMatrix = @modelWorldMatrix if programUniforms.modelWorldMatrix
    materialUniforms.modelViewMatrix = @modelViewMatrix if programUniforms.modelViewMatrix
    materialUniforms.normalMatrix = @normalMatrix if programUniforms.normalMatrix

  getMaterial: () ->
    @material

  setMaterial: (material) ->
    @material = material
    @resetAttribLocations()

  getProgram: () ->
    @material.program

  setProgram: (program) ->
    @material.program = program
    @resetAttribLocations()

  dispose: () ->
    @geometry.dispose()

  getBoundingBox: () ->
    if !@boundingBox then @updateBoundingBox()
    @boundingBox

  updateBoundingBox: () ->
    @updateMatrices()
    @boundingBox = BoundingBox.fromPoints @geometry.vertices.map (v) =>
      v.dup().transformMat4(@modelWorldMatrix)

module.exports = Mesh
