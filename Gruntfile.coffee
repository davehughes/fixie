module.exports = (grunt) ->
  grunt.initConfig

    pkg: grunt.file.readJSON('package.json')

    coffee:
      # options:
      #   sourceMap: true
      compile:
        files: [{
          expand: true
          cwd: 'coffee/'
          src: ['**/*.coffee']
          dest: 'gen/js'
          ext: '.js'
          }]

    handlebars:
      compile:
        files:
          'gen/js/fixie-templates.js': [
            'handlebars/**/*.hbs'
          ]
        options:
          namespace: 'App.Handlebars'
          wrapped: true
          processName: (filename) ->
            filename = filename.replace /handlebars\//, ''
            filename.replace /\.hbs$/, ''

    less:
      development:
        options:
          dumpLineNumbers: true
        files:
          'gen/css/style.css': 'less/style.less'
          'gen/css/fiddle.css': 'less/fiddle.less'

    #   production:
    #     options:
    #       yuicompress: true
    #     files:
    #       'gen/css/style.css': 'less/style.less'

    # uglify:
    #   build:
    #     src: 'gen/js/*.js'
    #     dest: 'gen/js/all.min.js'

    watch:
      options:
        livereload: true

      coffee:
        files: 'coffee/**/*.coffee'
        tasks: ['coffee']

      less:
        files: 'less/**/*.less'
        tasks: ['less']

      handlebars:
        files: 'handlebars/**/*.hbs'
        tasks: ['handlebars']

  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-contrib-less')
  grunt.loadNpmTasks('grunt-contrib-uglify')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-contrib-handlebars')

  grunt.registerTask('default', ['coffee', 'handlebars', 'less'])
