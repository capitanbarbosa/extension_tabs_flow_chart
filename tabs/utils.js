import { STORAGE_KEYS } from "./constants.js";

export function createFlowchartElement(item) {
  const element = document.createElement("div");
  element.className = "flowchart-tab";
  element.dataset.tabId = item.id;
  element.style.left = item.left;
  element.style.top = item.top;
  element.innerHTML = item.content;
  element.style.width = item.width || "auto";
  element.style.height = item.height || "auto";

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.textContent = "X";
  deleteButton.addEventListener("click", () => {
    element.remove();
    saveFlowchartState();
  });

  element.appendChild(deleteButton);

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

  return element;
}

export function measureTextWidth(text, element) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = getComputedStyle(element).font;
  return context.measureText(text).width;
}

export function highlightSelectedTool(selectedTool) {
  const toolButtons = document.querySelectorAll("#toolSelector button");
  toolButtons.forEach((button) => {
    if (button.dataset.tool === selectedTool) {
      button.classList.add("selected-tool");
    } else {
      button.classList.remove("selected-tool");
    }
  });
}

export function displayCurrentState() {
  chrome.storage.local.get(STORAGE_KEYS.currentState, (result) => {
    const currentState = result[STORAGE_KEYS.currentState];
    const stateDisplay = document.getElementById("currentStateDisplay");
    if (currentState) {
      stateDisplay.textContent = `Current State: ${currentState}`;
    } else {
      stateDisplay.textContent = "No state loaded";
    }
  });
}

export function clearBoard() {
  const flowchartArea = document.getElementById("flowchartArea");
  const flowchartElements = flowchartArea.querySelectorAll(".flowchart-tab");
  flowchartElements.forEach((element) => {
    flowchartArea.removeChild(element);
  });
}
