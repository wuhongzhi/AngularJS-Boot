define(['require', 'module', 'lib/system/devices/virtual/device.error', 'application'], 
    function(require, module, report, application) {
    var native = application.uefi.native;
    var gui = native.desktop || native.mobile;
    module.exports = function(options, success, error) {
        options = options || {};
        switch (options.action) {
            case 'shutdown':
                var quit = gui.quit || navigator.app && navigator.app.exitApp;
                if (angular.isFunction(quit)) {
                    success(quit());
                } else {
                    error();
                }
            default:
                report('power')(options.action);
                (error || angular.noop)();
        }
    };
    angular.extend(module.exports, {
        device: 'power',
        supports: ['shutdown']
    });
});