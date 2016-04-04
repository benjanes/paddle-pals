var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 8080;

var allRooms = {};


app.use(express.static('public'));

io.on('connection', function(socket) {
  // send out list of open rooms
  var openRooms = {};
  for (var room in allRooms) {
    if (allRooms[room].length < 4) {
      openRooms[room] = allRooms[room];
    }
  }

  socket.send(openRooms);

  socket.on('roomAdd', function() {
    console.log('room added!');
    allRooms[socket.id] = [socket.id];
  });

});

http.listen(port, function() {
  console.log('listening on ' + port);
});