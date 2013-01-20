'use strict';

// Declare app level module
angular.module('gameApp', []).config(function ($routeProvider, $locationProvider) {
  $routeProvider
    .when('/', {
      templateUrl: 'partials/lobby-list',
      controller: 'LobbyListCtrl'
    })
    .when('/lobby/:id', {
      templateUrl: 'partials/lobby',
      controller: 'LobbyCtrl'
    })
    .when('/game/:id', {
      templateUrl: 'partials/game',
      controller: 'GameCtrl'
    })
    .when('/game-over/:id', {
      templateUrl: 'partials/game-over',
      controller: 'GameOverCtrl'
    })
    .when('/game-score/:id', {
      templateUrl: 'partials/game-score',
      controller: 'GameScoreCtrl'
    })
    .when('/loading', {
      templateUrl: 'partials/loading'
    })
    .otherwise({
      redirectTo: '/'
    });

  $locationProvider.html5Mode(true);
});
