if(!Array.prototype.lastElement) {
    Array.prototype.lastElement = function() {
        return this[this.length - 1];
    }
}

var fs              = require('fs');
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

        this.budsJson       = JSON.parse(fs.readFileSync(__dirname + '/data/buds.json', 'utf8'));
        this.hormonesJson   = JSON.parse(fs.readFileSync(__dirname + '/data/hormones.json', 'utf8'));

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

            this.buds = this.budsJson;
            this.hormones = this.hormonesJson;
       }
    },

    restart: function() {

        this.budsJson = null;
        this.hormonesJson = null;
        this.sc.restart();
    },

    serialize: function() {

        var budsStr = JSON.stringify(this.buds, null, 2);

        fs.writeFile(__dirname + '/data/buds.json', budsStr, function(err) {
            if (err) console.log(err);
        });

        var hormonesStr = JSON.stringify(this.hormones, null, 2);

        fs.writeFile(__dirname + '/data/hormones.json', hormonesStr, function(err) {
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

            if (bud.parentPos) {
                that.lineBuilder.addLine(bud.position, bud.parentPos, Color.White, Color.Yellow);
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

