define(['environment', 'version', 'cache', 'require'], function(environment, appversion, cache, require) {
    var uefi = environment.uefi,
        slice = Array.prototype.slice,
        vkey = 'system.version',
        cached = Modernizr.localstorage
            && uefi.prodMode
            && (function() {
                var apv = localStorage.getItem(vkey),
                    version = appversion.version || "1.0.0";
                if (!apv || apv === version) {
                    try {
                        if (!apv) localStorage.setItem(vkey, version);
                    } catch(e) {}
                } else {
                    cache.$$clean();
                    try {
                        localStorage.setItem(vkey, version);
                    } catch(e) {}
                }
                if (typeof(appversion.cache) !== 'undefined' && !appversion.cache) return false;
                cache.$$prefix = 'cache!';
                cache.$$init();
                return true;
            })();
    require(['json!lib/system/etc/kernel.json'], function(config) {
        config = config.depends;
        var kernelModules = Object.keys(config.shim);
        ['baseUrl', 'shim', 'waitSeconds'].forEach(function(v) {
            if (typeof(config[v]) === 'undefined') {
                config[v] = environment[v];
            } else {
                Object.keys(environment[v]).forEach( function(subv) {
                    config[v][subv] = environment[v][subv];
                });
            }
            delete environment[v];
        });
        requirejs.config(config);
        require(kernelModules, function() {      
            define('application', {
                "uefi": environment.uefi,
                "$$config": function() {
                    slice.apply(arguments).forEach(function(v) {
                        angular.merge(config, v);
                    });
                    requirejs.config(config);
                },
                "$$baseUrl" : function() {
                    return config.baseUrl;
                },
                "$$cacheUrl": function(url) {
                    if (!cached || !url) return url;
                    var idx = url.lastIndexOf(cache.$$prefix);
                    if (idx === -1) return cache.$$prefix + url;
                    return url;
                }
            });
            requirejs.undef('environment');
            uefi.progress('Init', 'loading');
            require(["lib/system/init"], function() {
                uefi.progress('Init', 'ready');
            });
    });
    });
});