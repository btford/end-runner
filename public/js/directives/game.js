/*global angular:false*/

angular.module('gameApp').directive('game',
    function ($window, fullscreen, gameController, sharedModel) {

  var canvasWidth = 1000,
    canvasHeight = 600;

  return {
    templateUrl: '/directives/game',
    restrict: 'E',
    link: function (scope, elm, attrs) {
      var canvas = elm.find('canvas')[0];

      var mapCanvas = elm.find('canvas')[1];

      var context = canvas.getContext('2d');
      var map;

      var tileWidth = 64;
      var tileHeight = 32;

      mapCanvas.width = 100*tileWidth;
      mapCanvas.height = 100*tileHeight;

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

      angular.element(canvas).bind('click', function (ev) {
        // on click ...
      });

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
      
      var render = function () {
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        //console.log(sharedModel.get());

        // draw some shit
        var currentPlayer;
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

      // stop rendering when out of scope

      scope.$on('$destroy', function () {
        render = function () {};
      });
    }
  };
});
