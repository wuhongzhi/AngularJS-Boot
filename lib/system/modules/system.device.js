define(['require', 'exports', 'application', 'json!lib/system/devices/configuration.json'], function(require, exports, application, config) {
    var module = angular.module('system.devices', ['ng']),
        slice = Array.prototype.slice,
        uefi = application.uefi,
        devices = {}, 
        device = getDeviceInfo();
    angular.extend(exports, {
        name: module.name,
        module: function(resolved) {
            var type = device.mobile ? 'mobile' : device.desktop ? 'desktop' : 'browser';
            require(config.depends[type], function() {
                slice.apply(arguments).forEach(function(dev) {
                    devices[dev.device] = dev;
                });
                resolved(module);
            });
        }
    });
    module.run(['$rootScope', function($rootScope) {
        $rootScope.device = angular.extend(device, {
            support: function(device, func) {
                if (!device && !func) return false;
                if (!device) return false;
                device = devices[device];
                if (!device) return false;
                return func ? device.supports.indexOf(func) !== -1 : true;
            }
        });
    }]).config(['$provide', function($provide) {
        uefi.progress("Application", "setup system.devices");
        $provide.decorator("$http", ['$delegate', '$q', '$timeout', function($delegate, $q, $timeout) {
            createShortMethods('get', 'delete', 'head', 'jsonp');
            createShortMethodsWithData('post', 'put', 'patch');
            return deviceFilter;

            function deviceFilter() {
                var config = null,
                    arg0 = arguments[0];
                if (angular.isObject(arg0) && arg0.url &&
                    (config = /^device:\/\/(\w+)\??(.*)$/.exec(arg0.url))) {
                    var device = config[1],
                        deferred = $q.defer(),
                        params = arg0.params || {},
                        result = {
                            xhrStatus: 'complete',
                            statusText: 'complete',
                            config: arg0,
                            headers: {
                                "Content-Type": "application/json;charset=utf-8"
                            }
                        };
                    $timeout(function() {
                        try {
                            device = devices[device];
                            if (angular.isFunction(device)) {
                                device.call(device, params, resolve, reject);
                            } else {
                                reject("No such device `" + config[1] + "`");
                            }
                        } catch (e) {
                            reject(e.message);
                        }
                    });
                    return deferred.promise;

                    function reject(message) {
                        deferred.reject(angular.extend({ status: 501, message: message }, result));
                    }

                    function resolve(data) {
                        deferred.resolve(angular.extend({ status: 200, data: data }, result));
                    }
                }
                return $delegate.apply($delegate, arguments);
            }

            function createShortMethods(names) {
                angular.forEach(arguments, function(name) {
                    deviceFilter[name] = function(url, config) {
                        return deviceFilter(angular.extend({}, config || {}, {
                            method: name,
                            url: url
                        }));
                    };
                });
            }

            function createShortMethodsWithData(name) {
                angular.forEach(arguments, function(name) {
                    deviceFilter[name] = function(url, data, config) {
                        return deviceFilter(angular.extend({}, config || {}, {
                            method: name,
                            url: url,
                            data: data
                        }));
                    };
                });
            }
        }]);
    }]);
    function getDeviceInfo() {
        var native = uefi.native;
        if (native.mobile) {
            var gui = native.mobile.gui;
            return {
                mobile: true,
                desktop: false,
                version: native.mobile.version
            }
        } else {
            var hostUrl = window.location.href;
            var desktop = native.desktop || { version: { major: -1, minor: -1 } };
            return {
                mobile: false,
                desktop: !!native.desktop,
                version: desktop.version
            }
        }
    }
});