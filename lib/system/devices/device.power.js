define(['require', 'module', 'lib/system/devices/virtual/device.error', 'application'], 
    function(require, module, report, application) {
    var native = application.uefi.native;
    var gui = native.desktop || native.mobile;
    module.exports = function(options, success, error) {
        options = options || {};
        switch (options.action) {
            case 'shutdown':
                return gui.quit && gui.quit();
            default:
                report('power')(options.action);
        }
    };
    angular.extend(module.exports, {
        device: 'power',
        supports: ['shutdown']
    });
});