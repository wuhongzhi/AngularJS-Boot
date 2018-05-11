define(['text', 'crypto'], function(text, crypto) {
    var cached = {},
        self, prefix = 'cache://';
    return self = {
        $$style: function() {},
        $$init: function() {
            var delegate = text.get.bind(text);
            text.get = function(url, callback, errback) {
                var key = prefix + crypto.SHA256(url);
                var data = localStorage.getItem(key);
                if (data) {
                    data = crypto.AES.decrypt(data, key, {iv:key}).toString(crypto.enc.Utf8);
                    callback(data);
                } else {
                    delegate(url, function(data) {
                        callback(data);
                        try {
                            data = crypto.AES.encrypt(data, key, {iv:key});
                            localStorage.setItem(key, data);
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
            });
        }
    };
});