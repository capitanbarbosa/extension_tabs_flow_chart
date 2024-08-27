import { STORAGE_KEYS } from "./tabs/constants.js";
import {
  createFlowchartElement,
  displayCurrentState,
  clearBoard,
} from "./tabs/utils.js";
import { saveTabOrder, loadTabOrder } from "./tabs/tabOrder.js";
import {
  saveFlowchartState,
  loadFlowchartState,
  saveState,
  loadState,
  saveCurrentState,
} from "./tabs/flowchartState.js";
import { loadArrowRelationships } from "./tabs/arrowRelationships.js";
import {
  setupEventListeners,
  setupWindowContainerEventListeners,
} from "./tabs/eventHandlers.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM content loaded");
  loadFlowchartState();
  console.log("Flowchart state loaded");
  displayCurrentState();
  console.log("Current state displayed");
  loadArrowRelationships();
  console.log("Arrow relationships loaded");

  const flowchartArea = document.getElementById("flowchartArea");
  const toolSelector = document.getElementById("toolSelector");

  console.log("Flowchart area:", flowchartArea);
  console.log("Tool selector:", toolSelector);

  setupEventListeners(flowchartArea, toolSelector);
  console.log("Event listeners set up");

  chrome.tabs.query({}, (tabs) => {
    const tabList = document.getElementById("tabList");
    if (!tabList) {
      console.error("tabList element not found");
      return;
    }
    console.log("Tabs queried:", tabs);
    const windows = {};

    // Group tabs by windowId
    tabs.forEach((tab) => {
      if (!windows[tab.windowId]) {
        windows[tab.windowId] = [];
      }
      windows[tab.windowId].push(tab);
    });

    Object.keys(windows).forEach((windowId) => {
      const windowContainer = document.createElement("div");
      windowContainer.className = "window-container";

      setupWindowContainerEventListeners(windowContainer, windowId);

      // Add tabs to the window container
      windows[windowId].forEach((tab) => {
        const li = document.createElement("li");
        li.draggable = true;
        const div = document.createElement("div");
        div.className = "tab-container";

        li.dataset.tabId = tab.id;

        const img = document.createElement("img");
        img.src = tab.favIconUrl;
        img.alt = "Tab Icon";
        img.style.width = "16px";
        img.style.height = "16px";
        img.style.marginRight = "8px";

        const a = document.createElement("a");
        a.href = "#";
        a.textContent = tab.title;
        a.addEventListener("click", (event) => {
          event.preventDefault();
          chrome.tabs.update(tab.id, { active: true });
        });

        div.appendChild(img);
        div.appendChild(a);
        li.appendChild(div);
        windowContainer.appendChild(li);
      });

      tabList.appendChild(windowContainer);
    });
  });

  loadTabOrder();

  // Add event listeners for the new buttons
  const saveStateButton = document.getElementById("saveState");
  const loadStateButton = document.getElementById("loadState");
  const clearBoardButton = document.getElementById("clearBoard");

  saveStateButton.addEventListener("click", saveState);
  loadStateButton.addEventListener("click", loadState);
  clearBoardButton.addEventListener("click", clearBoard);

  window.addEventListener("beforeunload", saveCurrentState);
});
