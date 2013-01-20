// r1 moves into r2
var correct = module.exports = function (r1, r2) {
  // which corner hits?

  var r1left = r1.x,
      r1right = r1.x + r1.width,
      r1top = r1.y,
      r1bottom = r1.y + r1.height;

  var r2left = r2.x,
      r2right = r2.x + r2.width,
      r2top = r2.y,
      r2bottom = r2.y + r2.height;

  var top = false;

  // left side
  if (r1right > r2left && r2right > r1right) {

    // top left
    if (r1bottom > r2top && r2bottom > r1bottom) {
      if (r1bottom - r2top > r1right - r2left) {
        r1.x = r2.x - r1.width;
      } else {
        r1.y = r2.y - r1.height;
        top = true;
      }
    }

    // bottom left
    if (r1top > r2top && r2bottom > r1top) {
      if (r2bottom - r1top > r1right - r2left) {
        r1.x = r2.x - r1.width;
      } else {
        r1.y = r2bottom;
      }
    }

  }

  // right side
  if (r2right > r1left && r1left > r2left) {

    // top right
    if (r1bottom > r2top && r2bottom > r1bottom) {
      if (r1bottom - r2top > r2right - r1left) {
        r1.x = r2right;
      } else {
        r1.y = r2.y - r1.height;
        top = true;
      }
    }

    // bottom right
    if (r1top > r2top && r2bottom > r1top) {
      if (r2bottom - r1top > r2right - r1left) {
        r1.x = r2right;
      } else {
        r1.y = r2bottom;
      }
    }

  }

  if (top) {
    r1.yVelocity = 0;
    r1.jumping = false;
  }

};
