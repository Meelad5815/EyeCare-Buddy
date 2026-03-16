const STORAGE_KEY = 'eyeCareBuddyState';

const defaultState = {
  sessionLimit: 120,
  eyeInterval: 20,
  physicalInterval: 40,
  breathingInterval: 45,
  notificationStyle: 'both',
  soundType: 'chime',
  autoStop: false,
  lockAtLimit: false,
  enableEye: true,
  enablePhysical: true,
  enableBreathing: true,
  enableMiniWorkout: true,
  theme: 'dark',
  contrast: 'normal',
  stats: {
    sessions: [],
    reminders: {
      eye: { total: 0, completed: 0 },
      physical: { total: 0, completed: 0 },
      breathing: { total: 0, completed: 0 }
    }
  }
};

class EyeCareBuddy {
  constructor() {
    this.state = this.loadState();
    this.session = { active: false, elapsedSec: 0, timer: null, next: {} };
    this.pendingReminder = null;
    this.locked = false;
    this.bindElements();
    this.hydrateControls();
    this.bindEvents();
    this.renderAll();
  }

  bindElements() {
    this.el = {
      sessionLimit: document.getElementById('sessionLimit'),
      eyeInterval: document.getElementById('eyeInterval'),
      physicalInterval: document.getElementById('physicalInterval'),
      breathingInterval: document.getElementById('breathingInterval'),
      notificationStyle: document.getElementById('notificationStyle'),
      soundType: document.getElementById('soundType'),
      autoStop: document.getElementById('autoStop'),
      lockAtLimit: document.getElementById('lockAtLimit'),
      enableEye: document.getElementById('enableEye'),
      enablePhysical: document.getElementById('enablePhysical'),
      enableBreathing: document.getElementById('enableBreathing'),
      enableMiniWorkout: document.getElementById('enableMiniWorkout'),
      startBtn: document.getElementById('startSessionBtn'),
      stopBtn: document.getElementById('stopSessionBtn'),
      notificationBtn: document.getElementById('requestNotificationBtn'),
      timer: document.getElementById('sessionTimer'),
      nextEye: document.getElementById('nextEyeReminder'),
      nextPhysical: document.getElementById('nextPhysicalReminder'),
      nextBreathing: document.getElementById('nextBreathingReminder'),
      progress: document.getElementById('sessionProgress'),
      healthAlert: document.getElementById('healthAlert'),
      modal: document.getElementById('modal'),
      modalTitle: document.getElementById('modalTitle'),
      modalMessage: document.getElementById('modalMessage'),
      modalDone: document.getElementById('modalDone'),
      modalSnooze: document.getElementById('modalSnooze'),
      lockOverlay: document.getElementById('lockOverlay'),
      unlockSessionBtn: document.getElementById('unlockSessionBtn'),
      miniWorkoutBtn: document.getElementById('miniWorkoutBtn'),
      toastContainer: document.getElementById('toastContainer'),
      dailyChart: document.getElementById('dailyChart'),
      weeklyChart: document.getElementById('weeklyChart'),
      eyeCompliance: document.getElementById('eyeCompliance'),
      physicalCompliance: document.getElementById('physicalCompliance'),
      breathingCompliance: document.getElementById('breathingCompliance'),
      tips: document.getElementById('tipsPanel'),
      announcer: document.getElementById('screenReaderAnnouncer')
    };
  }

