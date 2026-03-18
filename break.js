const countdownEl = document.getElementById('breakCountdown');
const stepText = document.getElementById('stepText');
const completeBtn = document.getElementById('completeBreakBtn');
const skipBtn = document.getElementById('skipBreakBtn');

const steps = [
  '20-20-20: Look 20 feet away for 20 seconds',
  'Blinking: Blink gently 10 times',
  'Stretch: Rotate neck and roll shoulders for 30 seconds',
  'Breathing: Inhale 4s, hold 4s, exhale 6s'
];

let stepIndex = 0;
setInterval(() => {
  stepIndex = (stepIndex + 1) % steps.length;
  stepText.textContent = steps[stepIndex];
}, 8000);

function fmt(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

window.eyeCareAPI.onTick((state) => {
  if (state.runtime.inBreak) {
    countdownEl.textContent = fmt(state.runtime.breakRemainingSec);
    skipBtn.style.display = state.settings.strictness === 'strict' ? 'none' : 'inline-block';
  }
});

completeBtn.onclick = () => window.eyeCareAPI.completeBreak();
skipBtn.onclick = () => window.eyeCareAPI.skipBreak();
