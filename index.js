var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 8080;

var allRooms = [];
var allClients = [];

app.use(express.static('public'));

http.listen(port, function() {
  console.log('listening on ' + port);
});