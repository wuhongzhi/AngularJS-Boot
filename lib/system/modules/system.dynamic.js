define(['require', 'exports', 'application'], function(require, exports, application) {
    var module = exports.module = angular.module('system.dynamic', ['system.http', 'gui.language']),
        slice = Array.prototype.slice,
        uefi = application.uefi,
        components = application.components;
    module.config(function() {
        uefi.progress("Application", "setup system.dynamics");
    }).run(['$rootScope', '$location', '$route', '$injector', 
        function($rootScope, $location, $route, $injector) {
        var $broadcast = $rootScope.$broadcast;
        $rootScope.$on("$locationChangeStart", function(event) {
            var next = $route.routes[$location.path()];
            if (!next || !!next.ready || !!next.inProgress || event.defaultPrevented) return;
            next.inProgress = true;
            event.preventDefault();
            var argv = slice.apply(arguments);
            var langJson = next.language[$rootScope.language.getLocale()];
            uefi.progress("Application", "load dynamic module > " + next.extras.path);
            var depends = {scripts: [], components: []};
            resolve_depends(next.extras.deps);
            require(depends.scripts.concat([next.script, langJson]), function() {
                var exports = slice.apply(arguments),
                    language = exports.pop();
                exports = exports.map(function(exports) {
                    uefi.progress("Application", "setup module > " + exports.module.name);
                    return exports.module.name;
                });
                uefi.progress("Application", "setup module > " + next.extras.path);
                $injector.loadNewModules(exports);
                $rootScope.language.loadLanguage([[langJson, language]]);
                argv[0] = "$locationChangeSuccess";
                depends.components.forEach(function(component) {
                    component.extras.dynamic = false;
                });
                next.ready = true;
                next.inProgress = false;
                $location.path(next.extras.path);
                $broadcast.apply($rootScope, argv);
            });
            function resolve_depends(deps) {
                deps.forEach(function(path) {
                    var r = components.find(function(component) {
                        return (component.extras.path === path) && component.extras.dynamic;
                    });
                    if (r) {
                        uefi.progress("Application", "load dynamic module > " + path);
                        depends.scripts.push(r.script);
                        depends.components.push(r);
                        resolve_depends(r.extras.deps);
                    }
                })
            }
        });
    }]);
});