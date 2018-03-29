// 引入 gulp
var Browserify = require('browserify-gulp');
var gulp = require('gulp');
var less = require('gulp-less'); //sass编译
var concat = require('gulp-concat'); //合并
var uglify = require('gulp-uglify'); //js压缩
var rename = require('gulp-rename'); //重命名
var path = require('path'); //重命名
var htmlmin = require('gulp-htmlmin'); //页面压缩
var minifyCss = require('gulp-minify-css'); //css压缩
var importCss = require('gulp-import-css'); //css-import
var rev = require('gulp-rev'); //对文件名加MD5后缀
var revCollector = require('gulp-rev-collector'); //路径替换
var cheerio = require('gulp-cheerio'); //替换引用
var babel = require("gulp-babel");  // 转成es5
var clean = require('gulp-clean');  //清除
var combiner = require('stream-combiner2'); // 事件流插件
var imagemin = require('gulp-imagemin'); // 图片压缩
var base64 = require('gulp-base64'); // 转化成base64
var pngcrush = require('imagemin-pngcrush'); // 深度压缩png图片的imagemin插件
var runSequence = require('run-sequence'); // 事件流插件
var browserify = require('browserify'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    standalonify = require('standalonify'),
    argv = require('yargs').argv,
    babelify = require('babelify')      //bebel解析器
    glob = require('glob')              
    es = require('event-stream'),
    browserSync = require("browser-sync").create();//浏览器实时刷新  




    // 默认任务 
gulp.task('default', ['build']);


// 检查脚本 
// gulp.task('lint', function() {
//     gulp.src('./src/scripts/*.js')
//         .pipe(jshint())
//         .pipe(jshint.reporter('default'));
// });


// 打包-生产环境gulp任务
gulp.task('build', ['clean'], function() {
    runSequence('less','html','commonjs','browserifyjs','images');
});

// 
gulp.task('commonjs', function() {
    gulp.src(['./src/common/scripts/*.js','./src/common/scripts/**/*.js'],{base: './src/'})
        .pipe(babel({
            "presets": ['es2015'],
            "plugins": ["transform-runtime"]}
        )) 
        .pipe(uglify({
            compress: true
        }))
        .pipe(gulp.dest('./dist/'))
})


gulp.task('browserifyjs', function (done) {
    glob('./src/pages/**/*.js', function(err, files) {
        if(err) done(err);
        var tasks = files.map(function(entry) {
           let src = entry.replace('src','dist')
           let dirname = path.dirname(src)
           let basename = path.basename(src)
          console.log('dirname',path.dirname(src))
           console.log(src,dirname,basename)
            return browserify({ entries: [entry] }
                )
                .plugin(standalonify, {  //使打包后的js文件符合UMD规范并指定外部依赖包
                    name: 'umd',
                    deps: {
                        'nornj': 'nj',
                        'react': 'React',
                        'react-dom': 'ReactDOM'
                    }
                })
                .transform(babelify) 
                
                .bundle()  //合并打包
                .pipe(source(setbaseName(basename)))  //将常规流转换为包含Stream的vinyl对象，并且重命名
                .pipe(buffer())  //将vinyl对象内容中的Stream转换为Buffer
                .pipe(uglify({
                    compress: true
                }))
                .pipe(gulp.dest(dirname))
            })
            
        es.merge(tasks).on('end', done);
    })
  });
  
  function setbaseName(basename) {
    if (argv.min) {  //按命令参数"--min"判断是否为压缩版
        basename = 'basename.js';
    }
    return basename;
  }

// 编译less-并且压缩css
gulp.task('less', function() {
    gulp.src(['./src/common/style/*.less','./src/pages/**/*.less'],{base: './src/'})
        .pipe(less())
        .pipe(importCss())   //这里使用
        .pipe(minifyCss())
        .pipe(gulp.dest('./dist/'))
      
});




//改变引用文件
// gulp.task('rev', function() {
//     gulp.src(['./rev/css/rev-manifest.json', './rev/js/rev-manifest.json', './dist/index.html'])
//         .pipe(revCollector()) 
//         .pipe(gulp.dest('./dist/'));
// });

// 修改首页的指向-暂时无需，非单页
// gulp.task('indexHtml', function() {
//     return gulp.src(['./pages/**/*.html'])
//         .
// });


gulp.task('html', function() {
    return gulp.src('./src/pages/**/*.html',{base: './src/pages/'})
         .pipe(cheerio(function ($,file) {
            var baseName = path.basename(file.path,'.html');
            $('link').remove();
            $('head').append('<link rel="stylesheet" href="./'+  baseName + '.css">');

        }))
        .pipe(htmlmin({
            collapseWhitespace: true, // 压缩HTML
            removeComments: true, // 清除HTML注释
            keepClosingSlash: true //  保持元素末尾的斜杠
        }))
        .pipe(gulp.dest('./dist/pages/'))
});

// 清理dist-打包后的目录
gulp.task('clean', function () {
    return gulp.src(['dist/*','!dist/images'], {read: false})
        .pipe(clean());
});

gulp.task('images', function() {
    const combinedImages = combiner.obj([
        gulp.src('./src/common/images/*.{jpg,jpeg,png,gif,bmp}',{base: './src/'}),
        imagemin({
            optimizationLevel: 5, // 默认：3  取值范围：0-7（优化等级）
            progressive: true, // 默认：false 无损压缩jpg图片
            interlaced: true, // 默认：false 隔行扫描gif进行渲染
            multipass: true, // 默认：false 多次优化svg直到完全优化
            svgoPlugins: [{
                removeViewBox: false
            }], //不要移除svg的viewbox属性
            use: [pngcrush()] // 深度压缩png图片的imagemin插件
        }),
        gulp.dest('./dist/')
    ]);

});

gulp.task('server', ['clean'], function() {  
    gulp.start('less','html','commonjs','browserifyjs');  
    browserSync.init({  
        port: 8080,  
        server: {  
            baseDir: ['dist']  
        }  
    });  
    gulp.watch('./src/pages/**/*.html', ['html']).on('change', browserSync.reload);
    gulp.watch(['./src/pages/**/*.less', './src/common/style/*.less'], ['less']).on('change', browserSync.reload);
    gulp.watch(['./src/pages/**/*.js', './src/common/scripts/*.js'], ['commonjs','browserifyjs']).on('change', browserSync.reload);
    gulp.watch('./src/**/**/*.{jpg,jpeg,png,gif,bmp}', ['images']).on('change', browserSync.reload);
});  

// 测试环境
gulp.task('dev', ['server']);


