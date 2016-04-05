module.exports = function(grunt) {
  'use strict';

  var jsLibs = [
    'public/build/js/libs/d3.min.js', 
    'public/build/js/libs/jquery.min.js',
    'bower_components/angular/angular.min.js',
    'bower_components/angular-route/angular-route.min.js',
    'bower_components/angular-socket-io/socket.min.js'
  ];
  var jsApp = ['public/build/js/app.js'];

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    sass: {
      dist: {
        options: {
          style: 'compressed'
        },
        files: {
          'public/dist/styles/style.css' : 'public/build/sass/style.sass'
        }
      }
    },

    autoprefixer: {
      dist: {
        files: {
          'public/dist/styles/style.css' : 'public/dist/styles/style.css'
        }
      }
    },

    jshint: {
      all: ['Gruntfile.js', 'public/build/js/app.js', 'index.js']
    },

    uglify: {
      dist: {
        files: {
          'public/dist/js/libs.min.js': [jsLibs],
          'public/dist/js/app.min.js': [jsApp],
        }
      }
    },

    watch: {
      css: {
        files: 'public/build/sass/*.sass',
        tasks: ['sass'],
        options: {
          livereload: true
        }
      },
      jshint: {
        files: ['public/build/js/**/*.js'],
        tasks: ['jshint']
      }
    }
  });

  grunt.loadNpmTasks('grunt-sass');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-autoprefixer');

  grunt.registerTask('default', ['sass', 'jshint', 'watch']);
  grunt.registerTask('build', ['sass', 'autoprefixer', 'uglify']);
};