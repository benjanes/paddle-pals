var paddleApp = (function() {
  var app = {};
  var socket = io();

  // entry point variables
  var $currentGames = $('#current_games');
  var clientId;
  var gameRoom;

  // game variables
  var width = 500;
  var height = 500;
  var paddleW = 4;
  var paddleL = 80;
  var ballRad = 12;
  var baseSpeed = 4;

  var board, tPaddle, rPaddle, bPaddle, lPaddle, userPaddle;

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
  }


  /****************
  ** Paddle Class
  ****************/
  function Paddle(owner, side) {
    this.owner = owner;
    this.side = side;
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

    var newPaddle = board.append('rect').data([data])
      .classed(data.side + ' ' + this.owner, true)
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

      impactHandlers[this.side] = function(ballCoord) {
        var x = data.x;
        var y = data.y;
        if (data.side === 'left' || data.side === 'right') {
          if (ballCoord < y || ballCoord > y + paddleL) {
            gamePaused = true;
            return 0;
          } else {
            return(-(((paddleL / 2) - (ballCoord - y)) / paddleL) * 16);
          }
        } else if (data.side === 'top' || data.side === 'bottom') {
          if (ballCoord < x || ballCoord > x + paddleL) {
            gamePaused = true;
            return 0;
          } else {
            return(-(((paddleL / 2) - (ballCoord - x)) / paddleL) * 16);
          }
        }
      };
    }
    // select user paddle for dragging purposes
    userPaddle = d3.select('.client');
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
  });


  /****************
  ** Ball settings
  ****************/
  // add ball
  // start it in the center of the screen
  function Ball(x, y) {
    this.id = '#game_ball';
    this.cx = x;
    this.cy = y;
    this.rad = ballRad;
    this.speed = baseSpeed;

    this.vx = Math.cos(Math.PI / 3) * this.speed;
    this.vy = Math.sin(Math.PI / 3) * this.speed;
    
    board.append('circle').attr('id', this.id)
      .attr('cx', width / 2)
      .attr('cy', height / 2)
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
        ball.vy = impactHandlers.right(ball.cy);
      }
    }

    if (ball.cx < ball.rad) {
      
      ball.cx = ball.rad;
      ball.vx = -ball.vx;
      if (impactHandlers.left) {
        ball.vy = impactHandlers.left(ball.cy);
      }
    }

    if (ball.cy + ball.rad > height) {
      ball.cy = height - ball.rad;
      ball.vy = -ball.vy;
      if (impactHandlers.bottom) {
        ball.vx = impactHandlers.bottom(ball.cx);
      }
    }

    if (ball.cy < ball.rad) {
      ball.cy = ball.rad;
      ball.vy = -ball.vy;
      if (impactHandlers.top) {
        ball.vx = impactHandlers.top(ball.cx);
      }
    }

    ball.draw();
  };

  // start up the ball
  function startGame() {
    board.selectAll('circle').remove();
    var gameball = new Ball(width / 2, height / 2);

    gamePaused = false;
    playTimer = d3.timer(function() {
      gameball.move();
      return gamePaused;
    }, 500);
  }

  function addRoom() {
    socket.emit('roomAdd');
    gameRoom = clientId;
    setupBoard();
    startGame();
    bPaddle = new Paddle('client', 'bottom');
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
    socket.emit('joinRoom', room);
  }


  function addSocketListeners(s) {
    s.on('message', function(idAndRooms) {
      clientId = idAndRooms.id;
      showRooms(idAndRooms.rooms);
      console.log(clientId);
    });

    s.on('add player', function(player) {
      console.log('add player ' + player);
    });
    // s.on('roomAssignment', function(roomname) {
    //   gameRoom = roomname;
    //   console.log('something happened');
    // });
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