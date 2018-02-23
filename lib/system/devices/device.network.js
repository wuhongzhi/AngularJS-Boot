define(['require', 'module', 'lib/system/devices/virtual/device.error'], function(require, module, report) {
    module.exports = function(options, success, error) {
        options = options || {};
        switch (options.action) {
            case 'check':
                return success(navigator.connection.type 
                    || navigator.connection.effectiveType 
                    || 'unknown');
            default:
                report('network')(options.action);
        }
    };
    angular.extend(module.exports, {
        device: 'network',
        supports: ['check']
    });
});