define(['require', 'module', 'lib/system/devices/virtual/device.error', 'application'], function(require, module, report, application) {
    var gui = application.uefi.native.mobile.gui;
    module.exports = function(options, success, error) {
        options = options || {};
        switch (options.action) {
            case 'scan':
                gui.plugins.barcodeScanner.scan(success, error);
                break;
            default:
                report('scanner')();
        }
    };
    angular.extend(module.exports, {
        device: 'scanner',
        supports: ['scan']
    });
});