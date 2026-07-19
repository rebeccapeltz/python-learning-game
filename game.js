// Canvas rendering + simple physics/animation state machine for the
// Mario-style "write code to jump the gap" platformer.

const Game = (() => {
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const GROUND_Y = 250;          // top of the platform surface
  const PLATFORM_H = 90;         // visual thickness of platform block
  const PLATFORM_W = 260;
  const PLAYER_EDGE_MARGIN = 46; // how far from the gap edge the player stands
  const CAMERA_ANCHOR = 300;     // where the player sits on screen, in px

  const GAP_WIDTH = { pit: 120, lava: 150, goomba: 100 };

  // ---- Build the world layout from LEVELS ----
  let segments = []; // { type:'platform'|'gap', start, end, levelIndex, scenery? }
  let worldWidth = 0;

  function buildWorld() {
    segments = [];
    let x = 0;
    for (let i = 0; i < LEVELS.length; i++) {
      segments.push({ type: "platform", start: x, end: x + PLATFORM_W, levelIndex: i });
      x += PLATFORM_W;
      const gw = GAP_WIDTH[LEVELS[i].scenery] || 120;
      segments.push({ type: "gap", start: x, end: x + gw, levelIndex: i, scenery: LEVELS[i].scenery });
      x += gw;
    }
    // final platform with flagpole
    segments.push({ type: "platform", start: x, end: x + PLATFORM_W + 120, levelIndex: LEVELS.length, isFinal: true });
    x += PLATFORM_W + 120;
    worldWidth = x;
  }

  function platformFor(levelIndex) {
    return segments.find((s) => s.type === "platform" && s.levelIndex === levelIndex);
  }
  function gapFor(levelIndex) {
    return segments.find((s) => s.type === "gap" && s.levelIndex === levelIndex);
  }

  // ---- Player state ----
  const player = {
    worldX: 0,
    y: 0,
    state: "idle", // idle | walk-in | waiting | jumping | celebrate
    t: 0,           // generic animation timer
    facing: 1,
    animTime: 0,
    walkFrom: 0,
    walkTo: 0,
    jumpFrom: 0,
    jumpTo: 0,
    jumpDur: 0.9,
    bump: 0,        // screen shake amount
  };

  let camera = 0;
  let currentLevel = 0;
  let coins = 0;
  let coinPopups = []; // {worldX, y, t, text}

  // Callbacks wired up by main.js
  const listeners = {
    onReadyForInput: () => {},
    onLevelComplete: () => {},
    onVictory: () => {},
  };

  function loadLevel(index) {
    currentLevel = index;
    const plat = platformFor(index);
    player.worldX = plat.start + 30;
    player.y = 0;
    player.walkFrom = player.worldX;
    player.walkTo = plat.end - PLAYER_EDGE_MARGIN;
    player.state = "walk-in";
    player.animTime = 0;
    player.facing = 1;
  }

  function shakeFail() {
    player.bump = 10;
  }

  function jumpToNext() {
    const gap = gapFor(currentLevel);
    const nextPlat = platformFor(currentLevel + 1);
    player.jumpFrom = player.worldX;
    player.jumpTo = nextPlat.start + 30;
    player.jumpDur = 0.55 + (gap.end - gap.start) / 220;
    player.animTime = 0;
    player.state = "jumping";
  }

  function update(dt) {
    player.t += dt;
    if (player.bump > 0) player.bump = Math.max(0, player.bump - dt * 40);

    if (player.state === "walk-in") {
      player.animTime += dt;
      const dur = 0.7;
      const p = Math.min(1, player.animTime / dur);
      player.worldX = player.walkFrom + (player.walkTo - player.walkFrom) * easeOutQuad(p);
      if (p >= 1) {
        player.state = "waiting";
        listeners.onReadyForInput();
      }
    } else if (player.state === "jumping") {
      player.animTime += dt;
      const p = Math.min(1, player.animTime / player.jumpDur);
      player.worldX = player.jumpFrom + (player.jumpTo - player.jumpFrom) * p;
      const arcHeight = 95;
      player.y = -Math.sin(p * Math.PI) * arcHeight;
      if (p >= 1) {
        player.y = 0;
        const finishedLevel = currentLevel;
        const isLastLevel = currentLevel === LEVELS.length - 1;
        currentLevel += 1;
        coins += 10;
        coinPopups.push({ worldX: player.worldX, y: -40, t: 0, text: "+10" });
        if (isLastLevel) {
          const finalPlat = segments.find((s) => s.isFinal);
          player.walkFrom = player.worldX;
          player.walkTo = finalPlat.start + finalPlat.end ? finalPlat.start + (finalPlat.end - finalPlat.start) / 2 - 20 : player.worldX + 150;
          player.animTime = 0;
          player.state = "walk-in-final";
        } else {
          const plat = platformFor(currentLevel);
          player.walkFrom = player.worldX;
          player.walkTo = plat.end - PLAYER_EDGE_MARGIN;
          player.animTime = 0;
          player.state = "walk-in";
        }
        listeners.onLevelComplete(finishedLevel, coins);
      }
    } else if (player.state === "walk-in-final") {
      player.animTime += dt;
      const dur = 0.9;
      const p = Math.min(1, player.animTime / dur);
      player.worldX = player.walkFrom + (player.walkTo - player.walkFrom) * easeOutQuad(p);
      if (p >= 1) {
        player.state = "celebrate";
        listeners.onVictory(coins);
      }
    }

    for (const c of coinPopups) c.t += dt;
    coinPopups = coinPopups.filter((c) => c.t < 1.2);

    // camera follow
    const targetCam = clamp(player.worldX - CAMERA_ANCHOR, 0, Math.max(0, worldWidth - W));
    camera += (targetCam - camera) * Math.min(1, dt * 4);
  }

  function easeOutQuad(p) { return 1 - (1 - p) * (1 - p); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---------- Drawing ----------
  function draw() {
    ctx.save();
    if (player.bump > 0) {
      ctx.translate((Math.random() - 0.5) * player.bump, (Math.random() - 0.5) * player.bump);
    }

    drawSky();
    drawParallax();
    drawWorldSegments();
    drawCoinPopups();
    drawPlayer();

    ctx.restore();
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#5c94fc");
    g.addColorStop(1, "#a6d8ff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawParallax() {
    // hills
    ctx.fillStyle = "#3aa728";
    const hillOffset = -((camera * 0.3) % 400);
    for (let x = hillOffset - 400; x < W + 400; x += 400) {
      drawHill(x + 120, GROUND_Y, 110);
      drawHill(x + 320, GROUND_Y, 70);
    }
    // clouds
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    const cloudOffset = -((camera * 0.15) % 500);
    for (let x = cloudOffset - 500; x < W + 500; x += 500) {
      drawCloud(x + 60, 60);
      drawCloud(x + 300, 100);
    }
  }

  function drawHill(cx, baseY, r) {
    ctx.beginPath();
    ctx.moveTo(cx - r, baseY);
    ctx.quadraticCurveTo(cx, baseY - r * 1.3, cx + r, baseY);
    ctx.closePath();
    ctx.fill();
  }

  function drawCloud(cx, cy) {
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.arc(cx + 22, cy - 8, 22, 0, Math.PI * 2);
    ctx.arc(cx + 46, cy, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWorldSegments() {
    for (const seg of segments) {
      const sx = seg.start - camera;
      const ex = seg.end - camera;
      if (ex < -50 || sx > W + 50) continue; // offscreen

      if (seg.type === "platform") {
        drawBrickPlatform(sx, ex);
        if (seg.isFinal) drawFlagpole(sx + 60);
        else drawQuestionBlock(sx + (ex - sx) / 2, seg.levelIndex);
      } else {
        drawGap(sx, ex, seg.scenery);
      }
    }
  }

  function drawBrickPlatform(sx, ex) {
    const w = ex - sx;
    ctx.fillStyle = "#c84c0c";
    ctx.fillRect(sx, GROUND_Y, w, PLATFORM_H);
    ctx.strokeStyle = "#8a3308";
    ctx.lineWidth = 2;
    const brickW = 30, brickH = 18;
    for (let row = 0; row * brickH < PLATFORM_H; row++) {
      const offset = row % 2 === 0 ? 0 : brickW / 2;
      for (let bx = sx - offset; bx < ex; bx += brickW) {
        ctx.strokeRect(bx, GROUND_Y + row * brickH, brickW, brickH);
      }
    }
    // grassy top edge
    ctx.fillStyle = "#3aa728";
    ctx.fillRect(sx, GROUND_Y - 6, w, 8);
  }

  function drawQuestionBlock(cx, levelIndex) {
    const size = 26;
    const bob = Math.sin(player.t * 2 + levelIndex) * 2;
    const y = GROUND_Y - 60 + bob;
    ctx.fillStyle = "#fbd000";
    ctx.fillRect(cx - size / 2, y, size, size);
    ctx.strokeStyle = "#8a5a00";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - size / 2, y, size, size);
    ctx.fillStyle = "#8a5a00";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", cx, y + size / 2 + 1);
  }

  function drawFlagpole(sx) {
    ctx.fillStyle = "#bbb";
    ctx.fillRect(sx, GROUND_Y - 220, 6, 220);
    ctx.beginPath();
    ctx.moveTo(sx + 6, GROUND_Y - 210);
    ctx.lineTo(sx + 46, GROUND_Y - 198);
    ctx.lineTo(sx + 6, GROUND_Y - 186);
    ctx.closePath();
    ctx.fillStyle = "#3aa728";
    ctx.fill();
    // castle silhouette
    ctx.fillStyle = "#7a7a8a";
    ctx.fillRect(sx + 90, GROUND_Y - 110, 140, 110);
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(sx + 90 + i * 30, GROUND_Y - 128, 18, 18);
    }
  }

  function drawGap(sx, ex, scenery) {
    const w = ex - sx;
    if (scenery === "lava") {
      const flick = Math.sin(player.t * 6) * 4;
      const g = ctx.createLinearGradient(0, GROUND_Y, 0, H);
      g.addColorStop(0, "#ff7a00");
      g.addColorStop(1, "#ffd23f");
      ctx.fillStyle = g;
      ctx.fillRect(sx, GROUND_Y + 4 + flick, w, H - GROUND_Y);
      ctx.fillStyle = "#3a1400";
      ctx.fillRect(sx, GROUND_Y - 2, w, 6);
    } else {
      ctx.fillStyle = "#0c0c14";
      ctx.fillRect(sx, GROUND_Y, w, H - GROUND_Y);
      if (scenery === "goomba") {
        drawGoomba(sx + w / 2, GROUND_Y - 16);
      }
    }
  }

  function drawGoomba(cx, cy) {
    ctx.fillStyle = "#8a4b28";
    ctx.beginPath();
    ctx.ellipse(cx, cy, 16, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a2a14";
    ctx.fillRect(cx - 16, cy + 8, 10, 8);
    ctx.fillRect(cx + 6, cy + 8, 10, 8);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 2, 4, 0, Math.PI * 2);
    ctx.arc(cx + 6, cy - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 1, 1.6, 0, Math.PI * 2);
    ctx.arc(cx + 7, cy - 1, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCoinPopups() {
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    for (const c of coinPopups) {
      const sx = c.worldX - camera;
      const alpha = 1 - c.t / 1.2;
      ctx.fillStyle = `rgba(251,208,0,${alpha})`;
      ctx.fillText(c.text, sx, GROUND_Y - 40 - c.t * 40);
    }
  }

  function drawPlayer() {
    const sx = player.worldX - camera;
    const groundLevel = GROUND_Y - 2;
    const sy = groundLevel + player.y;

    const bobbing = player.state === "waiting" ? Math.sin(player.t * 4) * 2 : 0;
    const legPhase = (player.state === "walk-in" || player.state === "walk-in-final") ? Math.sin(player.t * 16) : 0;

    ctx.save();
    ctx.translate(sx, sy + bobbing);

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 4 - player.y * 0, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // legs
    ctx.fillStyle = "#2255cc";
    ctx.fillRect(-10, -22 + legPhase * 3, 8, 22);
    ctx.fillRect(2, -22 - legPhase * 3, 8, 22);

    // overalls / body
    ctx.fillStyle = "#2255cc";
    ctx.fillRect(-12, -46, 24, 26);

    // shirt sleeves
    ctx.fillStyle = "#e0453c";
    ctx.fillRect(-16, -46, 6, 14);
    ctx.fillRect(10, -46, 6, 14);

    // head
    ctx.fillStyle = "#f4c08a";
    ctx.fillRect(-9, -64, 18, 18);

    // cap
    ctx.fillStyle = "#e0453c";
    ctx.fillRect(-11, -70, 22, 8);
    ctx.fillRect(-11, -64, 10, 4);

    // mustache + eyes (simple)
    ctx.fillStyle = "#3a2415";
    ctx.fillRect(-7, -55, 14, 3);

    ctx.restore();
  }

  // ---------- Loop ----------
  let lastTime = 0;
  function frame(ts) {
    if (!lastTime) lastTime = ts;
    const dt = Math.min(0.05, (ts - lastTime) / 1000);
    lastTime = ts;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function init() {
    buildWorld();
    requestAnimationFrame(frame);
  }

  return {
    init,
    loadLevel,
    jumpToNext,
    shakeFail,
    get currentLevel() { return currentLevel; },
    get coins() { return coins; },
    on(name, fn) { listeners[name] = fn; },
  };
})();
