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

      //var hoarde = elm.find('img')[0];
      var background = elm.find('img')[1];
      var background2 = elm.find('img')[2];

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


        // render hints for 1st level
        if (sharedModel.get().level === 1) {
          mapContext.drawImage(
            imageLoader.get('text1'),
            100, 100,
            480, 300);
          mapContext.drawImage(
            imageLoader.get('text2'),
            700, 100,
            480, 300);
          mapContext.drawImage(
            imageLoader.get('text3'),
            3200, 100,
            480, 300);
          mapContext.drawImage(
            imageLoader.get('text4'),
            2100, 100,
            480, 300);
        }

        levelModel.tiles.forEach(function (col, row) {
          for (var i = 0; i < col.length; i++) {
            var x = tileSize * i,
              y = tileSize * row;

            if (col[i] === ' ') {
              // noop
            } else if (col[i] === 'c') {
              col[i+1] = ' ';
              col[i+2] = ' ';
              mapContext.drawImage(imageLoader.get('car'),
                  x, y,
                  tileSize*3, tileSize);
            } else if (col[i] === 'V') {
              levelModel.tiles[row+1][i] = ' ';
              mapContext.drawImage(imageLoader.get('vending-machine'),
                  x, y,
                  tileSize, 2*tileSize);
            } else if (col[i] === 'X') {
              mapContext.drawImage(imageLoader.get('brick'),
                  x, y,
                  tileSize, tileSize);
            } else if (col[i] === 'H') {
              mapContext.drawImage(imageLoader.get('hydrant'),
                  x, y,
                  tileSize, tileSize);
            }
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

        /*
        hoarde.style.left = +
          ((realCenterX < canvas.width/2 ?
            model.zombieWall
            : canvas.width/2 - realCenterX + model.zombieWall) - 1920) + 'px';
        */

        background.style.left = '-' + Math.floor(projectedUpperLeft/3)%1920 + 'px';
        background2.style.left = '-' + Math.floor(projectedUpperLeft/2)%1920 + 'px';

        // draw buttons
        model.buttons.forEach(function (button) {
          context.drawImage(
            button.pressed ? imageLoader.get('green-button') : imageLoader.get('red-button'),
            realCenterX < canvas.width/2 ?
              button.x
              : canvas.width/2 - realCenterX + button.x,
            button.y,
            60, 60);
        });

        // draw gates
        model.gates.forEach(function (gate) {
          if (!gate.open) {
            context.drawImage(
              imageLoader.get('gate'),
              realCenterX < canvas.width/2 ?
                gate.x
                : canvas.width/2 - realCenterX + gate.x,
              gate.y,
              gate.width, gate.height);
          }
        });

        // draw boxes
        model.boxes.forEach(function (box) {
          context.drawImage(imageLoader.get('crate'),
            realCenterX < canvas.width/2 ?
              box.x
              : canvas.width/2 - realCenterX + box.x,
            box.y,
            box.width, box.height);
        });

        // draw players
        var currentPlayer, playerIndex = 0;
        for (prop in model.players) {
          if (model.players.hasOwnProperty(prop)) {
            currentPlayer = model.players[prop];
            context.drawImage(imageLoader.get('player' + playerIndex),
              currentPlayer.frame, currentPlayer.frameType,
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
        
        
        context.drawImage(imageLoader.get('zombie-horde'),
          0, 0,
          1920, 1080,
          (realCenterX < canvas.width/2 ?
            model.zombieWall
            : canvas.width/2 - realCenterX + model.zombieWall) - 1874,
          0,
          1920,
          1080);

	
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

        // draw progress bar
        context.fillStyle = "#555";
        context.fillRect(
          canvas.width/2 - 200,
          15,
          400, 20);

        context.fillStyle = "#000";
        context.fillRect(
          canvas.width/2 - 200,
          15,
          400*(model.zombieWall / (tileSize * levelModel.tiles[0].length)), 20);

        playerIndex = 0;
        for (prop in model.players) {
          if (model.players.hasOwnProperty(prop)) {
            currentPlayer = model.players[prop];
            context.fillStyle = playerIndex ? "#00f" : "#f00";
            context.fillRect(
              canvas.width/2 - 200 + 400*(currentPlayer.x / (tileSize * levelModel.tiles[0].length)),
              15,
              20,
              20);
            playerIndex += 1;
          }
        }


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
