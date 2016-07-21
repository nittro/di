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
