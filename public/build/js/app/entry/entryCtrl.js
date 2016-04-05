angular.module('pp-entry', [])

.controller('entryCtrl', function($scope, socket, $rootScope, $location, roomFactory) {
  $scope.games = [];
  $rootScope.gameRoom = '';

  socket.on('message', function() {
    $scope.games = roomFactory.getRooms();
  });

  socket.on('update games', function() {
    $scope.games = roomFactory.getRooms();
  });

  $scope.joinGame = function(room) {
    $rootScope.gameRoom = room;
    // redirect to game
    $location.path('/game');
    socket.emit('joinRoom', room);
  };

  $scope.addGame = function() {
    $rootScope.gameRoom = $rootScope.id;
    // redirect to game
    $location.path('/game');
    socket.emit('roomAdd', $rootScope.gameRoom);
  };

});