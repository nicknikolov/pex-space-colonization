if(!Array.prototype.lastElement) {
    Array.prototype.lastElement = function() {
        return this[this.length - 1];
    }
}

var gui             = require('pex-gui');
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
    
    restart: function() {

        this.res = 1;
    },

    init: function() {
        center              = new Vec3(0, 0, 0);
        centerRadius        = 1;

        this.lineBuilder    = new LineBuilder();
        this.buds           = generateBuds(1);
        this.hormones       = generateHormones(numHormones, centerRadius, center);
        this.camera         = new PCamera(60, this.width / this.height);
        this.arcball        = new Arcball(this, this.camera);
        this.gui            = new gui.GUI(this);

        this.hormoneMesh    = generateSphereMesh();
        this.budMesh        = generateSphereMesh();
        this.lineMesh       = new Mesh(this.lineBuilder, new ShowColors(), {lines: true});
        this.res            = 0;
        
        this.time = 0.4;
        this.gui.addParam('Frame delay', this, 'time');
        this.gui.addButton('Restart', this, 'restart');
    },

    draw: function() {

        if (Time.frameNumber % Math.floor(this.time * 50) == 0) {
            this.iterObject = spaceColonIter(this.buds, this.hormones);
        }

        if (this.res == 1) {
            this.buds = generateBuds(1);
            this.hormones = generateHormones(numHormones, centerRadius, center);
            this.iterObject = spaceColonIter(this.buds, this.hormones);
            this.res = 0;
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
                    scale:  new Vec3(hormoneSize/2, hormoneSize/2, hormoneSize/2),
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
        this.gui.draw();
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

