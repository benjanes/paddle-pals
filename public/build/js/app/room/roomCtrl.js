angular.module('pp-room', [])

.controller('roomCtrl', function($scope, $rootScope, socket, $window) {

  $scope.score = 0;
  $scope.clientId = $rootScope.id;

  $scope.gameRoom = '';

  var width = 500;
  var height = 500;
  var paddleW = 6;
  var paddleL = 90;
  var ballRad = 12;
  var baseSpeed = 2;

  var board, userPaddle, clientPaddle, gameball;
  // store everyone but the client
  var gamePaddles = {};
  // include an impact handler only for client
  var impactHandlers = {};
  // store all users
  var allPlayers = [];

  /****************
  ** The Game Board
  ****************/
  function setupBoard() {
    board = d3.select('#game_board')
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    var defs = board.append('defs');

    var lightFilter = defs.append('filter')
      .attr('id', 'light_filter')
      .attr('filterUnits', 'userSpaceOnUse');

    lightFilter.append('feGaussianBlur')
      .attr('stdDeviation', 5)
      .attr('in', 'SourceAlpha')
      .attr('result', 'BLUR');

    var lightFilterFe = lightFilter.append('feSpecularLighting')
      .attr('in', 'BLUR')
      .attr('surfaceScale', 6)
      .attr('specularConstant', 1)
      .attr('specularExponent', 30)
      .attr('lighting-color', '#FFFFFF')
      .attr('result', 'SPECULAR');

    lightFilterFe.append('fePointLight')
      .attr('x', 40)
      .attr('y', -30)
      .attr('z', 200);

    lightFilter.append('feComposite')
      .attr('in', 'SPECULAR')
      .attr('in2', 'SourceGraphic')
      .attr('operator', 'in')
      .attr('result', 'COMPOSITE');

    var filterMerge = lightFilter.append('feMerge');

    filterMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    filterMerge.append('feMergeNode').attr('in', 'COMPOSITE');
  }

  /****************
  ** Paddle Class
  ****************/
  function Paddle(owner, side, id) {
    this.owner = owner;
    this.side = side;
    this.id = id.replace(/[^\w\s]/gi, '');
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
      .attr('height', function(rect) { return rect.l; });

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
        var score;

        if (data.side === 'left' || data.side === 'right') {
          if (ballData.cy < y || ballData.cy > y + paddleL) {
            vy = 0;
            score = 0;
          } else {
            vy = -(((paddleL / 2) - (ballData.cy - y)) / paddleL) * 16;
            score = $scope.score + 1;
          }
          ballData.vy = vy;
        } else if (data.side === 'top' || data.side === 'bottom') {
          if (ballData.cx < x || ballData.cx > x + paddleL) {
            vx = 0;
            score = 0;
          } else {
            vx = -(((paddleL / 2) - (ballData.cx - x)) / paddleL) * 16;
            score = $scope.score + 1;
          }
          ballData.vx = vx;
        }

        socket.emit('ballImpact', {
          room : $scope.gameRoom,
          owner : $scope.clientId,
          score : score,
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
    socket.emit('movingPaddle', {room : $scope.gameRoom, paddle : data});
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
    socket.emit('movingPaddle', {room : $scope.gameRoom, paddle : d});
  });

  /****************
  ** Ball Class
  ****************/
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
      .attr('fill', '#000000');
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

    playTimer = d3.timer(function() {
      gameball.move();
    }, 500);
  }

  function setBall(data) {
    startGame(data.cx, data.cy, data.vx, data.vy);
  }

  function resetBall(data) {
    gameball.resetPosition(data);
  }

  // add players to game
  function updatePaddles(playerList) {
    var players = Object.keys(playerList);

    players.forEach(function(player) {
      if (allPlayers.indexOf(player) === -1) {
        if (player === $scope.clientId) {
          clientPaddle = new Paddle('client', playerList[player], player);
        } else {
          gamePaddles[playerList[player]] = new Paddle('foreign', playerList[player], player);
        }
        allPlayers.push(player);
      }
    });
  }

  // SOCKET HANDLERS
  socket.on('start new game', function(id) {
    if (id === $rootScope.id) {
      allPlayers.push(id);
      $scope.gameRoom = id;
      startGame(width / 2, height / 2, Math.cos(Math.PI / 3) * baseSpeed, Math.sin(Math.PI / 3) * baseSpeed);
      clientPaddle = new Paddle('client', 'bottom', id);
    }
  });

  socket.on('add player', function(room) {
    updatePaddles(room.players);

    if ($scope.gameRoom.length === 0) {
      $scope.gameRoom = room.room;  
    }
    
    if (gameball) {
      var ballData = {
        cx : gameball.cx,
        cy : gameball.cy,
        vx : gameball.vx,
        vy : gameball.vy
      };
      var data = {
        room : $scope.gameRoom,
        ball : ballData
      };
      socket.emit('ballCoords', data);
    }
  });

  socket.on('move paddle', function(data) {
    if (gamePaddles[data.side]) {
      gamePaddles[data.side].repositionPaddle(data);
    }
  });

  socket.on('set ball', function(ball) {
    if (!gameball) {
      setBall(ball);
    }
  });

  socket.on('reset ball', function(ball) {
    resetBall(ball.data);

    if (ball.score === 0) {
      $scope.score = ball.score;
      board.classed('newball', false);
      setTimeout(function() {
        board.classed('newball', true);  
      }, 50);
    } else {
      $scope.score = Math.max($scope.score, ball.score);
    }

  });

  socket.on('remove player', function(player) {
    if (allPlayers.indexOf(player) !== -1) {
      d3.select('#' + player.replace(/[^\w\s]/gi, '')).remove();
    }
  });

  $scope.$on('$locationChangeStart', function(next, current) {
    socket.emit('leaveRoom', {
      id : $scope.clientId,
      room : $scope.gameRoom
    });

    $rootScope.gameRoom = '';
    $window.location.reload();
  });

  $scope.init = function() {
    setupBoard();
  };
  
  $scope.init();
});