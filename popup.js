document.addEventListener("DOMContentLoaded", () => {
  const tabList = document.getElementById("tabList");
  const openPageButton = document.getElementById("openPage");

  if (!tabList) {
    console.error("tabList element not found");
    return;
  }

  openPageButton.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs.html") });
  });

  chrome.tabs.query({}, (tabs) => {
    console.log("Tabs queried:", tabs); // Debugging line
    const windows = {};

    // Group tabs by windowId
    tabs.forEach((tab) => {
      if (!windows[tab.windowId]) {
        windows[tab.windowId] = [];
      }
      windows[tab.windowId].push(tab);
    });

    // Create a container for each window
    Object.keys(windows).forEach((windowId) => {
      const windowContainer = document.createElement("div");
      windowContainer.className = "window-container";

      // Load saved name from storage
      chrome.storage.local.get(`workspace_${windowId}`, (result) => {
        const savedName =
          result[`workspace_${windowId}`] || `Workspace ${windowId}`;
        const workspaceLabel = document.createElement("input");
        workspaceLabel.type = "text";
        workspaceLabel.value = savedName;
        workspaceLabel.className = "workspace-label";
        workspaceLabel.addEventListener("blur", () => {
          const newName = workspaceLabel.value;
          chrome.storage.local.set({ [`workspace_${windowId}`]: newName });
        });
        windowContainer.appendChild(workspaceLabel);

        // Add tabs to the window container
        windows[windowId].forEach((tab) => {
          const li = document.createElement("li");
          li.draggable = true; // Make the list item draggable
          const div = document.createElement("div");
          div.className = "tab-container";

          // Add event listeners for drag and drop
          li.addEventListener("dragstart", (event) => {
            event.dataTransfer.setData("text/plain", tab.id);
          });

          li.addEventListener("dragover", (event) => {
            event.preventDefault();
          });

          li.addEventListener("drop", (event) => {
            event.preventDefault();
            const draggedTabId = event.dataTransfer.getData("text/plain");
            const draggedElement = document.querySelector(
              `li[data-tab-id="${draggedTabId}"]`
            );
            if (draggedElement) {
              li.parentNode.insertBefore(draggedElement, li.nextSibling);
              saveTabOrder();
            }
          });

          li.dataset.tabId = tab.id; // Set a data attribute for the tab ID

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
  });

  function saveTabOrder() {
    const tabOrder = [];
    document.querySelectorAll("li[data-tab-id]").forEach((li) => {
      tabOrder.push(li.dataset.tabId);
    });
    chrome.storage.local.set({ tabOrder });
  }

  function loadTabOrder() {
    chrome.storage.local.get("tabOrder", (result) => {
      const tabOrder = result.tabOrder || [];
      const tabList = document.getElementById("tabList");
      tabOrder.forEach((tabId) => {
        const li = document.querySelector(`li[data-tab-id="${tabId}"]`);
        if (li) {
          tabList.appendChild(li);
        }
      });
    });
  }

  loadTabOrder(); // Load the tab order when the popup loads
});
