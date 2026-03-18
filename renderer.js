const el = {
  startBtn: document.getElementById('startBtn'),
  stopBtn: document.getElementById('stopBtn'),
  saveBtn: document.getElementById('saveBtn'),
  statusText: document.getElementById('statusText'),
  sessionTimer: document.getElementById('sessionTimer'),
  breakTimer: document.getElementById('breakTimer'),
  warnBanner: document.getElementById('warnBanner'),
  sessionDurationMin: document.getElementById('sessionDurationMin'),
  breakDurationMin: document.getElementById('breakDurationMin'),
  warningBeforeSec: document.getElementById('warningBeforeSec'),
  strictness: document.getElementById('strictness'),
  forcedLockMode: document.getElementById('forcedLockMode'),
  breaksTaken: document.getElementById('breaksTaken'),
  breaksSkipped: document.getElementById('breaksSkipped'),
  screenMinutesToday: document.getElementById('screenMinutesToday'),
  dailyCanvas: document.getElementById('dailyCanvas')
};

function fmt(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function drawSimpleChart(minutes) {
  const ctx = el.dailyCanvas.getContext('2d');
  const w = el.dailyCanvas.width;
  const h = el.dailyCanvas.height;
  ctx.clearRect(0, 0, w, h);

  const values = [Math.max(5, minutes * 0.3), Math.max(5, minutes * 0.6), Math.max(5, minutes)];
  const labels = ['Morning', 'Afternoon', 'Total'];
  const max = Math.max(...values, 1);

  values.forEach((v, i) => {
    const bw = 120;
    const x = 70 + i * 150;
    const bh = (v / max) * 120;
    const y = h - bh - 30;
    ctx.fillStyle = '#4f95ff';
    ctx.fillRect(x, y, bw, bh);
    ctx.fillStyle = '#b4c9ff';
    ctx.fillText(labels[i], x + 30, h - 10);
  });
}

function render(state) {
  const { runtime, settings, analytics } = state;
  el.statusText.textContent = `Status: ${runtime.running ? (runtime.inBreak ? 'Break Locked' : 'Monitoring') : 'Idle'}`;
  el.sessionTimer.textContent = `Session: ${fmt(runtime.sessionElapsedSec)}`;
  el.breakTimer.textContent = runtime.inBreak ? `Break Remaining: ${fmt(runtime.breakRemainingSec)}` : 'Break: --';

  el.sessionDurationMin.value = settings.sessionDurationMin;
  el.breakDurationMin.value = settings.breakDurationMin;
  el.warningBeforeSec.value = settings.warningBeforeSec;
  el.strictness.value = settings.strictness;
  el.forcedLockMode.checked = settings.forcedLockMode;

  el.breaksTaken.textContent = analytics.breaksTaken;
  el.breaksSkipped.textContent = analytics.breaksSkipped;
  el.screenMinutesToday.textContent = analytics.screenMinutesToday;
  drawSimpleChart(analytics.screenMinutesToday);
}

async function init() {
  const state = await window.eyeCareAPI.getState();
  render(state);

  el.startBtn.onclick = () => window.eyeCareAPI.startSession();
  el.stopBtn.onclick = () => window.eyeCareAPI.stopSession();
  el.saveBtn.onclick = () => {
    window.eyeCareAPI.updateSettings({
      sessionDurationMin: Number(el.sessionDurationMin.value),
      breakDurationMin: Number(el.breakDurationMin.value),
      warningBeforeSec: Number(el.warningBeforeSec.value),
      strictness: el.strictness.value,
      forcedLockMode: el.forcedLockMode.checked
    });
  };

  window.eyeCareAPI.onTick(render);
  window.eyeCareAPI.onBreakWarning(() => {
    el.warnBanner.classList.remove('hidden');
    setTimeout(() => el.warnBanner.classList.add('hidden'), 8000);
  });
}

init();
