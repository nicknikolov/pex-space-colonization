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
var hormoneSize     = 0.02;
var hormoneDeadZone = 0.07;
var budSize         = 0.04;
var growthStep      = 0.1;
var splitChance     = 0.4;
var margin          = 5;
var numHormones     = 100;

var buds            = [];
var center; 
var centerRadius;


sys.Window.create({
    settings: {
        width:  800,
        height: 600,
        type:   '3d'
    },

    init: function() {
        center              = new Vec2(this.width/2, this.height/2);
        centerRadius        = this.width * 0.4;

        this.lineBuilder    = new LineBuilder();
        this.lineMesh       = new Mesh(this.lineBuilder, new ShowColors(), {lines: true});
        this.budMeshes      = generateBuds();
        this.hormoneMeshes  = generateHormones();
        this.mesh           = generateSphereMesh();
        this.camera         = new PCamera(120, this.width / this.height);
        this.arcball        = new Arcball(this, this.camera);
    },

    draw: function() {
        iterate(this.hormoneMeshes);
        glu.clearColorAndDepth(Color.DarkGrey);
        glu.enableDepthReadAndWrite(true);
        glu.enableAlphaBlending();
        this.hormoneMeshes.forEach(function(hormone) {
            if (hormone.state == 0) {
                hormone.scale = new Vec3(hormoneDeadZone, hormoneDeadZone, hormoneDeadZone);
                hormone.uniforms = {
                    diffuseColor: Color.fromRGB(255/255, 220/255, 220/255, 0.5)
                }
                this.mesh.drawInstances(this.camera, [ hormone ]);
                hormone.uniforms = {
                    diffuseColor: Color.fromRGB(255/255, 100/255, 100/255, 1)
                }
            }
            else if (hormone.state == 1) {
                hormone.uniforms = {
                    diffuseColor: Color.fromRGB(0/255, 255/255, 255/255, 1)
                }
            }
            hormone.scale = new Vec3(hormoneSize, hormoneSize, hormoneSize);
        }.bind(this));
        this.mesh.drawInstances(this.camera, this.hormoneMeshes);
        glu.enableBlending(false);

        this.budMeshes.forEach(function(bud, i) {
            bud.uniforms = {
                diffuseColor: Color.fromRGB(100/255, 200/255, 50/255, 0.5)
            }
            this.mesh.drawInstances(this.camera, [ bud ]);
            buds[i].forEach(function(innerBud) {
                this.lineBuilder.addLine(bud.position, innerBud, Color.White, Color.Yellow);
                this.lineMesh.draw(this.camera);
                bud.position = new Vec3(innerBud.x, innerBud.y, innerBud.z);
                this.mesh.drawInstances(this.camera, [ bud ]);
            }.bind(this));
        }.bind(this));
    }
});

function generateBuds() {
    var budMeshes = [];
    //var numBuds = Math.floor(Math.random() * 4);
    var numBuds = 1;
    for(var i=0; i<numBuds; i++) {
        var pos = new Vec3(
            Math.random() - 0.5, 
            Math.random() - 0.5,
            Math.random() - 0.5
        );
        //pos.normalize().scale(centerRadius);
        //pos.add(center);
        buds.push([pos]);

        budMeshes.push({
            position:   new Vec3(pos.x, pos.y, pos.z),
            scale:      new Vec3(budSize, budSize, budSize),
            uniforms:   {
                diffuseColor: Color.fromHSL(1, 1, 0.5)
            }
        });
    }
    return budMeshes;
}

function generateHormones() {
    var hormoneMeshes = [];
    for(var i=0; i<numHormones; i++) {
        var pos = new Vec3(
            margin + Math.random() * (800 - 2 * margin) - 400,
            margin + Math.random() * (600 - 2 * margin) - 300,
            geom.randomFloat(-1, 1)
        );
        
        //if (pos.sub(center).length() > centerRadius) {
        //    i--;
        //    continue;
        //}
       
        hormoneMeshes.push({
            position:   new Vec3(pos.x/400, pos.y/300, pos.z),
            scale:      new Vec3(hormoneSize, hormoneSize, hormoneSize),
            uniforms:   {
                diffuseColor: Color.fromHSL(1, 1, 0.5)
            },
            state:      0
        });
    }
    return hormoneMeshes;
}

function generateSphereMesh() {
    var sphereGeometry = new Sphere();
    var sphereMaterial = new Diffuse({ diffuseColor: Color.Red });
    return new Mesh(sphereGeometry, sphereMaterial);
}

function iterate(hormones) {
    // Create an array of arrays each of which 
    // contains the hormonees attracting that bud
    var hormonesForBud = [];
    for(var i=0; i<buds.length; i++) {
        hormonesForBud.push([]);
    }
    hormones.forEach(function(hormone, i) {
        // We cycle through the hormones but process only
        // alive ones
        if (hormone.state != 0) return;
        var minDist = 1;
        var minDistTolerance = 0.005;
        var minDistIndices = [];
        // Else we cycle through the buds and see
        // how far away it's from the hormone
        buds.forEach(function(bud, j) {
            var budPos = new Vec3(); 
            budPos.copy(bud.lastElement());
            var hormPos = new Vec3();
            hormPos.copy(hormone.position);
            var dist = hormPos.distance(budPos);
            if (dist < minDist) {
                if (Math.abs(dist - minDist) < minDistTolerance) {
                    // If close enough and smaller than the tolerance
                    // then I don't understand this part yet
                    minDistIndices.push(j);
                } else {
                    // If close enough and bigger than the tolerance 
                    // then I don't understand this part yet
                    minDist = dist;
                    minDistIndices = [j];
                }
            }
        });
        if (minDistIndices.length > 0) {
            // If there are any buds that are closer to this particular
            // hormone in the iteration than the min distance then push
            // that hormone onto the array of attracting hormones 
            // for that bud 
            for (var k=0; k<minDistIndices.length; k++) {
                hormonesForBud[minDistIndices[k]].push(i);
            }
        }
        if (minDist < hormoneDeadZone && minDistIndices.length > 0) {
            // If the min distance falls down below the dead zone radius 
            // kill the hormone
            hormone.state++;
        }
    });
    var newBuds = [];
    buds.forEach(function(bud, i) {
        // Here we check if there are hormones attracting buds
        // and if so calculate the positions for the new buds
        if (hormonesForBud[i].length == 0) return;
        var budPos = new Vec3(); 
        budPos.copy(bud.lastElement());
        var avgPos = new Vec3(0,0,0);
        var avgPosCount = 0;
        hormonesForBud[i].forEach(function(hormone, j) {
            // Add the positions of all the hormones
            // attracting this bud in a vector 
            avgPos.add(hormones[j].position);
            avgPosCount++;    
        });

        // To get the new bud position we find the direction
        // in which the new bud will be, normalize+scale by 
        // growthstep to get direction+growthstep and then 
        // add that position to the array of positions of 
        // that bud 
        avgPos.scale(1/avgPosCount); // ?
        var dir = avgPos.sub(budPos); // ?
        dir.normalize().scale(growthStep);
        var nextPos = budPos.add(dir);
        buds[i].push(nextPos);
        // If God decides to make a new branch we push the 
        // new position in the array
        if (Math.random() > (1.0 - splitChance)) {
          newBuds.push([nextPos]);
        }
    });
    newBuds.forEach(function(bud) {
        buds.push(bud);
    });
    if (newBuds.length == 0) {
        if (++deadIterations >= 20) {
            init();
        }
    }
}

function init() {
}

