define(['environment', 'version', 'json!lib/system/etc/kernel.json'], function init(environment, appversion, config) {
    'use strict'
    config = config.depends;
    var uefi = environment.uefi,
        slice = Array.prototype.slice,
        kernelModules = Object.keys(config.shim);
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
    requirejs(['cache'].concat(kernelModules), function(cache) {
        var vkey = 'system.version',
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
                var $rootElement = angular.element(document);
                var $headElement = $rootElement.find('head');
                var $rootScope = $rootElement.data();
                angular.extend(cache, {
                    $$prefix: 'cache!',
                    $$apply : function(expr) {
                        var $scope = $rootScope.$scope || $rootScope.$injector && $rootScope.$injector.get('$rootScope');
                        if ($scope) {
                            $scope.$applyAsync(expr);
                        }
                    },
                    $$style: function(style) {
                        $headElement.append('<style>' + style + '</style>');
                    }
                });
                cache.$$init();
                return true;
            })();        
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
        requirejs(["lib/system/init"], function() {
            uefi.progress('Init', 'ready');
        });
    });
});