document.addEventListener("DOMContentLoaded", () => {
  const tabList = document.getElementById("tabList");
  const openPageButton = document.getElementById("openPage");

  openPageButton.addEventListener("click", () => {
    chrome.tabs.create({ url: "tabs.html" });
  });

  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      const li = document.createElement("li");
      const div = document.createElement("div");
      div.className = "tab-container";
      const a = document.createElement("a");
      a.href = "#";
      a.textContent = tab.title;
      a.addEventListener("click", (event) => {
        event.preventDefault();
        chrome.tabs.update(tab.id, { active: true });
      });
      div.appendChild(a);
      li.appendChild(div);
      tabList.appendChild(li);
    });
  });
});
