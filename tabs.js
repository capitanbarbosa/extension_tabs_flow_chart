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

    chrome.storage.local.set({ flowchartState: flowchartElements });
  }

  function loadFlowchartState() {
    chrome.storage.local.get(
      ["currentFlowchartState", "flowchartState"],
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

  let firstTab = null;

  flowchartCanvas.addEventListener("click", (event) => {
    if (selectedTool === "relationship") {
      event.preventDefault();
      event.stopPropagation();
      const clickedTab = event.target.closest(".flowchart-tab");
      if (clickedTab) {
        if (!firstTab) {
          firstTab = clickedTab;
          firstTab.classList.add("relationship-start");
        } else if (clickedTab !== firstTab) {
          createArrow(firstTab, clickedTab);
          firstTab.classList.remove("relationship-start");
          firstTab = null;
        }
      }
    }
  });

  // ==========================
  // Arrow Relationships
  // ==========================
  function createArrow(startTab, endTab) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    const startHandle = startTab.querySelector(".drag-handle");
    const endHandle = endTab.querySelector(".drag-handle");

    const startRect = startHandle.getBoundingClientRect();
    const endRect = endHandle.getBoundingClientRect();
    const flowchartRect = flowchartArea.getBoundingClientRect();

    const x1 =
      startRect.left +
      startRect.width / 2 -
      flowchartRect.left +
      flowchartArea.scrollLeft;
    const y1 =
      startRect.top +
      startRect.height / 2 -
      flowchartRect.top +
      flowchartArea.scrollTop;
    const x2 =
      endRect.left +
      endRect.width / 2 -
      flowchartRect.left +
      flowchartArea.scrollLeft;
    const y2 =
      endRect.top +
      endRect.height / 2 -
      flowchartRect.top +
      flowchartArea.scrollTop;

    svg.style.position = "absolute";
    svg.style.left = "0";
    svg.style.top = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.classList.add("relationship-arrow");

    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", "#61afef");
    line.setAttribute("stroke-width", "2");

    svg.appendChild(line);
    flowchartCanvas.appendChild(svg);

    saveArrowRelationship(startTab, endTab);
  }

  function saveArrowRelationship(startTab, endTab) {
    const arrow = {
      startId: startTab.dataset.tabId,
      endId: endTab.dataset.tabId,
    };

    chrome.storage.local.get("arrowRelationships", (result) => {
      const arrowRelationships = result.arrowRelationships || [];
      arrowRelationships.push(arrow);
      chrome.storage.local.set({ arrowRelationships });
    });
  }

  function loadArrowRelationships() {
    chrome.storage.local.get("arrowRelationships", (result) => {
      const arrowRelationships = result.arrowRelationships || [];
      arrowRelationships.forEach((arrow) => {
        const startTab = document.querySelector(
          `.flowchart-tab[data-tab-id="${arrow.startId}"]`
        );
        const endTab = document.querySelector(
          `.flowchart-tab[data-tab-id="${arrow.endId}"]`
        );
        if (startTab && endTab) {
          createArrow(startTab, endTab);
        }
      });
    });
  }

  // Add these variables at the top of your file, after the existing declarations
  let selectedElements = new Set();
  let isSelecting = false;
  let selectionBox = null;
  let startX, startY;

  // Modify the flowchartCanvas event listeners
  flowchartCanvas.addEventListener("mousedown", startSelection);
  flowchartCanvas.addEventListener("mousemove", updateSelection);
  flowchartCanvas.addEventListener("mouseup", endSelection);

  function startSelection(event) {
    if (event.target === flowchartCanvas && selectedTool === "move") {
      isSelecting = true;
      const flowchartRect = flowchartArea.getBoundingClientRect();
      startX = event.clientX - flowchartRect.left + flowchartArea.scrollLeft;
      startY = event.clientY - flowchartRect.top + flowchartArea.scrollTop;

      selectionBox = document.createElement("div");
      selectionBox.className = "selection-box";
      selectionBox.style.left = `${startX}px`;
      selectionBox.style.top = `${startY}px`;
      flowchartCanvas.appendChild(selectionBox);

      // Clear previous selection if not holding Ctrl key
      if (!event.ctrlKey) {
        selectedElements.forEach((el) => el.classList.remove("selected"));
        selectedElements.clear();
      }
    }
  }

  function updateSelection(event) {
    if (isSelecting) {
      const flowchartRect = flowchartArea.getBoundingClientRect();
      const currentX =
        event.clientX - flowchartRect.left + flowchartArea.scrollLeft;
      const currentY =
        event.clientY - flowchartRect.top + flowchartArea.scrollTop;

      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      selectionBox.style.left = `${left}px`;
      selectionBox.style.top = `${top}px`;
      selectionBox.style.width = `${width}px`;
      selectionBox.style.height = `${height}px`;
    }
  }

  function endSelection(event) {
    if (isSelecting) {
      isSelecting = false;
      const selectionRect = selectionBox.getBoundingClientRect();

      document.querySelectorAll(".flowchart-tab").forEach((element) => {
        const elementRect = element.getBoundingClientRect();
        if (
          elementRect.left < selectionRect.right &&
          elementRect.right > selectionRect.left &&
          elementRect.top < selectionRect.bottom &&
          elementRect.bottom > selectionRect.top
        ) {
          selectedElements.add(element);
          element.classList.add("selected");
        }
      });

      flowchartCanvas.removeChild(selectionBox);
      selectionBox = null;
    }
  }

  // Modify the existing flowchartCanvas drop event listener
  flowchartCanvas.addEventListener("drop", (event) => {
    event.preventDefault();
    const data = JSON.parse(event.dataTransfer.getData("text/plain"));

    if (selectedElements.size > 0) {
      const offsetX = event.clientX - data.startX;
      const offsetY = event.clientY - data.startY;

      selectedElements.forEach((element) => {
        const newLeft = parseInt(element.style.left) + offsetX;
        const newTop = parseInt(element.style.top) + offsetY;

        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
        element.classList.remove("selected");
      });

      selectedElements.clear();
    } else {
      // ... existing single element drop logic ...
    }

    saveFlowchartState();
  });
});
