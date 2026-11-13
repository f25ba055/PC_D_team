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

// ===== 要素 =====
const playerHandEl = document.getElementById("player-hand");
const cpuHandEl = document.getElementById("cpu-hand");
const messageEl = document.getElementById("message");
const choiceButtons = document.querySelectorAll(".choice");
const bgmToggle = document.getElementById("bgm-toggle");
const seToggle = document.getElementById("se-toggle");
const resetButton = document.getElementById("reset");

const counts = {
  win: document.getElementById("win-count"),
  lose: document.getElementById("lose-count"),
  draw: document.getElementById("draw-count"),
  streak: document.getElementById("streak-count"),
};

let score = { win: 0, lose: 0, draw: 0, streak: 0 };
let playing = false;
let seOn = true;

// ===== 手の表示（画像があれば画像、なければ絵文字） =====
function makeHandVisual(handIndex) {
  const hand = HANDS[handIndex];
  const img = document.createElement("img");
  img.src = hand.image;
  img.alt = hand.name;
  img.onerror = () => {
    img.replaceWith(document.createTextNode(hand.emoji));
  };
  return img;
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

seToggle.addEventListener("click", () => {
  seOn = !seOn;
  seToggle.textContent = seOn ? "🔊 効果音: ON" : "🔇 効果音: OFF";
  seToggle.setAttribute("aria-pressed", String(seOn));
});

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

function setResultClass(el, result) {
  el.classList.remove("win", "lose", "draw");
  if (result) el.classList.add(result);
}

function updateScore() {
  Object.keys(counts).forEach((key) => {
    counts[key].textContent = score[key];
  });
}

function play(player) {
  if (playing) return;
  playing = true;
  choiceButtons.forEach((b) => (b.disabled = true));

  setResultClass(messageEl, null);
  setResultClass(playerHandEl, null);
  setResultClass(cpuHandEl, null);
  messageEl.textContent = "じゃんけん…";
  showHand(playerHandEl, 0);
  showHand(cpuHandEl, 0);
  playerHandEl.classList.add("shake");
  cpuHandEl.classList.add("shake");

  setTimeout(() => {
    const cpu = Math.floor(Math.random() * 3);
    const result = judge(player, cpu);

    playerHandEl.classList.remove("shake");
    cpuHandEl.classList.remove("shake");
    showHand(playerHandEl, player);
    showHand(cpuHandEl, cpu);
    playSE("pon");

    score[result]++;
    score.streak = result === "win" ? score.streak + 1 : result === "lose" ? 0 : score.streak;
    updateScore();

    messageEl.textContent = "ぽん！ " + MESSAGES[result];
    setResultClass(messageEl, result);
    setResultClass(playerHandEl, result);
    setResultClass(cpuHandEl, result === "win" ? "lose" : result === "lose" ? "win" : "draw");
    setTimeout(() => playSE(result), 150);

    playing = false;
    choiceButtons.forEach((b) => (b.disabled = false));
  }, SHAKE_TIME);
}

choiceButtons.forEach((button) => {
  button.addEventListener("click", () => play(Number(button.dataset.hand)));
});

resetButton.addEventListener("click", () => {
  score = { win: 0, lose: 0, draw: 0, streak: 0 };
  updateScore();
  showHand(playerHandEl, null);
  showHand(cpuHandEl, null);
  setResultClass(playerHandEl, null);
  setResultClass(cpuHandEl, null);
  setResultClass(messageEl, null);
  messageEl.textContent = "手を選んでね！";
});

showHand(playerHandEl, null);
showHand(cpuHandEl, null);
