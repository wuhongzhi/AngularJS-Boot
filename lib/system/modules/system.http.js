define(['require', 'exports', 'application'], function(require, exports, application) {
    var module = exports.module = angular.module('system.http', ['ng', 'ngResource']),
        httpConfig = {xsrfHeaderName: 'X-XSRF-TOKEN'},
        slice = Array.prototype.slice,
        uefi = application.uefi,
        embbed = uefi.native.desktop || uefi.native.mobile,
        prefix = embbed ? getBaseUrl() : application.$$baseUrl(),
        xtoken = null;
    if (!prefix.endsWith('/')) prefix += '/';
    prefix += application.services || "api/";
    delete application.services;
    module.config(['$provide', '$httpProvider', function ($provide, $httpProvider) {
        uefi.progress("Application", "setup system.http");
        $provide.decorator("$resource", ['$delegate', function($delegate) {
            return function() {
                var argv = slice.apply(arguments);
                if (argv.length && !/^device:\/\//.test(argv[0])) {
                    argv[0] = prefix + argv[0];
                    var actions = {
                        "read"   : {method: "GET", isArray: true},
                        "create" : {method: "POST"},
                        "delete" : {method: "DELETE"},
                        "modify" : {method: "PUT"},
                        "confirm": {method: "PUT"},
                        "verify" : {method: "PUT"},
                        "reject" : {method: "PUT"}
                    }
                    argv[2] = argv[2] || {};
                    for (var key in actions) {
                        argv[2][key] = actions[key];
                    }
                }
                return $delegate.apply($delegate, argv);
            }
        }]);
        httpConfig = $httpProvider.defaults;
        $httpProvider.interceptors.push(["$q", "httpService", "$injector",
            function($q, httpService, $injector) {
            var authenticationService = null;
            return {
                'request': function(config) {
                    config.headers['X-Requested-By'] = 'XRich-Client';
                    if (xtoken && config.url.startsWith(prefix)) {
                        config.headers[httpConfig.xsrfHeaderName] = xtoken;
                    }
                    return config;
                },
                'responseError': function(response) {
                    if (response.status === 401) {
                        authenticationService = authenticationService || $injector.get('authenticationService');
                        authenticationService.deauthenticate();
                    }
                    return $q.reject(response);
                }
            };
        }]);        
    }]).service('httpService', function() {
        return {
            setXSRFToken: function(token) {
                xtoken = token;
                if (Modernizr.localstorage) {
                    if (token) {
                        localStorage.setItem(httpConfig.xsrfHeaderName, token);
                    } else {
                        localStorage.removeItem(httpConfig.xsrfHeaderName);
                    }
                }
            },
            getXSRFToken: function() {
                if (xtoken) return xtoken;
                if (Modernizr.localstorage) {
                    return localStorage.getItem(httpConfig.xsrfHeaderName);
                }
            }
        }
    });
    function getBaseUrl() {
        if (uefi.native.desktop) {
            var etc = uefi.native.desktop.etc;
            if (etc && etc.baseUrl) return etc.baseUrl;
        }
        if (/https?:/.test(location.protocol)) return location.pathname;
        var rpc = document.querySelector('meta[http-equiv="Content-Rest-Service"]');
        if (rpc) return rpc.content;
        throw new Error('No RPC meta in declaring');
    }
});
