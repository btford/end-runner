/*
 * Game State
 */

var util = require('util');

var SocketronState = require('socketron').State;

var GameScoreState = module.exports = function (config) {
  SocketronState.apply(this, arguments);
  
  this.broadcast('change:route', '/game-score/' + this._name);

  /*
  this.on('update:controller', function (message, state, socket) {
    if (message.down) {
      state.broadcast('change:route', '/');
      state.moveAllTo(state._router.getSubstate('globalLobby'));

      // TODO: remove game
      //state._parent.destroySubstate(state._name);
    } else if (message.up) {
      state.removeAll();
      state._parent.reset();
      state._parent.start();
    }
  });
  */

  this.on('get:score', function (message, state, socket) {
    socket.emit('update:score', state._parent.score);
  });

};

util.inherits(GameScoreState, SocketronState);
