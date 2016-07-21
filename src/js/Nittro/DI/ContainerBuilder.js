_context.invoke('Nittro.DI', function(Container, ContainerMixin, BuilderExtension, undefined) {

    var ContainerBuilder = _context.extend(function(config) {
        config || (config = {});

        this._ = {
            extensions: config.extensions || {},
            params: config.params || {},
            services: {},
            serviceDefs: config.services || {},
            factories: config.factories || {}
        };
    }, {
        addExtension: function(name, extension) {
            if (this._.extensions[name] !== undefined) {
                throw new Error('Container builder already has an extension called "' + name + '"');
            }

            this._.extensions[name] = extension;

            return this;
        },

        createContainer: function() {
            this._prepareExtensions();
            this._loadExtensions();
            this._setupExtensions();

            return new Container({
                params: this._.params,
                services: this._.serviceDefs,
                factories: this._.factories
            });
        },

        _prepareExtensions: function () {
            var name, extension;

            for (name in this._.extensions) {
                extension = this._.extensions[name];

                if (typeof extension === 'function') {
                    extension = this.invoke(extension, {containerBuilder: this, config: this._.params[name] || {}});

                } else if (typeof extension === 'string') {
                    extension = this._expandEntity(this._toEntity(extension), null, {containerBuilder: this, config: this._.params[name] || {}});

                }

                if (!(extension instanceof BuilderExtension)) {
                    throw new Error('Extension "' + name + '" is not an instance of Nittro.DI.BuilderExtension');

                }

                this._.extensions[name] = extension;

            }
        },

        _loadExtensions: function () {
            for (var name in this._.extensions) {
                this._.extensions[name].load();

            }
        },

        _setupExtensions: function () {
            for (var name in this._.extensions) {
                this._.extensions[name].setup();

            }
        }
    });

    _context.mixin(ContainerBuilder, ContainerMixin);
    _context.register(ContainerBuilder, 'ContainerBuilder');

});
