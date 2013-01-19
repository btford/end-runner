
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

/*
 * Utils
 */

var hit = require('../lib/hit.js');

/**
 * Model
 */

var SharedModel = module.exports = function (socketIds) {
  this.timer = 0;
  this.players = {};

  this.zombieWall = 0;
  this.zombies = [];


  this.initMap(JSON.parse(JSON.stringify(require('../public/json/levels/level-one.json').tiles)));

  // setup default player positions
  socketIds.forEach(function (socketId, playerNumber) {
    this.players[socketId] = {
      x: 20 + 200*playerNumber,
      y: 200,
      width: 60,
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
  this._calculateZombieWallMovement(delta, controller);

  this._calculateButtonPress(delta, controller);
}

// helper
SharedModel.prototype.initMap = function (tiles) {

  var tileSize = 60;

  // static things that you collide with
  this.entities = [];

  this.buttons = [];
  this.gates = [];

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
          this.entities.push({
            x: tileSize * i,
            y: tileSize * row,
            width: tileSize,
            height: tileSize
          });
          break;

        // buttons
        // b
        case 'b':
          // TODO: fix button hitbox here
          this.buttons.push({
            x: tileSize * i,
            y: tileSize * row,
            width: tileSize,
            height: tileSize,
            pressed: false
          });
          break;

        // gates (opened by buttons)
        // |
        // |
        // ...
        case '|':
          // grab the whole gate by overwriting the '|' tiles below
          var next = row + 1;
          while (next < tiles.length && tiles[next][i] === '|') {
            tiles[next][i] = ' ';
            next += 1;
          }

          // TODO: fix gate hitbox here ?
          this.gates.push({
            x: tileSize * i,
            y: tileSize * row,
            width: tileSize,
            height: tileSize * (next - row),
            open: false
          });
          break;

        // zombie
        // z
        // z
        case 'z':
          this.zombies.push({
            x: tileSize * i,
            y: tileSize * row,
            width: 60,
            height: 120,
            frame: 0
          });
          tiles[row + 1][i] = ' ';
          break;

        // TOOPT: make fewer, but larger this.entities
        /*
        case 'V':
          try {
            col[i+1] = ' ';
            tiles[row+1][i] = ' ';
            tiles[row+1][i+1] = ' ';
            tiles[row+2][i] = ' ';
            tiles[row+2][i+1] = ' ';
            this.entities.push({
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
  }, this);
};


SharedModel.prototype._calculateZombieMovement = function (delta, controller) {

  var zombieChaseThreshold = 300;

  this.zombies.forEach(function (zombie, zombieIndex) {
    var target, dist;
    var min = zombieChaseThreshold;

    zombie.frame = Math.floor(this.timer/100) % 3;
    
    for (var playerId in this.players) {
      if (this.players.hasOwnProperty(playerId)) {

        dist = Math.abs(this.players[playerId].x - zombie.x)
        if (dist < min) {
          target = this.players[playerId];
          min = dist;
        }

      }
    }
    if (target && Math.abs(target.x - zombie.x) > 10) {
      zombie.x += zombie.x > target.x ?
        -delta/10
        : delta/10;
    }
  }, this);

  this_(zombies = this.zombies);
};

SharedModel.prototype._calculateZombieWallMovement = function (delta, controller) {
  this_(zombieWall = this.timer/8);
};

// assumptions: buttons always paired
// buttons[0] + button[1] --> gate[0] opens
SharedModel.prototype._calculateButtonPress = function (delta, controller) {
  //this_(zombies = this.timer/8);
  var changedButton = false,
    changedGate = false;

  this.buttons.forEach(function (button, buttonIndex) {
    if (!button.pressed) {
      for (var playerId in this.players) {
        if (this.players.hasOwnProperty(playerId) && hit(this.players[playerId], button)) {
          button.pressed = true;
          changedButton = true;

          if ((buttonIndex % 2 === 0 && this.buttons[buttonIndex+1].pressed) ||
              (buttonIndex % 2 === 1 && this.buttons[buttonIndex-1].pressed)) {

            this.gates[Math.floor(buttonIndex / 2)].open = true;
            changedGate = true;
          }
        }
      }
    }
  }, this);

  if (changedButton) {
    this_(buttons = this.buttons);
    if (changedGate) {
      this_(gates = this.gates);
    }
  }
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
       * Is the player hit by the zombie?
       */

      var hitByZombie = false;

      var i;
      for (i = 0; i < this.zombies.length; i++) {
        if (hit(currentPlayer, this.zombies[i])) {
          hitByZombie = true;
          break;
        }
      }


      /* 
       * Jump/Fall
       */

      if (currentPlayer.jumping) {
        currentPlayer.yVelocity += delta/20;
        player_y = currentPlayer.yVelocity;
      } else if (currentController.up) {
        currentPlayer.yVelocity = -20 * (1 / (1 + 2*hitByZombie));
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

      player_x = delta * ( 1 / (1 + 1.5*hitByZombie)) * ((~~currentController.right) - (~~currentController.left)) / 3;
  
      currentPlayer.x += player_x;
      currentPlayer.y += player_y;

      /*
       * Collision detection
       */

      undo = false;
      for (i = 0; i < this.entities.length; i++) {
        if (hit(currentPlayer, this.entities[i])) {
          undo = true;
          break;
        }
      }

      // check if we hit a gate
      if (!undo) {
        for (i = this.gates.length - 1; i >= 0; i--) {
          if (this.gates[i].open) {
            continue;
          } else if (hit(this.gates[i], currentPlayer)) {
            undo = true;
            break;
          }
        }
      }

      if (undo) {
        currentPlayer.x -= player_x;
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
      if (currentPlayer.x < this.zombieWall) {
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
