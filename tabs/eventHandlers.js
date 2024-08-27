import { STORAGE_KEYS } from "./constants.js";
import { createFlowchartElement, highlightSelectedTool } from "./utils.js";
import { saveTabOrder } from "./tabOrder.js";
import { saveFlowchartState } from "./flowchartState.js";
import { createArrow } from "./arrowRelationships.js";

export function setupEventListeners(flowchartArea, toolSelector) {
  let selectedTool = null;
  let firstTab = null;

  toolSelector.addEventListener("click", (event) => {
    if (event.target.tagName === "BUTTON") {
      selectedTool = event.target.dataset.tool;
      highlightSelectedTool(selectedTool);
    }
  });

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
    } else {
      const draggedTabId = data.id;
      const draggedElement = document.querySelector(
        `li[data-tab-id="${draggedTabId}"]`
      );
      if (draggedElement) {
        const flowchartTab = createFlowchartElement({
          id: draggedTabId,
          type: "tab",
          left: `${event.clientX - flowchartArea.offsetLeft}px`,
          top: `${event.clientY - flowchartArea.offsetTop}px`,
          content: draggedElement.innerHTML,
        });
        flowchartArea.appendChild(flowchartTab);
      }
    }
    saveFlowchartState();
  });

  flowchartArea.addEventListener("click", (event) => {
    if (selectedTool === "text" || selectedTool === "header") {
      const element = createFlowchartElement({
        id: Date.now().toString(),
        type: selectedTool,
        left: `${event.clientX - flowchartArea.offsetLeft}px`,
        top: `${event.clientY - flowchartArea.offsetTop}px`,
        content: selectedTool === "text" ? "Text" : "Header",
      });
      flowchartArea.appendChild(element);
      element.focus();
      saveFlowchartState();
    } else if (selectedTool === "box") {
      const element = createFlowchartElement({
        id: Date.now().toString(),
        type: "box",
        left: `${event.clientX - flowchartArea.offsetLeft}px`,
        top: `${event.clientY - flowchartArea.offsetTop}px`,
        content: "",
        width: "100px",
        height: "100px",
      });
      flowchartArea.appendChild(element);
      saveFlowchartState();
    } else if (selectedTool === "arrow") {
      const clickedTab = event.target.closest(".flowchart-tab");
      if (clickedTab) {
        if (!firstTab) {
          firstTab = clickedTab;
          firstTab.classList.add("relationship-start");
        } else {
          createArrow(firstTab, clickedTab);
          firstTab.classList.remove("relationship-start");
          firstTab = null;
        }
      }
    }
  });
}

export function setupWindowContainerEventListeners(windowContainer, windowId) {
  windowContainer.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  windowContainer.addEventListener("drop", (event) => {
    event.preventDefault();
    const draggedTabId = event.dataTransfer.getData("text/plain");
    const draggedElement = document.querySelector(
      `li[data-tab-id="${draggedTabId}"]`
    );
    if (draggedElement) {
      const targetElement = event.target.closest("li");
      if (targetElement) {
        windowContainer.insertBefore(draggedElement, targetElement.nextSibling);
      } else {
        windowContainer.appendChild(draggedElement);
      }
      chrome.tabs.move(parseInt(draggedTabId), {
        windowId: parseInt(windowId),
        index: -1,
      });
      saveTabOrder();
    }
  });

  chrome.storage.local.get(
    `${STORAGE_KEYS.workspacePrefix}${windowId}`,
    (result) => {
      const workspaceName =
        result[`${STORAGE_KEYS.workspacePrefix}${windowId}`] ||
        `Workspace ${windowId}`;
      const workspaceLabel = document.createElement("div");
      workspaceLabel.className = "workspace-label";
      workspaceLabel.textContent = workspaceName;
      workspaceLabel.contentEditable = true;
      workspaceLabel.addEventListener("blur", () => {
        const newName = workspaceLabel.textContent.trim();
        chrome.storage.local.set({
          [`${STORAGE_KEYS.workspacePrefix}${windowId}`]: newName,
        });
      });
      windowContainer.insertBefore(workspaceLabel, windowContainer.firstChild);
    }
  );
}
