define(['text'], function(text) {
    var cached = {}, self, prefix = 'cache://';
    return self = {
        $$apply: function() {},
        $$style: function() {},
        $$init: function() {
            var delegate = text.get.bind(text);
            text.get = function(url, callback, errback) {
                var data = localStorage.getItem(prefix + url);
                if (data) {
                    callback(data);
                } else {
                    delegate(url, function(data) {
                        callback(data);
                        try {
                            localStorage.setItem(prefix + url, data);
                        } catch (e) {}
                    }, errback);
                }
            };
        },
        $$clean: function() {
            for (var n in localStorage) {
                if (n.startsWith(prefix)) {
                    try {
                        localStorage.removeItem(n);
                    } catch (e) {}
                }
            }
        },
        load: function(name, req, load, config) {
            requirejs(['text!' + requirejs.toUrl(name.substr(name.lastIndexOf('!') + 1))], function(content) {
                if (/\.json$/.test(name)) {
                    load(JSON.parse(content));
                } else if (/\.js$/.test(name)) {
                    load.fromText(content);
                } else if (/\.css$/.test(name)) {
                    try {
                        self.$$style(content);
                    } finally {
                        load("");
                    }
                } else {
                    load(content);
                }
                self.$$apply();
            });
        }
    };
});