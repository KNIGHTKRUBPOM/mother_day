// Responsive canvas + slower, more readable "HAPPY BIRTHDAY!" intro
var c = document.getElementById("c") || window.c;
var ctx = c.getContext("2d");

var w, h, hw, hh;
var opts, calc;
var Tau = Math.PI * 2, TauQuarter = Tau / 4;
var letters = [];

var dpr = Math.min(window.devicePixelRatio || 1, 2);
var touchShards = [];

function computeOpts() {
  w = window.innerWidth;
  h = window.innerHeight;
  hw = w / 2;
  hh = h / 2;

  c.width = w * dpr;
  c.height = h * dpr;
  c.style.width = w + "px";
  c.style.height = h + "px";

  var maxLen = 0;
  for (var s = 0; s < ["HAPPY", "BIRTHDAY", "MOM"].length; s++) {
    if (["HAPPY", "BIRTHDAY", "MOM"][s].length > maxLen) maxLen = ["HAPPY", "BIRTHDAY", "MOM"][s].length;
  }

  // Responsive scale: on mobile (360-450px), target ~76% of screen width for max line.
  var targetWidth = Math.min(w * 0.76, 460);
  var idealSpacing = targetWidth / maxLen;
  var scale = Math.max(0.75, Math.min(1.4, idealSpacing / 35));

  // If height is tight (e.g. phone in landscape), scale down so all 3 lines fit comfortably
  var totalHeightNeeded = 3 * 44 * scale;
  if (totalHeightNeeded > h * 0.55) {
    scale = Math.max(0.45, (h * 0.55) / (3 * 44));
  }

  opts = {
    strings: ["HAPPY", "BIRTHDAY", "MOM"],
    charSize: 30 * scale,
    charSpacing: 35 * scale,
    lineHeight: 44 * scale,

    cx: hw,
    cy: hh,

    fireworkPrevPoints: 10,
    fireworkBaseLineWidth: 5,
    fireworkAddedLineWidth: 8,

    // --- INTRO TIMINGS (faster rockets, still readable) ---
    fireworkSpawnTime: 180,          // launches staggered but snappy
    fireworkBaseReachTime: 22,       // rockets climb quickly
    fireworkAddedReachTime: 12,
    fireworkCircleBaseSize: 22 * scale,
    fireworkCircleAddedSize: 12 * scale,
    fireworkCircleBaseTime: 14,      // faster burst grow
    fireworkCircleAddedTime: 10,
    fireworkCircleFadeBaseTime: 14,
    fireworkCircleFadeAddedTime: 8,
    fireworkBaseShards: 5,
    fireworkAddedShards: 5,
    fireworkShardPrevPoints: 3,
    fireworkShardBaseVel: 6,
    fireworkShardAddedVel: 2,
    fireworkShardBaseSize: 3 * scale,
    fireworkShardAddedSize: 3 * scale,
    gravity: 0.1,
    upFlow: -0.2,
    letterContemplatingWaitTime: 180,
    balloonSpawnTime: 40,
    balloonBaseInflateTime: 2,
    balloonAddedInflateTime: 2,
    balloonBaseSize: 20 * scale,
    balloonAddedSize: 20 * scale,
    balloonBaseVel: 1.0,
    balloonAddedVel: 0.4,
    balloonBaseRadian: -(Math.PI / 2 - 0.5),
    balloonAddedRadian: -1,
  };

  calc = {
    totalWidth: opts.charSpacing * maxLen,
  };

  ctx.font = "bold " + opts.charSize + "px 'Prompt', sans-serif";
}

