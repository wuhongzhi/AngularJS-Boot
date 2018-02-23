define(['require', 'module', 'lib/system/devices/virtual/device.error'], function(require, module, report) {
    module.exports = function(options, success, error) {
        options = options || {};
        switch (options.action) {
            case 'shutdown':
                return window.navigator.app.exitApp();
            default:
                report('power')(options.action);
        }
    };
    angular.extend(module.exports, {
        device: 'power',
        supports: ['shutdown']
    });
});