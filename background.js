const MAX_SCHEDULED_TABS = 50;

function ensureProtocol(url) {
  if (!url) return url;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
    return 'https://' + url;
  }
  return url;
}

chrome.alarms.onAlarm.addListener((alarm) => {
  chrome.storage.local.get([alarm.name, 'scheduledTabs'], (result) => {
    const url = result[alarm.name];
    if (url) {
      chrome.tabs.create({ url });

      const parts = alarm.name.split('|');
      const frequency = parts[2];

      if (frequency === 'once') {
        // Cleanup "once" alarms
        let scheduledTabs = result.scheduledTabs || [];
        scheduledTabs = scheduledTabs.filter(tab => tab.name !== alarm.name);
        chrome.storage.local.set({ scheduledTabs }, () => {
          chrome.storage.local.remove(alarm.name);
        });
      } else if (frequency === 'monthly') {
        // Reschedule monthly alarms for the next month to avoid drift
        const nextTime = new Date(alarm.scheduledTime);
        nextTime.setMonth(nextTime.getMonth() + 1);
        chrome.alarms.create(alarm.name, { when: nextTime.getTime() });
      }
    }
  });
});

// Schedule a single tab (used for once/daily)
function scheduleTabOpening(name, url, scheduleInfo, callback) {
  chrome.storage.local.get(['scheduledTabs'], (result) => {
    let scheduledTabs = result.scheduledTabs || [];

    if (scheduledTabs.some(tab => tab.name === name)) {
      if (callback) callback({ status: 'already_scheduled' });
      return;
    }

    if (scheduledTabs.length >= MAX_SCHEDULED_TABS) {
      console.error('Maximum number of scheduled tabs reached.');
      if (callback) callback({ status: 'error', message: 'Maximum limit of 50 scheduled tabs reached.' });
      return;
    }

    scheduledTabs.push({ name, url });
    chrome.storage.local.set({ scheduledTabs, [name]: url }, () => {
      chrome.alarms.create(name, scheduleInfo);
      if (callback) callback({ status: 'scheduled' });
    });
  });
}

// Schedule multiple tabs sequentially to avoid race conditions
function scheduleBatch(items, callback) {
  let index = 0;

  function next() {
    if (index >= items.length) {
      if (callback) callback({ status: 'scheduled' });
      return;
    }
    const item = items[index];
    index++;
    scheduleTabOpening(item.name, item.url, item.scheduleInfo, (result) => {
      if (result.status === 'error') {
        if (callback) callback(result);
      } else {
        next();
      }
    });
  }

  next();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'scheduleTab') {
    let { name, url, scheduleInfo } = message;
    try {
      url = ensureProtocol(url);
      new URL(url);
      scheduleTabOpening(name, url, scheduleInfo, (result) => {
        sendResponse(result);
      });
    } catch (e) {
      sendResponse({ status: 'error', message: 'Invalid URL' });
      return false;
    }
    return true; // async response

  } else if (message.action === 'scheduleBatch') {
    // Batch schedule: receives an array of { name, url, scheduleInfo }
    let { items, url: batchUrl } = message;
    try {
      batchUrl = ensureProtocol(batchUrl);
      new URL(batchUrl);
      scheduleBatch(items, (result) => {
        sendResponse(result);
      });
    } catch (e) {
      sendResponse({ status: 'error', message: 'Invalid URL' });
      return false;
    }
    return true; // async response

  } else if (message.action === 'getScheduledTabs') {
    chrome.storage.local.get(['scheduledTabs'], (result) => {
      sendResponse({ scheduledTabs: result.scheduledTabs || [] });
    });
    return true;

  } else if (message.action === 'deleteScheduledTab') {
    const { name } = message;
    chrome.storage.local.get(['scheduledTabs'], (result) => {
      let scheduledTabs = result.scheduledTabs || [];
      scheduledTabs = scheduledTabs.filter(tab => tab.name !== name);
      chrome.storage.local.set({ scheduledTabs }, () => {
        chrome.alarms.clear(name);
        chrome.storage.local.remove(name, () => {
          sendResponse({ status: 'deleted' });
        });
      });
    });
    return true;

  } else if (message.action === 'deleteBatch') {
    // Batch delete: receives an array of names
    const { names } = message;
    chrome.storage.local.get(['scheduledTabs'], (result) => {
      let scheduledTabs = result.scheduledTabs || [];
      scheduledTabs = scheduledTabs.filter(tab => !names.includes(tab.name));
      chrome.storage.local.set({ scheduledTabs }, () => {
        names.forEach(name => chrome.alarms.clear(name));
        chrome.storage.local.remove(names, () => {
          sendResponse({ status: 'deleted' });
        });
      });
    });
    return true;
  }
});
