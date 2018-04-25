define(['require', 'exports', 'application', 'json!lib/system/modules/gui.theme.json'], 
    function(require, exports, application, config) {
    var uefi = application.uefi;
    application.$$config(config.depends);
    var theme = config.themes[application.theme],
        modules = [].concat(theme.modules), 
        depends = ['ngSanitize', 'ngMessages'].concat(theme.depends);
    if (!!theme.flex) {
        if (!(Modernizr.flexbox || Modernizr.flexboxlegacy || Modernizr.flexboxtweener)) {
            return alert('Your browser was not supported right now!');
        }
    }
    var module = angular.module("gui.theme", depends);
    angular.extend(exports, {
        name: module.name,
        module: function(resolved) {
            require(modules, function() {
                resolved(module);
            })
        }
    });
    if (depends.includes('ngTouch')) {
        module.config(['$touchProvider', function($touchProvider) {
            $touchProvider.ngClickOverrideEnabled(!!uefi.native.mobile);
        }]);
    }
    delete application.theme;
    module.run(['$rootScope', '$timeout', '$window', 'securityService', 
        function ($scope, $timeout, $window, securityService) {
        uefi.progress("Application", "setup gui.theme");
        var native = uefi.native; 
        if (!native.desktop) return;
        var gui = native.desktop.gui, 
            manifest = gui.App.manifest.window;
        gui.Screen.Init();
        $scope.$on(securityService.ENFORCED, function() {
            resize(0, 0);
        });
        $scope.$on(securityService.UNSECURED, function() {
            resize(manifest.width, manifest.height);
        });
        function resize(w, h) {
            var display = manifest.screen || 0
            var area = gui.Screen.screens[display].work_area;
            if (w > 0 && h > 0) {
                w = Math.min(w, area.width);
                h = Math.min(h, area.height);
                var l = (area.width - w) / 2;
                var t = (area.height - h) / 2;
                $window.moveTo(l, t);
                $window.resizeTo(w, h);
            } else {
                $window.moveTo(0, 0);
                $window.resizeTo(area.width, area.height);
            }
        }
    }])
});
