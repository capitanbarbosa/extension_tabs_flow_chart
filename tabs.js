document.addEventListener("DOMContentLoaded", () => {
  // ==========================
  // Initial Setup
  // ==========================
  loadFlowchartState();
  displayCurrentState();
  loadArrowRelationships();

  // Add the toggle functionality for the tab list
  const toggleTabListButton = document.getElementById("toggleTabList");
  const workspaceContainer = document.getElementById("workspaceContainer");

  toggleTabListButton.addEventListener("click", () => {
    workspaceContainer.classList.toggle("hidden");
  });
  // ==========================
  // Chrome Tabs Query and Grouping by windowId
  // ==========================
  chrome.tabs.query({}, (tabs) => {
    const windows = {};

    tabs.forEach((tab) => {
      if (!windows[tab.windowId]) {
        windows[tab.windowId] = [];
      }
      windows[tab.windowId].push(tab);
    });

    Object.keys(windows).forEach((windowId) => {
      const windowContainer = document.createElement("div");
      windowContainer.className = "window-container";

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

        windows[windowId].forEach((tab) => {
          const li = document.createElement("li");
          li.draggable = true;
          const div = document.createElement("div");
          div.className = "tab-container";

          li.addEventListener("dragstart", (event) => {
            event.dataTransfer.setData("text/plain", tab.id);
            li.classList.add("dragging");
          });

          li.addEventListener("dragend", () => {
            li.classList.remove("dragging");
          });

          li.addEventListener("dragover", (event) => {
            event.preventDefault();
            const draggingElement = document.querySelector(".dragging");
            const currentElement = li;
            const isAbove =
              draggingElement.getBoundingClientRect().top <
              currentElement.getBoundingClientRect().top;

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
              saveTabOrder();
            }
          });

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
  });

  // ==========================
  // Save and Load Tab Order
  // ==========================
  function saveTabOrder() {
    const tabOrder = [];
    document.querySelectorAll("li[data-tab-id]").forEach((li) => {
      tabOrder.push(li.dataset.tabId);
    });

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

  loadTabOrder();

  // ==========================
  // Flowchart State Management
  // ==========================
  function saveFlowchartState() {
    const flowchartElements = Array.from(
      document.querySelectorAll(".flowchart-tab")
    ).map((el) => {
      const content =
        el.dataset.type === "text"
          ? el.querySelector("[contenteditable]").innerHTML
          : el.innerHTML;

      return {
        id: el.dataset.tabId,
        type:
          el.dataset.type ||
          (el.classList.contains("box-element") ? "box" : "element"),
        left: `${parseInt(el.style.left) + flowchartArea.scrollLeft}px`,
        top: `${parseInt(el.style.top) + flowchartArea.scrollTop}px`,
        content: content,
        width: el.style.width,
        height: el.style.height,
      };
    });

    const svgPaths = Array.from(flowchartCanvas.querySelectorAll("path")).map(
      (path) => {
        return {
          d: path.getAttribute("d"),
          stroke: path.getAttribute("stroke"),
          strokeWidth: path.getAttribute("stroke-width"),
        };
      }
    );

    chrome.storage.local.set({ flowchartState: flowchartElements, svgPaths });
  }

  function loadFlowchartState() {
    chrome.storage.local.get(
      ["currentFlowchartState", "flowchartState", "svgPaths"],
      (result) => {
        const flowchartState =
          result.currentFlowchartState || result.flowchartState || [];
        const flowchartCanvas = document.getElementById("flowchartCanvas");
        const toolSelector = document.getElementById("toolSelector");

        // Clear existing elements
        while (flowchartCanvas.firstChild) {
          if (flowchartCanvas.firstChild !== toolSelector) {
            flowchartCanvas.removeChild(flowchartCanvas.firstChild);
          } else {
            break;
          }
        }

        flowchartState.forEach((item) => {
          const element = createFlowchartElement(item);
          flowchartCanvas.appendChild(element);
        });

        if (result.svgPaths) {
          const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
          );
          svg.style.position = "absolute";
          svg.style.left = "0";
          svg.style.top = "0";
          svg.style.width = "100%";
          svg.style.height = "100%";
          svg.style.pointerEvents = "none";
          flowchartCanvas.appendChild(svg);

          result.svgPaths.forEach((pathData) => {
            const path = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "path"
            );
            path.setAttribute("d", pathData.d);
            path.setAttribute("stroke", pathData.stroke);
            path.setAttribute("stroke-width", pathData.strokeWidth);
            path.setAttribute("fill", "none");
            svg.appendChild(path);
          });
        }

        console.log("Loaded flowchart state:", flowchartState); // For debugging
      }
    );
  }
  // ==========================
  // Drag and Drop within Flowchart Area
  // ==========================
  const flowchartArea = document.getElementById("flowchartArea");
  const flowchartCanvas = document.getElementById("flowchartCanvas");

  flowchartCanvas.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  flowchartCanvas.addEventListener("drop", (event) => {
    event.preventDefault();
    const draggedTabId = event.dataTransfer.getData("text/plain");
    const existingFlowchartTab = document.querySelector(
      `.flowchart-tab[data-tab-id="${draggedTabId}"]`
    );

    if (existingFlowchartTab) {
      existingFlowchartTab.style.left = `${
        event.clientX - flowchartArea.offsetLeft + flowchartArea.scrollLeft
      }px`;
      existingFlowchartTab.style.top = `${
        event.clientY - flowchartArea.offsetTop + flowchartArea.scrollTop
      }px`;
    } else {
      const draggedElement = document.querySelector(
        `li[data-tab-id="${draggedTabId}"]`
      );
      if (draggedElement) {
        const flowchartTab = document.createElement("div");
        flowchartTab.className = "flowchart-tab";
        flowchartTab.dataset.tabId = draggedTabId;

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

        const handle = document.createElement("div");
        handle.className = "drag-handle";
        flowchartTab.appendChild(handle);

        flowchartTab.style.left = `${
          event.clientX - flowchartArea.offsetLeft + flowchartArea.scrollLeft
        }px`;
        flowchartTab.style.top = `${
          event.clientY - flowchartArea.offsetTop + flowchartArea.scrollTop
        }px`;

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

        flowchartTab.addEventListener("click", (event) => {
          event.preventDefault();
          chrome.tabs.update(parseInt(flowchartTab.dataset.tabId), {
            active: true,
          });
        });

        flowchartCanvas.appendChild(flowchartTab);
      }
    }
    saveFlowchartState();
  });

  // ==========================
  // Tool Selector Functionality
  // ==========================
  const toolSelector = document.getElementById("toolSelector");
  let selectedTool = null;

  toolSelector.addEventListener("click", (event) => {
    if (event.target.tagName === "BUTTON") {
      selectedTool = event.target.dataset.tool;
      highlightSelectedTool(selectedTool);
    }
  });

  function highlightSelectedTool(selectedTool) {
    const toolButtons = toolSelector.querySelectorAll("button");
    toolButtons.forEach((button) => {
      if (button.dataset.tool === selectedTool) {
        button.classList.add("selected-tool");
      } else {
        button.classList.remove("selected-tool");
      }
    });
  }

  flowchartCanvas.addEventListener("click", (event) => {
    if (!selectedTool || selectedTool === "move") return;

    if (event.target.closest("#toolSelector")) return;

    if (
      event.target.closest(".flowchart-tab[contenteditable='true']") ||
      event.target.closest(".flowchart-tab h1[contenteditable='true']")
    ) {
      return;
    }

    if (selectedTool !== "relationship") {
      const element = document.createElement("div");
      element.className = "flowchart-tab";
      element.dataset.tabId = Date.now().toString();
      element.style.left = `${
        event.clientX - flowchartArea.offsetLeft + flowchartArea.scrollLeft
      }px`;
      element.style.top = `${
        event.clientY - flowchartArea.offsetTop + flowchartArea.scrollTop
      }px`;

      switch (selectedTool) {
        case "text":
          element.innerHTML =
            "<h3 contenteditable='true' style='font-weight: normal;'>Text</h3>";
          element.style.minWidth = "100px";
          element.style.minHeight = "30px";
          element.dataset.type = "header";
          break;
        case "header":
          element.innerHTML = "<h1 contenteditable='true'>Header</h1>";
          element.style.minWidth = "100px";
          element.style.minHeight = "30px";
          element.dataset.type = "header";
          break;
        case "box":
          element.classList.add("box-element");
          element.style.border = "2px dashed #d0d3d9";
          element.style.backgroundColor = "transparent";
          element.style.width = "100px";
          element.style.height = "100px";
          element.style.resize = "both";
          element.style.overflow = "auto";
          break;
        case "arrow":
          element.innerHTML = "→";
          element.style.fontSize = "24px";
          break;
      }

      const handle = document.createElement("div");
      handle.className = "drag-handle";
      element.appendChild(handle);

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

      flowchartCanvas.appendChild(element);
      saveFlowchartState();
    } else if (selectedTool === "relationship") {
      const handle = event.target.closest(".drag-handle");
      if (handle) {
        if (!firstHandle) {
          firstHandle = handle;
        } else {
          createArrow(firstHandle, handle);
          firstHandle = null;
        }
      }
    }
  });

  flowchartCanvas.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  flowchartCanvas.addEventListener("drop", (event) => {
    event.preventDefault();
    const data = JSON.parse(event.dataTransfer.getData("text/plain"));
    const draggingElement = document.querySelector(
      `.flowchart-tab[data-tab-id="${data.id}"]`
    );
    if (draggingElement) {
      draggingElement.style.left = `${
        event.clientX -
        data.offsetX -
        flowchartArea.offsetLeft +
        flowchartArea.scrollLeft
      }px`;
      draggingElement.style.top = `${
        event.clientY -
        data.offsetY -
        flowchartArea.offsetTop +
        flowchartArea.scrollTop
      }px`;
      draggingElement.classList.remove("dragging");
    }
    saveFlowchartState();
  });

  // ==========================
  // State Management Buttons
  // ==========================
  const saveStateButton = document.getElementById("saveState");
  const loadStateButton = document.getElementById("loadState");
  const clearBoardButton = document.getElementById("clearBoard");

  saveStateButton.addEventListener("click", saveState);
  loadStateButton.addEventListener("click", loadState);
  clearBoardButton.addEventListener("click", clearBoard);

  function saveState() {
    const flowchartState = Array.from(
      document.querySelectorAll(".flowchart-tab")
    ).map((el) => {
      const content =
        el.dataset.type === "text"
          ? el.querySelector("[contenteditable]").innerHTML
          : el.innerHTML;

      return {
        id: el.dataset.tabId,
        type: el.classList.contains("flowchart-tab") ? "tab" : "element",
        left: el.style.left,
        top: el.style.top,
        content: content,
        width: el.style.width,
        height: el.style.height,
      };
    });

    chrome.storage.local.get("currentState", (result) => {
      const currentState = result.currentState;
      if (currentState) {
        const overwrite = confirm(
          `Do you want to overwrite the current state "${currentState}"?`
        );
        if (overwrite) {
          chrome.storage.local.get("savedStates", (result) => {
            const savedStates = result.savedStates || {};
            savedStates[currentState] = flowchartState;
            chrome.storage.local.set(
              { savedStates, currentFlowchartState: flowchartState },
              () => {
                alert("State saved successfully!");
              }
            );
          });
          return;
        }
      }

      const stateName = prompt("Enter a name for this state:");
      if (stateName) {
        chrome.storage.local.get("savedStates", (result) => {
          const savedStates = result.savedStates || {};
          savedStates[stateName] = flowchartState;
          chrome.storage.local.set(
            {
              savedStates,
              currentState: stateName,
              currentFlowchartState: flowchartState,
            },
            () => {
              alert("State saved successfully!");
              displayCurrentState();
            }
          );
        });
      }
    });
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
        const flowchartCanvas = document.getElementById("flowchartCanvas");
        savedStates[stateName].forEach((item) => {
          const element = createFlowchartElement(item);
          flowchartCanvas.appendChild(element);
        });
        chrome.storage.local.set({ currentState: stateName }, () => {
          alert("State loaded successfully!");
        });
      } else if (stateName) {
        alert("State not found.");
      }
    });
  }

  function displayCurrentState() {
    chrome.storage.local.get("currentState", (result) => {
      const currentState = result.currentState;
      const stateDisplay = document.getElementById("currentStateDisplay");
      if (currentState) {
        stateDisplay.textContent = `Current State: ${currentState}`;
      } else {
        stateDisplay.textContent = "No state loaded";
      }
    });
  }

  function clearBoard() {
    const flowchartCanvas = document.getElementById("flowchartCanvas");
    const flowchartElements =
      flowchartCanvas.querySelectorAll(".flowchart-tab");
    flowchartElements.forEach((element) => {
      flowchartCanvas.removeChild(element);
    });

    // Remove all SVG elements (free-drawn lines)
    const svgElements = flowchartCanvas.querySelectorAll("svg");
    svgElements.forEach((svg) => {
      flowchartCanvas.removeChild(svg);
    });

    // Clear the saved state in local storage
    chrome.storage.local.remove(
      [
        "currentFlowchartState",
        "flowchartState",
        "svgPaths",
        "arrowRelationships",
      ],
      () => {
        console.log("Cleared flowchart state from local storage");
      }
    );
  }
  // ==========================
  // Flowchart Element Creation
  // ==========================
  function createFlowchartElement(item) {
    const element = document.createElement("div");
    element.className = "flowchart-tab";
    element.dataset.tabId = item.id;
    element.style.left = item.left;
    element.style.top = item.top;
    element.style.width = item.width || "auto";
    element.style.height = item.height || "auto";

    if (item.type === "text") {
      element.innerHTML = `<div contenteditable='true' style='font-size: 13px; font-weight: bold;'>${item.content}</div>`;
      element.style.minWidth = "100px";
      element.style.minHeight = "30px";
      element.dataset.type = "text";
    } else if (item.type === "header") {
      element.innerHTML = `<h1 contenteditable='true'>${item.content}</h1>`;
      element.style.minWidth = "100px";
      element.style.minHeight = "30px";
      element.dataset.type = "header";
    } else {
      element.innerHTML = item.content;
    }

    if (item.type === "box") {
      element.classList.add("box-element");
    }

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "X";
    deleteButton.addEventListener("click", () => {
      element.remove();
      saveFlowchartState();
    });

    element.appendChild(deleteButton);

    const handle = document.createElement("div");
    handle.className = "drag-handle";
    element.appendChild(handle);

    handle.draggable = true;
    handle.addEventListener("dragstart", (event) => {
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

    handle.addEventListener("dragend", () => {
      element.classList.remove("dragging");
    });

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

    const tabLink = element.querySelector("span");
    if (tabLink) {
      tabLink.addEventListener("click", (event) => {
        event.preventDefault();
        chrome.tabs.update(parseInt(element.dataset.tabId), { active: true });
      });
    }

    if (item.type === "text" || item.type === "header") {
      element.addEventListener("input", () => {
        element.style.width = "auto";
        element.style.height = "auto";
        const lines = element.innerText.split("\n");
        const maxWidth = Math.max(
          ...lines.map((line) => measureTextWidth(line, element))
        );
        element.style.width = `${maxWidth + 20}px`;
      });
    }

    element.addEventListener("mousedown", (event) => {
      if (selectedTool === "move") {
        if (!event.ctrlKey && !selectedElements.has(element)) {
          selectedElements.forEach((el) => el.classList.remove("selected"));
          selectedElements.clear();
        }

        if (event.ctrlKey) {
          if (selectedElements.has(element)) {
            selectedElements.delete(element);
            element.classList.remove("selected");
          } else {
            selectedElements.add(element);
            element.classList.add("selected");
          }
        } else {
          selectedElements.add(element);
          element.classList.add("selected");
        }

        const rect = element.getBoundingClientRect();
        event.dataTransfer.setData(
          "text/plain",
          JSON.stringify({
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
          })
        );
      }
    });

    return element;
  }

  function measureTextWidth(text, element) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = getComputedStyle(element).font;
    return context.measureText(text).width;
  }

  // ==========================
  // Save Current State
  // ==========================
  function saveCurrentState() {
    const flowchartState = Array.from(
      document.querySelectorAll(".flowchart-tab")
    ).map((el) => {
      const content =
        el.dataset.type === "text"
          ? el.querySelector("[contenteditable]").innerHTML
          : el.innerHTML;

      return {
        id: el.dataset.tabId,
        type: el.classList.contains("flowchart-tab") ? "tab" : "element",
        left: el.style.left,
        top: el.style.top,
        content: content,
        width: el.style.width,
        height: el.style.height,
      };
    });

    chrome.storage.local.set({ currentFlowchartState: flowchartState }, () => {
      console.log("Current state saved");
    });
  }

  window.addEventListener("beforeunload", saveCurrentState);

  const undoButton = document.getElementById("undoButton");
  const redoButton = document.getElementById("redoButton");
  const addedElements = [];
  const undoneElements = [];

  // Function to add elements to the addedElements array
  function trackElement(element) {
    addedElements.push(element);
    undoneElements.length = 0; // Clear the redo stack
  }

  // Modify the existing code to track added elements
  function createFlowchartElement(item) {
    const element = document.createElement("div");
    element.className = "flowchart-tab";
    element.dataset.tabId = item.id;
    element.style.left = item.left;
    element.style.top = item.top;
    element.style.width = item.width || "auto";
    element.style.height = item.height || "auto";

    if (item.type === "text") {
      element.innerHTML = `<div contenteditable='true' style='font-size: 13px; font-weight: bold;'>${item.content}</div>`;
      element.style.minWidth = "100px";
      element.style.minHeight = "30px";
      element.dataset.type = "text";
    } else if (item.type === "header") {
      element.innerHTML = `<h1 contenteditable='true'>${item.content}</h1>`;
      element.style.minWidth = "100px";
      element.style.minHeight = "30px";
      element.dataset.type = "header";
    } else {
      element.innerHTML = item.content;
    }

    if (item.type === "box") {
      element.classList.add("box-element");
    }

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "X";
    deleteButton.addEventListener("click", () => {
      element.remove();
      saveFlowchartState();
    });

    element.appendChild(deleteButton);

    const handle = document.createElement("div");
    handle.className = "drag-handle";
    element.appendChild(handle);

    handle.draggable = true;
    handle.addEventListener("dragstart", (event) => {
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

    handle.addEventListener("dragend", () => {
      element.classList.remove("dragging");
    });

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

    const tabLink = element.querySelector("span");
    if (tabLink) {
      tabLink.addEventListener("click", (event) => {
        event.preventDefault();
        chrome.tabs.update(parseInt(element.dataset.tabId), { active: true });
      });
    }

    if (item.type === "text" || item.type === "header") {
      element.addEventListener("input", () => {
        element.style.width = "auto";
        element.style.height = "auto";
        const lines = element.innerText.split("\n");
        const maxWidth = Math.max(
          ...lines.map((line) => measureTextWidth(line, element))
        );
        element.style.width = `${maxWidth + 20}px`;
      });
    }

    element.addEventListener("mousedown", (event) => {
      if (selectedTool === "move") {
        if (!event.ctrlKey && !selectedElements.has(element)) {
          selectedElements.forEach((el) => el.classList.remove("selected"));
          selectedElements.clear();
        }

        if (event.ctrlKey) {
          if (selectedElements.has(element)) {
            selectedElements.delete(element);
            element.classList.remove("selected");
          } else {
            selectedElements.add(element);
            element.classList.add("selected");
          }
        } else {
          selectedElements.add(element);
          element.classList.add("selected");
        }

        const rect = element.getBoundingClientRect();
        event.dataTransfer.setData(
          "text/plain",
          JSON.stringify({
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
          })
        );
      }
    });

    trackElement(element); // Track the element
    return element;
  }

  flowchartCanvas.addEventListener("drop", (event) => {
    event.preventDefault();
    const draggedTabId = event.dataTransfer.getData("text/plain");
    const existingFlowchartTab = document.querySelector(
      `.flowchart-tab[data-tab-id="${draggedTabId}"]`
    );

    if (existingFlowchartTab) {
      existingFlowchartTab.style.left = `${
        event.clientX - flowchartArea.offsetLeft + flowchartArea.scrollLeft
      }px`;
      existingFlowchartTab.style.top = `${
        event.clientY - flowchartArea.offsetTop + flowchartArea.scrollTop
      }px`;
    } else {
      const draggedElement = document.querySelector(
        `li[data-tab-id="${draggedTabId}"]`
      );
      if (draggedElement) {
        const flowchartTab = document.createElement("div");
        flowchartTab.className = "flowchart-tab";
        flowchartTab.dataset.tabId = draggedTabId;

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

        const handle = document.createElement("div");
        handle.className = "drag-handle";
        flowchartTab.appendChild(handle);

        flowchartTab.style.left = `${
          event.clientX - flowchartArea.offsetLeft + flowchartArea.scrollLeft
        }px`;
        flowchartTab.style.top = `${
          event.clientY - flowchartArea.offsetTop + flowchartArea.scrollTop
        }px`;

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

        flowchartTab.addEventListener("click", (event) => {
          event.preventDefault();
          chrome.tabs.update(parseInt(flowchartTab.dataset.tabId), {
            active: true,
          });
        });

        flowchartCanvas.appendChild(flowchartTab);
        trackElement(flowchartTab); // Track the element
      }
    }
    saveFlowchartState();
  });

  flowchartCanvas.addEventListener("click", (event) => {
    if (!selectedTool || selectedTool === "move") return;

    if (event.target.closest("#toolSelector")) return;

    if (
      event.target.closest(".flowchart-tab[contenteditable='true']") ||
      event.target.closest(".flowchart-tab h1[contenteditable='true']")
    ) {
      return;
    }

    if (selectedTool !== "relationship") {
      const element = document.createElement("div");
      element.className = "flowchart-tab";
      element.dataset.tabId = Date.now().toString();
      element.style.left = `${
        event.clientX - flowchartArea.offsetLeft + flowchartArea.scrollLeft
      }px`;
      element.style.top = `${
        event.clientY - flowchartArea.offsetTop + flowchartArea.scrollTop
      }px`;

      switch (selectedTool) {
        case "text":
          element.innerHTML =
            "<h3 contenteditable='true' style='font-weight: normal;'>Text</h3>";
          element.style.minWidth = "100px";
          element.style.minHeight = "30px";
          element.dataset.type = "header";
          break;
        case "header":
          element.innerHTML = "<h1 contenteditable='true'>Header</h1>";
          element.style.minWidth = "100px";
          element.style.minHeight = "30px";
          element.dataset.type = "header";
          break;
        case "box":
          element.classList.add("box-element");
          element.style.border = "2px dashed #d0d3d9";
          element.style.backgroundColor = "transparent";
          element.style.width = "100px";
          element.style.height = "100px";
          element.style.resize = "both";
          element.style.overflow = "auto";
          break;
        case "arrow":
          element.innerHTML = "→";
          element.style.fontSize = "24px";
          break;
      }

      const handle = document.createElement("div");
      handle.className = "drag-handle";
      element.appendChild(handle);

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

      flowchartCanvas.appendChild(element);
      trackElement(element); // Track the element
      saveFlowchartState();
    } else if (selectedTool === "relationship") {
      const handle = event.target.closest(".drag-handle");
      if (handle) {
        if (!firstHandle) {
          firstHandle = handle;
        } else {
          createArrow(firstHandle, handle);
          firstHandle = null;
        }
      }
    }
  });

  flowchartCanvas.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  flowchartCanvas.addEventListener("drop", (event) => {
    event.preventDefault();
    const data = JSON.parse(event.dataTransfer.getData("text/plain"));
    const draggingElement = document.querySelector(
      `.flowchart-tab[data-tab-id="${data.id}"]`
    );
    if (draggingElement) {
      draggingElement.style.left = `${
        event.clientX -
        data.offsetX -
        flowchartArea.offsetLeft +
        flowchartArea.scrollLeft
      }px`;
      draggingElement.style.top = `${
        event.clientY -
        data.offsetY -
        flowchartArea.offsetTop +
        flowchartArea.scrollTop
      }px`;
      draggingElement.classList.remove("dragging");
    }
    saveFlowchartState();
  });

  // Undo button functionality
  undoButton.addEventListener("click", () => {
    const lastElement = addedElements.pop();
    if (lastElement) {
      undoneElements.push(lastElement);
      lastElement.remove();
      saveFlowchartState();
    }
  });

  // Redo button functionality
  redoButton.addEventListener("click", () => {
    const lastUndoneElement = undoneElements.pop();
    if (lastUndoneElement) {
      addedElements.push(lastUndoneElement);
      flowchartCanvas.appendChild(lastUndoneElement);
      saveFlowchartState();
    }
  });

  // ==========================
  // Arrow Relationships
  // ==========================
  let firstHandle = null;

  function createArrow(startHandle, endHandle) {
    const startElement = startHandle.closest(".flowchart-tab");
    const endElement = endHandle.closest(".flowchart-tab");

    const startRect = startElement.getBoundingClientRect();
    const endRect = endElement.getBoundingClientRect();

    const startX = startRect.left + startRect.width / 2;
    const startY = startRect.top + startRect.height / 2;
    const endX = endRect.left + endRect.width / 2;
    const endY = endRect.top + endRect.height / 2;

    const arrow = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    arrow.setAttribute("d", `M${startX} ${startY} L${endX} ${endY}`);
    arrow.setAttribute("stroke", "black");
    arrow.setAttribute("stroke-width", "2");
    arrow.setAttribute("fill", "none");
    arrow.setAttribute("marker-end", "url(#arrowhead)");

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.position = "absolute";
    svg.style.left = "0";
    svg.style.top = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.appendChild(arrow);

    const arrowhead = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "marker"
    );
    arrowhead.setAttribute("id", "arrowhead");
    arrowhead.setAttribute("viewBox", "0 0 10 10");
    arrowhead.setAttribute("refX", "10");
    arrowhead.setAttribute("refY", "5");
    arrowhead.setAttribute("markerWidth", "6");
    arrowhead.setAttribute("markerHeight", "6");
    arrowhead.setAttribute("orient", "auto");

    const arrowheadPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    arrowheadPath.setAttribute("d", "M0 0 L10 5 L0 10 z");
    arrowheadPath.setAttribute("fill", "black");
    arrowhead.appendChild(arrowheadPath);

    svg.appendChild(arrowhead);
    flowchartCanvas.appendChild(svg);

    saveArrowRelationship(startElement, endElement);
  }

  function saveArrowRelationship(startElement, endElement) {
    chrome.storage.local.get("arrowRelationships", (result) => {
      const arrowRelationships = result.arrowRelationships || [];
      arrowRelationships.push({
        startId: startElement.dataset.tabId,
        endId: endElement.dataset.tabId,
      });
      chrome.storage.local.set({ arrowRelationships });
    });
  }

  function loadArrowRelationships() {
    chrome.storage.local.get("arrowRelationships", (result) => {
      const arrowRelationships = result.arrowRelationships || [];
      arrowRelationships.forEach((relationship) => {
        const startElement = document.querySelector(
          `.flowchart-tab[data-tab-id="${relationship.startId}"]`
        );
        const endElement = document.querySelector(
          `.flowchart-tab[data-tab-id="${relationship.endId}"]`
        );
        if (startElement && endElement) {
          createArrow(
            startElement.querySelector(".drag-handle"),
            endElement.querySelector(".drag-handle")
          );
        }
      });
    });
  }

  // ==========================
  // Multiple Selection and Movement
  // ==========================
  const selectedElements = new Set();

  flowchartCanvas.addEventListener("mousedown", (event) => {
    if (selectedTool === "move") {
      if (!event.ctrlKey && !selectedElements.has(event.target)) {
        selectedElements.forEach((el) => el.classList.remove("selected"));
        selectedElements.clear();
      }

      if (event.target.closest(".flowchart-tab")) {
        const element = event.target.closest(".flowchart-tab");
        if (event.ctrlKey) {
          if (selectedElements.has(element)) {
            selectedElements.delete(element);
            element.classList.remove("selected");
          } else {
            selectedElements.add(element);
            element.classList.add("selected");
          }
        } else {
          selectedElements.add(element);
          element.classList.add("selected");
        }

        const rect = element.getBoundingClientRect();
        event.dataTransfer.setData(
          "text/plain",
          JSON.stringify({
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
          })
        );
      }
    }
  });

  flowchartCanvas.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (selectedTool === "move" && selectedElements.size > 0) {
      const data = JSON.parse(event.dataTransfer.getData("text/plain"));
      const deltaX = event.clientX - data.startX;
      const deltaY = event.clientY - data.startY;

      selectedElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        element.style.left = `${rect.left + deltaX}px`;
        element.style.top = `${rect.top + deltaY}px`;
      });
    }
  });

  flowchartCanvas.addEventListener("drop", (event) => {
    event.preventDefault();
    if (selectedTool === "move" && selectedElements.size > 0) {
      const data = JSON.parse(event.dataTransfer.getData("text/plain"));
      const deltaX = event.clientX - data.startX;
      const deltaY = event.clientY - data.startY;

      selectedElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        element.style.left = `${rect.left + deltaX}px`;
        element.style.top = `${rect.top + deltaY}px`;
      });

      saveFlowchartState();
    }
  });

  // ==========================
  // Resizable Box Elements
  // ==========================
  flowchartCanvas.addEventListener("mousedown", (event) => {
    if (event.target.closest(".box-element")) {
      const boxElement = event.target.closest(".box-element");
      const rect = boxElement.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;

      const resizeHandles = document.createElement("div");
      resizeHandles.className = "resize-handles";

      const topLeft = document.createElement("div");
      topLeft.className = "resize-handle top-left";
      resizeHandles.appendChild(topLeft);

      const topRight = document.createElement("div");
      topRight.className = "resize-handle top-right";
      resizeHandles.appendChild(topRight);

      const bottomLeft = document.createElement("div");
      bottomLeft.className = "resize-handle bottom-left";
      resizeHandles.appendChild(bottomLeft);

      const bottomRight = document.createElement("div");
      bottomRight.className = "resize-handle bottom-right";
      resizeHandles.appendChild(bottomRight);

      boxElement.appendChild(resizeHandles);

      const resize = (event) => {
        const deltaX = event.clientX - offsetX;
        const deltaY = event.clientY - offsetY;
        const newWidth = deltaX - rect.left;
        const newHeight = deltaY - rect.top;

        if (newWidth >= 100 && newHeight >= 100) {
          boxElement.style.width = `${newWidth}px`;
          boxElement.style.height = `${newHeight}px`;
        }
      };

      const stopResize = () => {
        document.removeEventListener("mousemove", resize);
        document.removeEventListener("mouseup", stopResize);
        resizeHandles.remove();
      };

      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResize);
    }
  });

  // ==========================
  // Keyboard Shortcuts
  // ==========================
  document.addEventListener("keydown", (event) => {
    if (event.key === "Delete" && selectedElements.size > 0) {
      selectedElements.forEach((element) => {
        element.remove();
      });
      selectedElements.clear();
      saveFlowchartState();
    }
  });

  // ==========================
  // Zoom and Pan
  // ==========================
  const zoomInButton = document.getElementById("zoomIn");
  const zoomOutButton = document.getElementById("zoomOut");
  const zoomResetButton = document.getElementById("zoomReset");
  const panLeftButton = document.getElementById("panLeft");
  const panRightButton = document.getElementById("panRight");
  const panUpButton = document.getElementById("panUp");
  const panDownButton = document.getElementById("panDown");

  let zoomLevel = 1;
  let panX = 0;
  let panY = 0;

  zoomInButton.addEventListener("click", () => {
    zoomLevel += 0.1;
    updateZoomAndPan();
  });

  zoomOutButton.addEventListener("click", () => {
    zoomLevel -= 0.1;
    updateZoomAndPan();
  });

  zoomResetButton.addEventListener("click", () => {
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    updateZoomAndPan();
  });

  panLeftButton.addEventListener("click", () => {
    panX -= 50;
    updateZoomAndPan();
  });

  panRightButton.addEventListener("click", () => {
    panX += 50;
    updateZoomAndPan();
  });

  panUpButton.addEventListener("click", () => {
    panY -= 50;
    updateZoomAndPan();
  });

  panDownButton.addEventListener("click", () => {
    panY += 50;
    updateZoomAndPan();
  });

  function updateZoomAndPan() {
    flowchartCanvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
  }

  // ==========================
  // Free Drawing
  // ==========================
  const freeDrawButton = document.getElementById("freeDraw");
  let isFreeDrawing = false;

  freeDrawButton.addEventListener("click", () => {
    isFreeDrawing = !isFreeDrawing;
    if (isFreeDrawing) {
      freeDrawButton.classList.add("active");
      flowchartCanvas.addEventListener("mousedown", startFreeDrawing);
    } else {
      freeDrawButton.classList.remove("active");
      flowchartCanvas.removeEventListener("mousedown", startFreeDrawing);
    }
  });

  function startFreeDrawing(event) {
    if (isFreeDrawing) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.style.position = "absolute";
      svg.style.left = "0";
      svg.style.top = "0";
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.pointerEvents = "none";
      flowchartCanvas.appendChild(svg);

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute("stroke", "black");
      path.setAttribute("stroke-width", "2");
      path.setAttribute("fill", "none");
      svg.appendChild(path);

      const startX =
        event.clientX - flowchartArea.offsetLeft + flowchartArea.scrollLeft;
      const startY =
        event.clientY - flowchartArea.offsetTop + flowchartArea.scrollTop;
      path.setAttribute("d", `M${startX} ${startY}`);

      const draw = (event) => {
        const x =
          event.clientX - flowchartArea.offsetLeft + flowchartArea.scrollLeft;
        const y =
          event.clientY - flowchartArea.offsetTop + flowchartArea.scrollTop;
        path.setAttribute("d", `${path.getAttribute("d")} L${x} ${y}`);
      };

      const stopDrawing = () => {
        document.removeEventListener("mousemove", draw);
        document.removeEventListener("mouseup", stopDrawing);
        saveFlowchartState();
      };

      document.addEventListener("mousemove", draw);
      document.addEventListener("mouseup", stopDrawing);
    }
  }

  // ==========================
  // Export as Image
  // ==========================
  const exportImageButton = document.getElementById("exportImage");

  exportImageButton.addEventListener("click", () => {
    html2canvas(flowchartCanvas).then((canvas) => {
      const imageData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imageData;
      link.download = "flowchart.png";
      link.click();
    });
  });

  // ==========================
  // Export as JSON
  // ==========================
  const exportJsonButton = document.getElementById("exportJson");

  exportJsonButton.addEventListener("click", () => {
    const flowchartState = Array.from(
      document.querySelectorAll(".flowchart-tab")
    ).map((el) => {
      const content =
        el.dataset.type === "text"
          ? el.querySelector("[contenteditable]").innerHTML
          : el.innerHTML;

      return {
        id: el.dataset.tabId,
        type: el.classList.contains("flowchart-tab") ? "tab" : "element",
        left: el.style.left,
        top: el.style.top,
        content: content,
        width: el.style.width,
        height: el.style.height,
      };
    });

    const jsonData = JSON.stringify(flowchartState, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "flowchart.json";
    link.click();
  });

  // ==========================
  // Import from JSON
  // ==========================
  const importJsonButton = document.getElementById("importJson");
  const jsonInput = document.getElementById("jsonInput");

  importJsonButton.addEventListener("click", () => {
    jsonInput.click();
  });

  jsonInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          clearBoard();
          jsonData.forEach((item) => {
            const element = createFlowchartElement(item);
            flowchartCanvas.appendChild(element);
          });
          saveFlowchartState();
        } catch (error) {
          alert("Invalid JSON file");
        }
      };
      reader.readAsText(file);
    }
  });

  // ==========================
  // Search and Filter
  // ==========================
  const searchInput = document.getElementById("searchInput");
  const filterSelect = document.getElementById("filterSelect");

  searchInput.addEventListener("input", filterTabs);
  filterSelect.addEventListener("change", filterTabs);

  function filterTabs() {
    const searchText = searchInput.value.toLowerCase();
    const filterType = filterSelect.value;

    const tabs = document.querySelectorAll("li[data-tab-id]");
    tabs.forEach((tab) => {
      const title = tab.querySelector("a").textContent.toLowerCase();
      const isMatch = title.includes(searchText);

      if (filterType === "all" || (filterType === "active" && isMatch)) {
        tab.style.display = "block";
      } else {
        tab.style.display = "none";
      }
    });
  }

  // ==========================
  // Group Tabs
  // ==========================
  const groupTabsButton = document.getElementById("groupTabs");

  groupTabsButton.addEventListener("click", () => {
    const groupName = prompt("Enter a name for the group:");
    if (groupName) {
      const groupContainer = document.createElement("div");
      groupContainer.className = "group-container";

      const groupLabel = document.createElement("div");
      groupLabel.className = "group-label";
      groupLabel.textContent = groupName;
      groupContainer.appendChild(groupLabel);

      const groupTabs = document.createElement("ul");
      groupTabs.className = "group-tabs";
      groupContainer.appendChild(groupTabs);

      const selectedTabs = document.querySelectorAll("li.selected");
      selectedTabs.forEach((tab) => {
        groupTabs.appendChild(tab.cloneNode(true));
        tab.remove();
      });

      tabList.appendChild(groupContainer);
      saveTabOrder();
    }
  });

  // ==========================
  // Ungroup Tabs
  // ==========================
  const ungroupTabsButton = document.getElementById("ungroupTabs");

  ungroupTabsButton.addEventListener("click", () => {
    const selectedGroup = document.querySelector(".group-container.selected");
    if (selectedGroup) {
      const groupTabs = selectedGroup.querySelectorAll(".group-tabs li");
      groupTabs.forEach((tab) => {
        tabList.appendChild(tab.cloneNode(true));
      });
      selectedGroup.remove();
      saveTabOrder();
    }
  });

  // ==========================
  // Collapse/Expand Groups
  // ==========================
  tabList.addEventListener("click", (event) => {
    const groupLabel = event.target.closest(".group-label");
    if (groupLabel) {
      const groupContainer = groupLabel.closest(".group-container");
      groupContainer.classList.toggle("collapsed");
    }
  });

  // ==========================
  // Drag and Drop Tabs within Groups
  // ==========================
  tabList.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  tabList.addEventListener("drop", (event) => {
    event.preventDefault();
    const draggedTabId = event.dataTransfer.getData("text/plain");
    const draggedElement = document.querySelector(
      `li[data-tab-id="${draggedTabId}"]`
    );
    if (draggedElement) {
      const targetGroup = event.target.closest(".group-tabs");
      if (targetGroup) {
        targetGroup.appendChild(draggedElement);
        saveTabOrder();
      }
    }
  });

  // ==========================
  // Select Multiple Tabs
  // ==========================
  tabList.addEventListener("mousedown", (event) => {
    if (event.target.closest("li")) {
      const tab = event.target.closest("li");
      if (event.ctrlKey) {
        tab.classList.toggle("selected");
      } else {
        const selectedTabs = document.querySelectorAll("li.selected");
        selectedTabs.forEach((t) => t.classList.remove("selected"));
        tab.classList.add("selected");
      }
    }
  });

  // ==========================
  // Close Selected Tabs
  // ==========================
  const closeSelectedTabsButton = document.getElementById("closeSelectedTabs");

  closeSelectedTabsButton.addEventListener("click", () => {
    const selectedTabs = document.querySelectorAll("li.selected");
    selectedTabs.forEach((tab) => {
      const tabId = parseInt(tab.dataset.tabId);
      chrome.tabs.remove(tabId);
    });
  });

  // ==========================
  // Close All Tabs
  // ==========================
  const closeAllTabsButton = document.getElementById("closeAllTabs");

  closeAllTabsButton.addEventListener("click", () => {
    chrome.tabs.query({}, (tabs) => {
      const tabIds = tabs.map((tab) => tab.id);
      chrome.tabs.remove(tabIds);
    });
  });

  // ==========================
  // Close Other Tabs
  // ==========================
  const closeOtherTabsButton = document.getElementById("closeOtherTabs");

  closeOtherTabsButton.addEventListener("click", () => {
    const selectedTabs = document.querySelectorAll("li.selected");
    const selectedTabIds = Array.from(selectedTabs).map((tab) =>
      parseInt(tab.dataset.tabId)
    );

    chrome.tabs.query({}, (tabs) => {
      const tabIdsToClose = tabs
        .filter((tab) => !selectedTabIds.includes(tab.id))
        .map((tab) => tab.id);
      chrome.tabs.remove(tabIdsToClose);
    });
  });

  // ==========================
  // Close Tabs to the Right
  // ==========================
  const closeTabsToRightButton = document.getElementById("closeTabsToRight");

  closeTabsToRightButton.addEventListener("click", () => {
    const selectedTab = document.querySelector("li.selected");
    if (selectedTab) {
      const selectedTabId = parseInt(selectedTab.dataset.tabId);
      chrome.tabs.query({}, (tabs) => {
        const tabIdsToClose = tabs
          .filter((tab) => tab.index > selectedTab.dataset.index)
          .map((tab) => tab.id);
        chrome.tabs.remove(tabIdsToClose);
      });
    }
  });

  // ==========================
  // Close Tabs to the Left
  // ==========================
  const closeTabsToLeftButton = document.getElementById("closeTabsToLeft");

  closeTabsToLeftButton.addEventListener("click", () => {
    const selectedTab = document.querySelector("li.selected");
    if (selectedTab) {
      const selectedTabId = parseInt(selectedTab.dataset.tabId);
      chrome.tabs.query({}, (tabs) => {
        const tabIdsToClose = tabs
          .filter((tab) => tab.index < selectedTab.dataset.index)
          .map((tab) => tab.id);
        chrome.tabs.remove(tabIdsToClose);
      });
    }
  });

  // ==========================
  // Duplicate Tab
  // ==========================
  const duplicateTabButton = document.getElementById("duplicateTab");

  duplicateTabButton.addEventListener("click", () => {
    const selectedTab = document.querySelector("li.selected");
    if (selectedTab) {
      const tabId = parseInt(selectedTab.dataset.tabId);
      chrome.tabs.duplicate(tabId);
    }
  });

  // ==========================
  // Reopen Closed Tab
  // ==========================
  const reopenClosedTabButton = document.getElementById("reopenClosedTab");

  reopenClosedTabButton.addEventListener("click", () => {
    chrome.sessions.getRecentlyClosed({ maxResults: 1 }, (sessions) => {
      if (sessions.length > 0) {
        chrome.sessions.restore(sessions[0].sessionId);
      }
    });
  });

  // ==========================
  // Pin/Unpin Tab
  // ==========================
  tabList.addEventListener("click", (event) => {
    const pinButton = event.target.closest(".pin-button");
    if (pinButton) {
      const tab = pinButton.closest("li");
      const tabId = parseInt(tab.dataset.tabId);
      const isPinned = pinButton.classList.contains("pinned");
      chrome.tabs.update(tabId, { pinned: !isPinned });
    }
  });

  // ==========================
  // Mute/Unmute Tab
  // ==========================
  tabList.addEventListener("click", (event) => {
    const muteButton = event.target.closest(".mute-button");
    if (muteButton) {
      const tab = muteButton.closest("li");
      const tabId = parseInt(tab.dataset.tabId);
      const isMuted = muteButton.classList.contains("muted");
      chrome.tabs.update(tabId, { muted: !isMuted });
    }
  });

  // ==========================
  // Bookmark Tab
  // ==========================
  const bookmarkTabButton = document.getElementById("bookmarkTab");

  bookmarkTabButton.addEventListener("click", () => {
    const selectedTab = document.querySelector("li.selected");
    if (selectedTab) {
      const tabId = parseInt(selectedTab.dataset.tabId);
      chrome.bookmarks.create(
        {
          title: selectedTab.querySelector("a").textContent,
          url: selectedTab.dataset.url,
        },
        (bookmark) => {
          console.log("Tab bookmarked:", bookmark);
        }
      );
    }
  });

  // ==========================
  // Bookmark All Tabs
  // ==========================
  const bookmarkAllTabsButton = document.getElementById("bookmarkAllTabs");

  bookmarkAllTabsButton.addEventListener("click", () => {
    chrome.tabs.query({}, (tabs) => {
      const folderName = prompt("Enter a name for the bookmark folder:");
      if (folderName) {
        chrome.bookmarks.create({ title: folderName }, (folder) => {
          tabs.forEach((tab) => {
            chrome.bookmarks.create(
              {
                title: tab.title,
                url: tab.url,
                parentId: folder.id,
              },
              (bookmark) => {
                console.log("Tab bookmarked:", bookmark);
              }
            );
          });
        });
      }
    });
  });

  // ==========================
  // Reload Tab
  // ==========================
  const reloadTabButton = document.getElementById("reloadTab");

  reloadTabButton.addEventListener("click", () => {
    const selectedTab = document.querySelector("li.selected");
    if (selectedTab) {
      const tabId = parseInt(selectedTab.dataset.tabId);
      chrome.tabs.reload(tabId);
    }
  });

  // ==========================
  // Reload All Tabs
  // ==========================
  const reloadAllTabsButton = document.getElementById("reloadAllTabs");

  reloadAllTabsButton.addEventListener("click", () => {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.reload(tab.id);
      });
    });
  });

  // ==========================
  // Reload Other Tabs
  // ==========================
  const reloadOtherTabsButton = document.getElementById("reloadOtherTabs");

  reloadOtherTabsButton.addEventListener("click", () => {
    const selectedTabs = document.querySelectorAll("li.selected");
    const selectedTabIds = Array.from(selectedTabs).map((tab) =>
      parseInt(tab.dataset.tabId)
    );

    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (!selectedTabIds.includes(tab.id)) {
          chrome.tabs.reload(tab.id);
        }
      });
    });
  });

  // ==========================
  // Reload Tabs to the Right
  // ==========================
  const reloadTabsToRightButton = document.getElementById("reloadTabsToRight");

  reloadTabsToRightButton.addEventListener("click", () => {
    const selectedTab = document.querySelector("li.selected");
    if (selectedTab) {
      const selectedTabId = parseInt(selectedTab.dataset.tabId);
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.index > selectedTab.dataset.index) {
            chrome.tabs.reload(tab.id);
          }
        });
      });
    }
  });

  // ==========================
  // Reload Tabs to the Left
  // ==========================
  const reloadTabsToLeftButton = document.getElementById("reloadTabsToLeft");

  reloadTabsToLeftButton.addEventListener("click", () => {
    const selectedTab = document.querySelector("li.selected");
    if (selectedTab) {
      const selectedTabId = parseInt(selectedTab.dataset.tabId);
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.index < selectedTab.dataset.index) {
            chrome.tabs.reload(tab.id);
          }
        });
      });
    }
  });

  // ==========================
  // Move Tab to New Window
  // ==========================
  const moveTabToNewWindowButton =
    document.getElementById("moveTabToNewWindow");

  moveTabToNewWindowButton.addEventListener("click", () => {
    const selectedTab = document.querySelector("li.selected");
    if (selectedTab) {
      const tabId = parseInt(selectedTab.dataset.tabId);
      chrome.windows.create({ tabId: tabId });
    }
  });

  // ==========================
  // Move Tabs to New Window
  // ==========================
  const moveTabsToNewWindowButton = document.getElementById(
    "moveTabsToNewWindow"
  );

  moveTabsToNewWindowButton.addEventListener("click", () => {
    const selectedTabs = document.querySelectorAll("li.selected");
    const tabIds = Array.from(selectedTabs).map((tab) =>
      parseInt(tab.dataset.tabId)
    );
    if (tabIds.length > 0) {
      chrome.windows.create({ tabId: tabIds });
    }
  });

  // ==========================
  // Move Tab to New Incognito Window
  // ==========================
  const moveTabToNewIncognitoWindowButton = document.getElementById(
    "moveTabToNewIncognitoWindow"
  );

  moveTabToNewIncognitoWindowButton.addEventListener("click", () => {
    const selectedTab = document.querySelector("li.selected");
    if (selectedTab) {
      const tabId = parseInt(selectedTab.dataset.tabId);
      chrome.windows.create({ tabId: tabId, incognito: true });
    }
  });

  // ==========================
  // Move Tabs to New Incognito Window
  // ==========================
  const moveTabsToNewIncognitoWindowButton = document.getElementById(
    "moveTabsToNewIncognitoWindow"
  );

  moveTabsToNewIncognitoWindowButton.addEventListener("click", () => {
    const selectedTabs = document.querySelectorAll("li.selected");
    const tabIds = Array.from(selectedTabs).map((tab) =>
      parseInt(tab.dataset.tabId)
    );
    if (tabIds.length > 0) {
      chrome.windows.create({ tabId: tabIds, incognito: true });
    }
  });

  // ==========================
  // Move Tab to Existing Window
  // ==========================
  const moveTabToExistingWindowButton = document.getElementById(
    "moveTabToExistingWindow"
  );

  moveTabToExistingWindowButton.addEventListener("click", () => {
    const selectedTab = document.querySelector("li.selected");
    if (selectedTab) {
      const tabId = parseInt(selectedTab.dataset.tabId);
      chrome.windows.getAll({ populate: true }, (windows) => {
        const windowOptions = windows
          .map((window, index) => `${index + 1}: Window ${window.id}`)
          .join("\n");
        const windowIndex = prompt(
          `Enter the number of the window to move the tab to:\n\n${windowOptions}`
        );
        if (
          windowIndex &&
          !isNaN(windowIndex) &&
          windowIndex >= 1 &&
          windowIndex <= windows.length
        ) {
          const targetWindow = windows[windowIndex - 1];
          chrome.tabs.move(tabId, { windowId: targetWindow.id, index: -1 });
        }
      });
    }
  });

  // ==========================
  // Move Tabs to Existing Window
  // ==========================
  const moveTabsToExistingWindowButton = document.getElementById(
    "moveTabsToExistingWindow"
  );

  moveTabsToExistingWindowButton.addEventListener("click", () => {
    const selectedTabs = document.querySelectorAll("li.selected");
    const tabIds = Array.from(selectedTabs).map((tab) =>
      parseInt(tab.dataset.tabId)
    );
    if (tabIds.length > 0) {
      chrome.windows.getAll({ populate: true }, (windows) => {
        const windowOptions = windows
          .map((window, index) => `${index + 1}: Window ${window.id}`)
          .join("\n");
        const windowIndex = prompt(
          `Enter the number of the window to move the tabs to:\n\n${windowOptions}`
        );
        if (
          windowIndex &&
          !isNaN(windowIndex) &&
          windowIndex >= 1 &&
          windowIndex <= windows.length
        ) {
          const targetWindow = windows[windowIndex - 1];
          chrome.tabs.move(tabIds, { windowId: targetWindow.id, index: -1 });
        }
      });
    }
  });

  // ==========================
  // Move Tab to New Group
  // ==========================
  const moveTabToNewGroupButton = document.getElementById("moveTabToNewGroup");

  moveTabToNewGroupButton.addEventListener("click", () => {
    const selectedTab = document.querySelector("li.selected");
    if (selectedTab) {
      const groupName = prompt("Enter a name for the new group:");
      if (groupName) {
        const groupContainer = document.createElement("div");
        groupContainer.className = "group-container";

        const groupLabel = document.createElement("div");
        groupLabel.className = "group-label";
        groupLabel.textContent = groupName;
        groupContainer.appendChild(groupLabel);

        const groupTabs = document.createElement("ul");
        groupTabs.className = "group-tabs";
        groupContainer.appendChild(groupTabs);

        groupTabs.appendChild(selectedTab.cloneNode(true));
        selectedTab.remove();

        tabList.appendChild(groupContainer);
        saveTabOrder();
      }
    }
  });

  // ==========================
  // Move Tabs to New Group
  // ==========================
  const moveTabsToNewGroupButton =
    document.getElementById("moveTabsToNewGroup");

  moveTabsToNewGroupButton.addEventListener("click", () => {
    const selectedTabs = document.querySelectorAll("li.selected");
    if (selectedTabs.length > 0) {
      const groupName = prompt("Enter a name for the new group:");
      if (groupName) {
        const groupContainer = document.createElement("div");
        groupContainer.className = "group-container";

        const groupLabel = document.createElement("div");
        groupLabel.className = "group-label";
        groupLabel.textContent = groupName;
        groupContainer.appendChild(groupLabel);

        const groupTabs = document.createElement("ul");
        groupTabs.className = "group-tabs";
        groupContainer.appendChild(groupTabs);

        selectedTabs.forEach((tab) => {
          groupTabs.appendChild(tab.cloneNode(true));
          tab.remove();
        });

        tabList.appendChild(groupContainer);
        saveTabOrder();
      }
    }
  });

  // ==========================
  // Move Tab to Existing Group
  // ==========================
  const moveTabToExistingGroupButton = document.getElementById(
    "moveTabToExistingGroup"
  );

  moveTabToExistingGroupButton.addEventListener("click", () => {
    const selectedTab = document.querySelector("li.selected");
    if (selectedTab) {
      const groupContainers = document.querySelectorAll(".group-container");
      if (groupContainers.length > 0) {
        const groupOptions = Array.from(groupContainers)
          .map(
            (group, index) =>
              `${index + 1}: ${group.querySelector(".group-label").textContent}`
          )
          .join("\n");
        const groupIndex = prompt(
          `Enter the number of the group to move the tab to:\n\n${groupOptions}`
        );
        if (
          groupIndex &&
          !isNaN(groupIndex) &&
          groupIndex >= 1 &&
          groupIndex <= groupContainers.length
        ) {
          const targetGroup = groupContainers[groupIndex - 1];
          const groupTabs = targetGroup.querySelector(".group-tabs");
          groupTabs.appendChild(selectedTab.cloneNode(true));
          selectedTab.remove();
          saveTabOrder();
        }
      }
    }
  });

  // ==========================
  // Move Tabs to Existing Group
  // ==========================
  const moveTabsToExistingGroupButton = document.getElementById(
    "moveTabsToExistingGroup"
  );

  moveTabsToExistingGroupButton.addEventListener("click", () => {
    const selectedTabs = document.querySelectorAll("li.selected");
    if (selectedTabs.length > 0) {
      const groupContainers = document.querySelectorAll(".group-container");
      if (groupContainers.length > 0) {
        const groupOptions = Array.from(groupContainers)
          .map(
            (group, index) =>
              `${index + 1}: ${group.querySelector(".group-label").textContent}`
          )
          .join("\n");
        const groupIndex = prompt(
          `Enter the number of the group to move the tabs to:\n\n${groupOptions}`
        );
        if (
          groupIndex &&
          !isNaN(groupIndex) &&
          groupIndex >= 1 &&
          groupIndex <= groupContainers.length
        ) {
          const targetGroup = groupContainers[groupIndex - 1];
          const groupTabs = targetGroup.querySelector(".group-tabs");
          selectedTabs.forEach((tab) => {
            groupTabs.appendChild(tab.cloneNode(true));
            tab.remove();
          });
          saveTabOrder();
        }
      }
    }
  });

  // ==========================
  // Rename Group
  // ==========================
  tabList.addEventListener("dblclick", (event) => {
    const groupLabel = event.target.closest(".group-label");
    if (groupLabel) {
      const newName = prompt(
        "Enter a new name for the group:",
        groupLabel.textContent
      );
      if (newName) {
        groupLabel.textContent = newName;
      }
    }
  });

  // ==========================
  // Rename Tab
  // ==========================
  tabList.addEventListener("dblclick", (event) => {
    const tabLink = event.target.closest("a");
    if (tabLink) {
      const newName = prompt(
        "Enter a new name for the tab:",
        tabLink.textContent
      );
      if (newName) {
        tabLink.textContent = newName;
        const tabId = parseInt(tabLink.closest("li").dataset.tabId);
        chrome.tabs.update(tabId, { title: newName });
      }
    }
  });

  // ==========================
  // Custom CSS
  // ==========================
  const customCssInput = document.getElementById("customCss");

  customCssInput.addEventListener("input", () => {
    const customCss = customCssInput.value;
    const style = document.createElement("style");
    style.textContent = customCss;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom JavaScript
  // ==========================
  const customJsInput = document.getElementById("customJs");

  customJsInput.addEventListener("input", () => {
    const customJs = customJsInput.value;
    const script = document.createElement("script");
    script.textContent = customJs;
    document.body.appendChild(script);
  });

  // ==========================
  // Custom HTML
  // ==========================
  const customHtmlInput = document.getElementById("customHtml");

  customHtmlInput.addEventListener("input", () => {
    const customHtml = customHtmlInput.value;
    const parser = new DOMParser();
    const doc = parser.parseFromString(customHtml, "text/html");
    const customElements = doc.body.children;
    const customContainer = document.getElementById("customContainer");
    customContainer.innerHTML = "";
    while (customElements.length > 0) {
      customContainer.appendChild(customElements[0]);
    }
  });

  // ==========================
  // Custom Fonts
  // ==========================
  const customFontsInput = document.getElementById("customFonts");

  customFontsInput.addEventListener("input", () => {
    const customFonts = customFontsInput.value;
    const style = document.createElement("style");
    style.textContent = customFonts;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Colors
  // ==========================
  const customColorsInput = document.getElementById("customColors");

  customColorsInput.addEventListener("input", () => {
    const customColors = customColorsInput.value;
    const style = document.createElement("style");
    style.textContent = customColors;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Icons
  // ==========================
  const customIconsInput = document.getElementById("customIcons");

  customIconsInput.addEventListener("input", () => {
    const customIcons = customIconsInput.value;
    const style = document.createElement("style");
    style.textContent = customIcons;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Themes
  // ==========================
  const customThemesInput = document.getElementById("customThemes");

  customThemesInput.addEventListener("input", () => {
    const customThemes = customThemesInput.value;
    const style = document.createElement("style");
    style.textContent = customThemes;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Layouts
  // ==========================
  const customLayoutsInput = document.getElementById("customLayouts");

  customLayoutsInput.addEventListener("input", () => {
    const customLayouts = customLayoutsInput.value;
    const style = document.createElement("style");
    style.textContent = customLayouts;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Animations
  // ==========================
  const customAnimationsInput = document.getElementById("customAnimations");

  customAnimationsInput.addEventListener("input", () => {
    const customAnimations = customAnimationsInput.value;
    const style = document.createElement("style");
    style.textContent = customAnimations;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Transitions
  // ==========================
  const customTransitionsInput = document.getElementById("customTransitions");

  customTransitionsInput.addEventListener("input", () => {
    const customTransitions = customTransitionsInput.value;
    const style = document.createElement("style");
    style.textContent = customTransitions;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Effects
  // ==========================
  const customEffectsInput = document.getElementById("customEffects");

  customEffectsInput.addEventListener("input", () => {
    const customEffects = customEffectsInput.value;
    const style = document.createElement("style");
    style.textContent = customEffects;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Shadows
  // ==========================
  const customShadowsInput = document.getElementById("customShadows");

  customShadowsInput.addEventListener("input", () => {
    const customShadows = customShadowsInput.value;
    const style = document.createElement("style");
    style.textContent = customShadows;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Gradients
  // ==========================
  const customGradientsInput = document.getElementById("customGradients");

  customGradientsInput.addEventListener("input", () => {
    const customGradients = customGradientsInput.value;
    const style = document.createElement("style");
    style.textContent = customGradients;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Patterns
  // ==========================
  const customPatternsInput = document.getElementById("customPatterns");

  customPatternsInput.addEventListener("input", () => {
    const customPatterns = customPatternsInput.value;
    const style = document.createElement("style");
    style.textContent = customPatterns;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Filters
  // ==========================
  const customFiltersInput = document.getElementById("customFilters");

  customFiltersInput.addEventListener("input", () => {
    const customFilters = customFiltersInput.value;
    const style = document.createElement("style");
    style.textContent = customFilters;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Masks
  // ==========================
  const customMasksInput = document.getElementById("customMasks");

  customMasksInput.addEventListener("input", () => {
    const customMasks = customMasksInput.value;
    const style = document.createElement("style");
    style.textContent = customMasks;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Clip Paths
  // ==========================
  const customClipPathsInput = document.getElementById("customClipPaths");

  customClipPathsInput.addEventListener("input", () => {
    const customClipPaths = customClipPathsInput.value;
    const style = document.createElement("style");
    style.textContent = customClipPaths;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Blend Modes
  // ==========================
  const customBlendModesInput = document.getElementById("customBlendModes");

  customBlendModesInput.addEventListener("input", () => {
    const customBlendModes = customBlendModesInput.value;
    const style = document.createElement("style");
    style.textContent = customBlendModes;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Opacity
  // ==========================
  const customOpacityInput = document.getElementById("customOpacity");

  customOpacityInput.addEventListener("input", () => {
    const customOpacity = customOpacityInput.value;
    const style = document.createElement("style");
    style.textContent = customOpacity;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Z-Index
  // ==========================
  const customZIndexInput = document.getElementById("customZIndex");

  customZIndexInput.addEventListener("input", () => {
    const customZIndex = customZIndexInput.value;
    const style = document.createElement("style");
    style.textContent = customZIndex;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Cursors
  // ==========================
  const customCursorsInput = document.getElementById("customCursors");

  customCursorsInput.addEventListener("input", () => {
    const customCursors = customCursorsInput.value;
    const style = document.createElement("style");
    style.textContent = customCursors;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Scrollbars
  // ==========================
  const customScrollbarsInput = document.getElementById("customScrollbars");

  customScrollbarsInput.addEventListener("input", () => {
    const customScrollbars = customScrollbarsInput.value;
    const style = document.createElement("style");
    style.textContent = customScrollbars;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Tooltips
  // ==========================
  const customTooltipsInput = document.getElementById("customTooltips");

  customTooltipsInput.addEventListener("input", () => {
    const customTooltips = customTooltipsInput.value;
    const style = document.createElement("style");
    style.textContent = customTooltips;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Popups
  // ==========================
  const customPopupsInput = document.getElementById("customPopups");

  customPopupsInput.addEventListener("input", () => {
    const customPopups = customPopupsInput.value;
    const style = document.createElement("style");
    style.textContent = customPopups;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Modals
  // ==========================
  const customModalsInput = document.getElementById("customModals");

  customModalsInput.addEventListener("input", () => {
    const customModals = customModalsInput.value;
    const style = document.createElement("style");
    style.textContent = customModals;
    document.head.appendChild(style);
  });

  // ==========================
  // Custom Dropdowns
  // ==========================
  const customDropdownsInput = document.getElementById("customDropdowns");

  customDropdownsInput.addEventListener("input", () => {
    const customDropdowns = customDropdownsInput.value;
    flowchartCanvas.addEventListener("mouseup", () => {
      if (isDrawing && selectedTool === "freeLine") {
        isDrawing = false;
        if (!hasMoved) {
          // If the mouse hasn't moved, remove the current path
          svg.removeChild(currentPath);
        } else {
          saveFlowchartState();
        }
        currentPath = null;
        pathData = "";
      }
    });
  });
});
