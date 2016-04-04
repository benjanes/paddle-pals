var paddleApp = (function() {
  var app = {};

  // game variables
  var width = 500;
  var height = 500;

  /****************
  ** The Game Board
  ****************/
  function setupBoard() {
    board = d3.select('#game_board')
      .append('svg')
      .attr('width', width)
      .attr('height', height);
  }

  app.init = function() {
    setupBoard();
  };

  return app;
})();