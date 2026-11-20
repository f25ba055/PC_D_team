// ===== 設定 =====
// 画像や音のファイルを置くと、自動でそっちが使われる。
// ファイルがなければ絵文字と、ブラウザで作った音で動く。
const HANDS = [
  { name: "グー", emoji: "✊", image: "images/gu.png" },
  { name: "チョキ", emoji: "✌️", image: "images/choki.png" },
  { name: "パー", emoji: "✋", image: "images/pa.png" },
];

const SOUNDS = {
  bgm: "sounds/bgm.mp3",
  pon: "sounds/pon.mp3",
  win: "sounds/win.mp3",
  lose: "sounds/lose.mp3",
  draw: "sounds/draw.mp3",
};

const SHAKE_TIME = 900; // 「じゃんけん…」の時間（ミリ秒）
const WIN_TARGET = 3; // マッチモードで先に取る勝ち数
const HISTORY_MAX = 8; // 履歴に残す件数
const STORAGE_KEY = "janken-game-v2";

const DIFFICULTY_NOTES = {
  easy: "CPUがときどきわざと負けてくれるよ",
  normal: "CPUは完全ランダム。運勝負！",
  hard: "CPUがあなたの手の傾向を読んで、勝ちにくる手が増えるよ",
};

// ===== 要素 =====
const playerHandEl = document.getElementById("player-hand");
const cpuHandEl = document.getElementById("cpu-hand");
const messageEl = document.getElementById("message");
const choiceButtons = document.querySelectorAll(".choice");
const bgmToggle = document.getElementById("bgm-toggle");
const seToggle = document.getElementById("se-toggle");
const resetButton = document.getElementById("reset");
const nextMatchButton = document.getElementById("next-match");
const matchboardEl = document.getElementById("matchboard");
const matchPlayerEl = document.getElementById("match-player");
const matchCpuEl = document.getElementById("match-cpu");
const playerPipsEl = document.getElementById("player-pips");
const cpuPipsEl = document.getElementById("cpu-pips");
const streakBoxEl = document.getElementById("streak-box");
const historyListEl = document.getElementById("history-list");
const historyEmptyEl = document.getElementById("history-empty");
const difficultyNoteEl = document.getElementById("difficulty-note");
const modeButtons = document.querySelectorAll("[data-mode]");
const difficultyButtons = document.querySelectorAll("[data-difficulty]");

const counts = {
  win: document.getElementById("win-count"),
  lose: document.getElementById("lose-count"),
  draw: document.getElementById("draw-count"),
  streak: document.getElementById("streak-count"),
  bestStreak: document.getElementById("best-streak-count"),
  winRate: document.getElementById("win-rate"),
};

// ===== 状態（戦績・設定は localStorage に保存してリロードしても残る） =====
let score = { win: 0, lose: 0, draw: 0, streak: 0, bestStreak: 0 };
let match = { player: 0, cpu: 0, over: false };
let mode = "free"; // "free" | "match"
let difficulty = "normal"; // "easy" | "normal" | "hard"
let handCounts = [0, 0, 0]; // プレイヤーが出した手の回数（つよいCPU用）
let historyRounds = []; // { player, cpu, result }
let playing = false;
let seOn = true;

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ score, mode, difficulty, handCounts, historyRounds, seOn })
    );
  } catch {
    // 保存できない環境では保存なしで動く
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.score) score = { ...score, ...data.score };
    if (data.mode === "free" || data.mode === "match") mode = data.mode;
    if (["easy", "normal", "hard"].includes(data.difficulty)) difficulty = data.difficulty;
    if (Array.isArray(data.handCounts) && data.handCounts.length === 3) handCounts = data.handCounts;
    if (Array.isArray(data.historyRounds)) historyRounds = data.historyRounds.slice(0, HISTORY_MAX);
    if (typeof data.seOn === "boolean") seOn = data.seOn;
  } catch {
    // 壊れた保存データは無視する
  }
}