  bindEvents() {
    this.el.startBtn.addEventListener('click', () => this.startSession());
    this.el.stopBtn.addEventListener('click', () => this.stopSession('Session ended by user.'));
    this.el.notificationBtn.addEventListener('click', () => this.requestNotificationPermission());
    this.el.modalDone.addEventListener('click', () => this.resolveReminder(true));
    this.el.modalSnooze.addEventListener('click', () => this.snoozeReminder());
    this.el.unlockSessionBtn.addEventListener('click', () => this.unlockSession());
    this.el.miniWorkoutBtn.addEventListener('click', () => this.triggerMiniWorkout(true));

    document.querySelectorAll('input, select').forEach((ctrl) => {
      ctrl.addEventListener('change', () => this.updateSettings());
    });

    document.querySelectorAll('[data-theme-switch]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.theme = btn.dataset.themeSwitch;
        this.applyVisualSettings();
        this.persist();
      });
    });

    document.querySelectorAll('[data-contrast-switch]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.contrast = btn.dataset.contrastSwitch;
        this.applyVisualSettings();
        this.persist();
      });
    });

    document.querySelectorAll('[data-exercise]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        this.markExerciseDone(event.currentTarget.dataset.exercise);
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this.el.modal.classList.contains('hidden')) {
        this.resolveReminder(false);
      }
    });
  }

  hydrateControls() {
    this.el.sessionLimit.value = this.state.sessionLimit;
    this.el.eyeInterval.value = this.state.eyeInterval;
    this.el.physicalInterval.value = this.state.physicalInterval;
    this.el.breathingInterval.value = this.state.breathingInterval;
    this.el.notificationStyle.value = this.state.notificationStyle;
    this.el.soundType.value = this.state.soundType;
    this.el.autoStop.checked = this.state.autoStop;
    this.el.lockAtLimit.checked = this.state.lockAtLimit;
    this.el.enableEye.checked = this.state.enableEye;
    this.el.enablePhysical.checked = this.state.enablePhysical;
    this.el.enableBreathing.checked = this.state.enableBreathing;
    this.el.enableMiniWorkout.checked = this.state.enableMiniWorkout;
    this.applyVisualSettings();
    this.updateNotificationButtonText();
  }

  applyVisualSettings() {
    document.documentElement.dataset.theme = this.state.theme;
    document.documentElement.dataset.contrast = this.state.contrast;
  }

  updateSettings() {
    this.state.sessionLimit = Number(this.el.sessionLimit.value);
    this.state.eyeInterval = Number(this.el.eyeInterval.value);
    this.state.physicalInterval = Number(this.el.physicalInterval.value);
    this.state.breathingInterval = Number(this.el.breathingInterval.value);
    this.state.notificationStyle = this.el.notificationStyle.value;
    this.state.soundType = this.el.soundType.value;
    this.state.autoStop = this.el.autoStop.checked;
    this.state.lockAtLimit = this.el.lockAtLimit.checked;
    this.state.enableEye = this.el.enableEye.checked;
    this.state.enablePhysical = this.el.enablePhysical.checked;
    this.state.enableBreathing = this.el.enableBreathing.checked;
    this.state.enableMiniWorkout = this.el.enableMiniWorkout.checked;
    this.persist();
    this.refreshNextReminders();
  }

  startSession() {
    if (this.session.active || this.locked) return;
    this.session.active = true;
    this.session.elapsedSec = 0;
    this.session.next = {
      eye: this.state.eyeInterval * 60,
      physical: this.state.physicalInterval * 60,
      breathing: this.state.breathingInterval * 60,
      workout: 60 * 60
    };

    this.el.startBtn.disabled = true;
    this.el.stopBtn.disabled = false;
    this.setHealthAlert('Session active. Focus softly, blink often, and keep posture aligned.');

    this.session.timer = setInterval(() => {
      this.session.elapsedSec += 1;
      this.tick();
    }, 1000);
  }

  stopSession(reason = 'Session complete.') {
    if (!this.session.active) return;
    clearInterval(this.session.timer);
    this.session.active = false;

    const minutes = Math.max(1, Math.round(this.session.elapsedSec / 60));
    this.state.stats.sessions.push({ date: new Date().toISOString(), minutes });
    this.state.stats.sessions = this.state.stats.sessions.slice(-180);

    this.el.startBtn.disabled = false;
    this.el.stopBtn.disabled = true;
    this.el.progress.style.width = '0%';
    this.setHealthAlert(reason);

    this.persist();
    this.renderAll();
  }

  tick() {
    if (!this.session.active) return;
    this.renderLiveTimer();
    this.handleReminders();
    this.handleHealthLimit();
  }

  handleReminders() {
    const elapsed = this.session.elapsedSec;

    if (this.state.enableEye && elapsed === this.session.next.eye) {
      this.triggerReminder('eye', '20-20-20 time: look 20 feet away for 20 seconds.');
      this.session.next.eye += this.state.eyeInterval * 60;
    }

    if (this.state.enablePhysical && elapsed === this.session.next.physical) {
      this.triggerReminder('physical', 'Stand up, roll shoulders, and correct posture for 1 minute.');
      this.session.next.physical += this.state.physicalInterval * 60;
    }

    if (this.state.enableBreathing && elapsed === this.session.next.breathing) {
      this.triggerReminder('breathing', 'Take a breathing break: inhale 4s, hold 4s, exhale 6s.');
      this.session.next.breathing += this.state.breathingInterval * 60;
    }

    if (this.state.enableMiniWorkout && elapsed === this.session.next.workout) {
      this.triggerMiniWorkout(false);
      this.session.next.workout += 60 * 60;
    }

    this.refreshNextReminders();
  }

  handleHealthLimit() {
    const limitSec = this.state.sessionLimit * 60;
    const progress = Math.min((this.session.elapsedSec / limitSec) * 100, 100);
    this.el.progress.style.width = `${progress}%`;

    if (progress >= 80 && progress < 100) {
      this.setHealthAlert('Approaching limit. Plan a longer recovery break soon.');
    } else if (progress >= 100) {
      this.setHealthAlert('Screen-time limit reached. Please take an extended break now.');
      this.showBrowserNotification('Health Alert', 'Session limit reached. Please take an extended break.');
      if (this.state.autoStop) {
        this.stopSession('Auto-stopped at healthy session limit. Great job prioritizing your eyes!');
      }
      if (this.state.lockAtLimit && !this.locked) {
        this.lockSession();
      }
    }
  }

  triggerReminder(type, message) {
    this.state.stats.reminders[type].total += 1;
    this.pendingReminder = { type, message };
    this.playSound();

    if (this.state.notificationStyle === 'modal' || this.state.notificationStyle === 'both') {
      this.openModal(`${this.titleCase(type)} Reminder`, message);
    }

    if (this.state.notificationStyle === 'toast' || this.state.notificationStyle === 'both') {
      this.showToast(`${this.titleCase(type)}: ${message}`);
    }

    if (this.state.notificationStyle === 'browser' || this.state.notificationStyle === 'both') {
      this.showBrowserNotification(`${this.titleCase(type)} Reminder`, message);
    }

    this.announce(`${this.titleCase(type)} reminder triggered.`);
    this.persist();
    this.updateCompliance();
  }

  triggerMiniWorkout(userInitiated) {
    const message = 'Quick mini-workout: 10 calf raises, 10 shoulder rolls, 10 neck circles.';
    if (!userInitiated) {
      this.triggerReminder('physical', message);
      return;
    }
    this.showToast(message);
    this.showBrowserNotification('Mini Workout', message);
    this.markExerciseDone('stretch');
  }

  openModal(title, message) {
    this.el.modalTitle.textContent = title;
    this.el.modalMessage.textContent = message;
    this.el.modal.classList.remove('hidden');
    this.el.modalDone.focus();
  }

  resolveReminder(completed) {
    if (this.pendingReminder && completed) {
      this.state.stats.reminders[this.pendingReminder.type].completed += 1;
      this.setHealthAlert('Great work! Reminder completed. Keep building healthy momentum.');
    }
    this.pendingReminder = null;
    this.el.modal.classList.add('hidden');
    this.persist();
    this.renderAnalytics();
  }

  snoozeReminder() {
    if (!this.pendingReminder || !this.session.active) return;
    const type = this.pendingReminder.type;
    this.session.next[type] = this.session.elapsedSec + (5 * 60);
    this.pendingReminder = null;
    this.el.modal.classList.add('hidden');
    this.setHealthAlert('Reminder snoozed for 5 minutes.');
    this.refreshNextReminders();
  }

  lockSession() {
    this.locked = true;
    this.stopSession('Session paused for a required health break.');
    this.el.lockOverlay.classList.remove('hidden');
    this.el.unlockSessionBtn.focus();
  }

  unlockSession() {
    this.locked = false;
    this.el.lockOverlay.classList.add('hidden');
    this.setHealthAlert('Break acknowledged. Start a new session when ready.');
  }

  markExerciseDone(exerciseType) {
    const map = {
      rule202020: 'eye',
      blink: 'eye',
      rotate: 'eye',
      stretch: 'physical',
      breathe: 'breathing'
    };

    const bucket = map[exerciseType];
    if (!bucket) return;

    this.state.stats.reminders[bucket].total += 1;
    this.state.stats.reminders[bucket].completed += 1;
    this.persist();
    this.renderAnalytics();
    this.setHealthAlert(`Exercise completed: ${this.titleCase(exerciseType)}.`);
  }

  requestNotificationPermission() {
    if (!('Notification' in window)) {
      this.showToast('Browser Notification API is not supported in this browser.');
      return;
    }

    Notification.requestPermission().then(() => {
      this.updateNotificationButtonText();
      const message = Notification.permission === 'granted'
        ? 'Browser notifications enabled.'
        : 'Notification permission not granted.';
      this.showToast(message);
    });
  }

  updateNotificationButtonText() {
    if (!('Notification' in window)) {
      this.el.notificationBtn.textContent = 'Browser Notifications Unsupported';
      this.el.notificationBtn.disabled = true;
      return;
    }
    this.el.notificationBtn.textContent = Notification.permission === 'granted'
      ? 'Browser Notifications Enabled'
      : 'Enable Browser Notifications';
  }

  showBrowserNotification(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification(title, { body, icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text y="50" font-size="46">👁️</text></svg>' });
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `${message} <button class="btn" type="button" style="margin-left:.5rem;">Done</button>`;
    const doneBtn = toast.querySelector('button');
    doneBtn.addEventListener('click', () => {
      this.resolveReminder(true);
      toast.remove();
    });
    this.el.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 16000);
  }

  playSound() {
    if (this.state.soundType === 'none') return;
    const AudioContextRef = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextRef) return;

    const audio = new AudioContextRef();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = this.state.soundType === 'chime' ? 'sine' : 'triangle';
    oscillator.frequency.value = this.state.soundType === 'chime' ? 830 : 620;
    gain.gain.value = 0.0001;

    oscillator.connect(gain);
    gain.connect(audio.destination);

    const now = audio.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    oscillator.start(now);
    oscillator.stop(now + 0.55);
  }

  renderAll() {
    this.renderLiveTimer();
    this.renderAnalytics();
    this.refreshNextReminders();
  }

  renderLiveTimer() {
    this.el.timer.textContent = this.formatClock(this.session.elapsedSec);
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

  renderAnalytics() {
    this.updateCompliance();
    this.drawCharts();
    this.renderTips();
  }

  updateCompliance() {
    const pct = (bucket) => {
      if (!bucket.total) return '0%';
      return `${Math.round((bucket.completed / bucket.total) * 100)}%`;
    };

    this.el.eyeCompliance.textContent = pct(this.state.stats.reminders.eye);
    this.el.physicalCompliance.textContent = pct(this.state.stats.reminders.physical);
    this.el.breathingCompliance.textContent = pct(this.state.stats.reminders.breathing);
  }

  drawCharts() {
    this.drawChart(this.el.dailyChart, this.groupByLastDays(7), false);
    this.drawChart(this.el.weeklyChart, this.groupByLastWeeks(8), true);
  }

  drawChart(canvas, data, weekly) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const values = data.map((item) => item.value);
    const max = Math.max(...values, 1);
    const barWidth = (width - 50) / data.length;

    data.forEach((entry, index) => {
      const barHeight = ((height - 45) * entry.value) / max;
      const x = 25 + (index * barWidth) + 8;
      const y = height - barHeight - 22;

      ctx.fillStyle = '#4a93ff';
      ctx.fillRect(x, y, barWidth - 16, barHeight);

      ctx.fillStyle = '#90a7dc';
      ctx.font = '10px Inter';
      ctx.fillText(weekly ? entry.label : entry.label.slice(5), x - 2, height - 7);
    });
  }

  groupByLastDays(days) {
    const sessions = this.state.stats.sessions;
    const rows = [];

    for (let i = days - 1; i >= 0; i -= 1) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      const value = sessions
        .filter((session) => session.date.startsWith(key))
        .reduce((sum, session) => sum + session.minutes, 0);

      rows.push({ label: key, value });
    }

    return rows;
  }

  groupByLastWeeks(weeks) {
    const sessions = this.state.stats.sessions;
    const rows = [];

    for (let i = weeks - 1; i >= 0; i -= 1) {
      const start = new Date();
      start.setDate(start.getDate() - (i * 7));
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const value = sessions
        .filter((session) => {
          const sessionDate = new Date(session.date);
          return sessionDate >= start && sessionDate <= end;
        })
        .reduce((sum, session) => sum + session.minutes, 0);

      rows.push({ label: `W${weeks - i}`, value });
    }

    return rows;
  }

  renderTips() {
    const tips = [];
    const { eye, physical, breathing } = this.state.stats.reminders;

    const ratio = (item) => (item.total ? item.completed / item.total : 0);

    if (ratio(eye) < 0.65) tips.push('Try reducing eye reminder interval to 20-25 minutes to improve consistency.');
    if (ratio(physical) < 0.65) tips.push('Schedule physical breaks every 30-45 minutes to avoid neck and back strain.');
    if (ratio(breathing) < 0.65) tips.push('Breathing resets can reduce fatigue after cognitively heavy tasks.');

    const averageSession = this.state.stats.sessions.length
      ? this.state.stats.sessions.reduce((sum, s) => sum + s.minutes, 0) / this.state.stats.sessions.length
      : 0;

    if (averageSession > this.state.sessionLimit) {
      tips.push('Average session length exceeds your target. Consider enabling auto-stop or lock mode.');
    } else {
      tips.push('Great pacing! Maintain hydration and blink at natural intervals.');
    }

    this.el.tips.innerHTML = `<strong>Personalized Health Tips</strong><ul>${tips.map((tip) => `<li>${tip}</li>`).join('')}</ul>`;
  }

  formatClock(totalSeconds) {
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  formatCountdown(seconds) {
    const safe = Math.max(0, seconds);
    const m = String(Math.floor(safe / 60)).padStart(2, '0');
    const s = String(safe % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  setHealthAlert(message) {
    this.el.healthAlert.textContent = message;
    this.announce(message);
  }

  announce(message) {
    this.el.announcer.textContent = message;
  }

  titleCase(text) {
    return text
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (char) => char.toUpperCase());
  }

  loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);

    try {
      const parsed = JSON.parse(raw);
      return {
        ...structuredClone(defaultState),
        ...parsed,
        stats: {
          ...structuredClone(defaultState.stats),
          ...parsed.stats,
          reminders: {
            ...structuredClone(defaultState.stats.reminders),
            ...(parsed.stats?.reminders || {})
          }
        }
      };
    } catch {
      return structuredClone(defaultState);
    }
  }

  persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new EyeCareBuddy();
});
