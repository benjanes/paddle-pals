angular.module('pp-services', [])

.factory('socket', function(socketFactory) {
  var mainSocket = socketFactory();
  return mainSocket;
})

.factory('roomFactory', function(socket, $rootScope) {

  var currentRooms = [];

  socket.on('message', function(data) {
    $rootScope.id = data.id;
    currentRooms = Object.keys(data.rooms);
  });

  socket.on('update games', function(data) {
    currentRooms = Object.keys(data);
  });

  var getRooms = function() {
    return currentRooms;
  };

  return {
    getRooms : getRooms
  };

});