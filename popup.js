// ─── State ───
let selectedFrequency = 'once';
let selectedWeekDays = new Set();
let selectedMonthDays = new Set();

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── DOM References ───
const frequencyChips = document.getElementById('frequencyChips');
const daySelector = document.getElementById('daySelector');
const monthSelector = document.getElementById('monthSelector');
const dayGrid = document.getElementById('dayGrid');
const monthGrid = document.getElementById('monthGrid');
const daySummary = document.getElementById('daySummary');
const monthSummary = document.getElementById('monthSummary');
const scheduleBtn = document.getElementById('scheduleBtn');
const tabList = document.getElementById('tabList');
const tabCount = document.getElementById('tabCount');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const toastIcon = document.getElementById('toastIcon');

function ensureProtocol(url) {
  if (!url) return url;
  // Check if the URL already has a protocol (e.g., http://, https://, ftp://, etc.)
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
    return 'https://' + url;
  }
  return url;
}

// ─── Initialize Month Grid (1-31) ───
function initMonthGrid() {
  monthGrid.innerHTML = '';
  for (let i = 1; i <= 31; i++) {
    const btn = document.createElement('button');
    btn.className = 'month-day-btn';
    btn.dataset.day = i;
    btn.textContent = i;
    btn.title = `Day ${i}`;
    btn.addEventListener('click', () => toggleMonthDay(i, btn));
    monthGrid.appendChild(btn);
  }
}

// ─── Frequency Chip Selection ───
frequencyChips.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;

  // Remove selected from all chips
  frequencyChips.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
  chip.classList.add('selected');

  selectedFrequency = chip.dataset.value;

  // Show/hide day selectors
  daySelector.classList.toggle('visible', selectedFrequency === 'weekly');
  monthSelector.classList.toggle('visible', selectedFrequency === 'monthly');

  // Clear selections when switching
  if (selectedFrequency !== 'weekly') {
    selectedWeekDays.clear();
    dayGrid.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
    updateDaySummary();
  }
  if (selectedFrequency !== 'monthly') {
    selectedMonthDays.clear();
    monthGrid.querySelectorAll('.month-day-btn').forEach(b => b.classList.remove('selected'));
    updateMonthSummary();
  }
});

// ─── Weekly Day Toggle ───
dayGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.day-btn');
  if (!btn) return;

  const day = parseInt(btn.dataset.day);
  if (selectedWeekDays.has(day)) {
    selectedWeekDays.delete(day);
    btn.classList.remove('selected');
  } else {
    selectedWeekDays.add(day);
    btn.classList.add('selected');
  }
  updateDaySummary();
});

function updateDaySummary() {
  if (selectedWeekDays.size === 0) {
    daySummary.innerHTML = 'Tap days to select';
    return;
  }
  const sorted = [...selectedWeekDays].sort((a, b) => a - b);
  const names = sorted.map(d => DAY_NAMES_FULL[d]);
  daySummary.innerHTML = `Every <span>${names.join(', ')}</span>`;
}

// ─── Monthly Day Toggle ───
function toggleMonthDay(day, btn) {
  if (selectedMonthDays.has(day)) {
    selectedMonthDays.delete(day);
    btn.classList.remove('selected');
  } else {
    selectedMonthDays.add(day);
    btn.classList.add('selected');
  }
  updateMonthSummary();
}

function updateMonthSummary() {
  if (selectedMonthDays.size === 0) {
    monthSummary.innerHTML = 'Tap dates to select';
    return;
  }
  const sorted = [...selectedMonthDays].sort((a, b) => a - b);
  const suffix = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const names = sorted.map(suffix);
  monthSummary.innerHTML = `Every <span>${names.join(', ')}</span> of each month`;
}

