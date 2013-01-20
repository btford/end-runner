
module.exports = function (r1, r2) {
  return ((r1.x + r1.width >= r2.x)
            && (r1.x <= r2.x + r2.width))
      && ((r1.y + r1.height >= r2.y)
            && (r1.y <= r2.y + r2.height));
};

/*
// r1 is assumed to be moving
// r1 hits the top of r2
exports.hitTop = function (r1, r2) {
  return (r1.yVelocity > 0) &&
    ( (r1.x + r1.width > r2.x && r1.x + r1.width < r2.x + r2.width) ||
      (r1.x > r2.x && r1.x < r2.x + r2.width));
};

// r1 is assumed to be moving
// r1 hits the left of r2
exports.hitLeft = function (r1, r2) {
  return (r1.xVelocity > 0) &&
    ( (r1.y + r1.height > r2.y && r1.y + r1.height < r2.y + r2.height) ||
      (r1.y > r2.y && r1.y < r2.y + r2.height));
};

// r1 is assumed to be moving
exports.hitRight = function (r1, r2) {
  return (r1.xVelocity < 0) &&
    ( (r1.x + r1.width > r2.x && r1.x + r1.width < r2.x + r2.width) ||
      (r1.x > r2.x && r1.x < r2.x + r2.width));
};
*/
