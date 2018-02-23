define(['require', 'exports', 'application'], function(require, exports, application) {
    var module = exports.module = angular.module('system.dynamic', ['system.http', 'gui.language']),
        uefi = application.uefi,
        slice = Array.prototype.slice;
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
            uefi.progress("Application", "load dynamic module > " + next.extras.path);
            var langJson = next.language[$rootScope.language.getLocale()];
            require([next.script, langJson], function(exports, language) {
                uefi.progress("Application", "setup module > " + next.extras.path);
                $injector.loadNewModules([exports.module.name]);
                $rootScope.language.loadLanguage([[langJson, language]]);
                argv[0] = "$locationChangeSuccess";
                next.ready = true;
                next.inProgress = false;
                $location.path(next.extras.path);
                $broadcast.apply($rootScope, argv);
            });
        });
    }]);
});