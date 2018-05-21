define(['require', 'exports', 'application'], function(require, exports, application) {
    var module = angular.module('system.rxjs', ['ng']),
        uefi = application.uefi;
    module.config(['$provide', function($provide) {
		uefi.progress("Application", "setup system.rxjs");
	}]);
    angular.extend(exports, {
        name: module.name,
        module: function(resolved) {
            require(['lib/rxjs/rxjs.umd'], function(rxjs) {
            	module.constant('rxjsService', rxjs);
                resolved(module);
            });
        }
    });

});