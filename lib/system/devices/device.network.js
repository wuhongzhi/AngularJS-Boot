define(['require', 'module', 'lib/system/devices/virtual/device.error'], function(require, module, report) {
    module.exports = function(options, success, error) {
        options = options || {};
        switch (options.action) {
            case 'check':
                success(navigator.connection.type 
                    || navigator.connection.effectiveType 
                    || 'unknown');
                break;
            default:
                report('network')(options.action);
                (error || angular.noop)();
        }
    };
    angular.extend(module.exports, {
        device: 'network',
        supports: ['check']
    });
});