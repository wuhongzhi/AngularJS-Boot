define(['require', 'exports', 'application'], function(require, exports, application) {
    var module = angular.module('application.layout', ['ng', 'gui.language', 'system.security', 'system.cache']),
        LAYOUT = "<ng-include src=\"'TEMPLATE'\"></ng-include>";
    angular.extend(exports, {
        name: module.name,
        module: function(resolved) {
            require([application.$$cacheUrl('style!css/application/layout.css')], function() {
                resolved(module);
            });
        }
    });
    module.config(['$mdThemingProvider', function($mdThemingProvider) {
        // $mdThemingProvider.theme('default')
        //     .primaryPalette('purple')
        //     .warnPalette('amber');
    }]).run(['$sce', '$rootElement', function($sce, $rootElement) {
        var tempate = $sce.getTrustedResourceUrl(application.layout.templateUrl);
        $rootElement.removeClass("gui-progress");
        $rootElement.html(LAYOUT.replace('TEMPLATE', tempate));
    }]).controller('AppLayoutController', ['$scope', '$location', '$rootElement', function($scope, $location, $rootElement) {
        $scope.title = {
            name: application.name
        };
        $scope.view = {
            index: application.index
        };
        $scope.$on('$localeChangeSuccess', function() {
            $rootElement.find('title').text($scope.language.translate(application.name));
        });
        var session = $location.search()['session'];
        if (session) {
            $scope.uri = $location.path();
        } else {
            $scope.uri = application.logon;
        }
        $scope.$watch("uri", function(uri, ouri) {
            if ($location.path() != uri && ouri) {
                $location.path(uri);
            }
        });
        $scope.$on($scope.security.ENFORCED, function() {
            $scope.uri = application.index;
        });
        $scope.$on($scope.security.UNSECURED, function() {
            $scope.uri = application.logon;
        });
        $rootElement.contextmenu(function(e) {
            if (application.uefi.prodMode) {
                e.preventDefault();
            }
        });
    }]);
});