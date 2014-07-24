#!/usr/bin/env node

var fs = require('fs');
var watchify = require('watchify');
var browserSync = require('browser-sync');

function watch() {
    var bundler = watchify('./pex-main.js');

    bundler.transform({global:true}, 'brfs');
    bundler.ignore('plask');
    bundler.on('update', rebundle);

    function rebundle () {
        return bundler.bundle()
        // log errors if they happen
        .on('error', function(e) {
            console.log('Browserify Error', e);
        })
        .pipe(fs.createWriteStream('lib/pex.js'));
    }

    return rebundle()
}

watch();


var files = [
    './lib/pex.js'
];

browserSync.init(files, {
    server: {
        baseDir: './'
    }
});



