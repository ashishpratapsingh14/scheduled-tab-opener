const MAX_SCHEDULED_TABS = 10; // Limit to 10 scheduled tabs

chrome.alarms.onAlarm.addListener((alarm) => {
  chrome.storage.local.get([alarm.name], (result) => {
    const url = result[alarm.name];
    if (url) {
      chrome.tabs.create({ url });
    }
  });
});

function scheduleTabOpening(name, url, scheduleInfo) {
  chrome.storage.local.get(['scheduledTabs'], (result) => {
    let scheduledTabs = result.scheduledTabs || [];
    if (scheduledTabs.length >= MAX_SCHEDULED_TABS) {
      console.error('Maximum number of scheduled tabs reached.');
      return;
    }

    scheduledTabs.push({ name, url });
    chrome.storage.local.set({ scheduledTabs });
    chrome.storage.local.set({ [name]: url }, () => {
      chrome.alarms.create(name, scheduleInfo);
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'scheduleTab') {
    const { name, url, scheduleInfo } = message;
    try {
      new URL(url); // Validate URL
      scheduleTabOpening(name, url, scheduleInfo);
      sendResponse({ status: 'scheduled' });
    } catch (e) {
      sendResponse({ status: 'error', message: 'Invalid URL' });
    }
  } else if (message.action === 'getScheduledTabs') {
    chrome.storage.local.get(['scheduledTabs'], (result) => {
      sendResponse({ scheduledTabs: result.scheduledTabs || [] });
    });
    return true; // Indicate asynchronous response
  } else if (message.action === 'deleteScheduledTab') {
    const { name } = message;
    chrome.storage.local.get(['scheduledTabs'], (result) => {
      let scheduledTabs = result.scheduledTabs || [];
      scheduledTabs = scheduledTabs.filter(tab => tab.name !== name);
      chrome.storage.local.set({ scheduledTabs }, () => {
        chrome.alarms.clear(name);
        chrome.storage.local.remove(name, () => { // Corrected line
          sendResponse({ status: 'deleted' });
        });
      });
    });
    return true; // Indicate asynchronous response
  }
});
