document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({}, (tabs) => {
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
            li.classList.add("dragging"); // Add a class for visual feedback
          });

          li.addEventListener("dragend", () => {
            li.classList.remove("dragging"); // Remove visual feedback
          });

          li.addEventListener("dragover", (event) => {
            event.preventDefault();
            const draggingElement = document.querySelector(".dragging");
            const currentElement = li;
            const isAbove =
              draggingElement.getBoundingClientRect().top <
              currentElement.getBoundingClientRect().top;

            // Insert the dragging element before or after the current element
            if (isAbove) {
              currentElement.parentNode.insertBefore(
                draggingElement,
                currentElement
              );
            } else {
              currentElement.parentNode.insertBefore(
                draggingElement,
                currentElement.nextSibling
              );
            }
          });

          li.addEventListener("drop", (event) => {
            event.preventDefault();
            const draggedTabId = event.dataTransfer.getData("text/plain");
            const draggedElement = document.querySelector(
              `li[data-tab-id="${draggedTabId}"]`
            );
            if (draggedElement) {
              // Save the new order
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

    // Move tabs in the new order
    tabOrder.forEach((tabId, index) => {
      chrome.tabs.move(parseInt(tabId), { index });
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

  loadTabOrder(); // Load the tab order when the page loads

  // Handle drag and drop into the flowchart area
  const flowchartArea = document.getElementById("flowchartArea");

  flowchartArea.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  flowchartArea.addEventListener("drop", (event) => {
    event.preventDefault();
    const draggedTabId = event.dataTransfer.getData("text/plain");
    const draggedElement = document.querySelector(
      `li[data-tab-id="${draggedTabId}"]`
    );
    if (draggedElement) {
      const flowchartTab = document.createElement("div");
      flowchartTab.className = "flowchart-tab";
      flowchartTab.textContent = draggedElement.querySelector("a").textContent;
      flowchartTab.style.left = `${event.clientX - flowchartArea.offsetLeft}px`;
      flowchartTab.style.top = `${event.clientY - flowchartArea.offsetTop}px`;

      // Make the flowchart tab draggable within the flowchart area
      flowchartTab.draggable = true;
      flowchartTab.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text/plain", draggedTabId);
      });

      flowchartArea.appendChild(flowchartTab);
    }
  });
});
