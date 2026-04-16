/**
 * Taplo AI Content Script — runs on any ATS / LinkedIn page.
 * Grabs the visible page text for AI extraction.
 */

(function () {
  "use strict";

  function getPageText() {
    // Get visible text, limited to a reasonable size
    const body = document.body.innerText || "";
    // Take first 4000 chars — enough for AI to find name/email/phone
    return body.substring(0, 4000);
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrape") {
      sendResponse({
        success: true,
        data: {
          page_text: getPageText(),
          page_url: window.location.href,
        }
      });
    }
    return true;
  });
})();
