const MAX_SCHEDULED_TABS = 50;

chrome.alarms.onAlarm.addListener((alarm) => {
  chrome.storage.local.get([alarm.name], (result) => {
    const url = result[alarm.name];
    if (url) {
      chrome.tabs.create({ url });
    }
  });
});

// Schedule a single tab (used for once/daily)
function scheduleTabOpening(name, url, scheduleInfo, callback) {
  chrome.storage.local.get(['scheduledTabs'], (result) => {
    let scheduledTabs = result.scheduledTabs || [];

    if (scheduledTabs.some(tab => tab.name === name)) {
      if (callback) callback();
      return;
    }

    if (scheduledTabs.length >= MAX_SCHEDULED_TABS) {
      console.error('Maximum number of scheduled tabs reached.');
      if (callback) callback();
      return;
    }

    scheduledTabs.push({ name, url });
    chrome.storage.local.set({ scheduledTabs, [name]: url }, () => {
      chrome.alarms.create(name, scheduleInfo);
      if (callback) callback();
    });
  });
}

// Schedule multiple tabs sequentially to avoid race conditions
function scheduleBatch(items, callback) {
  let index = 0;

  function next() {
    if (index >= items.length) {
      if (callback) callback();
      return;
    }
    const item = items[index];
    index++;
    scheduleTabOpening(item.name, item.url, item.scheduleInfo, next);
  }

  next();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'scheduleTab') {
    const { name, url, scheduleInfo } = message;
    try {
      new URL(url);
      scheduleTabOpening(name, url, scheduleInfo, () => {
        sendResponse({ status: 'scheduled' });
      });
    } catch (e) {
      sendResponse({ status: 'error', message: 'Invalid URL' });
      return false;
    }
    return true; // async response

  } else if (message.action === 'scheduleBatch') {
    // Batch schedule: receives an array of { name, url, scheduleInfo }
    const { items, url: batchUrl } = message;
    try {
      new URL(batchUrl);
      scheduleBatch(items, () => {
        sendResponse({ status: 'scheduled' });
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
        let cleared = 0;
        names.forEach(name => {
          chrome.alarms.clear(name);
          chrome.storage.local.remove(name, () => {
            cleared++;
            if (cleared === names.length) {
              sendResponse({ status: 'deleted' });
            }
          });
        });
        if (names.length === 0) sendResponse({ status: 'deleted' });
      });
    });
    return true;
  }
});
