if(!Array.prototype.lastElement) {
    Array.prototype.lastElement = function() {
        return this[this.length - 1];
    }
}

var jsonfile        = require('jsonfile');
var gui             = require('pex-gui');
var sys             = require('pex-sys');
var glu             = require('pex-glu');
var geom            = require('pex-geom');
var gen             = require('pex-gen');
var materials       = require('pex-materials');
var color           = require('pex-color');
var helpers         = require('pex-helpers');
var SpaceColon      = require('./space-colonization/index.js');

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

sys.Window.create({
    settings: {
        width:  1024,
        height: 600,
        type:   '3d'
    },

    init: function() {

        this.lineBuilder    = new LineBuilder();
        this.camera         = new PCamera(60, this.width / this.height);
        this.gui            = new gui.GUI(this);
        this.arcball        = new Arcball(this, this.camera);
        this.sc             = new SpaceColon();

        this.hormoneMesh    = generateSphereMesh();
        this.budMesh        = generateSphereMesh();
        this.lineMesh       = new Mesh(this.lineBuilder, new ShowColors(), {lines: true});

        this.budsJson       = jsonfile.readFileSync('data/buds.json', [{'throw': false}]);
        this.hormonesJson   = jsonfile.readFileSync('data/hormones.json', [{'throw': false}]);

        this.debug          = false;
        this.iterate        = true;
        this.drawDeadB      = true;
        this.drawAliveB     = true;
        this.drawDeadH      = true;
        this.drawAliveH     = true;
        this.drawDeadZone   = true;

        this.gui.addParam('Iterate',                this, 'iterate');
        this.gui.addParam('Debug View',             this, 'debug');
        this.gui.addButton('Regenerate',            this, 'restart');
        this.gui.addButton('Seralize',              this, 'serialize');
        this.gui.addParam('Draw Dead Buds',         this, 'drawDeadB');
        this.gui.addParam('Draw Alive Buds',        this, 'drawAliveB');
        this.gui.addParam('Draw Dead Hormones',     this, 'drawDeadH');
        this.gui.addParam('Draw Alive Hormones',    this, 'drawAliveH');
        this.gui.addParam('Draw Dead Zone',         this, 'drawDeadZone');

        if (this.budsJson && this.hormonesJson) {

            var that = this;
            this.buds = this.budsJson.map(function(bud) {
                var parent = (bud.parent !== -1) ? that.budsJson[bud.parent] : null;
                return {
                    position:   bud.position,
                    state:      bud.state,
                    parent:     parent,
                    hormones:   bud.hormones
                };
            });

            this.hormones = this.hormonesJson.map(function(hormone) {
                return {
                    position:   hormone.position,
                    state:      hormone.state,
                };
            });
        }
    },

    restart: function() {

        this.budsJson = null;
        this.hormonesJson = null;
        this.sc.restart();
    },

    serialize: function() {

        var budsJson = this.buds.map(function(b, i) {
            return {
                position: { x: b.position.x, y: b.position.y, z:b.position.z },
                parent: b.parent ? i : -1,
                state: b.state,
                hormones: b.hormones
            };
        });

        jsonfile.writeFile('data/buds.json', budsJson, function(err) {
            if (err) console.log(err);
        });

        var hormonesJson = this.hormones.map(function(h) {
            return {
                position: { x: h.position.x, y: h.position.y, z: h.position.z},
                state: h.state
            };
        });

        jsonfile.writeFile('data/hormones.json', hormonesJson, function(err) {
            if (err) console.log(err);
        });
    },

    draw: function() {

        Time.verbose = true;

        if (!this.budsJson && !this.hormonesJson && this.iterate) {

            this.iterObject = this.sc.iterate();
            this.hormones   = this.iterObject.hormones;
            this.buds       = this.iterObject.buds;
        }
        var deadZoneObjects         = [];
        var aliveHormoneObjects     = [];
        var deadHormoneObjects      = [];
        var aliveBudObjects         = [];
        var deadBudObjects          = [];

        var that = this;

        this.hormones.forEach(function(hormone) {

            if (hormone.state == 0) {

                deadZoneObjects.push({
                    scale:      new Vec3(that.sc.deadZone, that.sc.deadZone, that.sc.deadZone),
                    uniforms:   {
                        diffuseColor: Color.fromRGB(255/255, 220/255, 220/255, 0.2),
                        ambientColor: Color.fromRGB(0,0,0,0)
                    },
                    position: hormone.position
                });

                aliveHormoneObjects.push({
                    scale:  new Vec3(that.sc.hSize, that.sc.hSize, that.sc.hSize),
                    uniforms: {
                        diffuseColor: Color.fromRGB(255/255, 100/255, 100/255, 1)
                    },
                    position: hormone.position
                });

            }

            else if (hormone.state == 1) {
                deadHormoneObjects.push({
                    scale:  new Vec3(that.sc.hSize/2, that.sc.hSize/2, that.sc.hSize/2),
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

            if (that.debug) {

                if (bud.hormones) {
                    bud.hormones.forEach(function(hormone) {
                        that.lineBuilder.addLine(bud.position, hormone.position, bud.color);
                    });
                }
            }

            if (bud.parent) {
                that.lineBuilder.addLine(bud.position, bud.parent.position, Color.White, Color.Yellow);
            }


            if (bud.state == 0) {

                aliveBudObjects.push({
                    scale:      new Vec3(that.sc.bSize, that.sc.bSize, that.sc.bSize),
                    position:   bud.position,
                    uniforms:   {
                        diffuseColor: Color.fromRGB(100/255, 200/255, 0/255, 1)
                    }
                });

            }


            else if (bud.state == 1) {

                deadBudObjects.push({
                    scale:      new Vec3(that.sc.bSize/2, that.sc.bSize/2, that.sc.bSize/2),
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
        if (this.drawDeadZone) this.hormoneMesh.drawInstances(this.camera, deadZoneObjects);

        glu.enableBlending(false);
        glu.enableDepthReadAndWrite(true, true);

        if (this.drawDeadH) this.hormoneMesh.drawInstances(this.camera, deadHormoneObjects);
        if (this.drawAliveH) this.hormoneMesh.drawInstances(this.camera, aliveHormoneObjects);

        if (this.drawDeadB) this.budMesh.drawInstances(this.camera, deadBudObjects);
        if (this.drawAliveB) this.budMesh.drawInstances(this.camera, aliveBudObjects);
        this.lineMesh.draw(this.camera);

        this.gui.draw();

    }
});

function generateSphereMesh() {
    var sphereGeometry = new Sphere();
    var sphereMaterial = new Diffuse({ diffuseColor: Color.Red });
    return new Mesh(sphereGeometry, sphereMaterial);
}

