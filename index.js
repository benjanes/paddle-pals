var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 8080;

var allRooms = [['client1', 'client2'], ['client3', 'client4', 'client5', 'client6']];
var allClients = [];

app.use(express.static('public'));

io.on('connection', function(socket) {
  // send out list of open rooms
  var openRooms = allRooms.filter(function(room) {
    return room.length < 4;
  });

  socket.send(openRooms);


});

http.listen(port, function() {
  console.log('listening on ' + port);
});