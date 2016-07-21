_context.invoke('Nittro.DI', function(undefined) {

    var ServiceDefinition = _context.extend(function(factory, args, setup, run) {
        this._ = {
            factory: factory,
            args: args || {},
            setup: setup || [],
            run: !!run
        };
    }, {
        getFactory: function() {
            return this._.factory;
        },

        setFactory: function(factory, args) {
            this._.factory = factory;

            if (args !== undefined) {
                this._.args = args;
            }

            return this;
        },

        getArguments: function () {
            return this._.args;
        },

        setArguments: function(args) {
            this._.args = args;
            return this;
        },

        getSetup: function () {
            return this._.setup;
        },

        hasSetup: function() {
            return this._.setup.length > 0;
        },

        addSetup: function(callback) {
            this._.setup.push(callback);
            return this;
        },

        setRun: function(state) {
            this._.run = state === undefined || !!state;
            return this;
        },

        isRun: function() {
            return this._.run;
        }
    });

    _context.register(ServiceDefinition, 'ServiceDefinition');

});
;
_context.invoke('Nittro.DI', function(Nittro, ReflectionClass, ReflectionFunction, Arrays, Strings, HashMap, Neon, NeonEntity, ServiceDefinition, undefined) {

    var prepare = function (self) {
        if (!self._) {
            self._ = {};
        }

        if (!self._.services) {
            self._.services = {};
            self._.serviceDefs = {};

        }
    };

    var ContainerMixin = {
        addService: function (name, service) {
            prepare(this);

            if (this._.services[name] || this._.serviceDefs[name]) {
                throw new Error('Container already has a service named "' + name + '"');

            }

            this._.services[name] = service;

            return this;

        },

        addServiceDefinition: function (name, definition, override) {
            prepare(this);

            if (!override && (this._.services[name] || this._.serviceDefs[name])) {
               throw new Error('Container already has a service named "' + name + '"');

            }

            this._.serviceDefs[name] = definition;

            return this;

        },

        hasServiceDefinition: function(name) {
            prepare(this);
            return this._.serviceDefs[name] !== undefined;
        },

        getServiceDefinition: function(name) {
            prepare(this);

            if (!this._.serviceDefs[name]) {
                throw new Error('Container has no service "' + name + '"');

            }

            if (typeof this._.serviceDefs[name] === 'string') {
                this._.serviceDefs[name] = new ServiceDefinition(
                    this._.serviceDefs[name].replace(/!$/, ''),
                    null,
                    null,
                    !!this._.serviceDefs[name].match(/!$/)
                );
            } else if (typeof this._.serviceDefs[name] === 'function') {
                this._.serviceDefs[name] = new ServiceDefinition(
                    this._.serviceDefs[name]
                );
            } else if (!(this._.serviceDefs[name] instanceof ServiceDefinition)) {
                this._.serviceDefs[name] = new ServiceDefinition(
                    this._.serviceDefs[name].factory,
                    this._.serviceDefs[name].args,
                    this._.serviceDefs[name].setup,
                    this._.serviceDefs[name].run
                );
            }

            return this._.serviceDefs[name];

        },

        getService: function (name) {
            prepare(this);

            if (name === 'container') {
                return this;

            } else if (this._.services[name] === undefined) {
                if (this._.serviceDefs[name]) {
                    this._createService(name);

                } else {
                    throw new Error('Container has no service named "' + name + '"');

                }
            }

            return this._.services[name];

        },

        hasService: function (name) {
            prepare(this);
            return name === 'container' || this._.services[name] !== undefined || this._.serviceDefs[name] !== undefined;

        },

        isServiceCreated: function (name) {
            if (!this.hasService(name)) {
                throw new Error('Container has no service named "' + name + '"');

            }

            return !!this._.services[name];

        },

        runServices: function () {
            prepare(this);

            var name, def;

            for (name in this._.serviceDefs) {
                def = this.getServiceDefinition(name);

                if (def.isRun()) {
                    this.getService(name);

                }
            }
        },

        invoke: function (callback, args, thisArg) {
            prepare(this);
            args = this._autowireArguments(callback, args);
            return callback.apply(thisArg || null, this._expandArguments(args));

        },

        _createService: function (name) {
            var def = this.getServiceDefinition(name),
                factory = def.getFactory(),
                obj,
                service,
                setup;

            if (typeof factory === 'function') {
                service = this.invoke(factory, def.getArguments());

                if (!service) {
                    throw new Error('Factory failed to create service "' + name + '"');

                }
            } else {
                factory = this._toEntity(factory);
                service = this._expandEntity(factory, null, def.getArguments());

                if (service === factory) {
                    throw new Error('Invalid factory for service "' + name + '"');

                }
            }

            this._.services[name] = service;

            if (def.hasSetup()) {
                setup = def.getSetup();

                for (var i = 0; i < setup.length; i++) {
                    if (typeof setup[i] === 'function') {
                        this.invoke(setup[i], null, service);

                    } else {
                        obj = this._toEntity(setup[i]);
                        this._expandEntity(obj, service);

                    }
                }
            }

            return service;

        },

        _autowireArguments: function (callback) {
            var argList = ReflectionFunction.from(callback).getArgs();

            var args = Arrays.createFrom(arguments, 1)
                .filter(function(arg) { return !!arg; })
                .map(function (arg) {
                    if (arg instanceof HashMap) {
                        if (arg.isList()) {
                            arg = HashMap.from(arg.getValues(), argList);

                        }
                    } else {
                        arg = HashMap.from(arg, argList);

                    }

                    return arg;

                });

            var i, a;

            lookupArg:
            for (i = 0; i < argList.length; i++) {
                for (a = args.length - 1; a >= 0; a--) {
                    if (args[a].has(argList[i])) {
                        argList[i] = args[a].get(argList[i]);
                        continue lookupArg;

                    } else if (args[a].has(i)) {
                        argList[i] = args[a].get(i);
                        continue lookupArg;

                    }
                }

                if (this.hasService(argList[i])) {
                    argList[i] = this.getService(argList[i]);
                    continue;

                }

                throw new Error('Cannot autowire argument "' + argList[i] + '" of function');

            }

            return argList;

        },

        _expandArguments: function (args) {
            for (var i = 0; i < args.length; i++) {
                args[i] = this._expandArg(args[i]);

            }

            return args;

        },

        _expandArg: function (arg) {
            if (arg instanceof NeonEntity) {
                return this._expandEntity(arg);

            } else if (typeof arg === 'string' && arg.match(/^@\S+$/)) {
                return this.getService(arg.substr(1));

            } else {
                return arg;

            }
        },

        _toEntity: function (str) {
            var m = str.match(/^([^\(]+)\((.*)\)$/);

            if (m) {
                return new NeonEntity(m[1], Neon.decode('[' + m[2] + ']'));

            } else {
                return new NeonEntity(str, new HashMap());

            }
        },

        _expandEntity: function (entity, context, mergeArgs) {
            var m, obj, method, args;

            if (m = entity.value.match(/^(?:(@)?([^:].*?))?(?:::(.+))?$/)) {
                if (m[2]) {
                    obj = m[1] ? this.getService(m[2]) : ReflectionClass.getClass(m[2]);

                } else if (context) {
                    obj = context;

                } else {
                    throw new Error('No context for calling ' + entity.value + ' given');

                }

                if (m[3] !== undefined) {
                    method = m[3];
                    args = this._autowireArguments(obj[method], entity.attributes, mergeArgs);
                    return obj[method].apply(obj, this._expandArguments(args));

                } else if (!m[1]) {
                    args = this._autowireArguments(obj, entity.attributes, mergeArgs);
                    return ReflectionClass.from(obj).newInstanceArgs(this._expandArguments(args));

                } else if (entity.attributes.length) {
                    throw new Error('Invalid entity "' + entity.value + '"');

                } else {
                    return obj;

                }
            } else {
                return entity;

            }
        }
    };

    _context.register(ContainerMixin, 'ContainerMixin');

}, {
    ReflectionClass: 'Utils.ReflectionClass',
    ReflectionFunction: 'Utils.ReflectionFunction',
    Arrays: 'Utils.Arrays',
    Strings: 'Utils.Strings',
    HashMap: 'Utils.HashMap',
    Neon: 'Nittro.Neon.Neon',
    NeonEntity: 'Nittro.Neon.NeonEntity'
});
;
_context.invoke('Nittro.DI', function(ContainerMixin, Arrays, HashMap, ReflectionClass, NeonEntity, undefined) {

    function traverse(cursor, path, create) {
        if (typeof path === 'string') {
            path = path.split(/\./g);

        }

        var i, p, n = path.length;

        for (i = 0; i < n; i++) {
            p = path[i];

            if (Array.isArray(cursor) && p.match(/^\d+$/)) {
                p = parseInt(p);

            }

            if (cursor[p] === undefined) {
                if (create) {
                    cursor[p] = {};

                } else {
                    return undefined;

                }
            }

            cursor = cursor[p];

        }

        return cursor;

    }

    var Container = _context.extend(function(config) {
        config || (config = {});

        this._ = {
            params: Arrays.mergeTree({}, config.params || null),
            serviceDefs: Arrays.mergeTree({}, config.services || null),
            services: {},
            factories: Arrays.mergeTree({}, config.factories || null)
        };

    }, {
        hasParam: function(name) {
            return traverse(this._.params, name) !== undefined;

        },

        getParam: function(name, def) {
            var value = traverse(this._.params, name);
            return value !== undefined ? value : (def !== undefined ? def : null);

        },

        setParam: function(name, value) {
            name = name.split(/\./g);

            var p = name.pop(),
                cursor = this._.params;

            if (name.length) {
                cursor = traverse(cursor, name, true);

            }

            if (Array.isArray(cursor) && p.match(/^\d+$/)) {
                p = parseInt(p);

            }

            cursor[p] = value;

            return this;

        },

        hasFactory: function(name) {
            return this._.factories[name] !== undefined;

        },

        addFactory: function(name, factory, params) {
            if (typeof factory === 'string') {
                this._.factories[name] = factory;

            } else {
                this._.factories[name] = {
                    callback: factory,
                    params: params || null
                };
            }

            return this;

        },

        create: function(name, args) {
            if (!this.hasFactory(name)) {
                throw new Error('No factory named "' + name + '" has been registered');

            }

            var factory = this._.factories[name];

            if (typeof factory === 'string') {
                this._.factories[name] = factory = this._toEntity(factory);

            } else if (!(factory.params instanceof HashMap)) {
                factory.params = new HashMap(factory.params);

            }

            if (factory instanceof NeonEntity) {
                return this._expandEntity(factory, null, args);

            } else {
                args = this._autowireArguments(factory.callback, factory.params, args);
                return factory.callback.apply(null, this._expandArguments(args));

            }
        },

        _expandArg: function (arg) {
            if (typeof arg === 'string' && arg.indexOf('%') > -1) {
                if (arg.match(/^%[^%]+%$/)) {
                    return this.getParam(arg.replace(/^%|%$/g, ''));

                } else {
                    return arg.replace(/%([a-z0-9_.-]+)%/gi, function () {
                        return this.getParam(arguments[1]);

                    }.bind(this));
                }
            } else {
                return this.__expandArg(arg);

            }
        }
    });

    _context.mixin(Container, ContainerMixin, {
        _expandArg: '__expandArg'
    });

    _context.register(Container, 'Container');

}, {
    Arrays: 'Utils.Arrays',
    HashMap: 'Utils.HashMap',
    ReflectionClass: 'Utils.ReflectionClass',
    NeonEntity: 'Nittro.Neon.NeonEntity'
});
;
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
;
_context.invoke('Nittro.DI', function(Container, ContainerMixin, BuilderExtension, undefined) {

    var ContainerBuilder = _context.extend(Container, function(config) {
        config || (config = {});

        ContainerBuilder.Super.call(this, config);
        this._.extensions = config.extensions || {};
        
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
