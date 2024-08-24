document.addEventListener("DOMContentLoaded", () => {
  const tabList = document.getElementById("tabList");

  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
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
      tabList.appendChild(li);
    });
  });
});
