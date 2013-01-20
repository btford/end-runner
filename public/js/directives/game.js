/*global angular:false*/

angular.module('gameApp').directive('game',
    function ($window, fullscreen, gameController, dataLoader, imageLoader, sharedModel, socket) {

  var canvasWidth = 1000,
    canvasHeight = 600,
    tileSize = 60;

  return {
    templateUrl: '/directives/game',
    restrict: 'E',
    link: function (scope, elm, attrs) {

      /*
       * Get background elements
       */

      var background = elm.find('img')[0];
      var background2 = elm.find('img')[1];

      /*
       * Render Map
       */

      var mapCanvas = elm.find('canvas')[1];
      var mapContext = mapCanvas.getContext('2d');

      mapCanvas.width = 1920;
      mapCanvas.height = 1080;

      /*
       * Setup Map and Tiles
       */

      // TODO: clean up how this is copied
      var levelModel = angular.copy(dataLoader.get('/json/levels/level-1.json'));
      // split strings into arrays
      levelModel.tiles.forEach(function (col, row) {
        levelModel.tiles[row] = col.split('');
      });

      // TODO: clean up how this is copied
      var tileTypes = angular.copy(dataLoader.get('/json/levels/tile-types.json'));
      // split strings into arrays
      tileTypes.types.forEach(function (type) {
        type.shape.forEach(function (row, rowIndex) {
          type.shape[rowIndex] =  row.split('');
        });
      });

      // augment type data for faster init render
      tileTypes.types.forEach(function (type) {
        // TODO: this assumption might break down
        type.firstChar = type.shape[0][0];
      });

      var isType = function (row, col, type) {

        if (levelModel.tiles.length <= row + type.shape.length ||
            levelModel.tiles[0].length <= col + type.shape[0].length) {
          return false;
        }

        var typeRow;
        for (var i = 0; i < type.shape.length; i++) {
          typeRow = type.shape[i];
          for (var j = 0; j < typeRow.length; j++) {
            if (typeRow[j] !==
                levelModel.tiles[row + i][col + j]) {
              return false;
            }
          }
        }
        return true;
      };

      var clearType = function (row, col, type) {
        var typeRow;
        for (var i = 0; i < type.shape.length; i++) {
          typeRow = type.shape[i];
          for (var j = 0; j < typeRow.length; j++) {
            levelModel.tiles[row + i][col + j] = ' ';
          }
        }
      };

      var renderMap = function () {
        mapCanvas.width = tileSize * levelModel.tiles[0].length;
        mapCanvas.height = tileSize * levelModel.tiles.length;

        levelModel.tiles.forEach(function (col, row) {
          for (var i = 0; i < col.length; i++) {
            var x = tileSize * i,
              y = tileSize * row;

            tileTypes.types.forEach(function (type) {
              if (isType(row, i, type)) {
                clearType(row, i, type);
                mapContext.drawImage(imageLoader.get(type.image),
                  x, y,
                  60, 120);
              }
            });
          }
        });
      };

      renderMap();

      /*
       * Render map again on level change
       */

      socket.getRaw().on('init:shared:model', function () {
        mapContext.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
        
        // TODO: DRY

        // TODO: clean up how this is copied
        levelModel = angular.copy(dataLoader.get('/json/levels/level-' + sharedModel.get().level + '.json'));
        // split strings into arrays
        levelModel.tiles.forEach(function (col, row) {
          levelModel.tiles[row] = col.split('');
        });

        // TODO: clean up how this is copied
        tileTypes = angular.copy(dataLoader.get('/json/levels/tile-types.json'));
        // split strings into arrays
        tileTypes.types.forEach(function (type) {
          type.shape.forEach(function (row, rowIndex) {
            type.shape[rowIndex] =  row.split('');
          });
        });

        // augment type data for faster init render
        tileTypes.types.forEach(function (type) {
          // TODO: this assumption might break down
          type.firstChar = type.shape[0][0];
        });

        renderMap();
      });

      // TODO:
      /*
      socket.getRaw().on('update:countdown', function (message) {
        if (message === 0) {

        } else {

        }
      })
      */


      /*
       * Render Models
       */

      var canvas = elm.find('canvas')[0];
      var context = canvas.getContext('2d');
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      var render = function () {
        context.clearRect(0, 0, canvas.width, canvas.height);
        // draw some shit

        var model = sharedModel.get();

        var realCenterX = 0;
        var prop, numberOfPlayers = 0;
        for (prop in model.players) {
          if (model.players.hasOwnProperty(prop)) {
            currentPlayer = model.players[prop];
            realCenterX += currentPlayer.x;
            numberOfPlayers += 1;
          }
        }
        realCenterX /= numberOfPlayers;

        projectedUpperLeft = Math.max(realCenterX - canvas.width/2, 0);
        mapCanvas.style.left = '-' + projectedUpperLeft + 'px';

        background.style.left = '-' + Math.floor(projectedUpperLeft/3)%1920 + 'px';
        background2.style.left = '-' + Math.floor(projectedUpperLeft/2)%1920 + 'px';

        // draw buttons
        model.buttons.forEach(function (button) {
          context.fillStyle = button.pressed ? "#0f0" : "#f00";
          context.fillRect(
            realCenterX < canvas.width/2 ?
              button.x
              : canvas.width/2 - realCenterX + button.x,
            button.y,
            60, 60);
        });

        // draw boxes
        model.boxes.forEach(function (box) {
          context.fillStyle = "#3bc";
          context.fillRect(
            realCenterX < canvas.width/2 ?
              box.x
              : canvas.width/2 - realCenterX + box.x,
            box.y,
            box.width, box.height);
        });

        // draw gates
        model.gates.forEach(function (gate) {
          context.fillStyle = gate.open ? "#fff" : "#00f";
          context.fillRect(
            realCenterX < canvas.width/2 ?
              gate.x
              : canvas.width/2 - realCenterX + gate.x,
            gate.y,
            gate.width, gate.height);
        });

        // draw players
        var currentPlayer, playerIndex = 0;
        for (prop in model.players) {
          if (model.players.hasOwnProperty(prop)) {
            currentPlayer = model.players[prop];
            context.drawImage(imageLoader.get('player' + playerIndex),
              0, currentPlayer.frame,
              60, 120,
              realCenterX < canvas.width/2 ?
                currentPlayer.x
                : canvas.width/2 - realCenterX + currentPlayer.x,
              currentPlayer.y,
              60, 120);
            playerIndex += 1;
          }
        }

        //draw zombie hoard
        context.fillStyle = "#000";
        context.fillRect(0, 0,
          realCenterX < canvas.width/2 ?
            model.zombieWall
            : canvas.width/2 - realCenterX + model.zombieWall,
          canvas.height);
	
        //draw zombies
        model.zombies.forEach(function (zombie) {
          context.drawImage(imageLoader.get('zombie'),
            zombie.frame*60, 0,
            60, 120,
            realCenterX < canvas.width/2 ?
              zombie.x
              : canvas.width/2 - realCenterX + zombie.x,
            zombie.y,
            60, 120);
        });

        // send keystrokes
        var ctrl = gameController.get();
        if (ctrl) {
          socket.getRaw().emit('update:controller', ctrl);
        }

        $window.requestAnimationFrame(render);
      };

      // start rendering the game
      render();


      /*
       * Bind Events
       */

       /*
      angular.element(canvas).bind('click', function (ev) {
        // on click ...
      });
      */


      /*
       * Watch for fullscreen
       */

      scope.$watch(function () {
        return fullscreen.get();
      }, function (fullscreenSetting) {
        if (fullscreenSetting) {
           canvas.width = $window.document.width;
           canvas.height = $window.document.height;
        } else {
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
        }
      });


      /*
       * stop rendering when out of scope
       */

      scope.$on('$destroy', function () {
        render = function () {};
      });
    }
  };
});