// ===== 手の表示（まず絵文字を出し、画像が実際に読み込めたら画像に差し替える） =====
// 先に <img> を出すと、画像がない環境では読み込みエラーが速すぎて
// onerror が間に合わず、絵文字に戻れないことがあるため、この順番にする。
function makeHandVisual(handIndex) {
  const hand = HANDS[handIndex];
  const emojiSpan = document.createElement("span");
  emojiSpan.textContent = hand.emoji;
  const probe = new Image();
  probe.onload = () => {
    const img = document.createElement("img");
    img.src = hand.image;
    img.alt = hand.name;
    emojiSpan.replaceWith(img);
  };
  probe.src = hand.image;
  return emojiSpan;
}

function showHand(el, handIndex) {
  el.replaceChildren(handIndex === null ? "？" : makeHandVisual(handIndex));
}

choiceButtons.forEach((button) => {
  const handIndex = Number(button.dataset.hand);
  const icon = document.createElement("span");
  icon.className = "choice-icon";
  icon.append(makeHandVisual(handIndex));
  button.append(icon, HANDS[handIndex].name);
});

// ===== 音 =====
const bgm = new Audio(SOUNDS.bgm);
bgm.loop = true;
bgm.volume = 0.4;
let bgmAvailable = true;
bgm.addEventListener("error", () => {
  bgmAvailable = false;
});

let audioCtx = null;

// 効果音ファイルがないときに鳴らす、かんたんな音
function beep(notes) {
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  let t = audioCtx.currentTime;
  notes.forEach(([freq, length]) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + length);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + length);
    t += length * 0.9;
  });
}

const FALLBACK_SE = {
  pon: [[660, 0.12]],
  win: [[523, 0.12], [659, 0.12], [784, 0.25]],
  lose: [[392, 0.18], [330, 0.18], [262, 0.3]],
  draw: [[440, 0.15], [440, 0.15]],
};

function playSE(name) {
  if (!seOn) return;
  const audio = new Audio(SOUNDS[name]);
  audio.play().catch(() => beep(FALLBACK_SE[name]));
}

bgmToggle.addEventListener("click", () => {
  if (!bgmAvailable) {
    bgmToggle.textContent = "🎵 BGMファイルなし";
    return;
  }
  if (bgm.paused) {
    bgm.play().then(() => {
      bgmToggle.textContent = "🎵 BGM: ON";
      bgmToggle.setAttribute("aria-pressed", "true");
    }).catch(() => {
      bgmAvailable = false;
      bgmToggle.textContent = "🎵 BGMファイルなし";
    });
  } else {
    bgm.pause();
    bgmToggle.textContent = "🎵 BGM: OFF";
    bgmToggle.setAttribute("aria-pressed", "false");
  }
});

function renderSeToggle() {
  seToggle.textContent = seOn ? "🔊 効果音: ON" : "🔇 効果音: OFF";
  seToggle.setAttribute("aria-pressed", String(seOn));
}

seToggle.addEventListener("click", () => {
  seOn = !seOn;
  renderSeToggle();
  saveState();
});

// ===== CPUの手を決める =====
function randomHand() {
  return Math.floor(Math.random() * 3);
}

// hand に勝つ手（グー→パー、チョキ→グー、パー→チョキ）
function counterHand(hand) {
  return (hand + 2) % 3;
}

// hand に負ける手（グー→チョキ、チョキ→パー、パー→グー）
function losingHand(hand) {
  return (hand + 1) % 3;
}

function chooseCpu(player) {
  if (difficulty === "easy") {
    // 35%の確率で、プレイヤーが勝つ手を出す
    return Math.random() < 0.35 ? losingHand(player) : randomHand();
  }
  if (difficulty === "hard") {
    const totalPicks = handCounts[0] + handCounts[1] + handCounts[2];
    if (totalPicks >= 3 && Math.random() < 0.75) {
      // これまで一番多く出した手を予測して、そのカウンターを出す
      let predicted = 0;
      for (let i = 1; i < 3; i++) {
        if (handCounts[i] > handCounts[predicted]) predicted = i;
      }
      return counterHand(predicted);
    }
    return randomHand();
  }
  return randomHand();
}

