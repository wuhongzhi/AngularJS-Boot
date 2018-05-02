define(['version', 'display'], function(appversion, display) {
    'use strict';
    var baseUrl = window.location.pathname;
    baseUrl = baseUrl.substr(0, baseUrl.lastIndexOf('/')) || './';
    var native = {};
    if (typeof cordova !== 'undefined' 
        && typeof cordova.fireDocumentEvent === 'function' 
        && typeof cordova.require === 'function') {
        var version = /(\d+)\.(\d+)/.exec(cordova.version);
        native.mobile = {
            version: {
                major: version[1],
                minor: version[2]
            },
            gui: cordova
        };
    }
    if (typeof global !== 'undefined' 
        && typeof global.process !== 'undefined' 
        && typeof global.require === 'function') {
        var version = /(\d+)\.(\d+)/.exec(global.process.versions['nw']);
        native.desktop = {
            version: {
                major: version[1],
                minor: version[2]
            },
            gui: global.require('nw.gui')
        };
    }
    var prodMode = appversion.production,
        percent = 0,
        uefi = {
            prodMode: prodMode,
            native: native,
            progress: function(module, message, finish) {
                if (!prodMode) {
                    var info = "Progress > " + module + ' > ' + message + ' ...';
                    display.message(info);
                }
                display.progress(Math.min(percent += 5, 100));
                finish && display.ready();
            }
        },
        environment = {
            uefi: uefi, 
            baseUrl: baseUrl,
            waitSeconds: prodMode ? 60 : 0,
            paths: {
                "cache": "lib/require-plugins/cache",
                "json" : "lib/require-plugins/json",
                "text" : "lib/require-plugins/text",
                "style": "lib/require-plugins/css",
                "crypto": "lib/crypto-js/crypto-js"
            },
            shim: {
                'lib/es5-shim/es5-sham': ['lib/es5-shim/es5-shim'],
                'lib/es6-shim/es6-shim': ['lib/es5-shim/es5-sham'],
                'lib/es6-shim/es6-sham': ['lib/es6-shim/es6-shim'],
                'lib/system/kernel': ['lib/es6-shim/es6-sham', 'crypto']
            }
        };
    requirejs.undef('display');
    define('environment', environment);
    requirejs.config(environment);
    var reqLoad = requirejs.load, 
        reqUrl = requirejs.toUrl;
    requirejs.load = function(context, moduleName, url) {
        if (prodMode && !/\/(i18n|nls)\//.test(url) && /(\.js)$/.test(url)) {
            url = url.replace(/(\.js)$/, ".min$1");
        }
        return reqLoad.call(requirejs, context, moduleName, url);
    };
    requirejs.toUrl = function() {
        var url = reqUrl.apply(requirejs, arguments);
        if (prodMode && /\.(css|js)$/.test(url)) {
            url = url.replace(/(\.(css|js))$/, ".min$1");
        }
        return url;
    };
    uefi.progress('UEFI', 'ready');
    uefi.progress('Kernel', 'loading');
    requirejs(["lib/system/kernel"], function() {
        uefi.progress('Kernel', 'ready');
    });
});