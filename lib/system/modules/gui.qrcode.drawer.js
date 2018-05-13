define(['require', 'exports'], function(require, exports) {
	exports.ngQrcode = function(encoder) {
        return {
            replace: true,
            restrict: "A",
            require: 'ngModel',
            template: Modernizr.canvas 
                ? "<canvas ng-hide></canvas>" 
                : "<div ng-hide style='position:relative;background:#ffffff;'></div>",
            link: function(scope, element, attrs, modelCtrl) {
                var brand = new Image(), hasBrand = !!attrs.ngBrand;
                if (hasBrand) {
                    brand.src = attrs.ngBrand;
                    angular.element(brand).on('load', function() {
                        brand.ready = true;
                        if (brand.$render) brand.$render();
                    });
                }
                modelCtrl.$render = function() {
                    var model = modelCtrl.$modelValue;
                    if (!model || modelCtrl.$isEmpty(model.data)) {
                        brand.$render = null;
                        return element.addClass('ng-hide');
                    }
                    var options = angular.merge({errorCorrectionLevel: 'Q', 
                            color : {
                                dark : "#00007f",
                                light: "#ffffff"
                            }
                        }, model.options);
                    var data = encoder(model, options);
                    if (Modernizr.canvas) {
                        qrcodeToCanvas(element, data, options);
                        (brand.$render = function() {
                            if (!hasBrand || brand.ready) element.removeClass('ng-hide');
                            if (!brand.ready) return;
                            var ctx = element[0].getContext('2d');
                            var side = 48, lineWidth = 2;
                            var offset = (element.width() - side) / 2;
                            ctx.fillStyle = "#ffffff";
                            ctx.strokeStyle = "#00007f";
                            ctx.lineWidth = lineWidth;
                            roundRect(ctx, offset, offset, side, side, 5, true, true);
                            ctx.clip();
                            ctx.drawImage(brand, offset, offset, side, side);
                        })();
                    } else {
                        (Modernizr.svg ? qrcodeToSvg : qrcodeToDivs)(element, data, options);
                        (brand.$render = function() {
                            if (!hasBrand || brand.ready) element.removeClass('ng-hide');
                            if (!brand.ready) return;
                            var side = 48, lineWidth = 2;
                            var offset = (element.width() - side) / 2;
                            element.css({
                                position: 'relative'
                            }).append(angular.element(brand).css({
                                'top': offset,
                                'left': offset,
                                'width': 48,
                                'height': 48,
                                'border-width': 2, 
                                'border-style': 'solid',
                                '-webkit-border-radius': 5,
                                '-moz-border-radius': 5,
                                'border-radius': 5,
                                'background-color': '#ffffff',
                                'border-color': '#00007f', 
                                'position': 'absolute'
                            }));
                        })();
                    }
                }
            }
        }
	};
    /**
     * Draws a rounded rectangle using the current state of the canvas.
     * If you omit the last three params, it will draw a rectangle
     * outline with a 5 pixel border radius
     * @param {CanvasRenderingContext2D} ctx
     * @param {Number} x The top left x coordinate
     * @param {Number} y The top left y coordinate
     * @param {Number} width The width of the rectangle
     * @param {Number} height The height of the rectangle
     * @param {Number} [radius = 5] The corner radius; It can also be an object
     *                 to specify different radii for corners
     * @param {Number} [radius.tl = 0] Top left
     * @param {Number} [radius.tr = 0] Top right
     * @param {Number} [radius.br = 0] Bottom right
     * @param {Number} [radius.bl = 0] Bottom left
     * @param {Boolean} [fill = false] Whether to fill the rectangle.
     * @param {Boolean} [stroke = true] Whether to stroke the rectangle.
     */
    function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
        if (typeof stroke == 'undefined') {
            stroke = true;
        }
        if (typeof radius === 'undefined') {
            radius = 5;
        }
        if (typeof radius === 'number') {
            radius = {
                tl: radius,
                tr: radius,
                br: radius,
                bl: radius
            };
        } else {
            var defaultRadius = {
                tl: 0,
                tr: 0,
                br: 0,
                bl: 0
            };
            for (var side in defaultRadius) {
                radius[side] = radius[side] || defaultRadius[side];
            }
        }
        ctx.beginPath();
        ctx.moveTo(x + radius.tl, y);
        ctx.lineTo(x + width - radius.tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        ctx.lineTo(x + width, y + height - radius.br);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        ctx.lineTo(x + radius.bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        ctx.lineTo(x, y + radius.tl);
        ctx.quadraticCurveTo(x, y, x + radius.tl, y);
        ctx.closePath();
        if (fill) {
            ctx.fill();
        }
        if (stroke) {
            ctx.stroke();
        }
    }
    function qrcodeToCanvas(element, data, options) {
        var scale = options.scale || 4;
        var margin = options.margin || 4;
        var length = data.length;
        var size = (length + margin * 2) * scale;
        element.attr('width', size).attr('height', size);
        element.css('margin-left', "calc(50% - " + (size / 2) + "px)");
        var ctx = element[0].getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        var block = options.color.dark || "#000000";
        ctx.fillStyle = block;
        for (var r = 0; r < length; r++) {
            for (var c = 0; c < length; c++) {
                if (data[r][c]) {
                    var x = (r + margin) * scale,
                        y = (c + margin) * scale;
                    ctx.fillRect(x, y, scale, scale);
                }
            }
        }
    }
    function qrcodeToSvg(element, data, options, callback) {
        var scale = options.scale || 4;
        var margin = options.margin || 4;
        var length = data.length;
        var size = (length + margin * 2) * scale;
        var block = options.color.dark || "#000000";
        element.width(size).height(size);
        element.css('margin-left', "calc(50% - " + (size / 2) + "px)");
        var strings = '';
        for (var r = 0; r < length; r += 1) {
            for (var c = 0; c < length; c += 1) {
                if (data[r][c]) {
                    var x = (c + margin) * scale,
                        y = (r + margin) * scale;
                    strings += 'M' + x + ' ' + y + 'h' + scale + 'v' + scale + 'h-' + scale + 'z';
                }
            }
        }
        var content = [
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + [0, 0, size, size].join(' ') + '">',
            '<path d="' + strings + '" fill="' + block + '"/>',
            '</svg>'
        ];
        element.html(content.join(""));
    }
    function qrcodeToDivs(element, data, options, callback) {
        var scale = options.scale || 4;
        var margin = options.margin || 4;
        var length = data.length;
        var size = (length + margin * 2) * scale;
        var block = options.color.dark || "#000000";
        element.width(size).height(size);
        element.css('margin-left', "calc(50% - " + (size / 2) + "px)");
        var selector = "qrs" + new Date().getTime();
        var strings = "<style>." + selector + "{position:absolute;background:" + block + 
                ";width:" + scale + "px;height:" + scale + "px;}</style>";
        for (var r = 0; r < length; r++) {
            for (var c = 0; c < length; c++) {
                if (data[r][c]) {
                    var x = (r + margin) * scale,
                        y = (c + margin) * scale;
                    strings += "<div class='" + selector + "' style='left:" + x + "px;top:" + y + "px;'></div>"
                }
            }
        }
        element.html(strings);
    }
});
