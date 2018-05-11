define(['require', 'exports', 'application', 'crypto'], function(require, exports, application, crypto) {
    var module = exports.module = angular.module('system.crypto', ['ng']),
        uefi = application.uefi;
    module.config(['$provide', function($provide) {
        uefi.progress("Application", "setup system.crypto");
    }]).service('cryptoService', function() {
        return crypto;
    });
});