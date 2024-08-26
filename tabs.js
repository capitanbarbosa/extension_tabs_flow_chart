document.addEventListener("DOMContentLoaded", () => {
  loadFlowchartState();

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

  function saveFlowchartState() {
    const flowchartElements = Array.from(
      document.querySelectorAll(".flowchart-tab")
    ).map((el) => ({
      id: el.dataset.tabId,
      type: el.classList.contains("flowchart-tab") ? "tab" : "element",
      left: el.style.left,
      top: el.style.top,
      content: el.innerHTML,
      width: el.style.width,
      height: el.style.height,
    }));

    chrome.storage.local.set({ flowchartState: flowchartElements });
  }

  function loadFlowchartState() {
    chrome.storage.local.get("flowchartState", (result) => {
      const flowchartState = result.flowchartState || [];
      const flowchartArea = document.getElementById("flowchartArea");
      const toolSelector = document.getElementById("toolSelector");

      // Clear existing flowchart elements while preserving the tool selector
      while (flowchartArea.firstChild) {
        if (flowchartArea.firstChild !== toolSelector) {
          flowchartArea.removeChild(flowchartArea.firstChild);
        } else {
          break;
        }
      }

      flowchartState.forEach((item) => {
        const element = createFlowchartElement(item);
        flowchartArea.appendChild(element);
      });
    });
  }
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

        // Create the drag handle
        const handle = document.createElement("div");
        handle.className = "drag-handle";
        flowchartTab.appendChild(handle);

        flowchartTab.style.left = `${
          event.clientX - flowchartArea.offsetLeft
        }px`;
        flowchartTab.style.top = `${event.clientY - flowchartArea.offsetTop}px`;

        // Make the flowchart tab draggable within the flowchart area
        handle.draggable = true;
        handle.addEventListener("dragstart", (event) => {
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

        handle.addEventListener("dragend", () => {
          flowchartTab.classList.remove("dragging");
        });

        // Make the flowchart tab clickable to shift focus
        flowchartTab.addEventListener("click", (event) => {
          event.preventDefault();
          chrome.tabs.update(parseInt(flowchartTab.dataset.tabId), {
            active: true,
          });
        });

        flowchartArea.appendChild(flowchartTab);
      }
    }
    saveFlowchartState();
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

    if (
      event.target.closest(".flowchart-tab[contenteditable='true']") ||
      event.target.closest(".flowchart-tab h1[contenteditable='true']")
    ) {
      return;
    }

    const element = document.createElement("div");
    element.className = "flowchart-tab";
    element.dataset.tabId = Date.now().toString();
    element.style.left = `${event.clientX - flowchartArea.offsetLeft}px`;
    element.style.top = `${event.clientY - flowchartArea.offsetTop}px`;

    switch (selectedTool) {
      case "text":
        element.textContent = "Text";
        element.contentEditable = "true";
        break;
      case "header":
        element.innerHTML = "<h1 contenteditable='true'>Header</h1>";
        break;
      case "box":
        element.style.width = "100px";
        element.style.height = "100px";
        element.style.border = "2px dashed #d0d3d9";
        element.style.backgroundColor = "transparent";
        break;
      case "arrow":
        element.innerHTML = "→";
        element.style.fontSize = "24px";
        break;
    }

    // Create the drag handle
    const handle = document.createElement("div");
    handle.className = "drag-handle";
    element.appendChild(handle);

    // Make the handle draggable
    handle.draggable = true;
    handle.addEventListener("dragstart", (event) => {
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

    handle.addEventListener("dragend", () => {
      element.classList.remove("dragging");
    });

    flowchartArea.appendChild(element);
    saveFlowchartState();
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
    saveFlowchartState();
  });

  // Add event listeners for the new buttons
  const saveStateButton = document.getElementById("saveState");
  const loadStateButton = document.getElementById("loadState");
  const clearBoardButton = document.getElementById("clearBoard");

  saveStateButton.addEventListener("click", saveState);
  loadStateButton.addEventListener("click", loadState);
  clearBoardButton.addEventListener("click", clearBoard);

  function saveState() {
    const flowchartState = Array.from(
      document.querySelectorAll(".flowchart-tab")
    ).map((el) => ({
      id: el.dataset.tabId,
      type: el.classList.contains("flowchart-tab") ? "tab" : "element",
      left: el.style.left,
      top: el.style.top,
      content: el.innerHTML,
      width: el.style.width,
      height: el.style.height,
    }));

    const stateName = prompt("Enter a name for this state:");
    if (stateName) {
      chrome.storage.local.get("savedStates", (result) => {
        const savedStates = result.savedStates || {};
        savedStates[stateName] = flowchartState;
        chrome.storage.local.set({ savedStates }, () => {
          alert("State saved successfully!");
        });
      });
    }
  }

  function loadState() {
    chrome.storage.local.get("savedStates", (result) => {
      const savedStates = result.savedStates || {};
      const stateNames = Object.keys(savedStates);

      if (stateNames.length === 0) {
        alert("No saved states found.");
        return;
      }

      const stateName = prompt(
        "Enter the name of the state to load:\n\nAvailable states:\n" +
          stateNames.join("\n")
      );
      if (stateName && savedStates[stateName]) {
        clearBoard();
        const flowchartArea = document.getElementById("flowchartArea");
        savedStates[stateName].forEach((item) => {
          const element = createFlowchartElement(item);
          flowchartArea.appendChild(element);
        });
        alert("State loaded successfully!");
      } else if (stateName) {
        alert("State not found.");
      }
    });
  }

  function clearBoard() {
    const flowchartArea = document.getElementById("flowchartArea");
    const flowchartElements = flowchartArea.querySelectorAll(".flowchart-tab");
    flowchartElements.forEach((element) => {
      flowchartArea.removeChild(element);
    });
  }

  function createFlowchartElement(item) {
    const element = document.createElement("div");
    element.className = "flowchart-tab";
    element.dataset.tabId = item.id;
    element.style.left = item.left;
    element.style.top = item.top;
    element.innerHTML = item.content;
    element.style.width = item.width;
    element.style.height = item.height;

    // Make the element draggable
    element.draggable = true;
    element.addEventListener("dragstart", (event) => {
      const rect = element.getBoundingClientRect();
      event.dataTransfer.setData(
        "text/plain",
        JSON.stringify({
          id: element.dataset.tabId,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
        })
      );
      element.classList.add("dragging");
    });

    element.addEventListener("dragend", () => {
      element.classList.remove("dragging");
    });

    // Add click event listener for the tab
    const tabLink = element.querySelector("span");
    if (tabLink) {
      tabLink.addEventListener("click", (event) => {
        event.preventDefault();
        chrome.tabs.update(parseInt(element.dataset.tabId), { active: true });
      });
    }

    return element;
  }
});
