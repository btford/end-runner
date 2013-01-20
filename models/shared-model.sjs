
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

var SharedModel = module.exports = function (config) {
  this.timer = 0;
  this.players = {};

  this.zombieWall = 0;

  var socketIds = config.players;
  this.level = config.level;

  // TODO:
  if (this.level > 2) {
    this.level = 2;
  }

  this.initMap(JSON.parse(JSON.stringify(require('../public/json/levels/level-' + this.level + '.json').tiles)));

  // setup default player positions
  socketIds.forEach(function (socketId, playerNumber) {
    this.players[socketId] = {
      x: 20 + 200*playerNumber,
      y: 200,
      width: 60,
      height: 120,
      jumping: false,
      yVelocity: 0,
      frame: 0
    };
  }, this);
  
  this._changed = {};
};


SharedModel.prototype.initMap = function (tiles) {

  var tileSize = 60;

  // static things that you collide with
  this.entities = [];

  this.buttons = [];
  this.gates = [];

  this.zombies = [];
  this.boxes = [];


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

        case 'B':
          // TODO: fix button hitbox here
          this.boxes.push({
            x: tileSize * i,
            y: tileSize * row,
            width: 2*tileSize,
            height: 2*tileSize
          });

          tiles[row][i + 1] = ' ';
          tiles[row + 1][i] = ' ';
          tiles[row + 1][i + 1] = ' ';

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
            frame: 0,
            health: 3
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



SharedModel.prototype.calculate = function (delta, controller) {
  // timer
  this_(timer += delta / 10); // this.timer += delta / 10;

  this._calculatePlayerMovement(delta, controller);
  this._calculatePlayerLevelCollisions(delta, controller); // includes gates
  this._calculatePlayerCratesCollisions(delta, controller);

  this._calculatePushBoxes(delta, controller);

  this._calculateZombieMovement(delta, controller);
  this._calculateZombieLevelCollisons(delta, controller);
  this._calculateZombieCrateCollisons(delta, controller);

  this._calculatePlayerAttack(delta, controller);

  this._calculateZombieWallMovement(delta, controller);
  this._calculateButtonPress(delta, controller);
};


SharedModel.prototype._calculatePlayerMovement = function (delta, controller) {

  var groundY = 450;

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
       * Movement
       */

      currentPlayer.xVelocity = delta * ( 1 / (1 + 1.5*hitByZombie)) *
          ((~~currentController.right) - (~~currentController.left)) / 3;
  
      currentPlayer.x += currentPlayer.xVelocity;
      currentPlayer.y += currentPlayer.yVelocity;


      /*
       * Jump/Fall
       */

      if (currentPlayer.jumping) {
        currentPlayer.yVelocity += delta/20;

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
       * Animation
       */

      //check for player movement to decide on frame
      if (~~currentController.right ||
          ~~currentController.left ||
          ~~currentController.up) {

        currentPlayer.frame = 240;
      } else {
        // else if(controller for zombie attack pressed
        // currentPlayer.frame = 120;
        currentPlayer.frame = 0;
      }

    }
  }
  this_(players = this.players)
};

// handles both entities and gates
SharedModel.prototype._calculatePlayerLevelCollisions = function (delta, controller) {

  var currentPlayer,
    currentController;

  // players
  for (var playerId in this.players) {
    if (this.players.hasOwnProperty(playerId) && controller.hasOwnProperty(playerId)) {

      /*
       * Collision detection for Entities
       */

      for (i = 0; i < this.entities.length; i++) {
        if (hit(currentPlayer, this.entities[i])) {

          currentPlayer.x -= currentPlayer.xVelocity;
          var xFixable = hit(currentPlayer, this.entities[i]);
          // x fixed

          currentPlayer.x += currentPlayer.xVelocity;
          currentPlayer.y -= currentPlayer.yVelocity;
          var yFixable = hit(currentPlayer, this.entities[i]);
          // y-fixed

          if (xFixable && yFixable) {
            // goood to go

          } else if (xFixable && !yFixable) {

            currentPlayer.x -= currentPlayer.xVelocity;
            currentPlayer.y += currentPlayer.yVelocity;

          } else if (!xFixable && yFixable) {
            // good to go
          } else {
            currentPlayer.x += currentPlayer.xVelocity;
            // both fixed
          }
          break;
        }
      }

      /*
       * Collision detection for Gates
       */

      // check if we hit a gate
      /*
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
        currentPlayer.x -= currentPlayer.xVelocity;
        currentPlayer.y -= currentPlayer.yVelocity;
      }
      */
    }
  }
};


SharedModel.prototype._calculateZombieMovement = function (delta, controller) {

  var zombieChaseThreshold = 300;

  this.zombies.forEach(function (zombie, zombieIndex) {
    var target, dist;
    var min = zombieChaseThreshold;

    zombie.frame = Math.floor(this.timer/100) % 3;
    
    for (var playerId in this.players) {
      if (this.players.hasOwnProperty(playerId)) {

        dist = Math.abs(this.players[playerId].x - zombie.x);
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


SharedModel.prototype._calculatePlayerCratesCollisions = function (delta, controller) {
  
  for (var playerId in this.players) {
    if (this.players.hasOwnProperty(playerId)) {
      this.boxes.forEach(function (box) {
        if (hit(this.players[playerId], box)) {

          // if we can undo the collision by undoing the y-movement, do so
          // otherwise, push the box

          } else if (this.players[playerId].xVelocity > 0) {
            box.x = this.players[playerId].x + this.players[playerId].width;
          } else {
            box.x = this.players[playerId].x - box.width;
          }

          // if the box is now hitting a gate or some entity, undo it, and undo the player's x-movement

        }
      }, this);
    }
  }

  this_(boxes = this.boxes);
};


SharedModel.prototype._calculateZombieCrateCollisons = function (delta, controller) {

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
};

SharedModel.prototype._calculatePlayerAttack = function (delta, controller) {
  
  var toRemove = [];

  for (var playerId in this.players) {
    if (this.players.hasOwnProperty(playerId) && controller.hasOwnProperty(playerId) && controller[playerId].space) {
      this.zombies.forEach(function (zombie) {
        if (hit(this.players[playerId], zombie)) {
          zombie.health -= 1;
          controller[playerId].space = false;

          if (zombie.health <= 0) {
            toRemove.push(zombie);
          }
        }
      }, this);
    }
  }

  // TODO: remove zombies
  toRemove.forEach(function (zombie) {
    zombie.x = -1000;
  });

  this_(zombies = this.zombies);
};



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
};

// return true iff zombies have overtaken either player
SharedModel.prototype.isNextLevel = function () {

  for (var playerId in this.players) {
    if (this.players.hasOwnProperty(playerId)) {
      currentPlayer = this.players[playerId];
      if (currentPlayer.x > 2000) {
        return true;
      }
    }
  }

  return false;
};

SharedModel.prototype.getChanges = function () {
  var changed = this._changed;
  this._changed = {};
  return changed;
};
