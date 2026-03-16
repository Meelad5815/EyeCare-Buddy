const STORAGE_KEY = 'eyeCareBuddyState';

const defaults = {
  sessionLimit: 120,
  eyeInterval: 20,
  physicalInterval: 45,
  breathingInterval: 60,
  notificationStyle: 'modal',
  soundType: 'chime',
  autoStop: false,
  enableEye: true,
  enablePhysical: true,
  enableBreathing: true,
  theme: 'dark',
  stats: {
    sessions: [],
    reminders: { eye: { total: 0, completed: 0 }, physical: { total: 0, completed: 0 }, breathing: { total: 0, completed: 0 } }
  }
};

class EyeCareBuddy {
  constructor() {
    this.state = this.loadState();
    this.session = { active: false, start: null, elapsedSec: 0, pauseAt: null, timer: null, next: {} };
    this.pendingReminder = null;
    this.bindElements();
    this.hydrateControls();
    this.bindEvents();
    this.render();
    this.drawCharts();
    this.renderTips();
  }

  bindElements() {
    this.el = {
      startBtn: document.getElementById('startSessionBtn'),
      stopBtn: document.getElementById('stopSessionBtn'),
      sessionLimit: document.getElementById('sessionLimit'),
      eyeInterval: document.getElementById('eyeInterval'),
      physicalInterval: document.getElementById('physicalInterval'),
      breathingInterval: document.getElementById('breathingInterval'),
      notificationStyle: document.getElementById('notificationStyle'),
      soundType: document.getElementById('soundType'),
      autoStop: document.getElementById('autoStop'),
      enableEye: document.getElementById('enableEye'),
      enablePhysical: document.getElementById('enablePhysical'),
      enableBreathing: document.getElementById('enableBreathing'),
      timer: document.getElementById('sessionTimer'),
      nextEye: document.getElementById('nextEyeReminder'),
      nextPhysical: document.getElementById('nextPhysicalReminder'),
      nextBreathing: document.getElementById('nextBreathingReminder'),
      progress: document.getElementById('sessionProgress'),
      healthAlert: document.getElementById('healthAlert'),
      toastContainer: document.getElementById('toastContainer'),
      modal: document.getElementById('modal'),
      modalTitle: document.getElementById('modalTitle'),
      modalMessage: document.getElementById('modalMessage'),
      modalDone: document.getElementById('modalDone'),
      modalSnooze: document.getElementById('modalSnooze'),
      dailyChart: document.getElementById('dailyChart'),
      weeklyChart: document.getElementById('weeklyChart'),
      eyeCompliance: document.getElementById('eyeCompliance'),
      physicalCompliance: document.getElementById('physicalCompliance'),
      breathingCompliance: document.getElementById('breathingCompliance'),
      tips: document.getElementById('tipsPanel')
    };
  }

