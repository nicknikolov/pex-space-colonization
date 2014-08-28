var geom = require('pex-geom');
var Vec3 = geom.Vec3;

function SpaceColonization(options) {

    var options         = options               ? options               : {};
    this.type           = options.type          ? options.type          : '2d';
    this.deadZone       = options.deadZone      ? options.deadZone      : 0.1;
    this.growthStep     = options.growthStep    ? options.growthStep    : 0.02;
    this.splitChance    = options.splitChance   ? options.splitChance   : 0.6;
    this.margin         = options.margin        ? options.margin        : 5;
    this.numHormones    = options.numHormones   ? options.numHormones   : 800;
    this.startBuds      = options.startBuds     ? options.startBuds     : 1;
    this.centerR        = options.centerRadius  ? options.centerRadius  : 1;
    this.budPosArray    = options.budPosArray   ? options.budPosArray   : null;
    this.hormPosArray   = options.hormPosArray  ? options.hormPosArray  : null;
    this.viewAngle      = options.viewAngle     ? options.viewAngle     : 50;
    this.growType       = options.growType      ? options.growType      : 'split';
    this.branchAngle    = options.branchAngle   ? options.branchAngle   : 30;

    this.center         = new Vec3(0, 0, 0);
    this.hormonesForBud = [];

    this.generateBuds();
    this.generateHormones();
}

SpaceColonization.prototype.restart = function() {

    this.generateHormones();
    this.generateBuds();
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

        minDist = 0.4;
        minDistIndex = -1;

        for (var j=0, length=this.buds.length; j<length; j++) {
            var bud = this.buds[j];
            if (bud.state > 0) continue;
            var dist = hormone.position.distance(bud.position);
            if (bud.position.direction) {
                var budPosDirNorm = bud.position.direction.clone().normalize();
                var hormPosNorm = hormone.position.clone().sub(bud.position).normalize();
                var dot = budPosDirNorm.dot(hormPosNorm);
                var radians = Math.acos(dot);
                var degrees = radians * (180/Math.PI);
                if (degrees > this.viewAngle * 2) {
                    continue;
                }
            }
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

SpaceColonization.prototype.calculateAverageVec = function(index) {

    var avgPos      = new Vec3(0, 0, 0);
    var avgPosCount = 0;

    for (var l=0; l<this.hormonesForBud[index].length; l++) {
        var hormone = this.hormones[this.hormonesForBud[index][l]];
        avgPos.add(hormone.position);
        avgPosCount++;
    };

    this.avgVec = avgPos.scale(1/avgPosCount);

}

SpaceColonization.prototype.findNextPos = function(budPos, rotate) {

    var dir = this.avgVec.dup().sub(budPos);
    dir.normalize().scale(this.growthStep);
    if (rotate && this.growType === "split") {
        var sinBranchAngle = Math.sin(this.branchAngle * (Math.PI/180));
        var cosBranchAngle = Math.cos(this.branchAngle * (Math.PI/180));
        dir.x = dir.x * cosBranchAngle + dir.y * sinBranchAngle;
        dir.y = -( dir.x * sinBranchAngle) + dir.y * cosBranchAngle;
    }
    var nextPos = budPos.dup().add(dir);
    nextPos.direction = dir;
    return nextPos;
}

SpaceColonization.prototype.findNextPosForBranch = function(budPos) {

    var dir = this.avgVec.dup().sub(budPos);
    dir.normalize().scale(this.growthStep);
    var sinBranchAngle = Math.sin(this.branchAngle * (Math.PI/180));
    var cosBranchAngle = Math.cos(this.branchAngle * (Math.PI/180));
    dir.x = dir.x * cosBranchAngle + dir.y * sinBranchAngle;
    dir.y = -( dir.x * sinBranchAngle) + dir.y * cosBranchAngle;
    var nextPos = budPos.add(dir);
    nextPos.direction = dir;
    return nextPos;

}

SpaceColonization.prototype.splitBranch = function(parentPos, nextPos) {

    if (Math.random() > (1.0 - this.splitChance)) {

        var branchNextPos = this.findNextPosForBranch(parentPos);

        this.buds.push({
            state:      0,
            position:   branchNextPos,
            parentPos:  parentPos
        });
        return true;

    } else return false;
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

        var budPos = bud.position.clone();
        this.calculateAverageVec(i);
        var didSplit = this.splitBranch(budPos, nextPos);
        var nextPos = this.findNextPos(budPos, didSplit);

        bud.state++;
        this.buds.push({
            state:      0,
            position:   nextPos,
            parentPos:  bud.position
        });

        var that = this;
        bud.hormones = this.hormonesForBud[i].map(function(index) { return that.hormones[index]; });

    };

    return {
       buds:        this.buds,
       hormones:    this.hormones
   }
}

module.exports = SpaceColonization;
