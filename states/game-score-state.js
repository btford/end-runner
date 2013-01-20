/*
 * Game State
 */

var util = require('util');

var SocketronState = require('socketron').State;

var GameState = require('./game-state');

var GameScoreState = module.exports = function (config) {
  SocketronState.apply(this, arguments);
  
  this.broadcast('change:route', '/game-score/' + this._name);

  this.on('play:again', function (message, state, socket) {
    state._parent.playAgain();
    state._parent.start();
    state.removeAll();
  });

  this.on('get:score', function (message, state, socket) {
    socket.emit('update:score', state._parent.score);
  });

};

util.inherits(GameScoreState, SocketronState);