// ===== ゲーム =====
// (player - cpu + 3) % 3 → 0:あいこ 1:負け 2:勝ち
function judge(player, cpu) {
  const result = (player - cpu + 3) % 3;
  if (result === 0) return "draw";
  if (result === 2) return "win";
  return "lose";
}

const MESSAGES = {
  win: "あなたの勝ち！",
  lose: "あなたの負け…",
  draw: "あいこ！もう一回！",
};

const RESULT_LABELS = { win: "勝ち", lose: "負け", draw: "あいこ" };

function setResultClass(el, result) {
  el.classList.remove("win", "lose", "draw");
  if (result) el.classList.add(result);
}

function updateScore() {
  counts.win.textContent = score.win;
  counts.lose.textContent = score.lose;
  counts.draw.textContent = score.draw;
  counts.streak.textContent = score.streak;
  counts.bestStreak.textContent = score.bestStreak;
  const games = score.win + score.lose + score.draw;
  counts.winRate.textContent = games ? Math.round((score.win / games) * 100) + "%" : "0%";
  streakBoxEl.classList.toggle("fire", score.streak >= 3);
}

function renderPips(el, wins) {
  el.replaceChildren();
  for (let i = 0; i < WIN_TARGET; i++) {
    const pip = document.createElement("span");
    pip.className = "pip" + (i < wins ? " on" : "");
    el.append(pip);
  }
}

function updateMatch() {
  matchboardEl.hidden = mode !== "match";
  matchPlayerEl.textContent = match.player;
  matchCpuEl.textContent = match.cpu;
  renderPips(playerPipsEl, match.player);
  renderPips(cpuPipsEl, match.cpu);
}

function renderHistory() {
  historyListEl.replaceChildren();
  historyEmptyEl.hidden = historyRounds.length > 0;
  historyRounds.forEach((round) => {
    const item = document.createElement("li");
    item.className = "history-item " + round.result;
    const hands = document.createElement("span");
    hands.textContent = `${HANDS[round.player].emoji} vs ${HANDS[round.cpu].emoji}`;
    const label = document.createElement("span");
    label.className = "history-result";
    label.textContent = RESULT_LABELS[round.result];
    item.append(hands, label);
    historyListEl.append(item);
  });
}

function setChoicesEnabled(enabled) {
  choiceButtons.forEach((b) => (b.disabled = !enabled));
}

// マッチ勝利時の紙吹雪（ライブラリなしの簡易版）
function launchConfetti() {
  const container = document.createElement("div");
  container.className = "confetti";
  const colors = ["#ff6b4a", "#2bb673", "#ffb703", "#4a9eff", "#ff4a8d"];
  for (let i = 0; i < 36; i++) {
    const piece = document.createElement("i");
    piece.style.left = Math.random() * 100 + "%";
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = Math.random() * 0.4 + "s";
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.append(piece);
  }
  document.body.append(container);
  setTimeout(() => container.remove(), 3200);
}

function endMatch(playerWon) {
  match.over = true;
  setChoicesEnabled(false);
  nextMatchButton.hidden = false;
  if (playerWon) {
    messageEl.textContent = `🏆 ${WIN_TARGET}勝先取！あなたの試合勝ち！`;
    setResultClass(messageEl, "win");
    launchConfetti();
  } else {
    messageEl.textContent = `CPUの${WIN_TARGET}勝先取… 試合に負けちゃった`;
    setResultClass(messageEl, "lose");
  }
}

function startNextMatch() {
  match = { player: 0, cpu: 0, over: false };
  nextMatchButton.hidden = true;
  setChoicesEnabled(true);
  showHand(playerHandEl, null);
  showHand(cpuHandEl, null);
  setResultClass(playerHandEl, null);
  setResultClass(cpuHandEl, null);
  setResultClass(messageEl, null);
  messageEl.textContent = "新しい試合！手を選んでね！";
  updateMatch();
}

