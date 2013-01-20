/*
 * Game State
 */

var util = require('util');

var SocketronState = require('socketron').State;

var SharedModel = require('../models/shared-model.js');

var GameOverState = require('./game-over-state');

var GameState = module.exports = function (config) {
  SocketronState.apply(this, arguments);

  this.maxPlayers = 4;
  this.numberOfPlayers = 0;

  this.level = 1;

  this.reset();

  this.on('update:controller', function (message, state, socket) {
    state.controller[socket.id] = message;
  });
};

util.inherits(GameState, SocketronState);

GameState.prototype.add = function (socket) {

  // limit the number of sockets that can join
  if (this.numberOfPlayers >= this.maxPlayers) {
    return;
  }

  this.numberOfPlayers += 1;

  var ret = SocketronState.prototype.add.apply(this, arguments);

  socket.emit('change:route', '/game/' + this._name);
  socket.emit('init:shared:model', this.model);

  // clear controller when a player joins
  this.controller[socket.id] = {};

  //this.broadcast('update:shared:model', this.repr());

  // when the first player joins, start the game
  if (this.numberOfPlayers === 1) {
    this.start();
  }

  return ret;
};

GameState.prototype.remove = function (socket) {

  this.numberOfPlayers -= 1;

  // when the last player leaves, stop the game
  if (this.numberOfPlayers <= 0) {
    this.stop();
  }

  var ret = SocketronState.prototype.remove.apply(this, arguments);
  //this.broadcast('update:shared:model', this.repr());
  return ret;
};

// return a representation to be sent to the client
GameState.prototype.repr = function () {
  return this.model;
};


GameState.prototype.start = function() {

  var gameModel = this.model;
  var thisGameState = this;
  var thisControllerModel = this.controller;

  // last timestamp (in ms) since gamestate was updated
  var last = Date.now();
  var play = function () {
    var now = Date.now();
    //var diff = game.calculate(now - last, privateState);
    var diff = now - last;
    gameModel.calculate(diff, thisControllerModel);
    if (diff) {
      thisGameState.broadcast('update:shared:model', gameModel.getChanges());
    }
    last = now;

    // TODO: end the game somehow

    if (gameModel.isNextLevel()) {
      console.log('game over');
      thisGameState.nextLevel();
    } else if (gameModel.isGameOver()) {
      thisGameState.gameOver();
    } else {
      setTimeout(play, 15);
    }
  };
  play();

  // play is now a noop
  this.stop = function () {
    play = function () {};
  };
};

// restart a level
GameState.prototype.gameOver = function () {
  var newGameOver = this.substate({
    type: GameOverState
  });
  this.moveAllTo(newGameOver);
};

GameState.prototype.reset = function () {

  // NOTE: hack to grab sockets that may/may not have connected
  var socketIds = [];
  for (var socketId in this._parent._sockets) {
    if (this._parent._sockets.hasOwnProperty(socketId)) {
      socketIds.push(socketId);
    }
  }

  // TODO: name ? GameModel
  this.model = new SharedModel({
    players: socketIds,
    level: this.level
  });
  this.controller = {};

  this.broadcast('init:shared:model', this.model);
};

GameState.prototype.nextLevel = function () {
  this.level += 1;
  this.reset();
  this.start();
};