  bindEvents() {
    this.el.startBtn.addEventListener('click', () => this.startSession());
    this.el.stopBtn.addEventListener('click', () => this.stopSession('Session stopped by user.'));
    this.el.modalDone.addEventListener('click', () => this.resolveReminder(true));
    this.el.modalSnooze.addEventListener('click', () => this.snoozeReminder());

    document.querySelectorAll('input, select').forEach((ctrl) => {
      ctrl.addEventListener('change', () => this.updateSettings());
    });

    document.querySelectorAll('[data-exercise]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.exercise;
        this.markExerciseDone(type);
      });
    });

    document.querySelectorAll('[data-theme-switch]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.theme = btn.dataset.themeSwitch;
        document.documentElement.dataset.theme = this.state.theme;
        this.persist();
      });
    });
  }

  hydrateControls() {
    document.documentElement.dataset.theme = this.state.theme;
    const { sessionLimit, eyeInterval, physicalInterval, breathingInterval, notificationStyle, soundType, autoStop, enableEye, enablePhysical, enableBreathing } = this.state;
    Object.assign(this.el.sessionLimit, { value: sessionLimit });
    Object.assign(this.el.eyeInterval, { value: eyeInterval });
    Object.assign(this.el.physicalInterval, { value: physicalInterval });
    Object.assign(this.el.breathingInterval, { value: breathingInterval });
    this.el.notificationStyle.value = notificationStyle;
    this.el.soundType.value = soundType;
    this.el.autoStop.checked = autoStop;
    this.el.enableEye.checked = enableEye;
    this.el.enablePhysical.checked = enablePhysical;
    this.el.enableBreathing.checked = enableBreathing;
  }

  updateSettings() {
    this.state.sessionLimit = Number(this.el.sessionLimit.value);
    this.state.eyeInterval = Number(this.el.eyeInterval.value);
    this.state.physicalInterval = Number(this.el.physicalInterval.value);
    this.state.breathingInterval = Number(this.el.breathingInterval.value);
    this.state.notificationStyle = this.el.notificationStyle.value;
    this.state.soundType = this.el.soundType.value;
    this.state.autoStop = this.el.autoStop.checked;
    this.state.enableEye = this.el.enableEye.checked;
    this.state.enablePhysical = this.el.enablePhysical.checked;
    this.state.enableBreathing = this.el.enableBreathing.checked;
    this.persist();
    this.refreshNextReminders();
  }

  startSession() {
    if (this.session.active) return;
    this.session.active = true;
    this.session.start = Date.now();
    this.session.elapsedSec = 0;
    this.session.next = {
      eye: this.state.eyeInterval * 60,
      physical: this.state.physicalInterval * 60,
      breathing: this.state.breathingInterval * 60
    };
    this.el.startBtn.disabled = true;
    this.el.stopBtn.disabled = false;
    this.el.healthAlert.textContent = 'Session active. Stay hydrated and blink often!';

    this.session.timer = setInterval(() => {
      this.session.elapsedSec += 1;
      this.tick();
    }, 1000);
  }

  stopSession(reason = 'Session completed.') {
    if (!this.session.active) return;
    clearInterval(this.session.timer);
    this.session.active = false;
    const mins = Math.round(this.session.elapsedSec / 60);
    this.state.stats.sessions.push({ date: new Date().toISOString(), minutes: mins });
    this.state.stats.sessions = this.state.stats.sessions.slice(-120);
    this.el.startBtn.disabled = false;
    this.el.stopBtn.disabled = true;
    this.el.healthAlert.textContent = reason;
    this.persist();
    this.drawCharts();
    this.renderTips();
  }

  tick() {
    this.render();
    this.handleReminders();
    this.handleHealthLimit();
  }

  handleReminders() {
    const elapsed = this.session.elapsedSec;
    if (this.state.enableEye && elapsed === this.session.next.eye) {
      this.triggerReminder('eye', '20-20-20 time! Look 20 feet away for 20 seconds.');
      this.session.next.eye += this.state.eyeInterval * 60;
    }
    if (this.state.enablePhysical && elapsed === this.session.next.physical) {
      this.triggerReminder('physical', 'Stand up, stretch your shoulders, and check posture for 1 minute.');
      this.session.next.physical += this.state.physicalInterval * 60;
    }
    if (this.state.enableBreathing && elapsed === this.session.next.breathing) {
      this.triggerReminder('breathing', 'Take a 1-minute breathing break: inhale 4s, hold 4s, exhale 6s.');
      this.session.next.breathing += this.state.breathingInterval * 60;
    }
    this.refreshNextReminders();
  }

  handleHealthLimit() {
    const limitSec = this.state.sessionLimit * 60;
    const pct = Math.min((this.session.elapsedSec / limitSec) * 100, 100);
    this.el.progress.style.width = `${pct}%`;

    if (pct >= 80 && pct < 100) {
      this.el.healthAlert.textContent = 'Approaching your session limit. Prepare to take a longer break.';
    } else if (pct >= 100) {
      this.el.healthAlert.textContent = 'Session limit exceeded. Take an immediate break.';
      if (this.state.autoStop) {
        this.stopSession('Auto-stopped due to session health limit.');
      }
    }
  }

  triggerReminder(type, message) {
    this.state.stats.reminders[type].total += 1;
    this.pendingReminder = { type, message };
    this.playSound();

    if (this.state.notificationStyle === 'modal') {
      this.el.modalTitle.textContent = `${type[0].toUpperCase() + type.slice(1)} Reminder`;
      this.el.modalMessage.textContent = message;
      this.el.modal.classList.remove('hidden');
    } else {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `<strong>${type.toUpperCase()}:</strong> ${message} <button class="btn" style="margin-left:.5rem;">Done</button>`;
      const btn = toast.querySelector('button');
      btn.addEventListener('click', () => {
        this.resolveReminder(true);
        toast.remove();
      });
      this.el.toastContainer.appendChild(toast);
      setTimeout(() => toast.remove(), 20000);
    }
    this.persist();
    this.updateCompliance();
  }

  resolveReminder(completed) {
    if (!this.pendingReminder) {
      this.el.modal.classList.add('hidden');
      return;
    }
    if (completed) {
      this.state.stats.reminders[this.pendingReminder.type].completed += 1;
    }
    this.pendingReminder = null;
    this.el.modal.classList.add('hidden');
    this.persist();
    this.updateCompliance();
    this.renderTips();
  }

  snoozeReminder() {
    if (!this.pendingReminder || !this.session.active) return;
    const type = this.pendingReminder.type;
    this.session.next[type] = this.session.elapsedSec + 5 * 60;
    this.pendingReminder = null;
    this.el.modal.classList.add('hidden');
    this.refreshNextReminders();
  }

  markExerciseDone(type) {
    const map = { rule202020: 'eye', blink: 'eye', rotate: 'eye', stretch: 'physical', breathe: 'breathing' };
    const bucket = map[type];
    if (bucket) {
      this.state.stats.reminders[bucket].completed += 1;
      this.state.stats.reminders[bucket].total += 1;
      this.persist();
      this.updateCompliance();
      this.renderTips();
    }
  }

  updateCompliance() {
    const pct = (obj) => obj.total ? `${Math.round((obj.completed / obj.total) * 100)}%` : '0%';
    this.el.eyeCompliance.textContent = pct(this.state.stats.reminders.eye);
    this.el.physicalCompliance.textContent = pct(this.state.stats.reminders.physical);
    this.el.breathingCompliance.textContent = pct(this.state.stats.reminders.breathing);
  }

  refreshNextReminders() {
    if (!this.session.active) {
      this.el.nextEye.textContent = 'Next eye break: --';
      this.el.nextPhysical.textContent = 'Next stretch break: --';
      this.el.nextBreathing.textContent = 'Next breathing break: --';
      return;
    }
    this.el.nextEye.textContent = `Next eye break: ${this.formatCountdown(this.session.next.eye - this.session.elapsedSec)}`;
    this.el.nextPhysical.textContent = `Next stretch break: ${this.formatCountdown(this.session.next.physical - this.session.elapsedSec)}`;
    this.el.nextBreathing.textContent = `Next breathing break: ${this.formatCountdown(this.session.next.breathing - this.session.elapsedSec)}`;
  }

  playSound() {
    if (this.state.soundType === 'none') return;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = this.state.soundType === 'chime' ? 'sine' : 'triangle';
    osc.frequency.value = this.state.soundType === 'chime' ? 784 : 620;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  render() {
    this.el.timer.textContent = this.formatTime(this.session.elapsedSec);
    this.refreshNextReminders();
    this.updateCompliance();
  }

  drawCharts() {
    this.drawBarChart(this.el.dailyChart, this.groupByDays(7), 'Daily');
    this.drawBarChart(this.el.weeklyChart, this.groupByWeeks(8), 'Weekly');
  }

  drawBarChart(canvas, data, mode) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const vals = data.map((d) => d.value);
    const max = Math.max(...vals, 1);
    const barW = (w - 40) / data.length;

    data.forEach((entry, idx) => {
      const x = 20 + idx * barW + barW * 0.15;
      const bh = ((h - 45) * entry.value) / max;
      const y = h - bh - 22;
      ctx.fillStyle = '#4d96ff';
      ctx.fillRect(x, y, barW * 0.7, bh);
      ctx.fillStyle = '#95a6d6';
      ctx.font = '10px Inter';
      ctx.fillText(mode === 'Daily' ? entry.label.slice(5) : entry.label, x, h - 8);
    });
  }

  groupByDays(days) {
    const out = [];
    const sessions = this.state.stats.sessions;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const total = sessions.filter((s) => s.date.startsWith(key)).reduce((acc, s) => acc + s.minutes, 0);
      out.push({ label: key, value: total });
    }
    return out;
  }

  groupByWeeks(weeks) {
    const out = [];
    const sessions = this.state.stats.sessions;
    for (let i = weeks - 1; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const total = sessions.filter((s) => {
        const date = new Date(s.date);
        return date >= start && date <= end;
      }).reduce((acc, s) => acc + s.minutes, 0);
      out.push({ label: `W${weeks - i}`, value: total });
    }
    return out;
  }

  renderTips() {
    const tips = [];
    const { eye, physical, breathing } = this.state.stats.reminders;
    const compliance = (x) => x.total ? (x.completed / x.total) : 0;

    if (compliance(eye) < 0.6) tips.push('Try enabling shorter eye reminder intervals and complete the 20-20-20 exercise.');
    if (compliance(physical) < 0.6) tips.push('Set physical reminders every 30–45 min to reduce neck/shoulder strain.');
    if (compliance(breathing) < 0.6) tips.push('Use breathing breaks after intense tasks to lower fatigue.');

    const avgSession = this.state.stats.sessions.length
      ? this.state.stats.sessions.reduce((a, s) => a + s.minutes, 0) / this.state.stats.sessions.length
      : 0;

    if (avgSession > this.state.sessionLimit) {
      tips.push('Your average session exceeds your limit. Consider lowering session limit or enabling auto-stop.');
    }
    if (!tips.length) {
      tips.push('Great consistency! Keep alternating focus distance, blinking, and short posture resets.');
    }

    this.el.tips.innerHTML = `<strong>Personalized tips</strong><ul>${tips.map((t) => `<li>${t}</li>`).join('')}</ul>`;
  }

  formatTime(sec) {
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  formatCountdown(sec) {
    const v = Math.max(sec, 0);
    const m = Math.floor(v / 60);
    const s = String(v % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...defaults, ...JSON.parse(raw), stats: { ...defaults.stats, ...JSON.parse(raw).stats } } : { ...defaults };
    } catch {
      return { ...defaults };
    }
  }

  persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }
}

window.addEventListener('DOMContentLoaded', () => new EyeCareBuddy());
