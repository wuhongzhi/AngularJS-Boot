define(['require', 'exports', 'application'], function(require, exports, application) {
    var module = exports.module = angular.module('system.dynamic', ['system.http', 'gui.language']),
        dependModules = application.dependModules,
        slice = Array.prototype.slice,
        uefi = application.uefi;
    module.config(function() {
        uefi.progress("Application", "setup system.dynamics");
    }).run(['$rootScope', '$location', '$route', '$injector', 'languageService',
        function($rootScope, $location, $route, $injector, languageService) {
        $rootScope.$on("$locationChangeStart", function(event) {
            var next = $route.routes[$location.path()];
            if (!next || !!next.ready || !!next.inProgress || event.defaultPrevented) return;
            next.inProgress = true;
            event.preventDefault();
            var argv = slice.apply(arguments);
            var langJson = next.language[languageService.getLocale()];
            uefi.progress("Application", "load dynamic module > " + next.extras.path);
            var depends = dependModules(next, []).map(function(route) {return route.script;});
            require(depends.concat([next.script, langJson]), function() {
                var argv = slice.apply(arguments),
                    language = langJson && argv.pop(),
                    pending = [];
                argv = argv.filter(function(exports) {
                    if (angular.isFunction(exports.module)) {
                        pending.push(exports);
                    } else {
                        return angular.isUndefined($injector.modules[exports.name]);
                    }
                }).map(function(exports) {
                    return exports.module;
                });
                if (pending.length) {
                    var rest = pending.length;
                    pending.forEach(function(exports) {
                        exports.module(function() {
                            argv = argv.concat(slice.apply(arguments));
                            if (--rest < 1) {
                                resolved(argv);
                            }
                        });
                    });
                } else if (argv.length) {
                    resolved(argv);
                }
                function resolved(modules) {
                    uefi.progress("Application", "setup dynamic module > " + next.extras.path);
                    modules = modules.map(function(exports) {
                        uefi.progress("Application", "setup module > " + exports.name);
                        return exports.name;
                    });
                    $injector.loadNewModules(modules);
                    if (langJson) {
                        languageService.loadLanguage([[langJson, language]]);
                    }
                    next.ready = true;
                    next.inProgress = false;
                    next.extras.dynamic = false;
                    $location.path(next.extras.path);
                    $rootScope.$broadcast("$locationChangeSuccess");
                }
            });
        });
    }]);
});