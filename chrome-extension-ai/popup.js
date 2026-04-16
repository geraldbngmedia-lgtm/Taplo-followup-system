/**
 * Taplo AI Extension Popup Logic
 * Sends page text to backend AI for extraction, then fills the form.
 */

document.addEventListener("DOMContentLoaded", () => {
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsPanel = document.getElementById("settingsPanel");
  const mainPanel = document.getElementById("mainPanel");
  const notConfigured = document.getElementById("notConfigured");
  const candidateForm = document.getElementById("candidateForm");

  const apiUrlInput = document.getElementById("apiUrl");
  const extKeyInput = document.getElementById("extKey");
  const saveSettingsBtn = document.getElementById("saveSettings");
  const settingsStatus = document.getElementById("settingsStatus");

  const candName = document.getElementById("candName");
  const candEmail = document.getElementById("candEmail");
  const candRole = document.getElementById("candRole");
  const candGroup = document.getElementById("candGroup");
  const candPhone = document.getElementById("candPhone");
  const candNotes = document.getElementById("candNotes");
  const candGdpr = document.getElementById("candGdpr");
  const pushBtn = document.getElementById("pushBtn");
  const pushStatus = document.getElementById("pushStatus");
  const fuModeDate = document.getElementById("fuModeDate");
  const fuModeInterval = document.getElementById("fuModeInterval");
  const fuDateField = document.getElementById("fuDateField");
  const fuIntervalField = document.getElementById("fuIntervalField");
  const candFollowupDate = document.getElementById("candFollowupDate");
  const candFollowupInterval = document.getElementById("candFollowupInterval");
  const extractingState = document.getElementById("extractingState");
  const badgeText = document.getElementById("badgeText");
  const scrapedBadge = document.getElementById("scrapedBadge");

  let isSettingsOpen = false;
  let currentTabUrl = "";

  // Follow-up mode toggle
  fuModeDate.addEventListener("click", () => {
    fuModeDate.classList.add("fu-active");
    fuModeInterval.classList.remove("fu-active");
    fuDateField.classList.remove("hidden");
    fuIntervalField.classList.add("hidden");
  });
  fuModeInterval.addEventListener("click", () => {
    fuModeInterval.classList.add("fu-active");
    fuModeDate.classList.remove("fu-active");
    fuIntervalField.classList.remove("hidden");
    fuDateField.classList.add("hidden");
  });

  settingsBtn.addEventListener("click", () => {
    isSettingsOpen = !isSettingsOpen;
    settingsPanel.classList.toggle("hidden", !isSettingsOpen);
    mainPanel.classList.toggle("hidden", isSettingsOpen);
  });

  function loadSettings(callback) {
    chrome.storage.local.get(["taplo_api_url", "taplo_ext_key"], (result) => {
      apiUrlInput.value = result.taplo_api_url || "";
      extKeyInput.value = result.taplo_ext_key || "";
      if (callback) callback(result);
    });
  }

  saveSettingsBtn.addEventListener("click", () => {
    let url = apiUrlInput.value.trim().replace(/\/$/, "");
    url = url.replace(/\/api\/.*$/, "").replace(/\/api$/, "");
    const key = extKeyInput.value.trim();
    if (!url || !key) {
      showStatus(settingsStatus, "Both fields are required", "error");
      return;
    }
    apiUrlInput.value = url;
    chrome.storage.local.set({ taplo_api_url: url, taplo_ext_key: key }, () => {
      showStatus(settingsStatus, "Settings saved!", "success");
      setTimeout(() => {
        isSettingsOpen = false;
        settingsPanel.classList.add("hidden");
        mainPanel.classList.remove("hidden");
        settingsStatus.classList.add("hidden");
        init();
      }, 1000);
    });
  });

  function showStatus(el, message, type) {
    el.textContent = message;
    el.className = "status " + type;
    el.classList.remove("hidden");
  }

  // AI extraction call
  function callAIExtract(apiUrl, extKey, pageText, pageUrl) {
    return fetch(apiUrl + "/api/extension/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Extension-Key": extKey,
      },
      body: JSON.stringify({
        page_text: pageText,
        page_url: pageUrl,
      }),
    })
    .then(function(res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  function init() {
    chrome.storage.local.get(["taplo_api_url", "taplo_ext_key"], function(result) {
      if (!result.taplo_api_url || !result.taplo_ext_key) {
        notConfigured.classList.remove("hidden");
        candidateForm.classList.add("hidden");
        return;
      }

      var apiUrl = result.taplo_api_url;
      var extKey = result.taplo_ext_key;

      notConfigured.classList.add("hidden");
      candidateForm.classList.remove("hidden");
      extractingState.classList.remove("hidden");
      scrapedBadge.classList.add("hidden");

      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        var tab = tabs[0];
        currentTabUrl = tab ? tab.url : "";

        // Detect platform for badge
        if (currentTabUrl.includes("linkedin.com")) {
          badgeText.textContent = "AI extracted from LinkedIn";
        } else if (currentTabUrl.includes("teamtailor.com")) {
          badgeText.textContent = "AI extracted from Teamtailor";
        } else {
          try {
            var host = new URL(currentTabUrl).hostname;
            badgeText.textContent = "AI extracted from " + host;
          } catch(e) {
            badgeText.textContent = "AI extracted";
          }
        }

        // Get page text from content script
        chrome.tabs.sendMessage(tab.id, { action: "scrape" }, function(response) {
          if (chrome.runtime.lastError || !response || !response.success) {
            extractingState.classList.add("hidden");
            scrapedBadge.classList.remove("hidden");
            showStatus(pushStatus, "Could not read page — fill in manually", "info");
            return;
          }

          // Send to AI — using .then() instead of async/await
          callAIExtract(apiUrl, extKey, response.data.page_text, response.data.page_url)
            .then(function(data) {
              candName.value = data.name || "";
              candEmail.value = data.email || "";
              candPhone.value = data.phone || "";
              extractingState.classList.add("hidden");
              scrapedBadge.classList.remove("hidden");
            })
            .catch(function(err) {
              console.error("AI extraction failed:", err);
              extractingState.classList.add("hidden");
              scrapedBadge.classList.remove("hidden");
              showStatus(pushStatus, "AI extraction failed — fill in manually", "info");
            });
        });
      });
    });
  }

  // Push to Taplo
  pushBtn.addEventListener("click", function() {
    var name = candName.value.trim();
    var email = candEmail.value.trim();

    if (!name || !email) {
      showStatus(pushStatus, "Name and email are required", "error");
      return;
    }

    pushBtn.disabled = true;
    pushBtn.innerHTML = '<span class="spinner"></span> Pushing...';
    pushStatus.classList.add("hidden");

    chrome.storage.local.get(["taplo_api_url", "taplo_ext_key"], function(result) {
      var followupDate = "";
      if (!fuIntervalField.classList.contains("hidden") && candFollowupInterval.value) {
        var d = new Date();
        d.setDate(d.getDate() + parseInt(candFollowupInterval.value));
        followupDate = d.toISOString();
      } else if (!fuDateField.classList.contains("hidden") && candFollowupDate.value) {
        followupDate = new Date(candFollowupDate.value).toISOString();
      }

      var payload = {
        name: name,
        email: email,
        role: candRole.value.trim(),
        phone: candPhone.value.trim(),
        stage: candGroup.value,
        notes: candNotes.value.trim(),
        tags: [],
        gdpr_consent: candGdpr.checked,
        tt_profile_url: currentTabUrl,
        tt_candidate_id: "",
      };
      if (followupDate) payload.followup_date = followupDate;

      fetch(result.taplo_api_url + "/api/extension/push-candidate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Extension-Key": result.taplo_ext_key,
        },
        body: JSON.stringify(payload),
      })
      .then(function(response) {
        if (!response.ok) {
          return response.json().then(function(err) {
            throw new Error(err.detail || "HTTP " + response.status);
          });
        }
        return response.json();
      })
      .then(function(data) {
        var action = data.status === "created" ? "added to" : "updated in";
        showStatus(pushStatus, name + " " + action + " your Taplo pipeline!", "success");
        pushBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Pushed!';
        setTimeout(function() {
          pushBtn.disabled = false;
          pushBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg> Push to Taplo';
        }, 3000);
      })
      .catch(function(error) {
        showStatus(pushStatus, "Failed: " + error.message, "error");
        pushBtn.disabled = false;
        pushBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg> Push to Taplo';
      });
    });
  });

  loadSettings(function() { init(); });
});
