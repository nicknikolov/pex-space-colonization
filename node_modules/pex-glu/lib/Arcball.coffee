
{ Vec2, Vec3, Vec4, Quat, Mat4, Plane } = require('pex-geom')

class Arcball
  constructor: (window, camera, distance) ->
    @camera = camera
    @window = window
    @radius = Math.min(window.width/2, window.height/2) * 2
    @center = Vec2.create(window.width/2, window.height/2)
    @currRot = Quat.create()
    @currRot.setAxisAngle(Vec3.create(0, 1, 0), 0)
    @clickRot = Quat.create()
    @dragRot = Quat.create()
    @clickPos = Vec3.create()
    @clickPosWindow = Vec2.create()
    @dragPos = Vec3.create()
    @dragPosWindow = Vec2.create()
    @rotAxis = Vec3.create()
    @allowZooming = true
    @enabled = true
    @clickTarget = Vec3.create(0, 0, 0)
    @setDistance(distance || 2)

    @updateCamera()

    @addEventHanlders()

  setTarget: (target) ->
    @camera.setTarget(target)
    @updateCamera()

  setOrientation: (dir) ->
    @currRot.setDirection(dir)
    @currRot.w *= -1
    @updateCamera()
    return this

  setPosition: (pos) ->
    dir = Vec3.create().asSub(pos, @camera.getTarget())
    @setOrientation(dir.dup().normalize())
    @setDistance(dir.length())
    @updateCamera()

  addEventHanlders: () ->
    @window.on 'leftMouseDown', (e) =>
      return if e.handled || !@enabled
      @down(e.x, e.y, e.shift) #we flip the y coord to make rotating camera work

    @window.on 'leftMouseUp', (e) =>
      @up(e.x, e.y, e.shift) #we flip the y coord to make rotating camera work

    @window.on 'mouseDragged', (e) =>
      return if e.handled || !@enabled
      @drag(e.x, e.y, e.shift) #we flip the y coord to make rotating camera work

    @window.on 'scrollWheel', (e) =>
      return if e.handled || !@enabled
      return if !@allowZooming
      @distance = Math.min(@maxDistance, Math.max(@distance + e.dy/100*(@maxDistance-@minDistance), @minDistance))
      @updateCamera()

  mouseToSphere: (x, y) ->
    y = @window.height - y #flip y axis as positive Y in the world goes up but in mouse coords it goes down
    v = Vec3.create((x - @center.x) / @radius, (y - @center.y) / @radius, 0)

    dist = v.x * v.x + v.y * v.y
    if dist > 1
      v.normalize()
    else
      v.z = Math.sqrt( 1.0 - dist )
    v

  down: (x, y, shift) ->
    @dragging = true
    @clickPos = @mouseToSphere(x, y)
    @clickRot.copy(@currRot)
    @updateCamera()
    if shift
      @clickPosWindow.set(x, y)
      target = @camera.getTarget()
      @clickTarget = target.dup();
      targetInViewSpace = target.dup().transformMat4(@camera.getViewMatrix())
      @panPlane = new Plane(targetInViewSpace, new Vec3(0, 0, 1))
      @clickPosPlane = @panPlane.intersectRay(@camera.getViewRay(@clickPosWindow.x, @clickPosWindow.y, @window.width, @window.height))
      @dragPosPlane = @panPlane.intersectRay(@camera.getViewRay(@dragPosWindow.x, @dragPosWindow.y, @window.width, @window.height))
    else
      @panPlane = null

  up: (x, y, shift) ->
    @dragging = false
    @panPlane = null

  drag: (x, y, shift) ->
    if !@dragging then return
    if shift && @panPlane
      @dragPosWindow.set(x, y)
      @clickPosPlane = @panPlane.intersectRay(@camera.getViewRay(@clickPosWindow.x, @clickPosWindow.y, @window.width, @window.height))
      @dragPosPlane = @panPlane.intersectRay(@camera.getViewRay(@dragPosWindow.x, @dragPosWindow.y, @window.width, @window.height))

      invViewMatrix = @camera.getViewMatrix().dup().invert()
      @clickPosWorld = @clickPosPlane.dup().transformMat4(invViewMatrix)
      @dragPosWorld = @dragPosPlane.dup().transformMat4(invViewMatrix)

      @diffWorld = @dragPosWorld.dup().sub(@clickPosWorld)
      @camera.setTarget(@clickTarget.dup().sub(@diffWorld))
      @updateCamera()
    else
      @dragPos = @mouseToSphere(x, y)
      @rotAxis.asCross(@clickPos, @dragPos)
      theta = @clickPos.dot(@dragPos)
      @dragRot.set(@rotAxis.x, @rotAxis.y, @rotAxis.z, theta)
      @currRot.asMul(@dragRot, @clickRot)
    @updateCamera()

  updateCamera: () ->
    #Based on [apply-and-arcball-rotation-to-a-camera](http://forum.libcinder.org/topic/apply-and-arcball-rotation-to-a-camera) on Cinder Forum.
    q = @currRot.clone()
    q.w *= -1
    target = @camera.getTarget()
    offset = Vec3.create(0, 0, @distance).transformQuat(q)
    eye = Vec3.create().asAdd(target, offset)
    up = Vec3.create(0, 1, 0).transformQuat(q)
    @camera.lookAt(target, eye, up)

  disableZoom: () ->
    @allowZooming = false

  setDistance: (distance) ->
    @distance = distance || 2
    @minDistance = distance/2 || 0.3
    @maxDistance = distance*2 || 5
    @updateCamera()

module.exports = Arcball
