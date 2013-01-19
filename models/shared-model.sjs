
/**
 * Poor man's Object.observe with sweet.js
 * http://sweetjs.org/
 */

macro change_helper {
  case ($processed ...) ($rest) => {
    this._changed.$processed (.) ... = this._changed.$processed (.) ... || {}
  }
  case ($processed ...) ($rest_head $rest ...) => {
    this._changed.$processed (.) ... = this._changed.$processed (.) ... || {}
    change_helper ($processed ... $rest_head) ($rest ...)
  }
}

macro this_ {
  
  // -= operator
  case ($x -= $val:expr) => {
    this.$x -= $val;
    this._changed.$x = this.$x
  }
  case ($head . $rest (.) ... -= $val:expr) => {
    this.$head . $rest (.) ... -= $val;
    change_helper ($head) ($rest ...);
    this._changed.$head . $rest (.) ... = this.$head . $rest (.) ...
  }
  
  // += operator
  case ($x += $val:expr) => {
    this.$x += $val;
    this._changed.$x = this.$x
  }
  case ($head . $rest (.) ... += $val:expr) => {
    this.$head . $rest (.) ... += $val;
    change_helper ($head) ($rest ...);
    this._changed.$head . $rest (.) ... = this.$head . $rest (.) ...
  }

  // = operator
  case ($x = $val:expr) => {
    this.$x = $val;
    this._changed.$x = this.$x
  }
  case ($head . $rest (.) ... = $val:expr) => {
    this.$head . $rest (.) ... = $val;
    change_helper ($head) ($rest ...);
    this._changed.$head . $rest (.) ... = $val:expr
  }
}

/**
 * # How it works
 * Changes made inside of this_() will be added to this._changed, and
 * ultimately sent to the client.
 *
 * Use myModel.getChanges to get the changes and reset the change list.
 *
 * The this_() macro currently only supports the following operators:
 *    =
 *    +=
 *    -=
 *
 * ## Examples
 * The following are valid:
 *    this_(a.b.c.d = x + y)
 *    this_(x = += dx)
 *
 */


/**
 * Model
 */

var SharedModel = module.exports = function (socketIds) {
  this.timer = 0;
  this.players = {};
  this.zombies = 0;
  this.zombie = {
	x: 220,
	y: 450,
	width: 60,
	height: 120
  };
  // setup default player positions
  socketIds.forEach(function (socketId, playerNumber) {
    this.players[socketId] = {
      x: 20 + 200*playerNumber,
      y: 200,
      width: 120,
      height: 120,
      jumping: false,
      yVelocity: 0
    };
  }, this);
  
  this._changed = {};
};

SharedModel.prototype.calculate = function (delta, controller) {
  // timer
  this_(timer += delta / 10); // this.timer += delta / 10;

  this._calculatePlayerMovement(delta, controller);
  this._calculateZombieMovement(delta, controller);
  this._calculateZombiesMovement(delta, controller);
}

// helper
var entityList = function (tiles) {

  var entities = [];
  var tileSize = 60;

  tiles.forEach(function (col, row) {
    tiles[row] = col.split('');
  });

  tiles.forEach(function (col, row) {
    for (var i = 0; i < col.length; i++) {
      switch (col[i]) {
        case ' ':
          continue;

        case '=':
        case 'V':
        default:
          entities.push({
            x: tileSize * i,
            y: tileSize * row,
            height: tileSize,
            width: tileSize
          });
          break;

        // TOOPT: make fewer, but larger entities
        /*
        case 'V':
          try {
            col[i+1] = ' ';
            tiles[row+1][i] = ' ';
            tiles[row+1][i+1] = ' ';
            tiles[row+2][i] = ' ';
            tiles[row+2][i+1] = ' ';
            entities.push({
              x: tileSize * i,
              y: tileSize * row,
              height: 3*tileSize,
              width: 2*tileSize
            });
          }
          catch (e) {}
          break;
        */
      }
    }
  });

  return entities;
};

var cachedEntityList = entityList(require('../public/json/levels/level-one.json').tiles);

var hit = function (r1, r2) {
  return ((r1.x + r1.width >= r2.x)
            && (r1.x <= r2.x + r2.width))
      && ((r1.y + r1.height >= r2.y)
            && (r1.y <= r2.y + r2.height));
}

SharedModel.prototype._calculateZombieMovement = function (delta, controller) {
 var target;
 for (var playerId in this.players) {
    if (this.players.hasOwnProperty(playerId)) { 
	     target = this.players[playerId];
	     if(this.zombie.x - target.x < 100) {
		this.zombie.x += delta/10;
	     }
	     else if(target.x - this.zombie.x < 100) {
		this.zombie.x -= delta/10;
	     }		
	  }
	}
	this_(zombie = this.zombie);
}

SharedModel.prototype._calculateZombiesMovement = function (delta, controller) {
  this_(zombies = this.timer/8);
}

SharedModel.prototype._calculatePlayerMovement = function (delta, controller) {

  var groundY = 450;

  var player_y = 0;
  var player_x = 0;

  var currentPlayer,
    currentController;

  // players
  for (var playerId in this.players) {
    if (this.players.hasOwnProperty(playerId) && controller.hasOwnProperty(playerId)) { 

      currentPlayer = this.players[playerId];
      currentController = controller[playerId];

      /* 
       * Jump/Fall
       */

      if (currentPlayer.jumping) {
        currentPlayer.yVelocity += delta/20;
        player_y = currentPlayer.yVelocity;
      } else if (currentController.up) {
        currentPlayer.yVelocity = -20;
        currentPlayer.jumping = true;
      }
      if (currentPlayer.y > groundY) {
        currentPlayer.yVelocity = 0;
        currentPlayer.y = groundY;
        currentPlayer.jumping = false;
      }


      /*
       * Movement
       */
  
      currentPlayer.x += delta * ((~~currentController.right) - (~~currentController.left)) / 3;
      currentPlayer.y += player_y;

      /*
       * Collision detection
       */

      var i, undo = false;
      for (i = 0; i < cachedEntityList.length; i++) {
        if (hit(currentPlayer, cachedEntityList[i])) {
          undo = true;
          break;
        }
      }
      if (undo) {
        currentPlayer.x -= delta * ((~~currentController.right) - (~~currentController.left)) / 3;
        currentPlayer.y -= player_y;
      }

    }
  }
  this_(players = this.players)
}

// return true iff zombies have overtaken either player
SharedModel.prototype.isGameOver = function () {

  for (var playerId in this.players) {
    if (this.players.hasOwnProperty(playerId)) { 
      currentPlayer = this.players[playerId];
      if (currentPlayer.x < this.zombies) {
        return true;
      }
    }
  }

  return false;
}

SharedModel.prototype.getChanges = function () {
  var changed = this._changed;
  this._changed = {};
  return changed;
}
