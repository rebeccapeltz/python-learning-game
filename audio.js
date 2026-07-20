// All sound is synthesized live with the Web Audio API — no audio files,
// nothing sampled from any existing game. An original chiptune-style loop
// plays in the background; short procedural blips act as SFX.

const AudioEngine = (() => {
  let ctx = null;
  let masterGain = null;   // global mute switch
  let musicGain = null;
  let sfxGain = null;
  let muted = false;
  let musicStarted = false;

  // ---- note table (just what the patterns/SFX below need) ----
  const NOTES = {
    C1: 32.70, F1: 43.65, G1: 49.00, A1: 55.00,
    C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
    C6: 1046.50, E6: 1318.51,
  };

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : 1;
      masterGain.connect(ctx.destination);

      musicGain = ctx.createGain();
      musicGain.gain.value = 0.22;
      musicGain.connect(masterGain);

      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.5;
      sfxGain.connect(masterGain);
    }
    return ctx;
  }

  function tone({ freq, start, dur, type = "square", gainNode = sfxGain, peak = 1, glideTo = null }) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + dur);

    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(peak, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);

    osc.connect(g);
    g.connect(gainNode);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  // ---------- one-shot SFX ----------
  function playCoin() {
    ensureCtx();
    const t = ctx.currentTime;
    tone({ freq: NOTES.B5, start: t, dur: 0.09, type: "square", peak: 0.7 });
    tone({ freq: NOTES.E6, start: t + 0.08, dur: 0.18, type: "square", peak: 0.7 });
  }

  function playSuccess() {
    ensureCtx();
    const t = ctx.currentTime;
    const notes = [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6];
    notes.forEach((f, i) => tone({ freq: f, start: t + i * 0.08, dur: 0.14, type: "square", peak: 0.6 }));
  }

  function playFail() {
    ensureCtx();
    const t = ctx.currentTime;
    tone({ freq: 180, glideTo: 70, start: t, dur: 0.28, type: "sawtooth", peak: 0.5 });
  }

  function playVictory() {
    ensureCtx();
    const t = ctx.currentTime;
    const seq = [
      [NOTES.G4, 0.00, 0.15], [NOTES.C5, 0.15, 0.15], [NOTES.E5, 0.30, 0.15],
      [NOTES.G5, 0.45, 0.28], [NOTES.E5, 0.75, 0.15], [NOTES.G5, 0.90, 0.5],
    ];
    seq.forEach(([f, off, dur]) => tone({ freq: f, start: t + off, dur, type: "square", peak: 0.6 }));
  }

  function playGameOver() {
    ensureCtx();
    const t = ctx.currentTime;
    const seq = [[NOTES.A3, 0], [NOTES.G3, 0.22], [NOTES.F3, 0.44], [NOTES.D3, 0.66]];
    seq.forEach(([f, off]) => tone({ freq: f, start: t + off, dur: 0.32, type: "sawtooth", peak: 0.45 }));
  }

  // ---------- looping background music (original composition) ----------
  const TEMPO = 148;
  const STEP_DUR = 60 / TEMPO / 2; // 8th notes
  const SCHEDULE_AHEAD = 0.12;
  const LOOKAHEAD_MS = 25;

  const bassPattern = ["C2", "C2", "G1", "C2", "C2", "C2", "G1", "A1", "F1", "F1", "C2", "F1", "F1", "F1", "G1", "G1"];
  const leadPattern = [
    "E4", null, "G4", null, "E4", null, "C4", null,
    "D4", null, "F4", null, "D4", null, "B3", null,
  ];

  let currentStep = 0;
  let nextStepTime = 0;
  let schedulerTimer = null;

  function scheduleStep(step, time) {
    tone({ freq: NOTES[bassPattern[step]], start: time, dur: STEP_DUR * 0.9, type: "triangle", gainNode: musicGain, peak: 0.8 });
    const lead = leadPattern[step];
    if (lead) {
      tone({ freq: NOTES[lead], start: time, dur: STEP_DUR * 1.7, type: "square", gainNode: musicGain, peak: 0.5 });
    }
  }

  function schedulerTick() {
    while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD) {
      scheduleStep(currentStep, nextStepTime);
      nextStepTime += STEP_DUR;
      currentStep = (currentStep + 1) % bassPattern.length;
    }
  }

  function startMusic() {
    ensureCtx();
    if (musicStarted) return;
    musicStarted = true;
    currentStep = 0;
    nextStepTime = ctx.currentTime + 0.05;
    schedulerTimer = setInterval(schedulerTick, LOOKAHEAD_MS);
  }

  function stopMusic() {
    if (schedulerTimer) clearInterval(schedulerTimer);
    schedulerTimer = null;
    musicStarted = false;
  }

  function resume() {
    ensureCtx();
    if (ctx.state === "suspended") ctx.resume();
    startMusic();
  }

  function toggleMute() {
    ensureCtx();
    muted = !muted;
    masterGain.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
    return muted;
  }

  return {
    resume, startMusic, stopMusic, toggleMute,
    playCoin, playSuccess, playFail, playVictory, playGameOver,
    isMuted: () => muted,
  };
})();
