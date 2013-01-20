/*global angular:false*/
'use strict';

angular.module('gameApp').controller('GameCtrl',
    function ($scope, socket, $routeParams, sound) {

  // TODO: send a request to join this game if possible

  $scope.showDialog = false;

  socket.on('level:failed', function () {
    $scope.showDialog = true;
  });

  sound.bgm();

});
