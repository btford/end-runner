/*global angular:false, Image:false*/
'use strict';

angular.module('gameApp').factory('dataLoader', function ($http) {

  var resources = [
    '/json/sprites.json',
    '/json/levels/level-1.json',
    '/json/levels/level-2.json',
    '/json/levels/level-3.json',
    '/json/levels/level-4.json',
    '/json/levels/level-5.json',
    '/json/levels/tile-types.json'
  ];
  var toLoad = resources.length;
  var cache = {};
  var callback = function () {};

  var api = {
    get: function (resource) {
      return cache[resource];
    },

    load: function (resource) {
      $http.get(resource).success(function (data) {
        cache[resource] = data;
        toLoad -= 1;
        if (toLoad === 0) {
          callback();
        }
      });
    },

    preLoad: function () {
      resources.forEach(function (resource) {
        api.load(resource);
      });
      return api;
    },

    ready: function (cb) {
      if (toLoad === 0) {
        cb();
      } else {
        callback = cb;
      }
    }
  };

  return api;
});
