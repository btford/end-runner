/*
 * Game State
 */

var util = require('util');

var SocketronState = require('socketron').State;

var GameOverState = module.exports = function (config) {
  SocketronState.apply(this, arguments);

  // cheating
  this._parent.broadcast('level:failed');

  this.on('main:menu', function (message, state) {
    state.broadcast('change:route', '/');
    state._parent.removeAll(state._router.getSubstate('globalLobby'));
  });

  this.on('restart:level', function (message, state, socket) {
    state.removeAll();
    state._parent.reset();
    state._parent.start();
  });

};

util.inherits(GameOverState, SocketronState);
