/**
 * Taplo Extension Popup Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsPanel = document.getElementById("settingsPanel");
  const mainPanel = document.getElementById("mainPanel");
  const notConfigured = document.getElementById("notConfigured");
  const notOnTT = document.getElementById("notOnTT");
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

  let isSettingsOpen = false;
  let currentTabUrl = "";

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
    const url = apiUrlInput.value.trim().replace(/\/$/, "");
    const key = extKeyInput.value.trim();
    if (!url || !key) {
      showStatus(settingsStatus, "Both fields are required", "error");
      return;
    }
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

  function init() {
    chrome.storage.local.get(["taplo_api_url", "taplo_ext_key"], (result) => {
      if (!result.taplo_api_url || !result.taplo_ext_key) {
        notConfigured.classList.remove("hidden");
        notOnTT.classList.add("hidden");
        candidateForm.classList.add("hidden");
        return;
      }
      notConfigured.classList.add("hidden");

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        currentTabUrl = tab ? tab.url : "";
        const isTeamtailor = currentTabUrl.includes("teamtailor.com");

        if (!isTeamtailor) {
          notOnTT.classList.remove("hidden");
          candidateForm.classList.add("hidden");
          return;
        }

        notOnTT.classList.add("hidden");
        candidateForm.classList.remove("hidden");

        chrome.tabs.sendMessage(tab.id, { action: "scrape" }, (response) => {
          if (chrome.runtime.lastError) {
            console.log("Content script not ready:", chrome.runtime.lastError.message);
            return;
          }
          if (response && response.success && response.data) {
            fillForm(response.data);
          }
        });
      });
    });
  }

  function fillForm(data) {
    candName.value = data.name || "";
    candEmail.value = data.email || "";
    candRole.value = data.role || "";
    candGroup.value = "pipeline"; // Default group
    candPhone.value = data.phone || "";
    candNotes.value = data.notes || "";
    candGdpr.checked = data.gdpr_consent !== false;
  }

  pushBtn.addEventListener("click", async () => {
    const name = candName.value.trim();
    const email = candEmail.value.trim();

    if (!name || !email) {
      showStatus(pushStatus, "Name and email are required", "error");
      return;
    }

    pushBtn.disabled = true;
    pushBtn.innerHTML = '<span class="spinner"></span> Pushing...';
    pushStatus.classList.add("hidden");

    chrome.storage.local.get(["taplo_api_url", "taplo_ext_key"], async (result) => {
      const payload = {
        name: name,
        email: email,
        role: candRole.value.trim(),
        phone: candPhone.value.trim(),
        stage: candGroup.value,
        notes: candNotes.value.trim(),
        tags: [],
        gdpr_consent: candGdpr.checked,
        tt_profile_url: currentTabUrl,
        tt_candidate_id: extractIdFromUrl(currentTabUrl),
      };

      try {
        const response = await fetch(result.taplo_api_url + "/api/extension/push-candidate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Extension-Key": result.taplo_ext_key,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || "HTTP " + response.status);
        }

        const data = await response.json();
        const action = data.status === "created" ? "added to" : "updated in";
        showStatus(pushStatus, name + " " + action + " your Taplo pipeline!", "success");

        pushBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Pushed!';

        setTimeout(() => {
          pushBtn.disabled = false;
          pushBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg> Push to Taplo';
        }, 3000);
      } catch (error) {
        showStatus(pushStatus, "Failed: " + error.message, "error");
        pushBtn.disabled = false;
        pushBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg> Push to Taplo';
      }
    });
  });

  function extractIdFromUrl(url) {
    const match = url.match(/candidates\/([^/?#]+)/);
    return match ? match[1] : "";
  }

  loadSettings(() => init());
});
