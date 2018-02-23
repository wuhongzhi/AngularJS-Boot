define(['require', 'exports', 'application', 'cache'], function(require, exports, application, cache) {
    var module = exports.module = angular.module('system.cache', ['ng']),
        uefi = application.uefi,
        cached = application.$$cacheUrl('/test') !== '/test';
    module.config(['$provide', function($provide) {
        uefi.progress("Application", "setup system.cache");
        if (!cached) return;
        $provide.decorator('$templateRequest', ['$delegate', '$templateCache', '$sce', '$q', '$timeout',
            function($delegate, $templateCache, $sce, $q, $timeout) {
                return function(tpl, ignoreRequestError) {
                    var deferred = $q.defer(),
                        data = $templateCache.get(tpl);
                    if (data) {
                        $timeout(function() {
                            deferred.resolve(data);
                        });
                    } else {
                        $delegate.totalPendingRequests++;
                        require([cache.$$prefix + $sce.getTrustedResourceUrl(tpl)], function(data) {
                            $delegate.totalPendingRequests--;
                            $templateCache.put(tpl, data);
                            deferred.resolve(data);
                        }, function(err) {
                            $delegate.totalPendingRequests--;
                            if (ignoreRequestError) {
                                deferred.resolve('');
                            } else {
                                deferred.reject(err);
                            }
                        });
                    }
                    return deferred.promise;
                }
            }
        ]);
    }]);
});