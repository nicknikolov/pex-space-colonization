var geom = require('pex-geom');
var Vec3 = geom.Vec3;

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
    this.budPosArray    = options.budPosArray   ? options.budPosArray   : null;
    this.hormPosArray   = options.hormPosArray  ? options.hormPosArray  : null;

    this.center         = new Vec3(0, 0, 0);
    this.hormonesForBud = [];

    this.generateBuds();
    this.generateHormones();
}

SpaceColonization.prototype.restart = function() {

    this.generateBuds();
    this.generateHormones();

}

SpaceColonization.prototype.generateBuds = function() {

    this.buds = [];
    var length = this.budPosArray ? this.budPosArray.length : this.startBuds;

    for(var i=0; i<length; i++) {
        if (this.budPosArray) {
            var pos = new Vec3( this.budPosArray[i].x, this.budPosArray[i].y, this.budPosArray[i].z );
        } else {
            var pos = geom.randomVec3(this.centerR).add(this.center);
            if (this.type === '2d') pos.z = 0;
        }

        this.buds.push({
            state:      0,
            position:   pos,
            parentPos:  null
        });
   }

}

SpaceColonization.prototype.generateHormones = function() {

    this.hormones = [];
    var length = this.hormPosArray ? this.hormPosArray.length : this.numHormones;

    for(var i=0; i<length; i++) {
        if (this.hormPosArray) {
            var pos = new Vec3( this.hormPosArray[i].x, this.hormPosArray[i].y, this.hormPosArray[i].z );
        } else {

            var pos = geom.randomVec3(this.centerR).add(this.center);
            if (this.type === '2d') pos.z = 0;

            if (pos.sub(this.center).length() > this.centerR) {
                i--;
                continue;
            }
        }

        this.hormones.push({
            state:      0,
            position:   pos
        });
    }
}

SpaceColonization.prototype.findAttractors = function() {

    this.hormonesForBud.length = 0;
    for(var k=0, length=this.buds.length; k<length; k++) {
        this.hormonesForBud.push([]);
    }

    for (var i=0; i<this.hormones.length; i++) {
        var hormone = this.hormones[i];
        if (hormone.state != 0) continue;

        minDist = 0.8 / 2;
        minDistIndex = -1;

        for (var j=0, length=this.buds.length; j<length; j++) {
            var bud = this.buds[j];
            if (bud.state > 0) continue;
            var dubPos = bud.position.clone();
            var dist = hormone.position.distance(bud.position);
            if (dist < minDist) {
                minDist = dist;
                minDistIndex = j;
            }
        }

        if (minDistIndex == -1) continue;

        this.hormonesForBud[minDistIndex].push(i);
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

    return avgPos.scale(1/avgPosCount);

}

SpaceColonization.prototype.findNextPos = function(avgVec, budPos) {

    var dir = avgVec.dup().sub(budPos);
    dir.normalize().scale(this.growthStep);
    var nextPos = budPos.add(dir);

    return nextPos;
}

SpaceColonization.prototype.findNextPosForBranch = function(avgVec, budPos) {

    var dir = avgVec.dup().sub(budPos);
    dir.normalize().scale(this.growthStep);
    var x = dir.x;
    var y = dir.y;
    dir.x = -y;
    dir.y = x;
    var nextPos = budPos.add(dir);

    return nextPos;

}

SpaceColonization.prototype.splitBranch = function(nextPos, parentPos) {

    if (Math.random() > (1.0 - this.splitChance)) {
        this.buds.push({
            state:      0,
            position:   nextPos,
            parentPos:  parentPos
        });
        nextPos.index = this.buds.length - 1;
    };
}

SpaceColonization.prototype.iterate = function() {

    this.findAttractors();

    for (var i=0, length=this.buds.length; i<length; i++) {
        var bud = this.buds[i];
        if (bud.state === 1) continue;

        if (this.hormonesForBud[i].length == 0) {
            if (bud.hormones) bud.hormones.length = 0;
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
        var branchNextPos   = this.findNextPosForBranch(averageVec, budPos);
        this.splitBranch(branchNextPos, bud.position);

    };

    return {
       buds:        this.buds,
       hormones:    this.hormones
   }
}

module.exports = SpaceColonization;
