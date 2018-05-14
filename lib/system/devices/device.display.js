define(['require', 'module', 'lib/system/devices/virtual/device.error', 'application'], function(require, module, report, application) {
    var gui = application.uefi.native.desktop.gui, 
        manifest = gui.App.manifest.window,
        display = manifest.screen || 0,
        area = gui.Screen.screens[display].work_area;
    gui.Screen.Init();
    module.exports = function(options, success, error) {
        options = options || {};
        switch (options.action) {
            case 'resize':
                var w = options.dimension.width,
                    h = options.dimension.height;
                if (w === -1) w = manifest.width;
                if (h === -1) h = manifest.height
                if (w > 0 && h > 0) {
                    w = Math.min(w, area.width);
                    h = Math.min(h, area.height);
                    var l = (area.width - w) / 2;
                    var t = (area.height - h) / 2;
                    window.moveTo(l, t);
                    window.resizeTo(w, h);
                } else {
                    window.moveTo(0, 0);
                    window.resizeTo(area.width, area.height);
                }
                break;
            default:
                report('display')();
        }
    };
    angular.extend(module.exports, {
        device: 'display',
        supports: ['resize']
    });
});