module.exports = function (grunt) {

    var files = [
        'src/js/Nittro/DI/ServiceDefinition.js',
        'src/js/Nittro/DI/ContainerMixin.js',
        'src/js/Nittro/DI/Container.js',
        'src/js/Nittro/DI/BuilderExtension.js',
        'src/js/Nittro/DI/ContainerBuilder.js'
    ];

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        uglify: {
            options: {
                mangle: false,
                sourceMap: false
            },
            nittro: {
                files: {
                    'dist/js/nittro-di.min.js': files
                }
            }
        },

        concat: {
            options: {
                separator: ";\n"
            },
            nittro: {
                files: {
                    'dist/js/nittro-di.js': files
                }
            }
        },

        jasmine: {
            src: files,
            options: {
                vendor: [
                    'bower_components/promiz/promiz.min.js',
                    'bower_components/nittro-core/dist/js/nittro-core.js',
                    'bower_components/nittro-datetime/dist/js/nittro-datetime.js',
                    'bower_components/nittro-neon/dist/js/nittro-neon.js'
                ],
                specs: 'tests/specs/**.spec.js',
                display: 'short',
                summary: true
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.registerTask('default', ['uglify', 'concat']);
    grunt.registerTask('test', ['jasmine']);

};
