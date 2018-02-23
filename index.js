/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
define(['require', 'version', 'index.i18n.min', 'lib/modernizr/modernizr.min'], function(require, version, i18n) {
    var bootTime = new Date().getTime();
    if (!Modernizr.typedarrays) {
        var lang = i18n[(navigator.language || navigator.userLanguages || i18n.failback).toLowerCase()];
        var information = [lang.title,
            "-----------[" + lang.desktop +"]-----------",
            "Internet Explorer 10+", 
            "Chrome 7.0+", 
            "Opera 12.1+", 
            "Safari 5.1+", 
            "Firefox 4+", 
            "Edge 12+", 
            "-----------[" + lang.mobile +"]------------",
            "Internet Explorer Mobile 10+", 
            "Chrome for Android 61+", 
            "Firefox for Android 56+", 
            "Android Browser 4+",
            "Opera Mobile 12+", 
            "Opera Mini 1.0+",
            "iOS Safari 5.1+", 
        ];
        return alert(information.join('\n'));
    }
    var baseUrl = window.location.pathname;
    baseUrl = baseUrl.substr(0, baseUrl.lastIndexOf('/')) || './';
    requirejs.config({ baseUrl: baseUrl });
    var native = window._cordovaNative || !!version.native;
    if (native || /(Android|iPhone|iPad|Windows Phone)/.test(navigator.userAgent)) {
        document.addEventListener('deviceready', bootstrap, false);
        require(['cordova' + (native ? '' : '.mock')]);
    } else {
        bootstrap();
    }
    function bootstrap() {
        if (Modernizr.applicationcache) {
            var appCache =  window.applicationCache;
            if (appCache.status == appCache.UPDATEREADY) {
                appCache.swapCache();
                return window.location.reload();
            }
        }
        var container = document.body || document.getElementsByTagName('body')[0],
            display;
        container.innerHTML = 
            '<div id="application-progress-box" class="meter blue">' +
                '<span id="application-progress" style="width: 0%"></span>'+
            '</div>';
        define('display', display = {
            indicator: document.getElementById("application-progress"),
            ready: function() {
                removeClass(container, 'logo');
                container.className = '';
                var elapsed = new Date().getTime() - bootTime;
                this.progress = function() {};
                this.message("Taken " + (elapsed) + "ms to boot up.");
            },
            message: function(message) {
                window.console && console.log(message);
            },
            progress: function(percent) {
                if (percent === 0) {
                    addClass(container, 'logo');
                }
                this.indicator.style.width = percent + "%";
            }
        });
        require(['lib/system/uefi' + (version.production ? ".min" : "")]);
        function addClass(container, className) {
            var list = container.classList;
            if (list) {
                if (!list.contains(className)) {
                    list.add(className);
                }
            } else {
                list = (container.className || "").split(/\s+/);
                if (!list.contains(className)) {
                    list.push(className);
                    container.className = list.join(' ');
                }
            }
        }
        function removeClass(container, className) {
            var list = container.classList;
            if (list) {
                if (list.contains(className)) {
                    list.remove(className);
                }
            } else {
                list = (container.className || "").split(/\s+/);
                var index = list.indexOf(className);
                if (index != -1) {
                    list.splice(index, 1);
                    container.className = list.join(' ');
                }
            }
        }
    }
});