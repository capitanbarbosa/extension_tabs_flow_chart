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
    const existingFlowchartTab = document.querySelector(
      `.flowchart-tab[data-tab-id="${draggedTabId}"]`
    );

    if (existingFlowchartTab) {
      // Move the existing flowchart tab
      existingFlowchartTab.style.left = `${
        event.clientX - flowchartArea.offsetLeft
      }px`;
      existingFlowchartTab.style.top = `${
        event.clientY - flowchartArea.offsetTop
      }px`;
    } else {
      // Create a new flowchart tab
      const draggedElement = document.querySelector(
        `li[data-tab-id="${draggedTabId}"]`
      );
      if (draggedElement) {
        const flowchartTab = document.createElement("div");
        flowchartTab.className = "flowchart-tab";
        flowchartTab.dataset.tabId = draggedTabId; // Set a data attribute for the tab ID

        const img = document.createElement("img");
        img.src = draggedElement.querySelector("img").src;
        img.alt = "Tab Icon";
        img.style.width = "16px";
        img.style.height = "16px";
        img.style.marginRight = "8px";

        const text = document.createElement("span");
        text.textContent = draggedElement.querySelector("a").textContent;

        flowchartTab.appendChild(img);
        flowchartTab.appendChild(text);

        flowchartTab.style.left = `${
          event.clientX - flowchartArea.offsetLeft
        }px`;
        flowchartTab.style.top = `${event.clientY - flowchartArea.offsetTop}px`;

        // Make the flowchart tab draggable within the flowchart area
        flowchartTab.draggable = true;
        flowchartTab.addEventListener("dragstart", (event) => {
          const rect = flowchartTab.getBoundingClientRect();
          event.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
              id: flowchartTab.dataset.tabId,
              offsetX: event.clientX - rect.left,
              offsetY: event.clientY - rect.top,
            })
          );
          flowchartTab.classList.add("dragging");
        });

        flowchartTab.addEventListener("dragend", () => {
          flowchartTab.classList.remove("dragging");
        });

        flowchartArea.appendChild(flowchartTab);
      }
    }
  });

  // Tool selector functionality
  const toolSelector = document.getElementById("toolSelector");
  let selectedTool = null;

  toolSelector.addEventListener("click", (event) => {
    if (event.target.tagName === "BUTTON") {
      selectedTool = event.target.dataset.tool;
    }
  });

  flowchartArea.addEventListener("click", (event) => {
    if (!selectedTool || selectedTool === "move") return;

    // Prevent creating a new element if clicking inside an existing editable element
    if (
      event.target.closest(".flowchart-tab[contenteditable='true']") ||
      event.target.closest(".flowchart-tab h1[contenteditable='true']")
    ) {
      return;
    }

    const element = document.createElement("div");
    element.className = "flowchart-tab";
    element.dataset.tabId = Date.now().toString(); // Add this line to generate a unique ID
    element.style.left = `${event.clientX - flowchartArea.offsetLeft}px`;
    element.style.top = `${event.clientY - flowchartArea.offsetTop}px`;

    switch (selectedTool) {
      case "text":
        element.textContent = "Text";
        element.contentEditable = "true"; // Make the text editable
        break;
      case "header":
        element.innerHTML = "<h1 contenteditable='true'>Header</h1>"; // Make the header editable
        break;
      case "box":
        element.style.width = "100px";
        element.style.height = "100px";
        element.style.border = "2px dashed #d0d3d9"; // Dashed border for the box
        element.style.backgroundColor = "transparent"; // Transparent background
        break;
      case "arrow":
        element.innerHTML = "→";
        element.style.fontSize = "24px";
        break;
    }

    // Make the new element draggable
    element.draggable = true;
    element.addEventListener("dragstart", (event) => {
      const rect = element.getBoundingClientRect();
      event.dataTransfer.setData(
        "text/plain",
        JSON.stringify({
          id: element.dataset.tabId || "",
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
        })
      );
      element.classList.add("dragging");
    });

    element.addEventListener("dragend", () => {
      element.classList.remove("dragging");
    });

    flowchartArea.appendChild(element);
  });

  // Allow moving of created elements
  flowchartArea.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  flowchartArea.addEventListener("drop", (event) => {
    event.preventDefault();
    const data = JSON.parse(event.dataTransfer.getData("text/plain"));
    const draggingElement = document.querySelector(
      `.flowchart-tab[data-tab-id="${data.id}"]`
    );
    if (draggingElement) {
      draggingElement.style.left = `${
        event.clientX - data.offsetX - flowchartArea.offsetLeft
      }px`;
      draggingElement.style.top = `${
        event.clientY - data.offsetY - flowchartArea.offsetTop
      }px`;
      draggingElement.classList.remove("dragging");
    }
  });
});
