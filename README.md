# scheduled-tab-opener
Chrome extension to open tabs based on a schedule

<img width="377" alt="image" src="https://github.com/ashishpratapsingh14/scheduled-tab-opener/assets/5556957/66dacb98-41c8-4805-859a-d273805dffb3">


# Step 1: Prepare Your Extension Files
Make sure you have all the necessary files in a single directory. Your directory structure should look like this:

scheduled-tab-opener/manifest.json

scheduled-tab-opener/background.js

scheduled-tab-opener/popup.html

scheduled-tab-opener/popup.js
# Step 2: Load the Extension in Chrome
Open Chrome Extensions Page:

Open Chrome and navigate to the Extensions page by entering chrome://extensions/ in the address bar or by clicking the menu (three dots) in the top-right corner, selecting "More tools," and then "Extensions."
Enable Developer Mode:

In the Extensions page, toggle the "Developer mode" switch on. It's usually located in the top right corner of the page.
Load Your Unpacked Extension:

Click the "Load unpacked" button. A file dialog will open.
Navigate to the directory containing your extension files (e.g., scheduled-tab-opener/), select the folder, and click "Select Folder."
# Step 3: Verify Your Extension
Verify Loading:

After selecting your extension folder, your extension should appear in the list of installed extensions. Ensure there are no errors shown. If there are errors, click on the "Errors" link to see the details and fix them accordingly.
Test the Extension:

Click on the extension icon in the Chrome toolbar to open the popup.
Try scheduling a tab by entering a URL, selecting a frequency, and setting a time.
Ensure the scheduled tabs are listed in the popup.
Verify that the tabs open at the scheduled time.
Test the delete functionality to remove a scheduled tab.
Step 4: Debugging and Improvements
If you encounter any issues:

Check Console Logs:

Open the Developer Tools in Chrome (Ctrl+Shift+I or Cmd+Option+I on macOS).
Go to the "Console" tab to see if there are any error messages or logs that can help you debug.
Update and Reload:

Make necessary changes to your extension files.
Go back to the Extensions page (chrome://extensions/) and click the "Reload" button for your extension.
Re-Test:

Repeat the testing steps to ensure everything works as expected.
