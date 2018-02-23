define(['environment', 'version'], function init(environment, appversion) {
    'use strict'
    var uefi = environment.uefi,
        slice = Array.prototype.slice,
        config = {
            paths: {
                "jquery": "lib/jquery/jquery.slim",
                "angular": "lib/angular.js/angular",
                "angular-animate": "lib/angular.js/angular-animate",
                "angular-aria": "lib/angular.js/angular-aria",
                "angular-cookies": "lib/angular.js/angular-cookies",
                "angular-messages": "lib/angular.js/angular-messages",
                "angular-resource": "lib/angular.js/angular-resource",
                "angular-sanitize": "lib/angular.js/angular-sanitize",
                "cache": "lib/require-plugins/cache",
                "text": "lib/require-plugins/text",
                "json": "lib/require-plugins/json",
                "style": "lib/require-plugins/css"
            },
            shim: {
                "angular": ['jquery'],
                "angular-animate": ['angular'],
                "angular-aria": ['angular'],
                "angular-cookies": ['angular'],
                "angular-messages": ['angular'],
                "angular-resource": ['angular'],
                "angular-sanitize": ['angular']
            }
        };
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
    requirejs(['cache', 'angular-animate', 'angular-aria', 'angular-messages', 'angular-cookies', 'angular-resource', 'angular-sanitize'], function(cache) {
        var cached = Modernizr.localstorage
            && uefi.prodMode
            && (function() {
                var apv = localStorage.getItem('system.version'),
                    version = appversion.version || "1.0.0";
                if (!apv || apv === version) {
                    try {
                        if (!apv) localStorage.setItem('system.version', version);
                    } catch(e) {}
                } else {
                    cache.$$clean();
                    try {
                        localStorage.setItem('system.version', version);
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