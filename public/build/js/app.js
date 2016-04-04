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
    }
    // select user paddle for dragging purposes
    userPaddle = d3.select('.client');
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
    bPaddle = new Paddle('client', 'bottom');
  };

  return app;
})();