define(['require', 'exports', 'application'], function(require, exports, application) {
    "use strict";
    var module = angular.module("twentyfourtyeightApp", ["Game", "ngAnimate", "ngCookies"]);
    angular.extend(exports, {
        name: module.name,
        module: function(resolved) {
            require([application.$$cacheUrl('style!modules/2048/2048.css')], function() {
                resolved(module);
            });
        }
    });

    module.config(['GridServiceProvider', function(GridServiceProvider) {
        GridServiceProvider.setSize(4);
    }]).controller('GameController', ['GameManager', 'KeyboardService', '$scope', '$location',
        function(GameManager, KeyboardService, $scope, $location) {

        this.game = GameManager;
        KeyboardService.init();
        var self = this;
        KeyboardService.on(function(key) {
            self.game.move(key);
            $scope.$digest();
        });
        this.newGame = function() {
            this.game.newGame();
        };
        this.newGame();
    }]).run(['$templateCache', function($templateCache) {
        'use strict';

        $templateCache.put('scripts/grid/grid.html',
            "<div id=\"game-{{ ngModel.gameSize }}\">\n" +
            "  <div class=\"grid-container\">\n" +
            "    <div class=\"grid-cell\" ng-repeat=\"cell in ngModel.grid track by $index\"></div>\n" +
            "  </div>\n" +
            "\n" +
            "  <div class=\"tile-container\">\n" +
            "    <div tile \n" +
            "          ng-model='tile'\n" +
            "          ng-repeat='tile in ngModel.tiles track by $id(tile.id || $index)'></div>\n" +
            "  </div>\n" +
            "</div>"
        );

        $templateCache.put('scripts/grid/tile.html',
            "<div ng-if='ngModel' class=\"tile position-{{ ngModel.x }}-{{ ngModel.y }} tile-{{ ngModel.value }} {{ngModel.merged?'tile-merged':''}}\" >\n" +
            "  <div class=\"tile-inner\">\n" +
            "    {{ ngModel.value }}\n" +
            "  </div>\n" +
            "</div>\n"
        );

    }]);

    angular.module('Game', ['Grid', 'Keyboard', 'ngCookies'])
        .service('GameManager', ['$q', '$timeout', 'GridService', '$cookieStore', function($q, $timeout, GridService, $cookieStore) {

            this.getHighScore = function() {
                return parseInt($cookieStore.get('highScore')) || 0;
            };

            this.grid = GridService.grid;
            this.tiles = GridService.tiles;
            this.gameSize = GridService.getSize();

            this.winningValue = 2048;

            this.reinit = function() {
                this.gameOver = false;
                this.win = false;
                this.currentScore = 0;
                this.highScore = this.getHighScore();
            };
            this.reinit();

            this.newGame = function() {
                GridService.buildEmptyGameBoard();
                GridService.buildStartingPosition();
                this.reinit();
            };

            /*
             * The game loop
             *
             * Inside here, we'll run every 'interesting'
             * event (interesting events are listed in the Keyboard service)
             * For every event, we'll:
             *  1. look up the appropriate vector
             *  2. find the furthest possible locations for each tile and 
             *     the next tile over
             *  3. find any spots that can be 'merged'
             *    a. if we find a spot that can be merged:
             *      i. remove both tiles
             *      ii. add a new tile with the double value
             *    b. if we don't find a merge:
             *      i. move the original tile
             */
            this.move = function(key) {
                var self = this;
                var f = function() {
                    if (self.win) {
                        return false;
                    }
                    var positions = GridService.traversalDirections(key);
                    var hasMoved = false;
                    var hasWon = false;

                    // Update Grid
                    GridService.prepareTiles();

                    positions.x.forEach(function(x) {
                        positions.y.forEach(function(y) {
                            var originalPosition = {
                                x: x,
                                y: y
                            };
                            var tile = GridService.getCellAt(originalPosition);

                            if (tile) {
                                var cell = GridService.calculateNextPosition(tile, key),
                                    next = cell.next;

                                if (next &&
                                    next.value === tile.value &&
                                    !next.merged) {

                                    // MERGE
                                    var newValue = tile.value * 2;

                                    var merged = GridService.newTile(tile, newValue);
                                    merged.merged = [tile, cell.next];

                                    GridService.insertTile(merged);
                                    GridService.removeTile(tile);

                                    GridService.moveTile(merged, next);

                                    self.updateScore(self.currentScore + cell.next.value);

                                    if (merged.value >= self.winningValue) {
                                        hasWon = true;
                                    }
                                    hasMoved = true; // we moved with a merge
                                } else {
                                    GridService.moveTile(tile, cell.newPosition);
                                }

                                if (!GridService.samePositions(originalPosition, cell.newPosition)) {
                                    hasMoved = true;
                                }
                            }
                        });
                    });

                    if (hasWon && !self.win) {
                        self.win = true;
                    }

                    if (hasMoved) {
                        GridService.randomlyInsertNewTile();

                        if (self.win || !self.movesAvailable()) {
                            self.gameOver = true;
                        }
                    }

                };
                return $q.when(f());
            };

            this.movesAvailable = function() {
                return GridService.anyCellsAvailable() || GridService.tileMatchesAvailable();
            };

            this.updateScore = function(newScore) {
                this.currentScore = newScore;
                if (this.currentScore > this.getHighScore()) {
                    this.highScore = newScore;
                    $cookieStore.put('highScore', newScore);
                }
            };

        }]);

    angular.module('Grid', [])
        .factory('GenerateUniqueId', function() {
            var generateUid = function() {
                // http://www.ietf.org/rfc/rfc4122.txt
                // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
                var d = new Date().getTime();
                var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = (d + Math.random() * 16) % 16 | 0;
                    d = Math.floor(d / 16);
                    return (c === 'x' ? r : (r & 0x7 | 0x8)).toString(16);
                });
                return uuid;
            };
            return {
                next: function() {
                    return generateUid();
                }
            };
        })
        .factory('TileModel', ['GenerateUniqueId', function(GenerateUniqueId) {
            var Tile = function(pos, val) {
                this.x = pos.x;
                this.y = pos.y;
                this.value = val || 2;

                this.id = GenerateUniqueId.next();
                this.merged = null;
            };

            Tile.prototype.savePosition = function() {
                this.originalX = this.x;
                this.originalY = this.y;
            };

            Tile.prototype.reset = function() {
                this.merged = null;
            };

            Tile.prototype.setMergedBy = function(arr) {
                var self = this;
                arr.forEach(function(tile) {
                    tile.merged = true;
                    tile.updatePosition(self.getPosition());
                });
            };

            Tile.prototype.updateValue = function(newVal) {
                this.value = newVal;
            };

            Tile.prototype.updatePosition = function(newPosition) {
                this.x = newPosition.x;
                this.y = newPosition.y;
            };

            Tile.prototype.getPosition = function() {
                return {
                    x: this.x,
                    y: this.y
                };
            };

            return Tile;
        }])
        .provider('GridService', function() {
            this.size = 4; // Default size
            this.startingTileNumber = 2; // default starting tiles

            this.setSize = function(sz) {
                this.size = sz ? sz : 0;
            };

            this.setStartingTiles = function(num) {
                this.startingTileNumber = num;
            };

            var service = this;

            this.$get = ['TileModel', function(TileModel) {
                this.grid = [];
                this.tiles = [];

                // Private things
                var vectors = {
                    'left': {
                        x: -1,
                        y: 0
                    },
                    'right': {
                        x: 1,
                        y: 0
                    },
                    'up': {
                        x: 0,
                        y: -1
                    },
                    'down': {
                        x: 0,
                        y: 1
                    }
                };

                this.getSize = function() {
                    return service.size;
                };

                // Build game board
                this.buildEmptyGameBoard = function() {
                    var self = this;
                    // Initialize our grid
                    for (var x = 0; x < service.size * service.size; x++) {
                        this.grid[x] = null;
                    }

                    this.forEach(function(x, y) {
                        self.setCellAt({
                            x: x,
                            y: y
                        }, null);
                    });
                };

                /*
                 * Prepare for traversal
                 */
                this.prepareTiles = function() {
                    this.forEach(function(x, y, tile) {
                        if (tile) {
                            tile.savePosition();
                            tile.reset();
                        }
                    });
                };

                /*
                 * Due to the fact we calculate the next positions
                 * in order, we need to specify the order in which
                 * we calculate the next positions
                 */
                this.traversalDirections = function(key) {
                    var vector = vectors[key];
                    var positions = {
                        x: [],
                        y: []
                    };
                    for (var x = 0; x < this.size; x++) {
                        positions.x.push(x);
                        positions.y.push(x);
                    }

                    if (vector.x > 0) {
                        positions.x = positions.x.reverse();
                    }
                    if (vector.y > 0) {
                        positions.y = positions.y.reverse();
                    }

                    return positions;
                };


                /*
                 * Calculate the next position for a tile
                 */
                this.calculateNextPosition = function(cell, key) {
                    var vector = vectors[key];
                    var previous;

                    do {
                        previous = cell;
                        cell = {
                            x: previous.x + vector.x,
                            y: previous.y + vector.y
                        };
                    } while (this.withinGrid(cell) && this.cellAvailable(cell));

                    return {
                        newPosition: previous,
                        next: this.getCellAt(cell)
                    };
                };


                /*
                 * Is the position within the grid?
                 */
                this.withinGrid = function(cell) {
                    return cell.x >= 0 && cell.x < this.size &&
                        cell.y >= 0 && cell.y < this.size;
                };

                /*
                 * Is a cell available at a given position
                 */
                this.cellAvailable = function(cell) {
                    if (this.withinGrid(cell)) {
                        return !this.getCellAt(cell);
                    } else {
                        return null;
                    }
                };

                /*
                 * Build the initial starting position
                 * with randomly placed tiles
                 */
                this.buildStartingPosition = function() {
                    for (var x = 0; x < this.startingTileNumber; x++) {
                        this.randomlyInsertNewTile();
                    }
                };

                /*
                 * Check to see if there are any matches available
                 */
                this.tileMatchesAvailable = function() {
                    var totalSize = service.size * service.size;
                    for (var i = 0; i < totalSize; i++) {
                        var pos = this._positionToCoordinates(i);
                        var tile = this.tiles[i];

                        if (tile) {
                            // Check all vectors
                            for (var vectorName in vectors) {
                                var vector = vectors[vectorName];
                                var cell = {
                                    x: pos.x + vector.x,
                                    y: pos.y + vector.y
                                };
                                var other = this.getCellAt(cell);
                                if (other && other.value === tile.value) {
                                    return true;
                                }
                            }
                        }
                    }
                    return false;
                };

                /*
                 * Get a cell at a position
                 */
                this.getCellAt = function(pos) {
                    if (this.withinGrid(pos)) {
                        var x = this._coordinatesToPosition(pos);
                        return this.tiles[x];
                    } else {
                        return null;
                    }
                };

                /*
                 * Set a cell at position
                 */
                this.setCellAt = function(pos, tile) {
                    if (this.withinGrid(pos)) {
                        var xPos = this._coordinatesToPosition(pos);
                        this.tiles[xPos] = tile;
                    }
                };

                this.moveTile = function(tile, newPosition) {
                    var oldPos = {
                        x: tile.x,
                        y: tile.y
                    };

                    this.setCellAt(oldPos, null);
                    this.setCellAt(newPosition, tile);

                    tile.updatePosition(newPosition);
                };

                /*
                 * Run a callback for every cell
                 * either on the grid or tiles
                 */
                this.forEach = function(cb) {
                    var totalSize = service.size * service.size;
                    for (var i = 0; i < totalSize; i++) {
                        var pos = this._positionToCoordinates(i);
                        cb(pos.x, pos.y, this.tiles[i]);
                    }
                };

                /*
                 * Helper to convert x to x,y
                 */
                this._positionToCoordinates = function(i) {
                    var x = i % service.size,
                        y = (i - x) / service.size;
                    return {
                        x: x,
                        y: y
                    };
                };

                /*
                 * Helper to convert coordinates to position
                 */
                this._coordinatesToPosition = function(pos) {
                    return (pos.y * service.size) + pos.x;
                };

                /*
                 * Insert a new tile
                 */
                this.insertTile = function(tile) {
                    var pos = this._coordinatesToPosition(tile);
                    this.tiles[pos] = tile;
                };

                this.newTile = function(pos, value) {
                    return new TileModel(pos, value);
                };

                /*
                 * Remove a tile
                 */
                this.removeTile = function(pos) {
                    pos = this._coordinatesToPosition(pos);
                    delete this.tiles[pos];
                };

                /*
                 * Same position
                 */
                this.samePositions = function(a, b) {
                    return a.x === b.x && a.y === b.y;
                };

                /*
                 * Get all the available tiles
                 */
                this.availableCells = function() {
                    var cells = [],
                        self = this;

                    this.forEach(function(x, y) {
                        var foundTile = self.getCellAt({
                            x: x,
                            y: y
                        });
                        if (!foundTile) {
                            cells.push({
                                x: x,
                                y: y
                            });
                        }
                    });

                    return cells;
                };

                /*
                 * Randomly insert a new tile
                 */
                this.randomlyInsertNewTile = function() {
                    var cell = this.randomAvailableCell(),
                        tile = this.newTile(cell, 2);
                    this.insertTile(tile);
                };

                /*
                 * Get a randomly available cell from all the
                 * currently available cells
                 */
                this.randomAvailableCell = function() {
                    var cells = this.availableCells();
                    if (cells.length > 0) {
                        return cells[Math.floor(Math.random() * cells.length)];
                    }
                };

                /*
                 * Check to see there are still cells available
                 */
                this.anyCellsAvailable = function() {
                    return this.availableCells().length > 0;
                };

                return this;
            }];
        })
        .directive('grid', function() {
            return {
                restrict: 'A',
                require: 'ngModel',
                scope: {
                    ngModel: '='
                },
                templateUrl: 'scripts/grid/grid.html'
            };
        }).directive('tile', function() {
            return {
                restrict: 'A',
                scope: {
                    ngModel: '='
                },
                templateUrl: 'scripts/grid/tile.html'
            };
        });

    angular.module('Keyboard', [])
        .service('KeyboardService', ['$document', function($document) {

            var UP = 'up',
                RIGHT = 'right',
                DOWN = 'down',
                LEFT = 'left';

            var keyboardMap = {
                37: LEFT,
                38: UP,
                39: RIGHT,
                40: DOWN
            };

            this.init = function() {
                var self = this;
                this.keyEventHandlers = [];
                $document.on('keydown', function(evt) {
                    var key = keyboardMap[evt.which];

                    if (key) {
                        // An interesting key was pressed
                        evt.preventDefault();
                        self._handleKeyEvent(key, evt);
                    }
                });
            };

            this.on = function(cb) {
                this.keyEventHandlers.push(cb);
            };

            this._handleKeyEvent = function(key, evt) {
                var callbacks = this.keyEventHandlers;
                if (!callbacks) {
                    return;
                }

                evt.preventDefault();

                if (callbacks) {
                    for (var x = 0; x < callbacks.length; x++) {
                        var cb = callbacks[x];
                        cb(key, evt);
                    }
                }
            };

        }]);
});