document.addEventListener("DOMContentLoaded", () => {
  const tabList = document.getElementById("tabList");
  if (!tabList) {
    console.error("tabList element not found");
    return;
  }

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
          const div = document.createElement("div");
          div.className = "tab-container";

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
});
