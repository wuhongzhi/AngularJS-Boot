define(['require', 'exports', 'application'], function(require, exports, application) {
    var module = angular.module('gui.qrcode', ['ng']),
        uefi = application.uefi;
    module.config(['$provide', function($provide) {
        uefi.progress("Application", "setup gui.qrcode");
    }]);
    angular.extend(exports, {
        name: module.name,
        module: function(resolved) {
            require(['lib/system/modules/gui.qrcode.drawer', 'lib/qrcode/qrcode'], function(drawer, qrcode) {
                module.directive('ngQrcode', function() {
                    return drawer.ngQrcode(function(model, options) {
                        return new qrcode(model.data, [options.errorCorrectionLevel]).getData();
                    });
                });
                resolved(module);
            });
        }
    });
});