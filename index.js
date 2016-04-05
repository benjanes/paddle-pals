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
    socket.join(roomname);

    // UPDATE THIS SO THAT NEW PLAYERS CAN JOIN AFTER OLD PLAYERS LEAVE!
    var side = paddleSides[Object.keys(allRooms[roomname]).length];
    allRooms[roomname][socket.id] = side;

    io.to(roomname).emit('add player', allRooms[roomname]);
  });

  // deal with paddle movement
  socket.on('movingPaddle', function(data) {
    io.to(data.room).emit('move paddle', data.paddle);
  });

  socket.on('ballCoords', function(data) {
    io.to(data.room).emit('set ball', data.ball);
  });

  socket.on('ballImpact', function(ball) {
    io.to(ball.room).emit('reset ball', {
      owner : ball.owner,
      data : ball.data
    });
  });

  // leave room (remove user from room)
  socket.on('disconnect', function(data) {
    // let the clients know
    io.emit('remove player', socket.id);
    // remove player from room
    for (var room in allRooms) {
      if (allRooms[room][socket.id]) {
        delete allRooms[room][socket.id];
        // if last person to leave room, delete room
        if (Object.keys(allRooms[room]).length === 0) {
          delete allRooms[room];
        }
      }
    }
  });

});

http.listen(port, function() {
  console.log('listening on ' + port);
});