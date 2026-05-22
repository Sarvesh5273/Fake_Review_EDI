chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["vertexshieldApiBaseUrl"], (items) => {
    if (!items.vertexshieldApiBaseUrl) {
      chrome.storage.sync.set({ vertexshieldApiBaseUrl: "http://localhost:3010" });
    }
  });
});

