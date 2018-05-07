define(['require', 'exports', 'application'], function(require, exports, application) {
    var module = exports.module = angular.module('system.security', ['ng', 'ngResource', 'system.http']),
        httpConfig = {xsrfCookieName : 'XSRF-TOKEN'},
        permissions = {},
        oldv = null,
        uefi = application.uefi;
    module.config(['$compileProvider', '$httpProvider', function($compileProvider, $httpProvider) {
        uefi.progress("Application", "setup system.security");
        httpConfig = angular.merge(httpConfig, $httpProvider.defaults);
        if (uefi.prodMode) {
            $compileProvider.debugInfoEnabled(false);
            angular.reloadWithDebugInfo = angular.noop;
        }
        delete window.jQuery;
        delete window.$;
    }]).run(['$rootScope', 'securityService', function ($rootScope, security) {
        $rootScope.security = security;
        $rootScope.$on("$routeChangeStart", function(event, next, current) {
            var route = next.$$route;
            if (route && route.extras.safe) return;
            if (!route || !security.canRead(route.originalPath)) {
                event.preventDefault();
            }
        });
    }]).factory('authenticationService', ['$resource', '$rootScope', 'httpService', 'securityService',
        function($resource, $rootScope, httpService, securityService) {
        var authIdentify = $resource("authenticate", null, {'authenticate': { method: 'POST' }}),
            authConfirm = $resource("authenticate/confirm", null, {'confirm': { method: 'POST' }}),
            deauthIdentify = $resource("authenticate/cancel", null, {'cancel': { method: 'POST' }}),
            self;
        return self = {
            authenticate: function(user, password) {
                var newv = {user: user, password: password};
                if (angular.equals(oldv, newv)) return;
                authIdentify.authenticate(newv, function(data) {
                    confirmed(data, newv);
                }, self.deauthenticate);
            },
            deauthenticate: function() {
                if (oldv == null) return;
                deauthIdentify.cancel({}, function() {
                    oldv = null;
                    permissions = {};
                    httpService.setXSRFToken(null);
                    $rootScope.$broadcast(securityService.UNSECURED);
                });
            },
            confirm: function(token) {
                var newv = {confirm: token};
                authConfirm.confirm(newv, function(data) {
                    confirmed(data, newv);
                }, self.deauthenticate);
            }
        }
        function confirmed(data, newv) {
            oldv = newv;
            permissions = angular.extend({}, data.permissions || {});
            httpService.setXSRFToken(data[httpConfig.xsrfCookieName]);
            $rootScope.$broadcast(securityService.ENFORCED);
        }
    }]).provider('securityService', [function() {
        var isUndefined = angular.isUndefined, 
            defacl = {CREATE: 'C', READ: 'R', MODIFY: 'U', DELETE: 'D'};
        this.acl = function(newacl) {
            if (isUndefined(newacl)) return defacl;
            defacl = newacl;
        };
        this.$get = function() {
            var self;
            return self = {
                ACL: defacl,
                ENFORCED : 'security.enforced',
                UNSECURED : 'security.unsecured',
                hasPermission: function(uri, action) {
                    if (isUndefined(uri)) return false;
                    var rights = permissions[uri];
                    if (isUndefined(rights)) return false;      
                    if (isUndefined(action)) return rights.length > 0;
                    return rights.indexOf(action.toUpperCase()) != -1;
                },
                canCreate: function(uri) {
                    return self.hasPermission(uri, self.ACL.CREATE);
                },
                canRead: function(uri) {
                    return self.hasPermission(uri, self.ACL.READ);
                },
                canModify: function(uri) {
                    return self.hasPermission(uri, self.ACL.MODIFY);
                },
                canDelete: function(uri) {
                    return self.hasPermission(uri, self.ACL.DELETE);
                }
            }            
        }
    }]);
});