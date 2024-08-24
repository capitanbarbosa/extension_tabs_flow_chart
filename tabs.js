document.addEventListener("DOMContentLoaded", () => {
  const tabList = document.getElementById("tabList");

  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = tab.url;
      a.textContent = tab.title;
      a.addEventListener("click", () => {
        chrome.tabs.update(tab.id, { active: true });
      });
      li.appendChild(a);
      tabList.appendChild(li);
    });
  });
});
