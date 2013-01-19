/*
 * Game State
 */

var util = require('util');

var SocketronState = require('socketron').State;

var GameOverState = module.exports = function (config) {
  SocketronState.apply(this, arguments);

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
};

util.inherits(GameOverState, SocketronState);