function Letter(char, x, y) {
  this.char = char;
  this.x = x;
  this.y = y;

  this.dx = -ctx.measureText(char).width / 2;
  this.dy = +opts.charSize / 2;

  this.fireworkDy = this.y - hh;

  var hue = (x / calc.totalWidth) * 360;

  this.color = "hsl(hue,80%,50%)".replace("hue", hue);
  this.lightAlphaColor = "hsla(hue,80%,light%,alp)".replace("hue", hue);
  this.lightColor = "hsl(hue,80%,light%)".replace("hue", hue);
  this.alphaColor = "hsla(hue,80%,50%,alp)".replace("hue", hue);

  this.reset();
}
Letter.prototype.reset = function () {
  this.phase = "firework";
  this.tick = 0;
  this.spawned = false;
  this.spawningTime = (opts.fireworkSpawnTime * Math.random()) | 0;
  this.reachTime =
    (opts.fireworkBaseReachTime + opts.fireworkAddedReachTime * Math.random()) |
    0;
  this.lineWidth =
    opts.fireworkBaseLineWidth + opts.fireworkAddedLineWidth * Math.random();
  this.prevPoints = [[0, hh, 0]];
};
Letter.prototype.step = function () {
  if (this.phase === "firework") {
    if (!this.spawned) {
      ++this.tick;
      if (this.tick >= this.spawningTime) {
        this.tick = 0;
        this.spawned = true;
      }
    } else {
      ++this.tick;

      var linearProportion = this.tick / this.reachTime,
        armonicProportion = Math.sin(linearProportion * TauQuarter),
        x = linearProportion * this.x,
        y = hh + armonicProportion * this.fireworkDy;

      if (this.prevPoints.length > opts.fireworkPrevPoints)
        this.prevPoints.shift();

      this.prevPoints.push([x, y, linearProportion * this.lineWidth]);

      var lineWidthProportion = 1 / (this.prevPoints.length - 1);

      for (var i = 1; i < this.prevPoints.length; ++i) {
        var point = this.prevPoints[i],
          point2 = this.prevPoints[i - 1];

        ctx.strokeStyle = this.alphaColor.replace(
          "alp",
          i / this.prevPoints.length
        );
        ctx.lineWidth = point[2] * lineWidthProportion * i;
        ctx.beginPath();
        ctx.moveTo(point[0], point[1]);
        ctx.lineTo(point2[0], point2[1]);
        ctx.stroke();
      }

      if (this.tick >= this.reachTime) {
        this.phase = "contemplate";

        this.circleFinalSize =
          opts.fireworkCircleBaseSize +
          opts.fireworkCircleAddedSize * Math.random();
        this.circleCompleteTime =
          (opts.fireworkCircleBaseTime +
            opts.fireworkCircleAddedTime * Math.random()) |
          0;
        this.circleCreating = true;
        this.circleFading = false;

        this.circleFadeTime =
          (opts.fireworkCircleFadeBaseTime +
            opts.fireworkCircleFadeAddedTime * Math.random()) |
          0;
        this.tick = 0;
        this.tick2 = 0;

        this.shards = [];

        var shardCount =
            (opts.fireworkBaseShards +
              opts.fireworkAddedShards * Math.random()) |
            0,
          angle = Tau / shardCount,
          cos = Math.cos(angle),
          sin = Math.sin(angle),
          sx = 1,
          sy = 0;

        for (var i = 0; i < shardCount; ++i) {
          var x1 = sx;
          sx = sx * cos - sy * sin;
          sy = sy * cos + x1 * sin;

          this.shards.push(new Shard(this.x, this.y, sx, sy, this.alphaColor));
        }
      }
    }
  } else if (this.phase === "contemplate") {
    ++this.tick;

    if (this.circleCreating) {
      ++this.tick2;
      var proportion = this.tick2 / this.circleCompleteTime,
        armonic = -Math.cos(proportion * Math.PI) / 2 + 0.5;

      ctx.beginPath();
      ctx.fillStyle = this.lightAlphaColor
        .replace("light", 50 + 50 * proportion)
        .replace("alp", proportion);
      ctx.beginPath();
      ctx.arc(this.x, this.y, armonic * this.circleFinalSize, 0, Tau);
      ctx.fill();

      if (this.tick2 > this.circleCompleteTime) {
        this.tick2 = 0;
        this.circleCreating = false;
        this.circleFading = true;
      }
    } else if (this.circleFading) {
      ctx.fillStyle = this.lightColor.replace("light", 70);
      ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);

      ++this.tick2;
      var proportion = this.tick2 / this.circleFadeTime,
        armonic = -Math.cos(proportion * Math.PI) / 2 + 0.5;

      ctx.beginPath();
      ctx.fillStyle = this.lightAlphaColor
        .replace("light", 100)
        .replace("alp", 1 - armonic);
      ctx.arc(this.x, this.y, this.circleFinalSize, 0, Tau);
      ctx.fill();

      if (this.tick2 >= this.circleFadeTime) this.circleFading = false;
    } else {
      ctx.fillStyle = this.lightColor.replace("light", 70);
      ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);
    }

    for (var i = 0; i < this.shards.length; ++i) {
      this.shards[i].step();

      if (!this.shards[i].alive) {
        this.shards.splice(i, 1);
        --i;
      }
    }

    if (this.tick > opts.letterContemplatingWaitTime) {
      this.phase = "balloon";

      this.tick = 0;
      this.spawning = true;
      this.spawnTime = (opts.balloonSpawnTime * Math.random()) | 0;
      this.inflating = false;
      this.inflateTime =
        (opts.balloonBaseInflateTime +
          opts.balloonAddedInflateTime * Math.random()) |
        0;
      this.size =
        (opts.balloonBaseSize + opts.balloonAddedSize * Math.random()) | 0;

      var rad =
          opts.balloonBaseRadian + opts.balloonAddedRadian * Math.random(),
        vel = opts.balloonBaseVel + opts.balloonAddedVel * Math.random();

      this.vx = Math.cos(rad) * vel;
      this.vy = Math.sin(rad) * vel;
    }
  } else if (this.phase === "balloon") {
    ctx.strokeStyle = this.lightColor.replace("light", 80);

    if (this.spawning) {
      ++this.tick;
      ctx.fillStyle = this.lightColor.replace("light", 70);
      ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);

      if (this.tick >= this.spawnTime) {
        this.tick = 0;
        this.spawning = false;
        this.inflating = true;
      }
    } else if (this.inflating) {
      ++this.tick;

      var proportion = this.tick / this.inflateTime,
        x = (this.cx = this.x),
        y = (this.cy = this.y - this.size * proportion);

      ctx.fillStyle = this.alphaColor.replace("alp", proportion);
      ctx.beginPath();
      generateBalloonPath(x, y, this.size * proportion);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, this.y);
      ctx.stroke();

      ctx.fillStyle = this.lightColor.replace("light", 70);
      ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);

      if (this.tick >= this.inflateTime) {
        this.tick = 0;
        this.inflating = false;
      }
    } else {
      this.cx += this.vx;
      this.cy += this.vy += opts.upFlow;

      ctx.fillStyle = this.color;
      ctx.beginPath();
      generateBalloonPath(this.cx, this.cy, this.size);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(this.cx, this.cy);
      ctx.lineTo(this.cx, this.cy + this.size);
      ctx.stroke();

      ctx.fillStyle = this.lightColor.replace("light", 70);
      ctx.fillText(this.char, this.cx + this.dx, this.cy + this.dy + this.size);

      if (this.cy + this.size < -hh || this.cx < -hw || this.cx > hw)
        this.phase = "done";
    }
  }
};
function Shard(x, y, vx, vy, color) {
  var vel =
    opts.fireworkShardBaseVel + opts.fireworkShardAddedVel * Math.random();

  this.vx = vx * vel;
  this.vy = vy * vel;

  this.x = x;
  this.y = y;

  this.prevPoints = [[x, y]];
  this.color = color;

  this.alive = true;

  this.size =
    opts.fireworkShardBaseSize + opts.fireworkShardAddedSize * Math.random();
}
Shard.prototype.step = function () {
  this.x += this.vx;
  this.y += this.vy += opts.gravity;

  if (this.prevPoints.length > opts.fireworkShardPrevPoints)
    this.prevPoints.shift();

  this.prevPoints.push([this.x, this.y]);

  var lineWidthProportion = this.size / this.prevPoints.length;

  for (var k = 0; k < this.prevPoints.length - 1; ++k) {
    var point = this.prevPoints[k],
      point2 = this.prevPoints[k + 1];

    ctx.strokeStyle = this.color.replace("alp", k / this.prevPoints.length);
    ctx.lineWidth = k * lineWidthProportion;
    ctx.beginPath();
    ctx.moveTo(point[0], point[1]);
    ctx.lineTo(point2[0], point2[1]);
    ctx.stroke();
  }

  if (this.prevPoints[0][1] > hh) this.alive = false;
};
function generateBalloonPath(x, y, size) {
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(
    x - size / 2,
    y - size / 2,
    x - size / 4,
    y - size,
    x,
    y - size
  );
  ctx.bezierCurveTo(x + size / 4, y - size, x + size / 2, y - size / 2, x, y);
}

