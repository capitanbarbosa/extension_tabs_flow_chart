document.addEventListener("DOMContentLoaded", () => {
  const tabList = document.getElementById("tabList");
  const openPageButton = document.getElementById("openPage");

  openPageButton.addEventListener("click", () => {
    chrome.tabs.create({ url: "tabs.html" });
  });

  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      const li = document.createElement("li");
      li.textContent = tab.title;
      tabList.appendChild(li);
    });
  });
});
