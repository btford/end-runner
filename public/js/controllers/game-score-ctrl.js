/*global angular:false*/
'use strict';

angular.module('gameApp').controller('GameScoreCtrl',
    function ($scope, $location, socket, sharedModel) {

  socket.emit('get:score');
  
  var onUpdateScore = function (score) {
    $scope.score = score;
  };

  socket.on('update:score', onUpdateScore);

  /*
   * Expose actions to score
   */

  $scope.playAgain = function () {
    socket.emit('play:again');
  };

  $scope.mainMenu = function () {
    $location.url('/');
  };


  /**
   * Unbind events when out of this scope
   */

  $scope.$on('$destroy', function () {
    socket.off('update:score', onUpdateScore);
  });


});
