angular.module('pp-entry', [])

.controller('entryCtrl', function($scope, socket, $rootScope, $location, roomFactory) {
  $scope.games = {};
  $rootScope.gameRoom = '';

  socket.on('message', function() {
    $scope.games = roomFactory.getRooms();
  });

  socket.on('update games', function() {
    $scope.games = roomFactory.getRooms();
  });
  // MOVE THIS INTO A SEPARATE SERVICE
  // FOR STORING CURRENT GAMES???
  // socket.on('message', function(data) {
  //   $rootScope.id = data.id;
  //   $scope.games = data.rooms;
  // });

  // socket.on('update games', function(data) {
  //   console.log(data);
  //   $scope.games = data;
  // });

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