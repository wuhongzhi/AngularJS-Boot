define(['require', 'exports', 'application'], function(require, exports, application) {
    var module = angular.module('system.immutable', ['ng']),
        uefi = application.uefi;
    module.config(['$provide', function($provide) {
		uefi.progress("Application", "setup system.immutable");
	}]);
    angular.extend(exports, {
        name: module.name,
        module: function(resolved) {
            require(['lib/immutable/immutable'], function(immutable) {
            	module.constant('immutableService', immutable);
                resolved(module);
            });
        }
    });

});