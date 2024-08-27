import { STORAGE_KEYS } from "./constants.js";

export function saveTabOrder() {
  const tabOrder = [];
  document.querySelectorAll("li[data-tab-id]").forEach((li) => {
    tabOrder.push(li.dataset.tabId);
  });

  tabOrder.forEach((tabId, index) => {
    chrome.tabs.move(parseInt(tabId), { index });
  });

  chrome.storage.local.set({ [STORAGE_KEYS.tabOrder]: tabOrder });
}

export function loadTabOrder() {
  chrome.storage.local.get(STORAGE_KEYS.tabOrder, (result) => {
    const tabOrder = result[STORAGE_KEYS.tabOrder] || [];
    const tabList = document.querySelector("#tabList");
    tabOrder.forEach((tabId) => {
      const li = document.querySelector(`li[data-tab-id="${tabId}"]`);
      if (li) {
        tabList.appendChild(li);
      }
    });
  });
}
