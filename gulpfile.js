const gulp = require('gulp');
const ts = require('gulp-typescript');

// pull in the project TypeScript config
const tsProject = ts.createProject('tsconfig.json');

gulp.task('scripts', () => {
    const tsResult = tsProject.src()
        .pipe(tsProject());
    gulp.src(['src/config/**/*']).pipe(gulp.dest('dist/config'));
return tsResult.js.pipe(gulp.dest('dist'));
});

gulp.task('watch', ['scripts'], () => {
    gulp.watch('src/**/*.ts', ['scripts']);
});

gulp.task('default', ['watch']);