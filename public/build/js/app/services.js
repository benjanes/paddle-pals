angular.module('pp-services', [])

.factory('socket', function(socketFactory) {
  var mainSocket = socketFactory();
  return mainSocket;
})

.factory('roomFactory', function(socket, $rootScope) {

  var currentRooms = {};

  socket.on('message', function(data) {
    $rootScope.id = data.id;
    currentRooms = data.rooms;
  });

  socket.on('update games', function(data) {
    currentRooms = data;
  })

  var getRooms = function() {
    return currentRooms;
  };

  return {
    getRooms : getRooms
  };

});