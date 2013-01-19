/*global angular:false*/

angular.module('gameApp').directive('game',
    function ($window, fullscreen, gameController, dataLoader, sharedModel, socket) {

  var canvasWidth = 1000,
    canvasHeight = 600,
    tileSize = 60;

  return {
    templateUrl: '/directives/game',
    restrict: 'E',
    link: function (scope, elm, attrs) {

      /*
       * Render Map
       */

      var mapCanvas = elm.find('canvas')[1];
      var mapContext = mapCanvas.getContext('2d');

      mapCanvas.width = 1920;
      mapCanvas.height = 1080;

      var levelModel = dataLoader.get('/json/levels/level-one.json');
      var renderMap = function () {
        levelModel.tiles.forEach(function (col, row) {
          for (var i = 0; i < col.length; i++) {
            switch (col[i]) {
              case ' ':
                mapContext.fillStyle = "#fff";
                break;

              case '=':
                mapContext.fillStyle = "#ccc";
                break;

              default:
                mapContext.fillStyle = "#ddd";
                break;
            }
            
            mapContext.fillRect(tileSize * i, tileSize * row, tileSize, tileSize);
          }
        });
      };

      renderMap();


      /*
       * Mock Models
       */

      var pretendModel = {
        player1: {
          x: 5,
          y: 5
        },
        player2: {
          x: 200,
          y: 5
        }
      };


      /*
       * Render Models
       */

      var canvas = elm.find('canvas')[0];
      var context = canvas.getContext('2d');
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

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
        var currentPlayer;
        context.fillStyle = "#000";
        for (prop in model.players) {
          if (model.players.hasOwnProperty(prop)) {
            currentPlayer = model.players[prop];
            context.fillRect(
              realCenterX < canvas.width/2 ?
                currentPlayer.x
                : canvas.width/2 - realCenterX + currentPlayer.x,
              canvas.width/2,
              currentPlayer.y,
              120, 120);
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

      angular.element(canvas).bind('click', function (ev) {
        // on click ...
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
