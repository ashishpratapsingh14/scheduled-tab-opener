document.getElementById('scheduleBtn').addEventListener('click', () => {
  const url = document.getElementById('url').value;
  const frequency = document.getElementById('frequency').value;
  const time = document.getElementById('time').value;

  if (url && time) {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const firstAlarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

    let periodInMinutes;
    if (frequency === 'daily') {
      periodInMinutes = 24 * 60;
    } else if (frequency === 'weekly') {
      periodInMinutes = 7 * 24 * 60;
    } else if (frequency === 'monthly') {
      periodInMinutes = 30 * 24 * 60;
    }

    const scheduleInfo = {
      when: firstAlarmTime.getTime(),
      periodInMinutes: periodInMinutes || undefined
    };

    chrome.runtime.sendMessage({
      action: 'scheduleTab',
      name: `${url}-${time}-${frequency}`,
      url,
      scheduleInfo
    }, (response) => {
      if (response.status === 'scheduled') {
        alert('Tab scheduled successfully!');
        loadScheduledTabs();
      } else if (response.status === 'error') {
        alert('Error: ' + response.message);
      }
    });
  } else {
    alert('Please enter both URL and time.');
  }
});

function loadScheduledTabs() {
  chrome.runtime.sendMessage({ action: 'getScheduledTabs' }, (response) => {
    const tabList = document.getElementById('tabList');
    tabList.innerHTML = '';
    response.scheduledTabs.forEach(tab => {
      const div = document.createElement('div');
      div.textContent = `URL: ${tab.url}, Scheduled as: ${tab.name}`;
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'deleteScheduledTab', name: tab.name }, (response) => {
          if (response.status === 'deleted') {
            loadScheduledTabs();
          }
        });
      });
      div.appendChild(deleteButton);
      tabList.appendChild(div);
    });
  });
}

document.addEventListener('DOMContentLoaded', loadScheduledTabs);
