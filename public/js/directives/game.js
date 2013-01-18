/*global angular:false*/

angular.module('gameApp').directive('game',
    function ($window, fullscreen, gameController, dataLoader, sharedModel) {

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
        var currentPlayer;
        context.fillStyle = "#000";
        for (var prop in pretendModel) {
          if (pretendModel.hasOwnProperty(prop)) {
            currentPlayer = pretendModel[prop];
            context.fillRect(currentPlayer.x + sharedModel.get().timer/10, currentPlayer.y, 150, 100);
          }
        }

        // send keystrokes

        /*
        if (gameController) {
          socket.getRaw().emit('controls', gameController);
        }
        */

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
