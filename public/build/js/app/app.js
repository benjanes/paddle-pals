angular.module('paddlePals', [
  'pp-entry',
  'pp-room',
  'ngRoute',
  'btford.socket-io',
  'pp-services'
])

.config(function($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: 'build/js/app/entry/entry.html',
      controller: 'entryCtrl'
    })
    .when('/game', {
      templateUrl: 'build/js/app/room/room.html',
      controller: 'roomCtrl'
    })
    .otherwise({
      redirectTo: '/'
    });
});