/**
 * Taplo Background Service Worker
 * Handles extension installation and badge updates.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("Taplo extension installed");

  // Set default settings
  chrome.storage.local.get(["taplo_api_url", "taplo_ext_key"], (result) => {
    if (!result.taplo_api_url) {
      chrome.storage.local.set({ taplo_api_url: "" });
    }
    if (!result.taplo_ext_key) {
      chrome.storage.local.set({ taplo_ext_key: "" });
    }
  });
});
