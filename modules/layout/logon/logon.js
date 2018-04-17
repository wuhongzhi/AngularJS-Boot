define(function(require, exports, module) {
    var module = exports.module = angular.module('application.logon', ['ng', 'system.security', 'gui.qrcode', 'system.devices']);
    module.controller('AppAuthenticateController', 
            ['$scope', '$location', 'authenticationService', '$resource', '$interval', '$rootElement', '$resource', 
            function ($scope, $location, authentication, $resource, $interval, $rootElement, $resource) {
        authentication.deauthenticate();
        $scope.title = {
            locale : $scope.language.getLocale(),
            locales: $scope.language.getLocales()
        };
        $scope.$watch('title.locale', function(locale) {
            $scope.language.setLocale(locale);
        });
        $scope.login_class = $scope.device.mobile ? 'login-mobile' : 'login-desktop';
        $scope.timeout = 90;
        $scope.auth_data = {user : "",password: ""};
        if ($scope.device.mobile) {
            $scope.signOn = function() {
                authentication.authenticate($scope.auth_data.user, $scope.auth_data.password);
            }
            if ($scope.device.support('power', 'shutdown')) {
                $scope.shutdown = function() {
                    $resource("device://power").get({action: 'shutdown'}, angular.noop, function(result) {
                        console.log(result.message);
                    });
                };
            }
        } else {
            var qraddress = $resource('qrcode-generate', null, {data : {method : 'POST'}}),
                qrwait = $resource('qrcode-await', null, {'await' : {method : 'POST', timeout: $scope.timeout * 1000, cancellable: true}});
            $scope.qrcode = {data : ""};
            $scope.loading = false;
            (function doComfirm() {
                qraddress.data({}, function(data) {
                    if ($scope.tcancel) $interval.cancel($scope.tcancel);
                    $scope.timeout = 90;
                    $scope.loading = true;
                    $scope.qrcode = {data : data.address  + '/' + data.session, options: {scale: 4}};
                    qrwait.await({session: data.session}, function(data) {
                        $interval.cancel($scope.tcancel);
                        authentication.confirm(data.confirm);
                    }, function() {
                        $location.path('/modules/2048/main');
                        //doComfirm();
                    });
                    $scope.tcancel = $interval(function() {
                        $scope.timeout--;
                    }, 1000, $scope.timeout);
                });
            })();
        }
    }]);
});
