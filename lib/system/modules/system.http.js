define(['require', 'exports', 'application'], function(require, exports, application) {
    var module = exports.module = angular.module('system.http', ['ng', 'ngResource']),
        httpConfig = {xsrfHeaderName: 'X-XSRF-TOKEN'},
        slice = Array.prototype.slice,
        uefi = application.uefi,
        embbed = uefi.native.desktop || uefi.native.mobile,
        prefix = embbed ? getBaseUrl() : application.$$baseUrl(),
        xtoken = null;
    if (!prefix.endsWith('/')) prefix += '/';
    prefix += application.services || "rest/";
    delete application.services;
    module.config(['$provide', '$httpProvider', function ($provide, $httpProvider) {
        uefi.progress("Application", "setup system.http");
        $provide.decorator("$resource", ['$delegate', function($delegate) {
            return function() {
                var argv = slice.apply(arguments);
                if (argv.length && !/^device:\/\//.test(argv[0])) {
                    argv[0] = prefix + argv[0];
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
                    return response;
                }
            };
        }]);        
    }]).service('httpService', function() {
        return {
            setXSRFToken: function(token) {
                xtoken = token;
            }
        }
    });
    function getBaseUrl() {
        if (/https?:/.test(location.protocol)) return location.pathname;
        var rpc = document.querySelector('meta[http-equiv="Content-Rest-Service"]');
        if (rpc) return rpc.content;
        throw new Error('No RPC meta in declaring');
    }
});
