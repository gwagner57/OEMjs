/**
 *  The '--production' parameter allows to minimize the JS and CSS code.
 *
 *  Minimal requirements: NodeJS v6.9+, gulp module installed globally, i.e., use 'npm install -g gulp'.
 *
 *  NOTE: for the first time, one need to execute: 'npm install' to get all the NodeJS
 *        dependency modules described in the package.json file and used by this gulp file.
 */


// dependency NodeJS modules
const argv = require( "yargs").argv,
  gulp = require( "gulp"),
  concat = require( "gulp-concat"),
  notify = require("gulp-notify"),
  gulpif = require("gulp-if"),
  uglify = require("gulp-uglify"),
  //cleanCSS = require("gulp-clean-css"),
  tap = require("gulp-tap"),
  del = require("del"),
  jshint = require('gulp-jshint');

// the folder where the distribution library file is created.
const buildFolder = "dist";

// the JS files of the cLASSjs Browser Library
const cLASSjsBrowserLibFiles = [
  "lib/browserShims.js",

  "lib/errorTypes.js",
  "lib/util.js",
  "src/eNUMERATION.js",
  "src/cLASS.js",

  "lib/dom.js",
  "src/oBJECTvIEW.js",

  "lib/idb.js",
  "src/storage/sTORAGEmANAGER.js",
  "src/storage/sTORAGEmANAGER_IndexedDB.js"
];

// the JS files of the cLASSjs Worker Library
const cLASSjsWorkerLibFiles = [
  "lib/browserShims.js",
  "lib/errorTypes.js",
  "lib/util.js",
  "src/eNUMERATION.js",
  "src/cLASS.js",
  "lib/idb.js",
  "src/storage/sTORAGEmANAGER.js",
  "src/storage/sTORAGEmANAGER_IndexedDB.js"
];

// build the cLASSjsBrowserLib.js file
gulp.task( "build-browser-lib", function() {
  return gulp.src( cLASSjsBrowserLibFiles)
    .pipe( concat("cLASSjsBrowserLib.js"))
    .pipe( gulpif( argv.production, uglify()))
    .pipe( gulp.dest( buildFolder))
    .pipe( notify({message: "cLASSjsBrowserLib.js was built!"}));
});
gulp.task( "build-css", function() {
  return gulp.src(
    [ "css/normalize.css",
      "css/vIEW.css"
	])
    .pipe( concat( "cLASS.css"))
//    .pipe( gulpif( argv.production, cleanCSS()))
    .pipe( gulp.dest( buildFolder))
});
// build the cLASSjsWorkerLib.js file
gulp.task( "build-worker-lib", function() {
  return gulp.src( cLASSjsWorkerLibFiles)
      .pipe( concat("cLASSjsWorkerLib.js"))
      .pipe( gulpif( argv.production, uglify()))
      .pipe( gulp.dest( buildFolder))
      .pipe( notify({message: "cLASSjsWorkerLib.js was built!"}));
});
gulp.task( "build", [ 
    "build-browser-lib",
	"build-css",
    "build-worker-lib"
]);


// build the cLASSjsNodeLib.js file
gulp.task( "build-node", function() {
  return gulp.src([
    "lib/errorTypes.js",
    "lib/util.js",
    "src/eNUMERATION.js",
    "src/cLASS.js"
  ])
      .pipe( concat("cLASSjsNodeLib.js"))
      .pipe( gulpif( argv.production, uglify()))
      .pipe( gulp.dest( buildFolder))
      .pipe( notify({message: "cLASSjsNodeLib.js was built!"}));
});


gulp.task('dev', function () {
  gulp.src([
      "lib/browserShims.js",
      "lib/errorTypes.js",
      "lib/util.js",
  	  "src/eNUMERATION.js",
      "src/cLASS.js",
      "lib/dom.js",
      "src/oBJECTvIEW.js"
  ])
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'));
});
