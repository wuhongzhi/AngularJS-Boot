define(['require', 'exports', 'application'], function(require, exports, application) {
    var module = angular.module('gui.language', ['ng']),
        uefi = application.uefi,
        forEach = angular.forEach,
        injector = angular.injector,
        extend = angular.extend,
        merge = angular.merge,
        slice = Array.prototype.slice,
        dictionary = {},
        rootScope = null,
        localeData = {
            $locale: null,
            currency: application.currency || '\u00a5',
            locales: application.locales || ['zh-cn'],
            locale: application.locale
        };
    localeData.locale = getLocale();
    extend(exports, {
        name: module.name,
        module: reloadLanguage.bind({locale: localeData.locale})
    });
    ['locale', 'locales', 'currency'].forEach(function(key) {delete application[key]});
    module.config(['$provide', function($provide) {
        if (localeData.$locale) return;
        uefi.progress("Application", "setup gui.language");
        $provide.decorator('currencyFilter', ['$delegate',
            function($delegate) {
                return extend(function () {
                    var argv = slice.apply(arguments);
                    if (!argv[1] || argv[1] === '$system$') {
                        argv[1] = localeData.currency;
                    }
                    return $delegate.apply($delegate, argv);
                }, {$stateful : true});
            }
        ]);
        ['date', 'number'].forEach(function(filter) {
            $provide.decorator(filter + 'Filter', ['$delegate', function($delegate) {
                return extend($delegate, {$stateful : true});
            }]);
        });
    }]).run(['$locale', '$rootScope', function($locale, $rootScope) {
        if (localeData.$locale) return;
        localeData.$locale = $locale;
        angular.extend(rootScope = $rootScope, {
            language : {
                loadLanguage: loadLanguage.bind(localeData),
                translate: translate.bind({}),
                getLocale: function() {
                    return localeData.locale;
                },
                getLocales: function() {
                    return [].concat(localeData.locales);
                },
                setLocale: function(locale) {
                    locale = getLocale(locale.toLowerCase());
                    reloadLanguage.bind({locale: locale})(function() {
                        localeData.locale = locale;
                    });
                }
            }
        });
    }]).filter('translate', function() {
        return extend(translate, {$stateful : true});
    });
    function reloadLanguage(resolved) {
        var locale = this.locale;
        loadLanguage.dynamics = loadLanguage.dynamics || {
            $$buf: {},
            put: function(lang) {
                if (!lang) return;
                lang = lang.substr(0, lang.lastIndexOf('/')); 
                this.$$buf[lang] = true;
            },
            has: function(lang) {
                lang = lang.substr(0, lang.lastIndexOf('/')); 
                return !!this.$$buf[lang];
            }
        };
        var i18ns = reloadLanguage.languages = reloadLanguage.languages || {};
        var reloadedLanguage = i18ns[locale] = i18ns[locale] || {};
        var languages = application.routes.concat(application.layout).filter(function(route) {
            var json = route.language[locale];
            return json && !reloadedLanguage[json] 
                && (!route.extras.dynamic || loadLanguage.dynamics.has(json));
        }).map(function(route) {
            return route.language[locale];
        });
        var angluar_locale = 'lib/angular.js/i18n/angular-locale_LOCALE.js';
        languages.unshift(angluar_locale.replace(/LOCALE/, locale));
        rootScope && rootScope.$broadcast('$localeChangeStart', locale);
        require(languages, function() {
            for(var i = 0; i < languages.length; i++) {
                var language = languages[i];
                if (i) {
                    reloadedLanguage[language] = true;
                    languages[i] = [language, arguments[i]];
                } else {
                    var nextLocale =reloadedLanguage[language] = reloadedLanguage[language] 
                            || injector(['ngLocale']).get('$locale');
                    languages[i] = [angluar_locale, arguments[i]];
                    if (localeData.$locale && localeData.$locale.id !== nextLocale.id) {
                        merge(localeData.$locale, nextLocale);
                    }
                }
            }
            loadLanguage.bind({locale: locale})(languages);
            if (resolved) resolved(module);
            rootScope && rootScope.$broadcast('$localeChangeSuccess', locale);
        });
    }
    function loadLanguage() {
        var languages = dictionary[this.locale] = dictionary[this.locale] || {};
        forEach(slice.apply(arguments), function(element) {
            forEach(element, function(language) {
                loadLanguage.dynamics.put(language[0]);
                forEach(language[1], function(value, key) {
                    languages[key.toLowerCase()] = value;
                });
            });
        });
    }
    function getLocale(locale) {
        locale = (
            locale ||
            Modernizr.localstorage && localStorage['system.locale'] ||
            navigator.languages && navigator.languages[0] ||
            navigator.language ||
            navigator.userLanguage ||
            localeData.locale || 'zh-cn').toLowerCase();
        if (localeData.locales.indexOf(locale) == -1) locale = 'zh-cn';
        if (localeData.locales.indexOf(locale) !== -1 && Modernizr.localstorage) {
            try {
                localStorage['system.locale'] = locale;
            } catch(e) {}
        }
        return locale;
    }
    function translate(key) {
        if (!key) return "";
        key = key.trim().toLowerCase();
        var template = (dictionary[localeData.locale] || {})[key];
        if (!template) {
            return 'TODO: Translate `' + key + '` in `' + localeData.locale + '`';
        }
        var argv = slice.call(arguments, 1);
        if (!argv.length) return template;
        return template.replace(/\{(\d+)\}/g, function(match, i) {
            var r = argv[i | 0];
            return typeof(r) !== 'undefined' ? r : match;
        });
    }
});