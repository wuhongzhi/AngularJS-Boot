define(['require', 'application'], function init(require, application, sysModules) {
    'use strict';
    var uefi = application.uefi,
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
            for(var i = 0; i < 100; i++) {
                var key = exp.exec(template);
                if (!key) return template;
                var val = application[key[1]];
                if (!val || !isString(val)) throw new Error("CANNT RESOLVE VAR `" + key + "`");
                template = template.replace(exp, val);
            }
            throw new Error("TO MANY LEVELS IN VAR RESOLVE.");
        };
    /**
     * load modules from application
     */
    function doBootstrap(rootModule) {
        var routes = get_routes([], rootModule),
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
        application.routes = routes.filter(function(route) {return !route.extras.layout && route.templateUrl});
        application.components = routes.filter(function(route) {return !route.extras.layout && !route.templateUrl});
        (function load(modules) {
            if (phases.length) {
                phases.shift()(mergeModules);
            } else {
                modules = modules.map(function(module) {
                    uefi.progress("Application", "bootstrap module > " + module.name);
                    return module.name;
                });
                angular.bootstrap(document, modules, {strictDi: true});
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
            var modules = routes.filter(function(route) {
                return route.ready = !route.extras.dynamic;
            }).map(function(route) {
                uefi.progress("Application", "prepare user module > " + route.extras.path);
                return route.script;
            });
            load_modules(modules, cb);
        }

        function load_modules(modules, cb) {
            require(modules, function() {
                var result = [], pending = arguments.length, timer = null;
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
        function get_routes(routes, module) {
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
                    route.extras.path =  '/' + absolutePath(module, key);
                }
                route.script = cacheUrl(route.script);
                forEach(route.language, function(value, key) {
                    route.language[key] = cacheUrl("json!" + value);
                });
                forEach(route.extras.deps, function(value, key) {
                    route.extras.deps[key] = canonicalPath(route.extras.path + '/' + value);
                });
                routes.push(route);
            });
            if (module.includes) {
                forEach(module.includes || [], function(module) {
                    routes = routes.concat(get_routes([], module));
                });
            }
            return routes;
        }
        function absolutePath(module, url) {
            if (!url || url[0] == '/') return url;
            return [module.dir, url].join('/');
        }
    }
    function canonicalPath(path) {
        var r = [];
        path.split('/').forEach(function(v) {
            if (v === '..') r.pop();
            else if (v !== '.') r.push(v);
        });
        return r.join('/');
    }
    /**
     * load all configurations
     */
    setTimeout(function() {
        uefi.progress('Application', 'loading');
        require([cacheUrl('json!lib/system/modules/configuration.json')], function(configuration) {
            var rootModule = {includes: [], dynamic: false, safe: false}, rootEnvironment;
            sysModules = configuration;
            (function loadConfig(items, parent) {
                if (!items.length) return;
                loadConfig.$remaining = loadConfig.$remaining | 0;
                loadConfig.$remaining += items.length;
                require(items.map(function(v) {
                    return cacheUrl(resolveVars(v.indexOf("json!") === 0 ? v : "json!" + v));
                }), function() {
                    var modules = slice.apply(arguments);
                    forEach(modules, function(module, i) {
                        parent.includes.push(module);
                        module.dynamic = defaultValue(module.dynamic, defaultValue(parent.dynamic, true));
                        module.safe = defaultValue(module.safe, defaultValue(parent.safe, false));
                        forEach(module.modules, function(route) {
                            route.dynamic = defaultValue(route.dynamic, defaultValue(module.dynamic, true));
                            route.safe = defaultValue(route.safe, defaultValue(module.safe, false));
                            route.depends = route.depends || [];
                        });
                        var subdir = canonicalPath(items[i]).split('/');
                        subdir.pop();
                        module['dir'] = subdir.length ? subdir.join('/') : "";
                        if (module.includes && isArray(module.includes)) {
                            var subjsons = module.includes.map(function(v) {
                                return subdir.length ? subdir.concat(v).join('/') : v;
                            });
                            module.includes = [];
                            loadConfig(subjsons, module);
                        }
                        if (parent === rootModule) {
                            rootEnvironment = rootModule.includes[0].environment || {};
                        } else {
                            merge(rootEnvironment, module.environment || {});
                        }
                    });
                    var remaining = loadConfig.$remaining -= modules.length;
                    if (!remaining) {
                        rootModule = rootModule.includes[0];
                        merge(application, {"name" : "APPLICATION"}, rootEnvironment);
                        doBootstrap(rootModule);
                    }
                });
            })(['application.json'], rootModule);
            function defaultValue(val, defval) {
                return isDefined(val) ? val : defval;
            }        
        });
    });
});