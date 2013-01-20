/*global angular:false*/

angular.module('gameApp').directive('restartDialog',
    function ($window, sharedModel, $rootScope) {

  return {
    templateUrl: '/directives/restart-dialog',
    restrict: 'E',
    scope:{
      'active': '='
    },
    link: function (scope, elm, attrs) {

      elm.addClass('hidden');

      scope.$watch('active', function (val) {
        if (val) {
          elm.removeClass('hidden');
        } else {
          elm.addClass('hidden');
        }
      });
    },
    controller: function ($scope, $location, socket) {

      $scope.mainMenu = function () {
        $location.url('/');
      };

      $scope.restartLevel = function () {
        socket.emit('restart:level');
        $scope.active = false;
      };

      socket.on('restart:level', function () {
        $scope.active = false;
      });

    }
  };
});