function buildLetters() {
  letters.length = 0;
  for (var i = 0; i < opts.strings.length; ++i) {
    for (var j = 0; j < opts.strings[i].length; ++j) {
      if (opts.strings[i][j] === " ") continue;
      letters.push(
        new Letter(
          opts.strings[i][j],
          j * opts.charSpacing +
            opts.charSpacing / 2 -
            (opts.strings[i].length * opts.charSpacing) / 2,
          i * opts.lineHeight +
            opts.lineHeight / 2 -
            (opts.strings.length * opts.lineHeight) / 2
        )
      );
    }
  }
}

function anim() {
  window.requestAnimationFrame(anim);

  // Clear canvas in native hardware pixels
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, c.width, c.height);

  // Scale by DPR and center on viewport in CSS pixels
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(hw, hh);

  var done = true;
  for (var l = 0; l < letters.length; ++l) {
    letters[l].step();
    if (letters[l].phase !== "done") done = false;
  }

  // Draw any touch spark particles
  for (var t = 0; t < touchShards.length; ++t) {
    touchShards[t].step();
    if (!touchShards[t].alive) {
      touchShards.splice(t, 1);
      --t;
    }
  }

  if (done) for (var l = 0; l < letters.length; ++l) letters[l].reset();
}

// Touch & tap spark burst for interactive feel on mobile
function spawnTouchBurst(clientX, clientY) {
  var touchX = clientX - hw;
  var touchY = clientY - hh;
  var count = 10;
  var angle = Tau / count;
  var baseHue = Math.random() * 360;
  for (var i = 0; i < count; i++) {
    var a = i * angle + (Math.random() - 0.5) * 0.4;
    var sx = Math.cos(a);
    var sy = Math.sin(a);
    var color = "hsla(" + ((baseHue + i * 25) % 360) + ", 90%, 60%, alp)";
    touchShards.push(new Shard(touchX, touchY, sx, sy, color));
  }
}

window.addEventListener("pointerdown", function (e) {
  spawnTouchBurst(e.clientX, e.clientY);
}, { passive: true });

computeOpts();
buildLetters();
anim();

if (document.fonts) {
  document.fonts.ready.then(function () {
    computeOpts();
    buildLetters();
  });
}

var lastW = window.innerWidth;
var lastH = window.innerHeight;
var resizeTimer;

window.addEventListener("resize", function () {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function () {
    var newW = window.innerWidth;
    var newH = window.innerHeight;
    // On mobile, slight address bar shifts change height by < 100px.
    // Only rebuild full letters if width changes or height changes significantly.
    if (newW !== lastW || Math.abs(newH - lastH) > 100) {
      lastW = newW;
      lastH = newH;
      computeOpts();
      buildLetters();
    } else {
      w = newW;
      h = newH;
      hw = w / 2;
      hh = h / 2;
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = w + "px";
      c.style.height = h + "px";
    }
  }, 120);
});

window.addEventListener("orientationchange", function () {
  setTimeout(function () {
    lastW = window.innerWidth;
    lastH = window.innerHeight;
    computeOpts();
    buildLetters();
  }, 250);
});
