define(function(require, exports, module) {
    'use strict';
    exports.module = angular.module('application.index', ['gui.theme']).controller('AlertDemoCtrl', [
            '$scope', '$resource', function ($scope, $resource) {
        $scope.alerts = [
            { type: 'danger', msg: 'Oh snap! Change a few things up and try submitting again.' },
            { type: 'success', msg: 'Well done! You successfully read this important alert message.' }
        ];
        $scope.addAlert = function() {
            if ($scope.device.support('scanner', 'scan')) {
                $resource("device://scanner").get({action: 'scan'}, function(result) {
                    $scope.alerts.push({msg: 'Scaned: ' + result.text + ', of ' + result.type});
                }, function(result) {
                    $scope.alerts.push({msg: 'Scaned Error: ' + result.message});
                });
            } else {
                $scope.alerts.push({msg: 'unsupported scanner!'});    
            }
        };
        if ($scope.device.support('power', 'shutdown')) {
            $scope.shutdown = function() {
                $resource("device://power").get({action: 'shutdown'}, angular.noop, function(result) {
                    console.log(result.message);
                });
            }
        }
        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        };
    }]);
});