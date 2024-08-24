document.addEventListener("DOMContentLoaded", () => {
  const tabList = document.getElementById("tabList");

  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      const li = document.createElement("li");
      li.textContent = tab.title;
      tabList.appendChild(li);
    });
  });
});
