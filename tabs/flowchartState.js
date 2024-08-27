import { STORAGE_KEYS } from "./constants.js";
import { createFlowchartElement, clearBoard } from "./utils.js";

export function saveFlowchartState() {
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

  chrome.storage.local.set({
    [STORAGE_KEYS.flowchartState]: flowchartElements,
  });
}

export function loadFlowchartState() {
  chrome.storage.local.get(
    [STORAGE_KEYS.currentFlowchartState, STORAGE_KEYS.flowchartState],
    (result) => {
      const flowchartState =
        result[STORAGE_KEYS.currentFlowchartState] ||
        result[STORAGE_KEYS.flowchartState] ||
        [];
      const flowchartArea = document.getElementById("flowchartArea");
      const toolSelector = document.getElementById("toolSelector");

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
    }
  );
}

export function saveState() {
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

  chrome.storage.local.get(STORAGE_KEYS.currentState, (result) => {
    const currentState = result[STORAGE_KEYS.currentState];
    if (currentState) {
      const overwrite = confirm(
        `Do you want to overwrite the current state "${currentState}"?`
      );
      if (overwrite) {
        chrome.storage.local.get(STORAGE_KEYS.savedStates, (result) => {
          const savedStates = result[STORAGE_KEYS.savedStates] || {};
          savedStates[currentState] = flowchartState;
          chrome.storage.local.set(
            {
              [STORAGE_KEYS.savedStates]: savedStates,
              [STORAGE_KEYS.currentFlowchartState]: flowchartState,
            },
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
      chrome.storage.local.get(STORAGE_KEYS.savedStates, (result) => {
        const savedStates = result[STORAGE_KEYS.savedStates] || {};
        savedStates[stateName] = flowchartState;
        chrome.storage.local.set(
          {
            [STORAGE_KEYS.savedStates]: savedStates,
            [STORAGE_KEYS.currentState]: stateName,
            [STORAGE_KEYS.currentFlowchartState]: flowchartState,
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

export function loadState() {
  chrome.storage.local.get(STORAGE_KEYS.savedStates, (result) => {
    const savedStates = result[STORAGE_KEYS.savedStates] || {};
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
      chrome.storage.local.set(
        { [STORAGE_KEYS.currentState]: stateName },
        () => {
          alert("State loaded successfully!");
        }
      );
    } else if (stateName) {
      alert("State not found.");
    }
  });
}

export function saveCurrentState() {
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

  chrome.storage.local.set(
    { [STORAGE_KEYS.currentFlowchartState]: flowchartState },
    () => {
      console.log("Current state saved");
    }
  );
}
