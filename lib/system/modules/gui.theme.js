define(['require', 'exports', 'application'], function(require, exports, application) {
    var uefi = application.uefi;
    application.$$config({
        paths : {
            "angular-touch" : "lib/angular.js/angular-touch",
            "ui-bootstrap"  : "lib/angular-bootstrap/ui-bootstrap-tpls",
            "ui-material"   : "lib/angular-material/angular-material"
        },  
        shim : {    
            "angular-touch" : ['angular'],
            "ui-bootstrap"  : ['angular-sanitize', 'angular-touch'],
            "ui-material"   : ['angular-sanitize']
        }
    });
    var modules = ['style!css/shared/icons/awesome/font-awesome'], depends = ['ngSanitize', 'ngMessages'];
    switch(application.theme) {
    case 'material':
        modules.push('style!css/themes/material/angular-material');
        modules.push('style!css/themes/material/angular-material-icons');
        modules.push('ui-material');
        depends.push('ngMaterial');
        if (!(Modernizr.flexbox || Modernizr.flexboxlegacy || Modernizr.flexboxtweener)) {
            return alert('Your browser was not supported right now!');
        }
        break;
    default:
    case 'bootstrap':
        modules.push('style!css/themes/bootstrap/bootstrap');
        modules.push('style!css/themes/bootstrap/bootstrap-theme');
        modules.push('ui-bootstrap');
        depends.push('ui.bootstrap');
        depends.push('ngTouch');
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
    if (application.theme !== 'material') {
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
