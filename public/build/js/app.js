var paddleApp = (function() {
  var app = {};

  // game variables
  var width = 500;
  var height = 500;
  var paddleW = 4;
  var paddleL = 80;

  var board, tPaddle, rPaddle, bPaddle, lPaddle, userPaddle;

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

  app.init = function() {
    setupBoard();
    lPaddle = new Paddle('foreign', 'left');
    tPaddle = new Paddle('client', 'top');
  };

  return app;
})();