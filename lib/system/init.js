define(['require', 'application'], function(require, application, sysModules) {
    'use strict';
    var uefi = application.uefi,
        prodMode = uefi.prodMode,
        cacheUrl = application.$$cacheUrl,
        bootstrap = angular.bootstrap,
        forEach = angular.forEach,
        merge = angular.merge,
        slice = Array.prototype.slice,
        isFunction = angular.isFunction,
        isArray = angular.isArray,
        isDefined = angular.isDefined,
        isString = angular.isString,
        resolveVars = function(template) {
            if (!template) return template;
            var exp = /\$\{([a-zA-Z\.\-0-9/]+)\}/g;
            for (var i = 0; i < 100; i++) {
                var key = exp.exec(template);
                if (!key) return template;
                var val = application[key[1]];
                if (!val || !isString(val)) throw new Error("CANNT RESOLVE VAR `" + key + "`");
                template = template.replace(exp, val);
            }
            throw new Error("TO MANY LEVELS IN VAR RESOLVE.");
        }, 
        verifies = {},
        verifyModules = function () {
            var $angular =angular.module;
            angular.module = (function(){
                var mname = arguments[0];
                var self = $angular.apply(angular, arguments);
                angular.forEach(self, function(fn, key) {
                    if (typeof(fn) === 'function' 
                        && !(key === 'info' || key === 'config' || key === 'run')) {
                        if (!!fn.$$hook) return;
                        var nfn = self[key] = (function() {
                            var oname = arguments[0],
                                keys = (verifies[oname] = verifies[oname] || {}),
                                dkey =  mname + '::' + key + '::' + oname;
                            if (keys[oname]) {
                                console.warn(key + '::' + oname + ' in module ' 
                                    + mname + ' was already defined in ' + keys[oname]);
                            } else {
                                keys[oname] = mname;
                                console.debug('define ' + key + '::' 
                                    + oname + ' in module ' + mname);
                            }
                            fn.apply(self, arguments);
                            return self;
                        }).bind(self);
                        nfn.$$hook = true;
                        angular.forEach(nfn, function(fn, key) {
                            if (typeof(fn) === 'function') {
                                nfn[key] = fn;
                            }
                        });
                    }
                });
                return self;
            }).bind(angular);
        };
    /**
     * load all configurations
     */
    uefi.progress('Application', 'loading');
    require([cacheUrl('json!lib/system/etc/module.json')], function(config) {
        var rootModule = { includes: [] },
            rootEnvironment;
        sysModules = config;
        (function loadConfig(items, parent, config) {
            if (!items.length) return;
            loadConfig.$remaining = loadConfig.$remaining | 0;
            loadConfig.$remaining += items.length;
            require(items.map(function(v) {
                return cacheUrl(resolveVars(v.indexOf("json!") === 0 ? v : "json!" + v));
            }), function() {
                var modules = slice.apply(arguments);
                forEach(modules, function(module, i) {
                    parent.includes.push(module);
                    var safe = defaultValue(module.safe, defaultValue(config.safe, false));
                    var dynamic = defaultValue(module.dynamic, defaultValue(config.dynamic, true));
                    forEach(module.modules, function(route) {
                        route.dynamic = defaultValue(route.dynamic, defaultValue(dynamic, true));
                        route.safe = defaultValue(route.safe, defaultValue(safe, false));
                        route.depends = route.depends || [];
                    });
                    delete module.safe;
                    delete module.dynamic;
                    var subdir = canonicalPath(items[i]).split('/');
                    subdir.pop();
                    module['dir'] = subdir.length ? subdir.join('/') : "";
                    if (module.includes && isArray(module.includes)) {
                        var subJsons = module.includes.filter(function(v) {
                            return typeof(v) === 'string';
                        }).map(function(v) {
                            return subdir.length ? subdir.concat(v).join('/') : v;
                        });
                        module.includes = module.includes.filter(function(v) {return (typeof(v) !== 'string');});
                        loadConfig(subJsons, module, {dynamic: dynamic, safe: safe});
                    }
                    if (parent === rootModule) {
                        rootEnvironment = rootModule.includes[0].environment || {};
                    } else {
                        merge(rootEnvironment, module.environment || {});
                    }
                });
                var remaining = loadConfig.$remaining -= modules.length;
                if (!remaining) {
                    if (!prodMode) verifyModules();
                    rootModule = rootModule.includes[0];
                    merge(application, { "name": "APPLICATION" }, rootEnvironment);
                    if (!prodMode) {
                        console.debug("application.json:\n" + JSON.stringify(rootModule, null, 4));
                    }
                    doBootstrap(rootModule);
                }
            });
        })(['application.json'], rootModule, {dynamic: false, safe: false});

        function defaultValue(val, defval) {
            return isDefined(val) ? val : defval;
        }
    });
    
    /**
     * load modules from application
     */
    function doBootstrap(rootModule) {
        var routes = getRoutes([], rootModule),
            phases = [
                load_system_modules,
                load_user_modules
            ];
        forEach(routes, function(route) {
            if (route.extras.path === application.layout) {
                application.layout = route;
                route.extras.layout = true;
                route.extras.safe = true;
                route.extras.dynamic = false;
            }
        });
        var components = routes.filter(function(route) { return !route.extras.layout && !route.templateUrl });
        application.routes = routes.filter(function(route) { return !route.extras.layout && route.templateUrl });
        application.dependModules = dependModules;
        (function load(modules) {
            if (phases.length) {
                phases.shift()(mergeModules);
            } else {
                modules = modules.map(function(module) {
                    uefi.progress("Application", "bootstrap module > " + module.name);
                    return module.name;
                });
                if (!prodMode) {
                    uefi.progress("Application", "verify done");
                }
                var $rootElement = document.body || document.querySelector && document.querySelector('body');
                angular.bootstrap($rootElement, modules, { strictDi: true });
                uefi.progress("Application", "ready", true);
            }

            function mergeModules(newModels) {
                load(modules.concat(newModels));
            }
        })([]);

        function load_system_modules(cb) {
            uefi.progress("Application", "prepare system modules");
            application.$$config(sysModules.depends || {});
            var modules = sysModules.includes || [];
            forEach(modules, function(module) {
                uefi.progress("Application", "prepare system module > " + module);
            });
            load_modules(modules, cb);
        }

        function load_user_modules(cb) {
            uefi.progress("Application", "prepare user modules");
            var modules = [];
            routes.filter(function(route) {
                return route.ready = !route.extras.dynamic;
            }).forEach(function(route) {
                uefi.progress("Application", "prepare user module > " + route.extras.path);
                dependModules(route, modules).push(route);
            });
            modules = modules.map(function(module) {
                module.extras.dynamic = false;
                return module.script;
            });
            load_modules(modules, cb);
        }

        function load_modules(modules, cb) {
            require(modules, function() {
                var result = [],
                    pending = arguments.length,
                    timer = null;
                if (pending == 0) return cb(result);
                slice.apply(arguments).map(function(exports, i, modules) {
                    if (isFunction(exports.module)) {
                        exports.module(resolved);
                        if (!timer) detector(modules);
                    } else {
                        exports.name = exports.module.name;
                        resolved(exports.module);
                    }

                    function resolved() {
                        slice.apply(arguments).forEach(function(module) {
                            if (!module) return
                            result.push(module);
                            modules.forEach(function(exports) {
                                if (module.name == exports.name) {
                                    exports.resolved = true;
                                }
                            });
                        });
                        if (--pending < 1) {
                            if (timer) clearTimeout(timer);
                            cb(result);
                        }
                    }
                });

                function detector(modules) {
                    detector.times = detector.times | 0;
                    if (detector.times++ > 10) return;
                    timer = setTimeout(function() {
                        detector(modules);
                        var unresolved = [];
                        modules.forEach(function(exports) {
                            if (!exports.resolved) {
                                unresolved.push(exports.name);
                            }
                        });
                        throw new Error("DETECTED INIT HUNG UP WITHIN 30 SECONDS." +
                            "\nPlease check out following modules:\n\t" + unresolved.join('\n\t'));
                    }, 30000)
                }
            });
        }
        /**
         * get all routes from configurations
         */
        function getRoutes(routes, module) {
            forEach(module.modules || {}, function(item, key) {
                var route = {
                    "language": item.language || {},
                    "script": resolveVars(item.script),
                    "templateUrl": resolveVars(item.template),
                    "extras": {
                        "dynamic": item.dynamic,
                        "safe": item.safe,
                        "deps": item.depends,
                        "path": key
                    }
                };
                if (module.dir) {
                    route.script = absolutePath(module, route.script);
                    route.templateUrl = absolutePath(module, route.templateUrl);
                    forEach(route.language, function(value, key) {
                        route.language[key] = absolutePath(module, value);
                    });
                    route.extras.path = '/' + absolutePath(module, key);
                }
                route.script = cacheUrl(route.script);
                forEach(route.language, function(value, key) {
                    route.language[key] = cacheUrl("json!" + value);
                });
                routes.push(route);
            });
            if (module.includes) {
                forEach(module.includes || [], function(module) {
                    routes = routes.concat(getRoutes([], module));
                });
            }
            return routes;
        }

        function dependModules(self, result) {
            self.extras.deps.forEach(function(path) {
                var r = components.find(function(component) {
                    return (component.extras.path === path) && component.extras.dynamic;
                });
                if (!r) return;
                uefi.progress("Application", "prepare dependency module > " + path);
                result.push(r);
                dependModules(r, result);
            });
            return result;
        }
    }

    function absolutePath(module, url) {
        if (!url || url[0] == '/') return url;
        return canonicalPath([module.dir, url].join('/'));
    }

    function canonicalPath(path) {
        var r = [];
        path.split('/').forEach(function(v) {
            if (v === '..') r.pop();
            else if (v !== '.') r.push(v);
        });
        return r.join('/');
    }
});