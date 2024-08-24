document.addEventListener("DOMContentLoaded", () => {
  const tabList = document.getElementById("tabList");
  const openPageButton = document.getElementById("openPage");

  openPageButton.addEventListener("click", () => {
    chrome.tabs.create({ url: "tabs.html" });
  });

  chrome.tabs.query({}, (tabs) => {
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

      // Add workspace indicator label
      const workspaceLabel = document.createElement("h2");
      workspaceLabel.textContent = `Workspace ${windowId}`;
      workspaceLabel.className = "workspace-label";
      windowContainer.appendChild(workspaceLabel);

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
