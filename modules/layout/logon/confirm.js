define(['require', 'exports', 'application'], function(require, exports, application) {
    var module = exports.module = angular.module('application.logon.confirm', ['ng', 'system.security']);
    module.controller('AppConfirmController', ['$scope', '$resource', '$location', '$window', "$timeout",
        function($scope, $resource, $location, $window, $timeout) {
            var session = $location.search().session;
            if (session) {
                $scope.confirm = function() {
                    $resource('session-confirm').get({session: session}, function(message) {
                        $scope.error = message.message;
                        if (!message.code) $window.close();
                    });
                }
            } else {
                $location.path(application.authentication);
            }
        }
    ]);
});