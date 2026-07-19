// Wires the UI (DOM) to the Game (canvas/animation) and PyRunner (Pyodide).

(function () {
  const el = (id) => document.getElementById(id);

  const bootScreen = el("boot-screen");
  const bootStatus = el("boot-status");
  const bootBarFill = el("boot-bar-fill");
  const app = el("app");

  const levelTitleEl = el("level-title");
  const coinCountEl = el("coin-count");
  const levelCountEl = el("level-count");
  const levelTotalEl = el("level-total");
  const livesCountEl = el("lives-count");

  const conceptBadge = el("concept-badge");
  const challengeTitle = el("challenge-title");
  const challengePrompt = el("challenge-prompt");
  const codeEditor = el("code-editor");
  const runBtn = el("run-btn");
  const hintBtn = el("hint-btn");
  const resetBtn = el("reset-btn");
  const feedback = el("feedback");
  const hintBox = el("hint-box");
  const consoleOutput = el("console-output");

  const winScreen = el("win-screen");
  const finalStats = el("final-stats");
  const playAgainBtn = el("play-again-btn");

  const gameoverScreen = el("gameover-screen");
  const retryBtn = el("retry-btn");

  let lives = 3;
  let failCount = 0;
  let inputLocked = true;

  levelTotalEl.textContent = LEVELS.length;

  function setStatus(msg, pct) {
    bootStatus.textContent = msg;
    bootBarFill.style.width = pct + "%";
  }

  function lockInput(locked) {
    inputLocked = locked;
    runBtn.disabled = locked;
    codeEditor.disabled = locked;
  }

  function clearFeedback() {
    feedback.classList.add("hidden");
    feedback.classList.remove("success", "error");
    feedback.textContent = "";
  }

  function setupLevelUI(index) {
    const level = LEVELS[index];
    if (!level) return;
    levelTitleEl.textContent = `World ${level.world}`;
    levelCountEl.textContent = index + 1;
    conceptBadge.textContent = level.concept;
    challengeTitle.textContent = level.title;
    challengePrompt.textContent = level.prompt;
    codeEditor.value = level.starter;
    consoleOutput.textContent = "";
    clearFeedback();
    hintBox.classList.add("hidden");
    hintBtn.classList.add("hidden");
    failCount = 0;
    lockInput(true);
    runBtn.textContent = "▶ Run & Jump";
  }

  async function handleRun() {
    if (inputLocked || !PyRunner.isReady()) return;
    lockInput(true);
    runBtn.textContent = "Running…";
    clearFeedback();

    const level = LEVELS[Game.currentLevel];
    const code = codeEditor.value;

    let result;
    try {
      result = await PyRunner.runChallenge(code, level.test);
    } catch (e) {
      result = { success: false, output: "", error: String(e) };
    }

    consoleOutput.textContent = result.output || "";

    if (result.success) {
      feedback.textContent = "✅ Correct! Jumping to the next platform…";
      feedback.classList.remove("error");
      feedback.classList.add("success");
      Game.jumpToNext();
      // lockInput stays true; setupLevelUI (called from onLevelComplete) will
      // re-lock for the new level, and onReadyForInput unlocks once landed.
    } else {
      failCount += 1;
      feedback.textContent = "❌ " + result.error;
      feedback.classList.remove("success");
      feedback.classList.add("error");
      Game.shakeFail();
      runBtn.textContent = "▶ Run & Jump";
      lockInput(false);

      if (failCount >= 2) {
        hintBtn.classList.remove("hidden");
      }
      if (failCount % 5 === 0) {
        loseLife();
      }
    }
  }

  function loseLife() {
    lives -= 1;
    livesCountEl.textContent = lives;
    if (lives <= 0) {
      lockInput(true);
      gameoverScreen.classList.remove("hidden");
    } else {
      feedback.textContent += `\n💥 You fell in! ${lives} ${lives === 1 ? "life" : "lives"} left.`;
    }
  }

  hintBtn.addEventListener("click", () => {
    const level = LEVELS[Game.currentLevel];
    hintBox.innerHTML = `<strong>Hint:</strong><pre style="margin:6px 0 0;white-space:pre-wrap;">${escapeHtml(level.hint)}</pre>`;
    hintBox.classList.remove("hidden");
  });

  resetBtn.addEventListener("click", () => {
    const level = LEVELS[Game.currentLevel];
    codeEditor.value = level.starter;
    clearFeedback();
  });

  runBtn.addEventListener("click", handleRun);

  codeEditor.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = codeEditor.selectionStart;
      const end = codeEditor.selectionEnd;
      codeEditor.value = codeEditor.value.slice(0, start) + "    " + codeEditor.value.slice(end);
      codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
    } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun();
    }
  });

  playAgainBtn.addEventListener("click", () => location.reload());

  retryBtn.addEventListener("click", () => {
    gameoverScreen.classList.add("hidden");
    lives = 3;
    livesCountEl.textContent = lives;
    setupLevelUI(Game.currentLevel);
    Game.loadLevel(Game.currentLevel);
  });

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // ---- Game event wiring ----
  Game.on("onReadyForInput", () => {
    lockInput(false);
    codeEditor.focus();
  });

  Game.on("onLevelComplete", (finishedIndex, coins) => {
    coinCountEl.textContent = coins;
    if (Game.currentLevel < LEVELS.length) {
      setupLevelUI(Game.currentLevel);
    }
  });

  Game.on("onVictory", (coins) => {
    finalStats.textContent = `Final score: ${coins} coins across ${LEVELS.length} worlds.`;
    winScreen.classList.remove("hidden");
  });

  // ---- Boot sequence ----
  async function boot() {
    try {
      await PyRunner.init((msg, pct) => setStatus(msg, pct));
    } catch (e) {
      setStatus("Failed to load Python engine: " + e.message, 0);
      return;
    }
    bootScreen.classList.add("hidden");
    app.classList.remove("hidden");

    Game.init();
    setupLevelUI(0);
    Game.loadLevel(0);
  }

  boot();
})();
