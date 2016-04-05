var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 8080;

var allRooms = {};
var paddleSides = ['bottom', 'top', 'left', 'right'];

app.use(express.static('public'));

io.on('connection', function(socket) {
  // send out list of open rooms
  var openRooms = {};
  for (var room in allRooms) {
    if (Object.keys(allRooms[room]).length < 4) {
      openRooms[room] = allRooms[room];
    }
  }
  socket.send({id : socket.id, rooms : openRooms});

  socket.on('roomAdd', function() {
    var id = socket.id;
    console.log('room added! ' + id);
    allRooms[id] = {};
    allRooms[id][id] = 'bottom';
    socket.to(id).emit('roomAssignment', id);
  });

  // join existing room
  socket.on('joinRoom', function(roomname) {
    console.log(roomname);
    socket.join(roomname);

    var side = paddleSides[Object.keys(allRooms[roomname]).length];

    allRooms[roomname][socket.id] = side;
    io.to(roomname).emit('add player', allRooms[roomname]);
  });

  // leave room (remove user from room)
  // if last person to leave room, delete room

});

http.listen(port, function() {
  console.log('listening on ' + port);
});