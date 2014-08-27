var geom    = require('pex-geom');
var Octree  = geom.Octree;
var Vec3    = geom.Vec3;

function SpaceColonization(options) {

    var options         = options               ? options               : {};
    this.type           = options.type          ? options.type          : '2d';
    this.deadZone       = options.deadZone      ? options.deadZone      : 0.04;
    this.growthStep     = options.growthStep    ? options.growthStep    : 0.02;
    this.splitChance    = options.splitChance   ? options.splitChance   : 0.4;
    this.margin         = options.margin        ? options.margin        : 5;
    this.numHormones    = options.numHormones   ? options.numHormones   : 200;
    this.startBuds      = options.startBuds     ? options.startBuds     : 1;
    this.centerR        = options.centerRadius  ? options.centerRadius  : 1;

    this.octree         = new Octree(new Vec3(-1, -1, -1), new Vec3(2, 2, 2));
    this.center         = new Vec3(0, 0, 0);

    this.generateBuds();
    this.generateHormones();
}

SpaceColonization.prototype.restart = function() {

    this.octree = new Octree(new Vec3(-1, -1, -1), new Vec3(2, 2, 2));
    this.generateBuds();
    this.generateHormones();

}

SpaceColonization.prototype.generateBuds = function() {

    this.buds = [];
    for(var i=0; i<this.startBuds; i++) {

        var pos = new Vec3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        );

        if (this.type === '2d') pos.z = 0;

        pos.normalize().scale(this.centerR);
        pos.add(this.center);
        this.buds.push({
            state:      0,
            position:  new Vec3(pos.x, pos.y, pos.z),
            parentPos:     null
        });

        pos.index = i;

        this.octree.add(pos);
   }

}

SpaceColonization.prototype.generateHormones = function() {

    this.hormones = [];
    for(var i=0; i<this.numHormones; i++) {

        var pos = geom.randomVec3(this.centerR).add(this.center);
        if (this.type === '2d') pos.z = 0;

        if (pos.sub(this.center).length() > this.centerR) {
            i--;
            continue;
        }

        this.hormones.push({
            state:      0,
            position:   new Vec3(pos.x, pos.y, pos.z)
        });
    }
}

SpaceColonization.prototype.findAttractors = function() {

    this.hormonesForBud = [];
    for(var k=0; k<this.buds.length; k++) {
        this.hormonesForBud.push([]);
    }

    for (var i=0; i<this.hormones.length; i++) {
        var hormone = this.hormones[i];
        if (hormone.state != 0) continue;

        minDist = 0.8 / 2;
        minDistIndex = -1;

        var closestBud = this.octree.findNearestPoint(hormone.position, {maxDist: minDist});
        if (closestBud) minDistIndex = closestBud.index;
        if (minDistIndex == -1) continue;
        this.hormonesForBud[minDistIndex].push(i);
        minDist = hormone.position.distance(closestBud);
        if (minDist < this.deadZone && minDistIndex != -1) {
            hormone.state++;
        }
    };
}

SpaceColonization.prototype.findAverageVec = function(hormonesForBud, index) {

    var avgPos      = new Vec3(0, 0, 0);
    var avgPosCount = 0;

    for (var l=0; l<this.hormonesForBud[index].length; l++) {
        var hormone = this.hormones[hormonesForBud[index][l]];
        avgPos.add(hormone.position);
        avgPosCount++;
    };

    return {vector: avgPos, count: avgPosCount};

}

SpaceColonization.prototype.findNextPos = function(avgVec, budPos) {

    avgVec.vector.scale(1/avgVec.count);
    var dir = avgVec.vector.sub(budPos);
    dir.normalize().scale(this.growthStep);
    var nextPos = budPos.add(dir);

    return nextPos;
}

SpaceColonization.prototype.findNextPosForBranch = function(avgVec, budPos) {

    avgVec.vector.scale(1/avgVec.count);
    var dir = avgVec.vector.sub(budPos);
    dir.normalize().scale(this.growthStep/2);
    var x = dir.x;
    var y = dir.y;
    dir.x = -y;
    dir.y = x;
    var nextPos = budPos.add(dir);

    return nextPos;

}

SpaceColonization.prototype.splitBranch = function(nextPos) {

    if (Math.random() > (1.0 - this.splitChance)) {
        this.buds.push({
            state:      0,
            position:   nextPos,
            parentPos:     this.buds[this.buds.length-1].position
        });
        nextPos.index = this.buds.length - 1;
    };
}

SpaceColonization.prototype.rebuildOctree = function() {

    this.octree = new Octree(new Vec3(-1, -1, -1), new Vec3(2, 2, 2));

    for (var j=0; j<this.buds.length; j++) {
        if (this.buds[j].state === 0) {
            var budPos = this.buds[j].position;
            budPos.index = j;
            this.octree.add(budPos);
        }
    }

}

SpaceColonization.prototype.iterate = function() {

    this.findAttractors();

    // snapshot of the length because it changes in the loop and breaks
    // when lookuping hormonesForBud
    // is this the best way tho ...
    var buds = this.buds.length;

    for (var i=0; i<buds; i++) {
        var bud = this.buds[i];
        if (bud.state === 1) continue;

        if (this.hormonesForBud[i].length == 0) {
            bud.hormones = [];
            bud.state++;
            continue;
        }

        var budPos      = bud.position.clone();
        var averageVec  = this.findAverageVec(this.hormonesForBud, i);
        var nextPos     = this.findNextPos(averageVec, budPos);

        var that = this;
        bud.hormones = this.hormonesForBud[i].map(function(index) { return that.hormones[index]; });

        bud.state++;
        this.buds.push({
            state:      0,
            position:   nextPos,
            parentPos:  bud.position
        });

        budPos              = bud.position.clone();
        averageVec          = this.findAverageVec(this.hormonesForBud, i);
        var branchNextPos   = this.findNextPosForBranch(averageVec, budPos);
        this.splitBranch(branchNextPos);

    };

    this.rebuildOctree();
    return {
       buds:        this.buds,
       hormones:    this.hormones
   }
}

module.exports = SpaceColonization;
