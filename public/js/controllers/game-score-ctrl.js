/*global angular:false*/
'use strict';

angular.module('gameApp').controller('GameScoreCtrl',
    function ($scope, socket, sharedModel) {

  socket.emit('get:score');
  
  socket.on('update:score', function (score) {
    $scope.score = score;
  });

  /*
   * Expose actions to score
   */

  $scope.playAgain = function () {
    // TODO:
  };
  
  $scope.mainMenu = function () {
    // TODO:
  };


  /**
   * Unbind events when out of this scope
   */

  $scope.$on('$destroy', function () {
    socket.off('update:lobby', onUpdateLobby);
  });


});
