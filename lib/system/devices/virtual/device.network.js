define(['require', 'module', 'lib/system/devices/virtual/device.error'], function(require, module, report) {
    module.exports = function(options, success, error) {
        options = options || {};
        switch (options.action) {
            case 'check':
                return success('ethernet');
            default:
                report('network')(options.action);
        }
    };
    angular.extend(module.exports, {
        device: 'network',
        supports: ['check']
    });
});