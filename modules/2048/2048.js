define(['require', 'exports', 'application'], function(require, exports, application) {
    "use strict";
    var module = angular.module("twentyfourtyeightApp", ["Game", "Grid", "Keyboard", "ngAnimate", "ngCookies"]);
    angular.extend(exports, {
        name: module.name,
        module: function(resolved) {
            require([application.$$cacheUrl('style!modules/2048/2048.css')], function() {
                resolved(module);
            });
        }
    });
    module.config(["GridServiceProvider", function(a) {
        a.setSize(4)
    }
    ]).controller("GameController", ["GameManager", "KeyboardService", "$location", function(a, b, c) {
        this.game = a,
        this.newGame = function() {
            b.init(),
            this.game.newGame(),
            this.startGame()
        }
        ,
        this.startGame = function() {
            var a = this;
            b.on(function(b) {
                a.game.move(b)
            })
        }
        ,
        this.tryAgain = function() {
            c.path("/modules/logon/main");
        },
        this.newGame()
    }
    ]),
    angular.module("Grid", []).factory("GenerateUniqueId", function() {
        var a = function() {
            var a = (new Date).getTime()
              , b = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(b) {
                var c = (a + 16 * Math.random()) % 16 | 0;
                return a = Math.floor(a / 16),
                ("x" === b ? c : 7 & c | 8).toString(16)
            });
            return b
        };
        return {
            next: function() {
                return a()
            }
        }
    }).factory("TileModel", ["GenerateUniqueId", function(a) {
        var b = function(b, c) {
            this.x = b.x,
            this.y = b.y,
            this.value = c || 2,
            this.id = a.next(),
            this.merged = null
        };
        return b.prototype.savePosition = function() {
            this.originalX = this.x,
            this.originalY = this.y
        }
        ,
        b.prototype.reset = function() {
            this.merged = null
        }
        ,
        b.prototype.setMergedBy = function(a) {
            var b = this;
            a.forEach(function(a) {
                a.merged = !0,
                a.updatePosition(b.getPosition())
            })
        }
        ,
        b.prototype.updateValue = function(a) {
            this.value = a
        }
        ,
        b.prototype.updatePosition = function(a) {
            this.x = a.x,
            this.y = a.y
        }
        ,
        b.prototype.getPosition = function() {
            return {
                x: this.x,
                y: this.y
            }
        }
        ,
        b
    }
    ]).provider("GridService", function() {
        this.size = 4,
        this.startingTileNumber = 2,
        this.setSize = function(a) {
            this.size = a ? a : 0
        }
        ,
        this.setStartingTiles = function(a) {
            this.startingTileNumber = a
        }
        ;
        var a = this;
        this.$get = ["TileModel", function(b) {
            this.grid = [],
            this.tiles = [];
            var c = {
                left: {
                    x: -1,
                    y: 0
                },
                right: {
                    x: 1,
                    y: 0
                },
                up: {
                    x: 0,
                    y: -1
                },
                down: {
                    x: 0,
                    y: 1
                }
            };
            return this.getSize = function() {
                return a.size
            }
            ,
            this.buildEmptyGameBoard = function() {
                for (var b = this, c = 0; c < a.size * a.size; c++)
                    this.grid[c] = null;
                this.forEach(function(a, c) {
                    b.setCellAt({
                        x: a,
                        y: c
                    }, null)
                })
            }
            ,
            this.prepareTiles = function() {
                this.forEach(function(a, b, c) {
                    c && (c.savePosition(),
                    c.reset())
                })
            }
            ,
            this.traversalDirections = function(a) {
                for (var b = c[a], d = {
                    x: [],
                    y: []
                }, e = 0; e < this.size; e++)
                    d.x.push(e),
                    d.y.push(e);
                return b.x > 0 && (d.x = d.x.reverse()),
                b.y > 0 && (d.y = d.y.reverse()),
                d
            }
            ,
            this.calculateNextPosition = function(a, b) {
                var d, e = c[b];
                do
                    d = a,
                    a = {
                        x: d.x + e.x,
                        y: d.y + e.y
                    };
                while (this.withinGrid(a) && this.cellAvailable(a));return {
                    newPosition: d,
                    next: this.getCellAt(a)
                }
            }
            ,
            this.withinGrid = function(a) {
                return a.x >= 0 && a.x < this.size && a.y >= 0 && a.y < this.size
            }
            ,
            this.cellAvailable = function(a) {
                return this.withinGrid(a) ? !this.getCellAt(a) : null
            }
            ,
            this.buildStartingPosition = function() {
                for (var a = 0; a < this.startingTileNumber; a++)
                    this.randomlyInsertNewTile()
            }
            ,
            this.tileMatchesAvailable = function() {
                for (var b = a.size * a.size, d = 0; b > d; d++) {
                    var e = this._positionToCoordinates(d)
                      , f = this.tiles[d];
                    if (f)
                        for (var g in c) {
                            var h = c[g]
                              , i = {
                                x: e.x + h.x,
                                y: e.y + h.y
                            }
                              , j = this.getCellAt(i);
                            if (j && j.value === f.value)
                                return !0
                        }
                }
                return !1
            }
            ,
            this.getCellAt = function(a) {
                if (this.withinGrid(a)) {
                    var b = this._coordinatesToPosition(a);
                    return this.tiles[b]
                }
                return null
            }
            ,
            this.setCellAt = function(a, b) {
                if (this.withinGrid(a)) {
                    var c = this._coordinatesToPosition(a);
                    this.tiles[c] = b
                }
            }
            ,
            this.moveTile = function(a, b) {
                var c = {
                    x: a.x,
                    y: a.y
                };
                this.setCellAt(c, null),
                this.setCellAt(b, a),
                a.updatePosition(b)
            }
            ,
            this.forEach = function(b) {
                for (var c = a.size * a.size, d = 0; c > d; d++) {
                    var e = this._positionToCoordinates(d);
                    b(e.x, e.y, this.tiles[d])
                }
            }
            ,
            this._positionToCoordinates = function(b) {
                var c = b % a.size
                  , d = (b - c) / a.size;
                return {
                    x: c,
                    y: d
                }
            }
            ,
            this._coordinatesToPosition = function(b) {
                return b.y * a.size + b.x
            }
            ,
            this.insertTile = function(a) {
                var b = this._coordinatesToPosition(a);
                this.tiles[b] = a
            }
            ,
            this.newTile = function(a, c) {
                return new b(a,c)
            }
            ,
            this.removeTile = function(a) {
                a = this._coordinatesToPosition(a),
                delete this.tiles[a]
            }
            ,
            this.samePositions = function(a, b) {
                return a.x === b.x && a.y === b.y
            }
            ,
            this.availableCells = function() {
                var a = []
                  , b = this;
                return this.forEach(function(c, d) {
                    var e = b.getCellAt({
                        x: c,
                        y: d
                    });
                    e || a.push({
                        x: c,
                        y: d
                    })
                }),
                a
            }
            ,
            this.randomlyInsertNewTile = function() {
                var a = this.randomAvailableCell()
                  , b = this.newTile(a, 2);
                this.insertTile(b)
            }
            ,
            this.randomAvailableCell = function() {
                var a = this.availableCells();
                return a.length > 0 ? a[Math.floor(Math.random() * a.length)] : void 0
            }
            ,
            this.anyCellsAvailable = function() {
                return this.availableCells().length > 0
            }
            ,
            this
        }
        ]
    }),
    angular.module("Grid").directive("grid", function() {
        return {
            restrict: "A",
            require: "ngModel",
            scope: {
                ngModel: "="
            },
            templateUrl: "scripts/grid/grid.html"
        }
    }),
    angular.module("Grid").directive("tile", function() {
        return {
            restrict: "A",
            scope: {
                ngModel: "="
            },
            templateUrl: "scripts/grid/tile.html"
        }
    }),
    angular.module("Keyboard", []).service("KeyboardService", ["$document", '$rootScope', function(a, scope) {
        var b = "up"
          , c = "right"
          , d = "down"
          , e = "left"
          , f = {
            37: e,
            38: b,
            39: c,
            40: d
        };
        this.init = function() {
            var b = this;
            this.keyEventHandlers = [],
            a.bind("keydown", function(a) {
                var c = f[a.which];
                c && (a.preventDefault(),
                b._handleKeyEvent(c, a))
            })
        }
        ,
        this.on = function(a) {
            this.keyEventHandlers.push(a)
        }
        ,
        this._handleKeyEvent = function(a, b) {
            var c = this.keyEventHandlers;
            if (c && (b.preventDefault(),
            c))
                for (var d = 0; d < c.length; d++) {
                    var e = c[d];
                    e(a, b)
                }
            scope.$apply();
        }
    }
    ]),
    angular.module("Game", ["Grid", "ngCookies"]).service("GameManager", ["$q", "$timeout", "GridService", "$cookieStore", function(a, b, c, d) {
        this.getHighScore = function() {
            return parseInt(d.get("highScore")) || 0
        }
        ,
        this.grid = c.grid,
        this.tiles = c.tiles,
        this.gameSize = c.getSize(),
        this.winningValue = 2048,
        this.reinit = function() {
            this.gameOver = !1,
            this.win = !1,
            this.currentScore = 0,
            this.highScore = this.getHighScore()
        }
        ,
        this.reinit(),
        this.newGame = function() {
            c.buildEmptyGameBoard(),
            c.buildStartingPosition(),
            this.reinit()
        }
        ,
        this.move = function(b) {
            var d = this
              , e = function() {
                if (d.win)
                    return !1;
                var a = c.traversalDirections(b)
                  , e = !1
                  , f = !1;
                c.prepareTiles(),
                a.x.forEach(function(g) {
                    a.y.forEach(function(a) {
                        var h = {
                            x: g,
                            y: a
                        }
                          , i = c.getCellAt(h);
                        if (i) {
                            var j = c.calculateNextPosition(i, b)
                              , k = j.next;
                            if (k && k.value === i.value && !k.merged) {
                                var l = 2 * i.value
                                  , m = c.newTile(i, l);
                                m.merged = [i, j.next],
                                c.insertTile(m),
                                c.removeTile(i),
                                c.moveTile(m, k),
                                d.updateScore(d.currentScore + j.next.value),
                                m.value >= d.winningValue && (f = !0),
                                e = !0
                            } else
                                c.moveTile(i, j.newPosition);
                            c.samePositions(h, j.newPosition) || (e = !0)
                        }
                    })
                }),
                f && !d.win && (d.win = !0),
                e && (c.randomlyInsertNewTile(),
                (d.win || !d.movesAvailable()) && (d.gameOver = !0))
            };
            return a.when(e())
        }
        ,
        this.movesAvailable = function() {
            return c.anyCellsAvailable() || c.tileMatchesAvailable()
        }
        ,
        this.updateScore = function(a) {
            this.currentScore = a,
            this.currentScore > this.getHighScore() && (this.highScore = a,
            d.put("highScore", a))
        }
    }
    ]);
    module.run(['$templateCache', function($templateCache) {
        'use strict';
        $templateCache.put('scripts/grid/grid.html', "<div id=\"game-{{ ngModel.gameSize }}\">\n" + "  <div class=\"grid-container\">\n" + "    <div class=\"grid-cell\" ng-repeat=\"cell in ngModel.grid track by $index\"></div>\n" + "  </div>\n" + "\n" + "  <div class=\"tile-container\">\n" + "    <div tile \n" + "          ng-model='tile'\n" + "          ng-repeat='tile in ngModel.tiles track by $id(tile.id || $index)'></div>\n" + "  </div>\n" + "</div>");
        $templateCache.put('scripts/grid/tile.html', "<div ng-if='ngModel' class=\"tile position-{{ ngModel.x }}-{{ ngModel.y }} tile-{{ ngModel.value }}\" \n" + "  ng-class=\"{ 'tile-merged': ngModel.merged}\">\n" + "  <div class=\"tile-inner\">\n" + "    {{ ngModel.value }}\n" + "  </div>\n" + "</div>\n");
    }
    ]);
});
