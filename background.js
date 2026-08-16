'use strict';

const COMMANDS = new Set(['speed-up', 'speed-down', 'speed-reset']);

chrome.commands.onCommand.addListener(async (command) => {
  if (!COMMANDS.has(command)) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id != null) {
      chrome.tabs.sendMessage(tab.id, { type: 'baisoku:command', command }).catch(() => {});
    }
  } catch (_) {
    // no receiver / restricted page
  }
});
