var paddleApp = (function() {
  var app = {};
  var socket = io();

  // entry point variables
  var $currentGames = $('#current_games');
  var clientId;
  var allPlayers = [];
  var gameRoom;
  var gameball;
  var roomScore, scoreboard;

  // game variables
  var width = 500;
  var height = 500;
  var paddleW = 4;
  var paddleL = 80;
  var ballRad = 12;
  var baseSpeed = 2;

  var board, userPaddle, clientPaddle;
  // store everyone but the client
  var gamePaddles = {};

  var impactHandlers = {};
  var gamePaused = null;


  /****************
  ** The Game Board
  ****************/
  function setupBoard() {
    board = d3.select('#game_board')
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // display the score
    scoreboard = d3.select('#game_score')
      .text(roomScore);
  }

  function updateScore(score) {
    scoreboard.text(score);
  }


  /****************
  ** Paddle Class
  ****************/
  function Paddle(owner, side, id) {
    this.owner = owner;
    this.side = side;
    this.id = id.slice(2);
    this.init();
  }

  Paddle.prototype.init = function() {
    var paddle = this;
    var data = {};
    data.side = this.side;

    if (this.side === 'left') {
      data.x = 0;
      data.y = (height / 2) - (paddleL / 2);
      data.w = paddleW;
      data.l = paddleL;
    } else if (this.side === 'right') {
      data.x = width - paddleW;
      data.y = (height / 2) - (paddleL / 2);
      data.w = paddleW;
      data.l = paddleL;
    } else if (this.side === 'top') {
      data.x = (width / 2) - (paddleL / 2);
      data.y = 0;
      data.w = paddleL;
      data.l = paddleW;
    } else if (this.side === 'bottom') {
      data.x = (width / 2) - (paddleL / 2);
      data.y = height - paddleW;
      data.w = paddleL;
      data.l = paddleW;
    }

    var newPaddle = board.append('rect');
    newPaddle.data([data])
      .classed(data.side + ' ' + this.owner, true)
      .attr('id', this.id)
      .attr('x', function(rect) { return rect.x; })
      .attr('y', function(rect) { return rect.y; })
      .attr('width', function(rect) { return rect.w; })
      .attr('height', function(rect) { return rect.l; })
      .attr('fill', '#000');

    if (this.owner === 'client') {
      newPaddle.call(dragHandler);

      document.addEventListener('keydown', function(e) {
        paddle.keyHandler(e.keyCode, data);
      });

      impactHandlers[this.side] = function(ballData) {
        var vy = ballData.vy;
        var vx = ballData.vx;
        var x = data.x;
        var y = data.y;

        if (data.side === 'left' || data.side === 'right') {
          if (ballData.cy < y || ballData.cy > y + paddleL) {
            vy = 0;
            roomScore = 0;
          } else {
            vy = -(((paddleL / 2) - (ballData.cy - y)) / paddleL) * 16;
            roomScore = roomScore + 1 || 1;
          }
        } else if (data.side === 'top' || data.side === 'bottom') {
          if (ballData.cx < x || ballData.cx > x + paddleL) {
            vx = 0;
            roomScore = 0;
          } else {
            vx = -(((paddleL / 2) - (ballData.cx - x)) / paddleL) * 16;
            roomScore = roomScore + 1 || 1;
          }
        }

        updateScore(roomScore);
        socket.emit('ballImpact', {
          room : gameRoom,
          owner : clientId,
          score : roomScore,
          data : {
            cx : ballData.cx,
            cy : ballData.cy,
            vx : ballData.vx,
            vy : ballData.vy
          }
        });
        return {
          vx : vx,
          vy : vy
        };
      };
    }
    // select user paddle for dragging purposes
    userPaddle = d3.select('.client');

    if (this.owner === 'foreign') {
      // UPDATE FUNCTION FOR HANDLING INCOMING DATA
      this.repositionPaddle = function(data) {
        newPaddle.data([data])
          .attr('x', data.x)
          .attr('y', data.y);
      };
    }
  };

  Paddle.prototype.keyHandler = function(key, data) {
    if (this.side === 'bottom' || this.side === 'top') {
      if (key === 39) {
        data.x += 10;
        data.x = Math.min(data.x, width - paddleL);
      } else if (key === 37) {
        data.x -= 10;
        data.x = Math.max(data.x, 0);
      }
      userPaddle.data([data]).attr('x', data.x);
    }
    if (this.side === 'left' || this.side === 'right') {
      if (key === 38) {
        data.y -= 10;
        data.y = Math.max(data.y, 0);
      } else if (key === 40) {
        data.y += 10;
        data.y = Math.min(data.y, height - paddleL);
      }
      userPaddle.data([data]).attr('y', data.y);
    }
    // emit data out to other players in this room, along with the side
    socket.emit('movingPaddle', {room : gameRoom, paddle : data});
  };

  // drag handler for the client's paddle
  var dragHandler = d3.behavior.drag().on('drag', function(d) {
    if (d.side === 'top' || d.side === 'bottom') {
      d.x += d3.event.dx;
      if (d.x < 0) {
        d.x = 0;
      } else if (d.x > width - paddleL) {
        d.x = width - paddleL;
      }
      userPaddle.data([d]).attr('x', d.x);
    } else if (d.side === 'left' || d.side === 'right') {
      d.y += d3.event.dy;
      if (d.y < 0) {
        d.y = 0;
      } else if (d.y > height - paddleL) {
        d.y = height - paddleL;
      }
      userPaddle.data([d]).attr('y', d.y);
    }
    // emit data out to other players in this room, along with the side
    socket.emit('movingPaddle', {room : gameRoom, paddle : d});
  });


  /****************
  ** Ball settings
  ****************/
  // add ball
  // start it in the center of the screen
  function Ball(x, y, vx, vy) {
    this.id = '#game_ball';
    this.cx = x;
    this.cy = y;
    this.rad = ballRad;

    this.vx = vx;
    this.vy = vy;
    
    board.append('circle').attr('id', this.id)
      .attr('cx', this.cx)
      .attr('cy', this.cy)
      .attr('r', ballRad)
      .attr('fill', '#FF0000');
  }

  Ball.prototype.draw = function() {
    board
      .selectAll('circle')
      .attr({
        cx : this.cx,
        cy : this.cy
      });
  };

  Ball.prototype.move = function() {
    var ball = this;

    ball.cx += ball.vx;
    ball.cy += ball.vy;

    if (ball.cx + ball.rad > width) {
      ball.cx = width - ball.rad;
      ball.vx = -ball.vx;
      if (impactHandlers.right) {
        ball.vy = impactHandlers.right(ball).vy;
      }
    }

    if (ball.cx < ball.rad) {
      
      ball.cx = ball.rad;
      ball.vx = -ball.vx;
      if (impactHandlers.left) {
        ball.vy = impactHandlers.left(ball).vy;
      }
    }

    if (ball.cy + ball.rad > height) {
      ball.cy = height - ball.rad;
      ball.vy = -ball.vy;
      if (impactHandlers.bottom) {
        ball.vx = impactHandlers.bottom(ball).vx;
      }
    }

    if (ball.cy < ball.rad) {
      ball.cy = ball.rad;
      ball.vy = -ball.vy;
      if (impactHandlers.top) {
        ball.vx = impactHandlers.top(ball).vx;
      }
    }

    ball.draw();
  };

  Ball.prototype.resetPosition = function(incomingData) {
    var data = incomingData;
    this.cx = data.cx;
    this.cy = data.cy;
    this.vx = data.vx;
    this.vy = data.vy;
  };

  // start up the ball
  function startGame(x, y, vx, vy) {
    board.selectAll('circle').remove();
    gameball = new Ball(x, y, vx, vy);

    // setTimeout or something here so that game does
    // not kickoff immediately
    gamePaused = false;
    playTimer = d3.timer(function() {
      gameball.move();
      return gamePaused;
    }, 500);
  }

  function addRoom() {
    socket.emit('roomAdd');
    gameRoom = clientId;
    roomScore = 0;
    setupBoard();
    allPlayers.push(clientId);
    startGame(width / 2, height / 2, Math.cos(Math.PI / 3) * baseSpeed, Math.sin(Math.PI / 3) * baseSpeed);

    clientPaddle = new Paddle('client', 'bottom', clientId);
  }


  // show all the rooms currently in play with fewer than 4 players
  function showRooms(rooms) {
    var counter = 1;

    for (var room in rooms) {
      createRoomListing(room, counter);
      counter++;
    }
  }

  function createRoomListing(room, count) {
    var $room = $('<li></li>');
    $room.text('Game ' + count);
    $room.addClass('current-game');
    $room.click(function() {
      joinRoom(room);
    });
    $currentGames.append($room);
  }


  function joinRoom(room) {
    gameRoom = room;
    setupBoard();
    socket.emit('joinRoom', room);
  }

  function setBall(data) {
    startGame(data.cx, data.cy, data.vx, data.vy);
  }

  function resetBall(data) {
    gameball.resetPosition(data);

  }

  function updatePaddles(playerList) {
    var players = Object.keys(playerList);

    players.forEach(function(player) {
      if (allPlayers.indexOf(player) === -1) {
        if (player === clientId) {
          clientPaddle = new Paddle('client', playerList[player], player);
        } else {
          gamePaddles[playerList[player]] = new Paddle('foreign', playerList[player], player);
        }
        allPlayers.push(player);
      }
    });
  }


  function addSocketListeners(s) {
    s.on('message', function(idAndRooms) {
      clientId = idAndRooms.id;
      showRooms(idAndRooms.rooms);
      // console.log(clientId);
    });

    s.on('add player', function(players) {
      updatePaddles(players);
      if (gameball) {
        var ballData = {
          cx : gameball.cx,
          cy : gameball.cy,
          vx : gameball.vx,
          vy : gameball.vy
        };
        var data = {
          room : gameRoom,
          ball : ballData
        };

        socket.emit('ballCoords', data);
      }
    });

    s.on('move paddle', function(data) {
      // paddle position, data need to come through
      if (gamePaddles[data.side]) {
        gamePaddles[data.side].repositionPaddle(data);
      }
    });

    s.on('remove player', function(player) {
      if (allPlayers.indexOf(player) !== -1) {
        d3.select('#' + player.slice(2)).remove();
      }
    });

    s.on('set ball', function(ball) {
      if (!gameball) {
        setBall(ball);
      }
    });

    s.on('reset ball', function(ball) {
      if (clientId !== ball.owner) {
        resetBall(ball.data);
      }

      if (!roomScore || ball.score === 0) {
        roomScore = ball.score;
      } else {
        roomScore = Math.max(roomScore, ball.score);
      }

      updateScore(roomScore);
    });
  }

  function addClickHandlers() {
    $('#add_game').click(function() {
      addRoom();
    });
  }

  /****************
  ** Start the app
  ****************/
  app.init = function() {
    addSocketListeners(socket);
    addClickHandlers();

  };

  return app;
})();