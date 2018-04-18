define(['require', 'exports', 'application'], function(require, exports, application) {
    var module = exports.module = angular.module('system.dynamic', ['system.http', 'gui.language']),
        dependModules = application.dependModules,
        slice = Array.prototype.slice,
        uefi = application.uefi;
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
            var depends = dependModules(next, []).map(function(route) {return route.script;});
            require(depends.concat([next.script, langJson]), function() {
                var argv = slice.apply(arguments),
                    language = argv.pop();
                argv = argv.map(function(exports) {
                    uefi.progress("Application", "setup module > " + exports.module.name);
                    return exports.module.name;
                });
                uefi.progress("Application", "setup module > " + next.extras.path);
                $injector.loadNewModules(argv);
                $rootScope.language.loadLanguage([[langJson, language]]);
                argv[0] = "$locationChangeSuccess";
                next.ready = true;
                next.inProgress = false;
                next.extras.dynamic = false;
                $location.path(next.extras.path);
                $broadcast.apply($rootScope, argv);
            });
        });
    }]);
});