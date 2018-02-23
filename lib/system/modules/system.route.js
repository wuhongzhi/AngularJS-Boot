define(['require', 'exports', 'application'], function(require, exports, application) {
    var isUndefined = angular.isUndefined,
    	forEach = angular.forEach,
        uefi = application.uefi,
    	module = exports.module = angular.module('system.route', ['ngRoute']);
    module.config(['$routeProvider', '$locationProvider', function($route, $location) {
        uefi.progress("Application", "setup system.routes");
        forEach(application.routes, function(route) {
            $route.when(route.extras.path, route);
            uefi.progress("Application", "setup route > " + route.extras.path);
        });
        $route.otherwise({ redirectTo: application.index });
        $location.hashPrefix('!').html5Mode(Modernizr.history && !!application.html5);
        delete application.html5;
    }]);
});