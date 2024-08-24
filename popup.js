document.addEventListener("DOMContentLoaded", () => {
  const tabList = document.getElementById("tabList");
  const openPageButton = document.getElementById("openPage");

  openPageButton.addEventListener("click", () => {
    chrome.tabs.create({ url: "tabs.html" });
  });

  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#";
      a.textContent = tab.title;
      a.addEventListener("click", () => {
        chrome.tabs.update(tab.id, { active: true });
      });
      li.appendChild(a);
      tabList.appendChild(li);
    });
  });
});
