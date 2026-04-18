chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["taplo_api_url", "taplo_ext_key"], (result) => {
    if (!result.taplo_api_url) {
      chrome.storage.local.set({ taplo_api_url: "" });
    }
    if (!result.taplo_ext_key) {
      chrome.storage.local.set({ taplo_ext_key: "" });
    }
  });
});
