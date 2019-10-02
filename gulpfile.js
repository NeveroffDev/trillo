const {src, dest, task, series, watch, parallel} = require('gulp');
const rm = require('gulp-rm');
const sass = require('gulp-sass');
const concat = require('gulp-concat');
const browserSync = require('browser-sync').create();
const reload = browserSync.reload;
const sassGlob = require('gulp-sass-glob');
const autoprefixer = require('gulp-autoprefixer');
const px2rem = require('gulp-smile-px2rem');
const gcmq = require('gulp-group-css-media-queries');
const cleanCSS = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const svgo = require('gulp-svgo');
const svgSprite = require('gulp-svg-sprite');
const gulpif = require('gulp-if');

//env variable for dev or prod
const env = process.env.NODE_ENV;

//config
const {DIST_PATH, SRC_PATH, JS_LIBS, STYLE_LIBS, REM} = require('./gulp.config');

sass.compiler = require('node-sass');

//clear dist folder
task('clear', () => {
    console.log(env);
    return src(`${DIST_PATH}/**/*`, {read: false}).pipe(rm());
});

//copy html
task('copy:html', () => {
    return src(`${SRC_PATH}/index.html`)
        .pipe(dest(DIST_PATH))
        .pipe(reload({stream: true}));
});

//copy img
task('copy:img', () => {
    return src(`${SRC_PATH}/img/*.*`)
        .pipe(dest(`${DIST_PATH}/img`))
        .pipe(reload({stream: true}));
});

//SVG
task('svg', () => {
    return src(`${SRC_PATH}/img/svg/*.svg`)
        .pipe(svgo({
            removeAttrs: {
                attrs: '(fill|stroke|style|width|height|data.*)'
            }
        }))
        .pipe(svgSprite({
            mode: {
                symbol: {
                    sprite: '../sprite.svg'
                }
            }
        }))
        .pipe(dest(`${DIST_PATH}/img/svg`))
});

//compile sass files
task('styles', () => {
    return src([...STYLE_LIBS, `${SRC_PATH}/styles/scss/main.scss`])
        .pipe(gulpif(env === 'dev',
            sourcemaps.init()))
        .pipe(concat('main.min.scss'))
        .pipe(sassGlob())
        .pipe(sass().on('error', sass.logError))
        .pipe(px2rem({
            dpr: 1,
            rem: REM,
            one: false
        }))
        .pipe(gulpif(env === 'prod',
            autoprefixer({
                cascade: false
            })))
        .pipe(gulpif(env === 'prod',
            gcmq()))
        .pipe(gulpif(env === 'prod',
            cleanCSS()))
        .pipe(gulpif(env === 'dev',
            sourcemaps.write()))
        .pipe(dest(`${DIST_PATH}/css`))
        .pipe(reload({stream: true}));
});

//compile JS scripts
task('scripts', () => {
    return src([...JS_LIBS, `${SRC_PATH}/js/*.js`])
        .pipe(gulpif(env === 'dev',
            sourcemaps.init()))
        .pipe(concat('main.min.js', {newLine: ';'}))
        .pipe(gulpif(env === 'prod',
            babel({
                presets: ['@babel/env']
            })))
        .pipe(gulpif(env === 'prod',
            uglify()))
        .pipe(gulpif(env === 'dev',
            sourcemaps.write()))
        .pipe(dest(`${DIST_PATH}/js`))
        .pipe(reload({stream: true}));
});

//create a dev server
task('server', function () {
    browserSync.init({
        server: {
            baseDir: `./${DIST_PATH}`
        },
        open: false
    });
});
task('watch', () => {
    watch(`./${SRC_PATH}/styles/**/*.scss`, series('styles'));
    watch(`./${SRC_PATH}/js/*.js`, series('scripts'));
    watch(`./${SRC_PATH}/*.html`, series('copy:html'));
    watch(`./${SRC_PATH}/img/*.*`, series('copy:img'));
    watch(`./${SRC_PATH}/img/svg/*.svg`, series('svg'));
});


task(
    'default',
    series('clear',
        parallel('copy:img', 'svg', 'copy:html', 'styles', 'scripts'),
        parallel('server', 'watch')));

task(
    'build',
    series('clear',
        parallel('copy:img', 'svg', 'copy:html', 'styles', 'scripts'))
);