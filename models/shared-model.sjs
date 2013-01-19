
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

  // setup default player positions
  socketIds.forEach(function (socketId, playerNumber) {
    this.players[socketId] = {
      x: 20 + 200*playerNumber,
      y: 200,
      width: 120,
      height: 120
    };
  }, this);
  
  this._changed = {};
};

SharedModel.prototype.calculate = function (delta, controller) {
  // timer
  this_(timer += delta / 10); // this.timer += delta / 10;

  this._calculatePlayerMovement(delta, controller);
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

console.log(cachedEntityList);

var hit = function (r1, r2) {
  return ((r1.x + r1.width >= r2.x)
            && (r1.x <= r2.x + r2.width))
      && ((r1.y + r1.height >= r2.y)
            && (r1.y <= r2.y + r2.height));
}

SharedModel.prototype._calculatePlayerMovement = function (delta, controller) {

  // players
  for (var playerId in this.players) {
    if (this.players.hasOwnProperty(playerId) && controller.hasOwnProperty(playerId)) {

      this.players[playerId].x += delta * ((~~controller[playerId].right) - (~~controller[playerId].left)) / 3;
      this.players[playerId].y += delta * ((~~controller[playerId].down) - (~~controller[playerId].up)) / 3;
      
      var i, undo = false;
      for (i = 0; i < cachedEntityList.length; i++) {
        if (hit(this.players[playerId], cachedEntityList[i])) {
          undo = true;
          break;
        }
      }

      if (undo) {
        this.players[playerId].x -= delta * ((~~controller[playerId].right) - (~~controller[playerId].left)) / 3;
        this.players[playerId].y -= delta * ((~~controller[playerId].down) - (~~controller[playerId].up)) / 3;
      }

    }
  }
  this_(players = this.players)
}

SharedModel.prototype.getChanges = function () {
  var changed = this._changed;
  this._changed = {};
  return changed;
}
