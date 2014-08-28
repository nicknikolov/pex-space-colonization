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
var SpaceColon      = require('../index.js');

var Cube            = gen.Cube;
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
var Quat            = geom.Quat;

sys.Window.create({
    settings: {
        width:  1350,
        height: 850,
        type:   '3d'
    },

    init: function() {

        this.lineBuilder    = new LineBuilder();
        this.camera         = new PCamera(80, this.width / this.height);
        this.gui            = new gui.GUI(this);
        this.arcball        = new Arcball(this, this.camera);
        this.sc             = new SpaceColon();

        this.hormoneMesh    = generateSphereMesh();
        this.budMesh        = generateSphereMesh();
        this.cubeMesh       = generateCubeMesh();
        this.lineMesh       = new Mesh(this.lineBuilder, new ShowColors(), {lines: true});

        try {
            this.hormonesJson = JSON.parse(fs.readFileSync(__dirname + '/data/hormones.json', 'utf8'));
        } catch (err) {
            this.hormonesJson = null;
        }

        try {
            this.budsJson = JSON.parse(fs.readFileSync(__dirname + '/data/buds.json', 'utf8'));
        } catch (err) {
            this.budsJson = null;
        }

        // Bools
        this.debug          = false;
        this.iterate        = true;
        this.drawDeadB      = false;
        this.drawAliveB     = false;
        this.drawDeadH      = false;
        this.drawAliveH     = false;
        this.drawDeadZone   = false;
        this.drawLines      = true;
        this.drawCubes      = true;

        // Params
        this.treeType       = 0;
        this.cubeSize       = 0.5;
        this.budSize        = 0.04;
        this.hormoneSize    = 0.05;

        // Colors
        this.cubeColor      = Color.create(0.2, 0.2, 0.4, 1);
        this.deadBudColor   = Color.fromRGB(100/255, 50/255, 200/255, 1);
        this.aliveBudColor  = Color.fromRGB(100/255, 200/255, 0/255, 1);
        this.deadHormColor  = Color.fromRGB(0/255, 255/255, 255/255, 1);
        this.aliveHormColor = Color.fromRGB(255/255, 100/255, 100/255, 1);
        this.deadZoneColor  = Color.fromRGB(255/255, 220/255, 220/255, 0.2);
        this.ambientColor   = Color.fromRGB(0,0,0,0);

        // GUI
        this.gui.addLabel('Actions');
        this.gui.addParam('Iterate', this, 'iterate');
        this.gui.addButton('Seralize', this, 'serialize');
        this.gui.addLabel('');
        this.gui.addLabel('Generation Config');
        this.gui.addButton('Regenerate', this, 'restart');
        var that = this;
        var radioList = this.gui.addRadioList('Tree Type', this, 'treeType', [
            { name: '2D', value: 0 },
            { name: '3D', value: 1 }
        ], function(idx) {
            if (that.treeType === 0) that.sc.type = '2d';
            else that.sc.type = '3d';
        });
        this.gui.addLabel('');
        this.gui.addLabel('Drawing Config');
        this.gui.addParam('Debug View',             this, 'debug');
        this.gui.addParam('Draw Dead Buds',         this, 'drawDeadB');
        this.gui.addParam('Draw Alive Buds',        this, 'drawAliveB');
        this.gui.addParam('Draw Dead Hormones',     this, 'drawDeadH');
        this.gui.addParam('Draw Alive Hormones',    this, 'drawAliveH');
        this.gui.addParam('Draw Dead Zone',         this, 'drawDeadZone');
        this.gui.addParam('Draw Lines',             this, 'drawLines');
        this.gui.addParam('Draw Cubes',             this, 'drawCubes');
        this.gui.addParam('Cube Size',              this, 'cubeSize', {min: 0.1, max: 1});
        this.gui.addParam('Cube Color',             this, 'cubeColor');


        if (this.budsJson && this.hormonesJson) {
            this.buds = this.budsJson;
            this.hormones = this.hormonesJson;
       }

        // Objects to draw
        this.deadZoneObjects         = [];
        this.aliveHormoneObjects     = [];
        this.deadHormoneObjects      = [];
        this.aliveBudObjects         = [];
        this.deadBudObjects          = [];
        this.cubeObjects             = [];

        // Size vectors
        this.deadZoneV3 = new Vec3(this.sc.deadZone, this.sc.deadZone, this.sc.deadZone);
        this.hormSizeV3 = new Vec3(this.hormoneSize, this.hormoneSize, this.hormoneSize);
        this.deadHormSizeV3 = new Vec3(this.hormoneSize/2, this.hormoneSize/2, this.hormoneSize/2);
        this.cubeSizeV3 = new Vec3(this.cubeSize, this.cubeSize, this.cubeSize);
        this.budSizeV3  = new Vec3(this.budSize, this.budSize, this.budSize);
        this.deadBudSizeV3 = new Vec3(this.budSize/2, this.budSize/2, this.budSize/2);

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
        this.deadZoneObjects.length     = 0;
        this.aliveHormoneObjects.length = 0;
        this.deadHormoneObjects.length  = 0;
        this.aliveBudObjects.length     = 0;
        this.deadBudObjects.length      = 0;
        this.cubeObjects.length         = 0;


        for (var i=0, length=this.hormones.length; i<length; i++) {
            var hormone = this.hormones[i];
            if (hormone.state == 0) {

                this.deadZoneObjects.push({
                    scale:      this.deadZoneV3,
                    uniforms:   {
                        diffuseColor: this.deadZoneColor,
                        ambientColor: this.ambientColor
                    },
                    position: hormone.position
                });

                this.aliveHormoneObjects.push({
                    scale:  this.hormSizeV3,
                    uniforms: {
                        diffuseColor: this.aliveHormColor
                    },
                    position: hormone.position
                });

            }

            else if (hormone.state == 1) {
                this.deadHormoneObjects.push({
                    scale:  this.deadHormSizeV3,
                    uniforms: {
                        diffuseColor: this.deadHormColor
                    },
                    position: hormone.position
                });
            }
        };


        this.lineBuilder.reset();


        for (var i=0, length=this.buds.length; i<length; i++) {
            var bud = this.buds[i];

            if (!bud.color) bud.color = Color.fromHSL(Math.random(), 1, 0.5);

            if (this.debug) {

                if (bud.hormones) {
                    for (var m=0, length2=bud.hormones.length; m<length2; m++) {
                        var hormone = bud.hormones[m];
                        this.lineBuilder.addLine(bud.position, hormone.position, bud.color);
                    };
                }
            }

            if (bud.parentPos) {

                var position = new Vec3(bud.position.x, bud.position.y, bud.position.z);

                this.cubeObjects.push({
                    scale:      this.cubeSizeV3,
                    position:   bud.position,
                    uniforms:   {
                        diffuseColor: this.cubeColor,
                    },
                    rotation:   Quat.fromDirection(position.dup().sub(bud.parentPos))
                });

                this.lineBuilder.addLine(bud.position, bud.parentPos, Color.White, Color.Yellow);


            }

            if (bud.state == 0) {

                this.aliveBudObjects.push({
                    scale:      this.budSizeV3,
                    position:   bud.position,
                    uniforms:   {
                        diffuseColor: this.aliveBudColor
                    }
                });

            }


            else if (bud.state == 1) {

                this.deadBudObjects.push({
                    scale:      this.deadBudSizeV3,
                    position:   bud.position,
                    uniforms:   {
                        diffuseColor: this.deadBudColor
                    }
                });
            }

        };


        glu.clearColorAndDepth(Color.DarkGrey);
        glu.enableDepthReadAndWrite(true, false);
        glu.enableAlphaBlending(true);
        glu.cullFace(true);
        if (this.drawDeadZone) this.hormoneMesh.drawInstances(this.camera, this.deadZoneObjects);

        glu.enableBlending(false);
        glu.enableDepthReadAndWrite(true, true);

        if (this.drawDeadH) this.hormoneMesh.drawInstances(this.camera, this.deadHormoneObjects);
        if (this.drawAliveH) this.hormoneMesh.drawInstances(this.camera, this.aliveHormoneObjects);

        if (this.drawDeadB) this.budMesh.drawInstances(this.camera, this.deadBudObjects);
        if (this.drawAliveB) this.budMesh.drawInstances(this.camera, this.aliveBudObjects);
        if (this.drawCubes) this.cubeMesh.drawInstances(this.camera, this.cubeObjects);
        if (this.drawLines) this.lineMesh.draw(this.camera);

        this.gui.draw();

    }
});

function generateSphereMesh() {
    var sphereGeometry = new Sphere();
    var sphereMaterial = new Diffuse({ diffuseColor: Color.Red });
    return new Mesh(sphereGeometry, sphereMaterial);
}

function generateCubeMesh() {
    var cubeGeometry = new Cube(0.05, 0.05, 0.05);
    var cubeMaterial = new Diffuse({ diffuseColor: Color.Red });
    return new Mesh(cubeGeometry, cubeMaterial);
}

