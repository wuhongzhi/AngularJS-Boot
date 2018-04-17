define(function(require, exports, module) {
    'use strict';
    exports.module = angular.module('application.send', ['gui.theme', 'system.http']).controller('SendCtrl', [
        '$timeout', '$q', '$log', '$resource',
        function($timeout, $q, $log, $resource) {
            var self = this;
            self.send = function() {
                self.rsp = "Waiting...";
                $resource("send").save({ type: self.type, clazz: self.datagram, data: self.req || (self.type === 'json' ? "{}" : '<MsgText/>') }, function(result) {
                    self.rsp = result.data;
                }, function(result) {
                    self.rsp = "<ERROR>:" + result.data;
                });
            };
            self.reset = function() {
                self.rsp = "";
            };
        }
    ]);
});