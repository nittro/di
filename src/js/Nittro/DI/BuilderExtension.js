_context.invoke('Nittro.DI', function (Arrays) {

    var BuilderExtension = _context.extend(function(containerBuilder, config) {
        this._ = {
            containerBuilder: containerBuilder,
            config: config
        };
    }, {
        load: function() {

        },

        setup: function () {

        },

        _getConfig: function (defaults) {
            if (defaults) {
                this._.config = Arrays.mergeTree({}, defaults, this._.config);
            }

            return this._.config;

        },

        _getContainerBuilder: function () {
            return this._.containerBuilder;
        }
    });

    _context.register(BuilderExtension, 'BuilderExtension');

}, {
    Arrays: 'Utils.Arrays'
});
