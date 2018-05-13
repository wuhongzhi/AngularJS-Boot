define(['require', 'exports', 'application', 'json!lib/system/etc/theme.json'], 
    function(require, exports, application, config) {
    var uefi = application.uefi;
    application.$$config(config.depends);
    var theme = config.themes[application.theme],
        modules = [].concat(theme.modules), 
        depends = ['ngSanitize', 'ngMessages', 'ngResource'].concat(theme.depends);
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
    module.run(['$rootScope', 'securityService', '$resource',
        function ($scope, securityService, $resource) {
        uefi.progress("Application", "setup gui.theme");
        $scope.$on(securityService.ENFORCED, function() {
            resize(0, 0);
        });
        $scope.$on(securityService.UNSECURED, function() {
            resize(-1, -1);
        });
        function resize(w, h) {
            if ($scope.device.support('display', 'resize')) {
                $resource("device://display").get({action: 'resize', dimension: {width: w, height: h}});
            }
        }
    }]);
});