// ─── Toast Notification ───
function showToast(message, type = 'success') {
  toastMessage.textContent = message;
  toast.className = 'toast ' + type;
  toastIcon.textContent = type === 'success' ? 'check_circle' : 'error';

  // Trigger show
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// ─── Schedule Tab ───
scheduleBtn.addEventListener('click', () => {
  let url = document.getElementById('url').value.trim();
  const time = document.getElementById('time').value;

  if (!url) {
    showToast('Please enter a URL', 'error');
    return;
  }

  url = ensureProtocol(url);

  if (!time) {
    showToast('Please select a time', 'error');
    return;
  }

  // Validate day selection for weekly/monthly
  if (selectedFrequency === 'weekly' && selectedWeekDays.size === 0) {
    showToast('Please select at least one day', 'error');
    return;
  }
  if (selectedFrequency === 'monthly' && selectedMonthDays.size === 0) {
    showToast('Please select at least one date', 'error');
    return;
  }

  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();

  // For weekly/monthly with multi-day selection, create multiple alarms
  if (selectedFrequency === 'weekly') {
    const days = [...selectedWeekDays].sort((a, b) => a - b);
    scheduleWeeklyTabs(url, hours, minutes, days, now);
  } else if (selectedFrequency === 'monthly') {
    const dates = [...selectedMonthDays].sort((a, b) => a - b);
    scheduleMonthlyTabs(url, hours, minutes, dates, now);
  } else {
    // Once or Daily
    const firstAlarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    if (firstAlarmTime <= now) {
      firstAlarmTime.setDate(firstAlarmTime.getDate() + 1);
    }

    let periodInMinutes;
    if (selectedFrequency === 'daily') {
      periodInMinutes = 24 * 60;
    }

    const scheduleInfo = {
      when: firstAlarmTime.getTime(),
      periodInMinutes: periodInMinutes || undefined
    };

    const daysLabel = selectedFrequency === 'once' ? '' : 'Every day';
    const name = `${url}|${time}|${selectedFrequency}|${daysLabel}`;

    chrome.runtime.sendMessage({
      action: 'scheduleTab',
      name,
      url,
      scheduleInfo,
      frequency: selectedFrequency,
      selectedDays: [],
      displayInfo: { frequency: selectedFrequency, time, days: [] }
    }, (response) => {
      if (response && response.status === 'scheduled') {
        showToast('Tab scheduled successfully!');
        loadScheduledTabs();
        resetForm();
      } else if (response && response.status === 'error') {
        showToast(response.message, 'error');
      }
    });
  }
});

function scheduleWeeklyTabs(url, hours, minutes, days, now) {
  const daysNames = days.map(d => DAY_NAMES[d]).join(', ');
  const timeStr = `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}`;

  const items = days.map((dayOfWeek) => {
    const firstAlarmTime = getNextDayOfWeek(now, dayOfWeek, hours, minutes);
    return {
      name: `${url}|${timeStr}|weekly|${DAY_NAMES[dayOfWeek]}|${dayOfWeek}`,
      url,
      scheduleInfo: {
        when: firstAlarmTime.getTime(),
        periodInMinutes: 7 * 24 * 60
      }
    };
  });

  chrome.runtime.sendMessage({
    action: 'scheduleBatch',
    url,
    items
  }, (response) => {
    if (response && response.status === 'scheduled') {
      showToast(`Scheduled for ${daysNames}`);
      loadScheduledTabs();
      resetForm();
    } else if (response && response.status === 'error') {
      showToast(response.message, 'error');
    }
  });
}

function scheduleMonthlyTabs(url, hours, minutes, dates, now) {
  const suffix = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const datesLabel = dates.map(suffix).join(', ');
  const timeStr = `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}`;

  const items = dates.map((dateOfMonth) => {
    const firstAlarmTime = getNextDateOfMonth(now, dateOfMonth, hours, minutes);
    return {
      name: `${url}|${timeStr}|monthly|day${dateOfMonth}`,
      url,
      scheduleInfo: {
        when: firstAlarmTime.getTime()
      }
    };
  });

  chrome.runtime.sendMessage({
    action: 'scheduleBatch',
    url,
    items
  }, (response) => {
    if (response && response.status === 'scheduled') {
      showToast(`Scheduled for ${datesLabel} monthly`);
      loadScheduledTabs();
      resetForm();
    } else if (response && response.status === 'error') {
      showToast(response.message, 'error');
    }
  });
}

function getNextDayOfWeek(from, dayOfWeek, hours, minutes) {
  const result = new Date(from.getFullYear(), from.getMonth(), from.getDate(), hours, minutes, 0, 0);
  const currentDay = from.getDay();
  let daysUntil = dayOfWeek - currentDay;
  if (daysUntil < 0) daysUntil += 7;
  if (daysUntil === 0 && result <= from) daysUntil = 7;
  result.setDate(result.getDate() + daysUntil);
  return result;
}

function getNextDateOfMonth(from, dateOfMonth, hours, minutes) {
  const result = new Date(from.getFullYear(), from.getMonth(), dateOfMonth, hours, minutes, 0, 0);
  if (result <= from) {
    result.setMonth(result.getMonth() + 1);
  }
  return result;
}

function resetForm() {
  document.getElementById('url').value = '';
  document.getElementById('time').value = '';
  selectedFrequency = 'once';
  selectedWeekDays.clear();
  selectedMonthDays.clear();

  // Reset UI
  frequencyChips.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
  frequencyChips.querySelector('[data-value="once"]').classList.add('selected');
  daySelector.classList.remove('visible');
  monthSelector.classList.remove('visible');
  dayGrid.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
  monthGrid.querySelectorAll('.month-day-btn').forEach(b => b.classList.remove('selected'));
  updateDaySummary();
  updateMonthSummary();
}

// ─── Load Scheduled Tabs ───
function loadScheduledTabs() {
  chrome.runtime.sendMessage({ action: 'getScheduledTabs' }, (response) => {
    if (!response) return;
    const tabs = response.scheduledTabs || [];
    tabCount.textContent = tabs.length;
    tabList.innerHTML = '';

    if (tabs.length === 0) {
      tabList.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-outlined">event_available</span>
          <p>No scheduled tabs yet.<br>Add one above to get started!</p>
        </div>
      `;
      return;
    }

    // Group tabs by URL + time for display
    const grouped = {};
    tabs.forEach(tab => {
      const parts = tab.name.split('|');
      const url = tab.url || parts[0];
      const time = parts[1] || '';
      const freq = parts[2] || 'once';
      const groupKey = `${url}__${time}__${freq}`;

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          url: url,
          time: time,
          frequency: freq,
          names: [],
          dayLabels: []
        };
      }
      grouped[groupKey].names.push(tab.name);
      if (parts[3]) {
        grouped[groupKey].dayLabels.push(parts[3]);
      }
    });

    Object.values(grouped).forEach(group => {
      const card = document.createElement('div');
      card.className = 'tab-card';

      // Determine display hostname
      let displayUrl = group.url;
      try {
        const urlObj = new URL(group.url);
        displayUrl = urlObj.hostname.replace('www.', '');
      } catch(e) {}

      // Frequency label
      const freqLabel = group.frequency.charAt(0).toUpperCase() + group.frequency.slice(1);

      // Day chips HTML
      let dayChipsHTML = '';
      if (group.dayLabels.length > 0) {
        dayChipsHTML = `<div class="tab-card-days">
          ${group.dayLabels.map(d => `<span class="tab-card-day-chip">${d}</span>`).join('')}
        </div>`;
      }

      card.innerHTML = `
        <div class="tab-card-indicator"></div>
        <div class="tab-card-content">
          <div class="tab-card-url" title="${group.url}">${displayUrl}</div>
          <div class="tab-card-meta">
            <span class="material-icons-outlined">schedule</span>
            ${group.time || 'N/A'}
            <span class="tab-card-tag">${freqLabel}</span>
          </div>
          ${dayChipsHTML}
        </div>
      `;

      // Delete button - deletes all alarms in the group
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.title = 'Remove schedule';
      deleteBtn.innerHTML = '<span class="material-icons-outlined">delete_outline</span>';
      deleteBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'deleteBatch', names: group.names }, (response) => {
          if (response && response.status === 'deleted') {
            showToast('Schedule removed');
            loadScheduledTabs();
          }
        });
      });

      card.appendChild(deleteBtn);
      tabList.appendChild(card);
    });
  });
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
  initMonthGrid();
  updateDaySummary();
  updateMonthSummary();
  loadScheduledTabs();
});
