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
        },
        isNumberNaN = Number.isNaN || function isNumberNaN(num) {
            return num !== num;
        };
    localeData.locale = getLocale();
    extend(exports, {
        name: module.name,
        module: reloadLanguage.bind({ locale: localeData.locale })
    });
    ['locale', 'locales', 'currency'].forEach(function(key) { delete application[key] });
    module.config(['$provide', function($provide) {
        if (localeData.$locale) return;
        uefi.progress("Application", "setup gui.language");
        $provide.decorator('currencyFilter', ['$delegate',
            function($delegate) {
                return extend(function() {
                    var argv = slice.apply(arguments);
                    if (!argv[1] || argv[1] === '$system$') {
                        argv[1] = localeData.currency;
                    }
                    return $delegate.apply($delegate, argv);
                }, { $stateful: true });
            }
        ]);
        ['date', 'number'].forEach(function(filter) {
            $provide.decorator(filter + 'Filter', ['$delegate', function($delegate) {
                return extend($delegate, { $stateful: true });
            }]);
        });
    }]).factory('languageService', ['$locale', function($locale) {
        localeData.$locale = $locale;
        return {
            loadLanguage: loadLanguage.bind(localeData),
            translate: translate.bind({}),
            getLocale: function() {
                return localeData.locale;
            },
            getLocales: function() {
                return [].concat(localeData.locales);
            },
            setLocale: function(locale) {
                var locale = getLocale(locale.toLowerCase());
                reloadLanguage.bind({ locale: locale })(function() {
                    localeData.locale = locale;
                });
            }
        };
    }]).directive('maxbytes', function() {
        return {
            restrict: 'A',
            require: ['?ngModel', '^?ngModelOptions'],
            link: function(scope, elm, attr, ctrls) {
                var model = ctrls[0],
                    charset = ctrls[1] && ctrls[1].$options.getOption('charset') || 'utf8';
                if (!model) return;
                var maxlength = -1;
                attr.$observe('maxbytes', function(value) {
                    var intVal = toInt(value) || 0;
                    maxlength = isNumberNaN(intVal) ? -1 : intVal;
                    model.$validate();
                });
                model.$validators.maxbytes = function(modelValue, viewValue) {
                    if ((maxlength < 0) || model.$isEmpty(viewValue)) return true;
                    var l = bytesLength(viewValue, charset);
                    model.$setValidity('charset', l !== -1);
                    return (l >= 0) && (l <= maxlength);
                };
            }
        }
    }).directive('minbytes', function() {
        return {
            restrict: 'A',
            require: ['?ngModel', '^?ngModelOptions'],
            link: function(scope, elm, attr, ctrls) {
                var model = ctrls[0],
                    charset = ctrls[1] && ctrls[1].$options.getOption('charset') || 'utf8';
                if (!model) return;
                var minlength = 0;
                attr.$observe('minbytes', function(value) {
                    var intVal = toInt(value) || 0;
                    minlength = isNumberNaN(intVal) ? -1 : intVal;
                    model.$validate();
                });
                model.$validators.minbytes = function(modelValue, viewValue) {
                    if (model.$isEmpty(viewValue)) return true;
                    var l = bytesLength(viewValue, charset);
                    model.$setValidity('charset', l !== -1);
                    return (l >= 0) && (l >= minlength);
                };
            }
        };
    }).filter('translate', function() {
        return extend(translate, { $stateful: true });
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
        var languages = application.routes.concat(application.layout);
        languages = languages.concat(application.languages);
        languages = languages.filter(function(route) {
            var json = route.language[locale];
            return json && !reloadedLanguage[json] &&
                (!route.extras.dynamic || loadLanguage.dynamics.has(json));
        }).map(function(route) {
            return route.language[locale];
        });
        var angluar_locale = 'lib/angular.js/i18n/angular-locale_LOCALE.js';
        languages.unshift(angluar_locale.replace(/LOCALE/, locale));
        rootScope && rootScope.$broadcast('$localeChangeStart', locale);
        require(languages, function() {
            for (var i = 0; i < languages.length; i++) {
                var language = languages[i];
                if (i) {
                    reloadedLanguage[language] = true;
                    languages[i] = [language, arguments[i]];
                } else {
                    var nextLocale = reloadedLanguage[language] = reloadedLanguage[language] ||
                        injector(['ngLocale']).get('$locale');
                    languages[i] = [angluar_locale, arguments[i]];
                    if (localeData.$locale && localeData.$locale.id !== nextLocale.id) {
                        merge(localeData.$locale, nextLocale);
                    }
                }
            }
            loadLanguage.bind({ locale: locale })(languages);
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
            } catch (e) {}
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

    function bytesLength(value, charset) {
        var len = 0;
        switch (charset) {
            case 'gbk':
            case 'gb18030':
                value = Array.from(value);
                for (var i = 0; i < value.length; i++) {
                    var cp = value[i].codePointAt(0);
                    if (cp < 0x80) {
                        len += 1;
                    } else {
                        var table = unioncodeToCharsets[charset];
                        var found = false;
                        for (var j = 0; j < table.length; j += 2) {
                            var c1 = table[j],
                                c2 = c1 + table[j + 1];
                            if (found = (c1 <= cp && cp <= c2)) break;
                        }
                        if (found) {
                            len += 2;
                        } else if (table === unioncodeToCharsets.gb18030) {
                            if (cp > 0x183990) return -1;
                            len += 4;
                        } else {
                            return -1; 
                        }
                    }
                };
                break;
                //see https://en.wikipedia.org/wiki/UTF-8
            case 'utf8':
                value = Array.from(value);
                for (var i = 0; i < value.length; i++) {
                    var cp = value[i].codePointAt(0);
                    if (cp < 0x80) len += 1;
                    else if (cp < 0x800) len += 2;
                    else if (cp < 0x10000) len += 3;
                    else if (cp < 0x110000) len += 4;
                    else return -1;
                };
                break;
            default:
                return -1;
        }
        return len
    }

    function toInt(str) {
        return parseInt(str, 10);
    }

    //http://www.fmddlmyy.cn/text30.html
    var unioncodeToCharsets = {
        gbk: [
            164, 0, 167, 1, 176, 1, 183, 0, 215, 0, 224, 1, 232, 2, 236, 1, 242, 1,
            249, 1, 252, 0, 257, 0, 275, 0, 283, 0, 299, 0, 324, 0, 328, 0, 333, 0,
            462, 0, 464, 0, 466, 0, 468, 0, 470, 0, 472, 0, 474, 0, 476, 0, 593, 0,
            711, 0, 713, 2, 729, 0, 913, 16, 931, 6, 945, 16, 963, 6, 1025, 0, 1040, 63,
            8208, 0, 8211, 3, 8216, 1, 8220, 1, 8229, 1, 8240, 0, 8242, 1, 8245, 0, 8251, 0,
            8453, 0, 8457, 0, 8470, 0, 8481, 0, 8544, 11, 8560, 9, 8592, 3, 8598, 3, 8712, 0,
            8721, 0, 8725, 0, 8730, 0, 8733, 3, 8739, 0, 8741, 0, 8743, 4, 8750, 0, 8756, 3,
            8776, 0, 8780, 0, 8786, 0, 8800, 1, 8804, 3, 8814, 1, 8853, 0, 8857, 0, 8869, 0,
            8978, 0, 9312, 9, 9332, 39, 9472, 75, 9552, 35, 9601, 14, 9619, 2, 9632, 1, 9650, 1,
            9670, 1, 9675, 0, 9678, 1, 9698, 3, 9733, 1, 9737, 0, 9792, 0, 9794, 0, 12288, 3,
            12317, 1, 12321, 8, 12353, 82, 12443, 3, 12449, 85, 12540, 2, 12549, 36, 12832, 9, 12849, 0,
            13198, 1, 13212, 2, 13217, 0, 13252, 0, 13262, 0, 13265, 1, 13269, 0, 19968, 20901, 59335, 1,
            59413, 79, 63788, 0, 63865, 0, 63893, 0, 63975, 0, 63985, 0, 64012, 3, 64017, 0, 64019, 1,
            64031, 2, 64035, 1, 64039, 2, 65072, 1, 65075, 17, 65097, 9, 65108, 3, 65113, 13, 65128, 3,
            65504, 5
        ],
        gb18030: [
            164, 0, 167, 1, 176, 1, 183, 0, 215, 0, 224, 1, 232, 2, 236, 1, 242, 1,
            249, 1, 252, 0, 257, 0, 275, 0, 283, 0, 299, 0, 324, 0, 328, 0, 333, 0,
            462, 0, 464, 0, 466, 0, 468, 0, 470, 0, 472, 0, 474, 0, 476, 0, 505, 0,
            609, 0, 711, 0, 713, 2, 729, 0, 913, 16, 931, 6, 945, 16, 963, 6, 1025, 0,
            1105, 0, 7743, 0, 8208, 0, 8211, 3, 8216, 1, 8220, 1, 8229, 1, 8240, 0, 8242, 1,
            8251, 0, 8364, 0, 8451, 0, 8453, 0, 8457, 0, 8470, 0, 8481, 0, 8544, 11, 8560, 9,
            8598, 3, 8712, 0, 8719, 0, 8721, 0, 8725, 0, 8730, 0, 8733, 3, 8739, 0, 8741, 0,
            8750, 0, 8756, 3, 8765, 0, 8776, 0, 8780, 0, 8786, 0, 8800, 1, 8804, 3, 8814, 1,
            8857, 0, 8869, 0, 8895, 0, 8978, 0, 9312, 9, 9332, 39, 9472, 75, 9552, 35, 9601, 14,
            9632, 1, 9650, 1, 9660, 1, 9670, 1, 9675, 0, 9678, 1, 9698, 3, 9733, 1, 9737, 0,
            9794, 0, 11905, 0, 11908, 0, 11912, 0, 11915, 1, 11927, 0, 11943, 0, 11946, 0, 11950, 0,
            11958, 1, 11963, 0, 11978, 0, 12272, 11, 12288, 3, 12293, 18, 12317, 1, 12321, 8, 12350, 0,
            12443, 3, 12449, 85, 12540, 2, 12549, 36, 12832, 9, 12849, 0, 12963, 0, 13198, 1, 13212, 2,
            13252, 0, 13262, 0, 13265, 1, 13269, 0, 13383, 0, 13427, 0, 13726, 0, 13838, 0, 13850, 0,
            14702, 0, 14799, 1, 14815, 0, 14963, 0, 15182, 0, 15470, 0, 15584, 0, 16470, 0, 16735, 0,
            17324, 0, 17329, 0, 17373, 0, 17622, 0, 17996, 0, 18017, 0, 18211, 0, 18217, 0, 18300, 0,
            18759, 0, 18810, 0, 18813, 0, 18818, 1, 18821, 1, 18843, 0, 18847, 0, 18870, 1, 19575, 0,
            19731, 6, 19886, 0, 19968, 20901, 57344, 1899, 59245, 89, 59337, 29, 59380, 32, 59414, 2, 59422, 0,
            59435, 1, 59441, 1, 59451, 0, 59459, 0, 59476, 1, 59492, 0, 63788, 0, 63865, 0, 63893, 0,
            63985, 0, 64012, 3, 64017, 0, 64019, 1, 64024, 0, 64031, 2, 64035, 1, 64039, 2, 65072, 1,
            65097, 9, 65108, 3, 65113, 13, 65128, 3, 65281, 93, 65504, 5
        ]
    };
});