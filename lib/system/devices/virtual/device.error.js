define(['require', 'module'], function(require, module) {
    module.exports = function(device) {
        return function(func) {
            throw new Error(func ?
                　'The `' + func + '` function on device `' + device + '` was not implemented!' :
                'The device `' + device + '` was not implemented!');
        }
    }
});