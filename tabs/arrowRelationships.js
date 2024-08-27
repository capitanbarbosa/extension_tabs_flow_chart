import { STORAGE_KEYS } from "./constants.js";

export function createArrow(startTab, endTab) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

  const startHandle = startTab.querySelector(".drag-handle");
  const endHandle = endTab.querySelector(".drag-handle");

  const startRect = startHandle.getBoundingClientRect();
  const endRect = endHandle.getBoundingClientRect();
  const flowchartRect = document
    .getElementById("flowchartArea")
    .getBoundingClientRect();

  const x1 = startRect.left + startRect.width / 2 - flowchartRect.left;
  const y1 = startRect.top + startRect.height / 2 - flowchartRect.top;
  const x2 = endRect.left + endRect.width / 2 - flowchartRect.left;
  const y2 = endRect.top + endRect.height / 2 - flowchartRect.top;

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
  document.getElementById("flowchartArea").appendChild(svg);

  saveArrowRelationship(startTab, endTab);
}

export function saveArrowRelationship(startTab, endTab) {
  const arrow = {
    startId: startTab.dataset.tabId,
    endId: endTab.dataset.tabId,
  };

  chrome.storage.local.get(STORAGE_KEYS.arrowRelationships, (result) => {
    const arrowRelationships = result[STORAGE_KEYS.arrowRelationships] || [];
    arrowRelationships.push(arrow);
    chrome.storage.local.set({
      [STORAGE_KEYS.arrowRelationships]: arrowRelationships,
    });
  });
}

export function loadArrowRelationships() {
  chrome.storage.local.get(STORAGE_KEYS.arrowRelationships, (result) => {
    const arrowRelationships = result[STORAGE_KEYS.arrowRelationships] || [];
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
