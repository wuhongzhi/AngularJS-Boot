define(['require', 'exports', 'application'], function(require, exports, application) {
    var module = exports.module = angular.module('system.security', ['ng', 'ngResource', 'system.http']),
        httpConfig = {xsrfHeaderName: 'X-XSRF-TOKEN'},
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
            if (!route || !security.hasPermission(route.originalPath)) {
                event.preventDefault();
            }
        });
    }]).factory('authenticationService', ['$resource', '$rootScope', '$route',
        'httpService', 'securityService',
        function($resource, $rootScope, $route, httpService, securityService) {
        var self;
        return self = {
            authenticate: function(username, password, error) {
                var newv = {username: username, password: password};
                if (angular.equals(oldv, newv)) return;
                $resource("authentication")
                    .create(newv, function(data) {
                        confirmed(data, newv);
                    }, function(err) {
                        reset();
                        if (angular.isFunction(error)) {
                            error(err);
                        }
                    });
            },
            deauthenticate: function() {
                if (oldv == null) return;
                oldv = null;
                permissions = {};
                $resource("authentication")
                    .delete(reset, reset);
            },
            confirm: function(success, error) {
                var token = httpService.getXSRFToken();
                if (!token) {
                    if (angular.isFunction(error)) {
                        error();
                    };
                    return;
                }
                var newv = {confirm: token};
                $resource("authentication/confirm/:token", {token: token})
                    .read(function(data) {
                        confirmed(data[0], newv);
                        if (angular.isFunction(success)) {
                            success();
                        }
                    }, function() {
                        if (angular.isFunction(error)) {
                            if (!error()) {
                                reset();        
                            }
                        } else {
                            reset();
                        }
                    });
            },
            keepalive: function(success, error) {
                if (oldv == null) return;
                $resource("authentication/keepalive")
                    .read(function() {
                        if (angular.isFunction(success)) {
                            success();
                        }
                    }, function(err) {
                        if (angular.isFunction(error)) {
                            if (!error()) {
                                reset();
                            }
                        } else {
                            reset();
                        }
                    });
            }
        }
        function reset() {
            oldv = null;
            permissions = {};
            httpService.setXSRFToken(null);
            $rootScope.$broadcast(securityService.UNSECURED);                    
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
                if (securityService.hasPermission(perm.module)) {
                    menus.push(perm.module);
                }
            });
            httpService.setXSRFToken(data[httpConfig.xsrfHeaderName]);
            var actions = data['actions'];
            if (actions) {
                httpService.setJaxRSActs(actions);
                var canChangeDetect = [];
                angular.forEach(actions, function(value) {
                    var func = value['function'].toUpperCase(),
                        method = value['method'];
                    securityService.ACL[func] = value.rights;
                    method = 'can' + func[0] + func.substring(1).toLowerCase();
                    func = securityService[method] = function(uri) {
                        uri = uri || $route.current && $route.current.$$route.extras.path;
                        return securityService.hasPermission(uri, value.rights);
                    };
                    if (value.change) {
                        canChangeDetect.push(func);
                    }
                });
                if (canChangeDetect.length) {
                    securityService.canChange = function(uri) {
                        uri = uri || $route.current && $route.current.$$route.extras.path;
                        for (var i = 0, ii = canChangeDetect.length; i < ii; i++) {
                            if (canChangeDetect[i](uri)) {
                                return true;
                            }
                        }
                        return false;
                    };
                }
            }
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
                    return self.canCreate(uri) 
                        || self.canModify(uri) 
                        || self.canDelete(uri);
                }
            }
        }];
    }]);
});
