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
  console.log('CONNECTED');
  socket.send({id : socket.id, rooms : parseRooms(allRooms)});

  socket.on('roomAdd', function() {
    var id = socket.id;
    console.log('room added! ' + id);
    allRooms[id] = {};
    allRooms[id][id] = 'bottom';

    io.emit('update games', parseRooms(allRooms));
    
    setTimeout(function() {
      socket.emit('start new game', id);
    }, 100);
    
  });

  // join existing room
  socket.on('joinRoom', function(roomname) {
    socket.join(roomname);

    // UPDATE THIS SO THAT NEW PLAYERS CAN JOIN AFTER OLD PLAYERS LEAVE!
    var side = paddleSides[Object.keys(allRooms[roomname]).length];
    allRooms[roomname][socket.id] = side;
    io.emit('update games', parseRooms(allRooms));

    setTimeout(function() {
      io.to(roomname).emit('add player', {
        room : roomname,
        players : allRooms[roomname]
      });
    }, 100);
  
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
      data : ball.data,
      score : ball.score
    });
  });

  // leave room (remove user from room)
  socket.on('disconnect', function() {
    removePlayer(socket.id);
    io.emit('update games', parseRooms(allRooms));
  });

  // leave room but stay in app
  socket.on('leaveRoom', function(id) {
    removePlayer(id);
    io.emit('update games', parseRooms(allRooms));
  });

});

function removePlayer(id) {
  // let the clients know
  io.emit('remove player', id);
  // remove player from room
  for (var room in allRooms) {
    if (allRooms[room][id]) {
      delete allRooms[room][id];
      // if last person to leave room, delete room
      if (Object.keys(allRooms[room]).length === 0) {
        delete allRooms[room];
      }
    }
  }
}

function parseRooms(rooms) {
  var openRooms = {};
  for (var room in rooms) {
    if (Object.keys(rooms[room]).length < 4) {
      openRooms[room] = rooms[room];
    }
  }
  return openRooms;
}

http.listen(port, function() {
  console.log('listening on ' + port);
});