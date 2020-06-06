define(['require', 'exports', 'application'], function(require, exports, application) {
    var module = exports.module = angular.module('system.security', ['ng', 'ngResource', 'system.http']),
        httpConfig = {xsrfCookieName : 'XSRF-TOKEN'},
        permissions = {},
        oldv = null,
        uefi = application.uefi,
        routes = application.routes;
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
        var self;
        return self = {
            authenticate: function(username, password, error) {
                var newv = {username: username, password: password};
                if (angular.equals(oldv, newv)) return;
                $resource("authentication")
                    .create(newv, function(data) {
                        confirmed(data, newv);
                    }, function(err) {
                        self.deauthenticate();
                        if (angular.isFunction(error)) {
                            error(err);
                        }
                    });
            },
            deauthenticate: function() {
                if (oldv == null) return;
                $resource("authentication")
                    .delete(function() {
                        oldv = null;
                        permissions = {};
                        httpService.setXSRFToken(null);
                        $rootScope.$broadcast(securityService.UNSECURED);
                    });
            },
            confirm: function(token) {
                var newv = {confirm: token};
                $resource("authentication")
                    .modify(newv, function(data) {
                        confirmed(data, newv);
                    }, self.deauthenticate);
            }
        }
        function confirmed(data, newv) {
            oldv = newv;
            permissions = {};
            var menus = [];
            angular.forEach(data['permissions'] || [], function(perm) {
                if (perm.rights.length) {
                    permissions[perm.module] = perm.rights;
                }
            });
            angular.forEach(data['permissions'] || [], function(perm) {
                if (securityService.canRead(perm.module, securityService.ACL.READ)) {
                    menus.push(perm.module);
                }
            });
            httpService.setXSRFToken(data['xsrfToken']);
            $rootScope.$broadcast(securityService.ENFORCED, menus, data['user'] || {});
        }
    }]).provider('securityService', [function() {
        var isUndefined = angular.isUndefined, 
            defacl = {CREATE: 'C', READ: 'R', MODIFY: 'U', DELETE: 'D'};
        this.acl = function(newacl) {
            if (isUndefined(newacl)) return defacl;
            defacl = newacl;
        };
        this.$get = ['$route', function($route) {
            var self;
            return self = {
                ACL: defacl,
                ENFORCED : 'security.enforced',
                UNSECURED : 'security.unsecured',
                hasPermission: function(uri, action) {
                    var route = routes.filter(function(route) {
                        return route.extras.path === uri;
                    }); 
                    if (route.length < 1) return false;
                    if (isUndefined(uri)) return false;
                    var rights = permissions[uri];
                    if (isUndefined(rights)) return false;      
                    if (isUndefined(action)) return rights.length > 0;
                    return rights.indexOf(action) != -1;
                },
                canCreate: function(uri) {
                    uri = uri || $route.current && $route.current.$$route.extras.path;
                    return self.hasPermission(uri, self.ACL.CREATE);
                },
                canRead: function(uri) {
                    uri = uri || $route.current && $route.current.$$route.extras.path;
                    return self.hasPermission(uri, self.ACL.READ);
                },
                canModify: function(uri) {
                    uri = uri || $route.current && $route.current.$$route.extras.path;
                    return self.hasPermission(uri, self.ACL.MODIFY);
                },
                canDelete: function(uri) {
                    uri = uri || $route.current && $route.current.$$route.extras.path;
                    return self.hasPermission(uri, self.ACL.DELETE);
                },
                canChange: function(uri) {
                    uri = uri || $route.current && $route.current.$$route.extras.path;
                    return self.canCreate(uri) || self.canModify(uri) || self.canDelete(uri);
                }
            }
        }];
    }]);
});