nextMatchButton.addEventListener("click", startNextMatch);

function play(player) {
  if (playing || match.over) return;
  playing = true;
  setChoicesEnabled(false);

  setResultClass(messageEl, null);
  setResultClass(playerHandEl, null);
  setResultClass(cpuHandEl, null);
  messageEl.textContent = "じゃんけん…";
  showHand(playerHandEl, 0);
  showHand(cpuHandEl, 0);
  playerHandEl.classList.add("shake");
  cpuHandEl.classList.add("shake");

  setTimeout(() => {
    const cpu = chooseCpu(player);
    const result = judge(player, cpu);

    playerHandEl.classList.remove("shake");
    cpuHandEl.classList.remove("shake");
    showHand(playerHandEl, player);
    showHand(cpuHandEl, cpu);
    playSE("pon");

    score[result]++;
    score.streak = result === "win" ? score.streak + 1 : result === "lose" ? 0 : score.streak;
    score.bestStreak = Math.max(score.bestStreak, score.streak);
    handCounts[player]++;
    historyRounds.unshift({ player, cpu, result });
    historyRounds = historyRounds.slice(0, HISTORY_MAX);

    if (mode === "match" && result !== "draw") {
      if (result === "win") match.player++;
      else match.cpu++;
    }

    updateScore();
    updateMatch();
    renderHistory();
    saveState();

    messageEl.textContent =
      "ぽん！ " + MESSAGES[result] + (result === "win" && score.streak >= 3 ? ` ${score.streak}連勝中🔥` : "");
    setResultClass(messageEl, result);
    setResultClass(playerHandEl, result);
    setResultClass(cpuHandEl, result === "win" ? "lose" : result === "lose" ? "win" : "draw");
    setTimeout(() => playSE(result), 150);

    playing = false;
    if (mode === "match" && (match.player >= WIN_TARGET || match.cpu >= WIN_TARGET)) {
      endMatch(match.player >= WIN_TARGET);
    } else {
      setChoicesEnabled(true);
    }
  }, SHAKE_TIME);
}

choiceButtons.forEach((button) => {
  button.addEventListener("click", () => play(Number(button.dataset.hand)));
});

// キーボード操作（1=グー / 2=チョキ / 3=パー）
document.addEventListener("keydown", (event) => {
  const index = ["1", "2", "3"].indexOf(event.key);
  if (index >= 0) play(index);
});

// ===== モード・難易度 =====
function renderControls() {
  modeButtons.forEach((b) => {
    const active = b.dataset.mode === mode;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  difficultyButtons.forEach((b) => {
    const active = b.dataset.difficulty === difficulty;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  difficultyNoteEl.textContent = DIFFICULTY_NOTES[difficulty];
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (mode === button.dataset.mode) return;
    mode = button.dataset.mode;
    match = { player: 0, cpu: 0, over: false };
    nextMatchButton.hidden = true;
    setChoicesEnabled(true);
    renderControls();
    updateMatch();
    saveState();
  });
});

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    difficulty = button.dataset.difficulty;
    renderControls();
    saveState();
  });
});

// ===== リセット =====
resetButton.addEventListener("click", () => {
  score = { win: 0, lose: 0, draw: 0, streak: 0, bestStreak: 0 };
  match = { player: 0, cpu: 0, over: false };
  handCounts = [0, 0, 0];
  historyRounds = [];
  nextMatchButton.hidden = true;
  setChoicesEnabled(true);
  updateScore();
  updateMatch();
  renderHistory();
  saveState();
  showHand(playerHandEl, null);
  showHand(cpuHandEl, null);
  setResultClass(playerHandEl, null);
  setResultClass(cpuHandEl, null);
  setResultClass(messageEl, null);
  messageEl.textContent = "手を選んでね！";
});

// ===== 初期化 =====
loadState();
renderSeToggle();
renderControls();
updateScore();
updateMatch();
renderHistory();
showHand(playerHandEl, null);
showHand(cpuHandEl, null);
