const path = require("path");
const gulp = require("gulp");
const pump = require("pump");
const del = require("del");
const RevAll = require("gulp-rev-all");
const uglify = require("gulp-uglify");
const cleanCss = require("gulp-clean-css");
const htmlmin = require('gulp-htmlmin');
const imagemin = require('gulp-imagemin');
const sftp = require("gulp-sftp");
const gutil = require("gulp-util");
const eslint = require('gulp-eslint');
const gulpSequence = require("gulp-sequence");

const src = "../";
const dest = "../dist/";
const host = "host"
const remotePath = "remotePath"
let isProduction = true;

// 版本控制(缓存处理)
gulp.task("rev", function() {
  return gulp
    .src([
      src + "js/**/*",
      src + "images/**/*",
      src + "img/**/*",
      src + "css/**/*",
      src + "*.html"
    ])
    .pipe(
      RevAll.revision({
        includeFilesInManifest: [".js", ".css", ".png", "jpeg", "jpg"],
        hashLength: 6,
        dontRenameFile: !isProduction ? [/.$/g] : [/.html$/g],
        dontUpdateReference: [/.html$/g]
      })
    )
    .pipe(gulp.dest(dest))
    .pipe(RevAll.manifestFile())
    .pipe(gulp.dest(dest));
});

// 删除生成目录
gulp.task("clean", function() {
  del.sync([dest], {
    force: true
  });
});

// 压缩 JS
gulp.task("min:js", function() {
  pump([gulp.src(dest + "js/**/*.js"), uglify(), gulp.dest(dest + "js/")]);
});

// 压缩 CSS
gulp.task("min:css", function() {
  return gulp
    .src(dest + "css/**/*.css")
    .pipe(
      cleanCss({
        compatibility: "ie8"
      })
    )
    .pipe(gulp.dest(dest + "css/"));
});

// 压缩 HTML
gulp.task('min:html', function() {
  return gulp.src(dest + "**/*.html")
    .pipe(htmlmin({
        minifyCSS: true,
        minifyJS: true,
        removeComments: false, // 保留 ssi
        removeAttributeQuotes: false, // 保留引号
        collapseWhitespace: true,
    }))
    .pipe(gulp.dest(dest));
});

// 压缩图片
gulp.task('min:img1', function() {
  return gulp.src(dest + "images/*")
    .pipe(imagemin({
        verbose: true
    }))
    .pipe(gulp.dest(dest + 'images'));
});

gulp.task('min:img2', function() {
  return gulp.src(dest + "img/*")
    .pipe(imagemin({
        verbose: true
    }))
    .pipe(gulp.dest(dest + 'img'));
});

gulp.task("min:image", ["min:img1", "min:img2"]);

// 合并压缩任务
gulp.task("min", ["min:html", "min:js", "min:css"]);

// ftp 上传
gulp.task("sftp", function() {
  return gulp.src([dest + "**/*"]).pipe(
    sftp({
      host: host,
      auth: "auth",
      port: 22,
      remotePath: remotePath
    })
  );
});

gulp.task('eslint', function() {
    return gulp.src('js/**/*.js')
    .pipe(eslint({
        fix: true
        // useEslintrc: true,
        // configFile: './.eslintrc.js'
    }))
    .pipe(eslint.format())
    // .pipe(eslint.failAfterError());
})

gulp.task("dev", function() {
  isProduction = false;
  gulpSequence("clean", "rev", "min", "sftp")((err) => {
    if (err) console.log(err);

    gulp.watch(
      [
        src + "*.html",
        src + "js/**/*",
        src + "css/**/*",
        src + "images/**/*",
        src + "css/**/*"
      ],
      function() {
        gulpSequence("rev", "min", "sftp")((err) => {
          if (err) console.log(err);
        });
      }
    );
  });
});

gulp.task("build", function() {
  gulpSequence("clean", "rev", ["min:js", "min:css"], "sftp")((err) => {
    if (err) console.log(err);
  });
});

gulp.task("default", ["dev"]);
