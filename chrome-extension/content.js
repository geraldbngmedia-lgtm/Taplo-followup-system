/**
 * Taplo Content Script — runs on Teamtailor & LinkedIn pages.
 * Auto-detects platform and scrapes candidate data accordingly.
 */

(function () {
  "use strict";

  // ========================
  // Platform Detection
  // ========================

  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes("teamtailor.com")) return "teamtailor";
    if (host.includes("linkedin.com")) return "linkedin";
    return "unknown";
  }

  // ========================
  // Shared Utilities
  // ========================

  const EMPTY_VALUES = ["tomt", "empty", "—", "-", "", "kandidater", "candidates"];

  function isEmptyValue(text) {
    return EMPTY_VALUES.includes(text.toLowerCase().trim());
  }

  function cleanName(raw) {
    return raw.replace(/^\(\d+\)\s*/, "").trim();
  }

  // ========================
  // Teamtailor Scraping
  // ========================

  const TT_EMAIL_LABELS = ["e-post", "email", "e-mail", "mail"];
  const TT_PHONE_LABELS = ["telefon", "phone", "mobile", "mobil", "tel"];
  const TT_LOCATION_LABELS = ["plats", "location", "ort", "stad", "city"];

  const TT_STAGE_WORDS = [
    "reference taking", "referenstagning", "inbox", "inkorg", "rejected", "avvisad",
    "hired", "anställd", "interview", "intervju", "screening", "offer", "erbjudande",
    "new", "ny", "in process", "i process", "disqualified", "diskvalificerad",
    "withdrawn", "återkallad", "on hold", "parkerad", "kandidater", "candidates",
    "candidate", "kandidat", "dashboard", "pipeline", "inställningar", "settings",
    "teamtailor", "logga in", "login", "overview", "översikt"
  ];

  function ttIsStageName(text) {
    return TT_STAGE_WORDS.some((s) => text.toLowerCase().trim() === s);
  }

  function ttFindByLabels(labelTexts) {
    const allElements = document.querySelectorAll("span, div, td, dd, p, label, dt, li, a");
    for (const el of allElements) {
      const text = el.textContent.trim().toLowerCase();
      const isLabel = labelTexts.some((l) => text === l || text === l + ":");
      if (!isLabel) continue;

      let sibling = el.nextElementSibling;
      let attempts = 0;
      while (sibling && attempts < 5) {
        const val = sibling.textContent.trim();
        if (val && !isEmptyValue(val) && val.length < 200) return val;
        sibling = sibling.nextElementSibling;
        attempts++;
      }

      const parent = el.parentElement;
      if (parent) {
        const children = Array.from(parent.children);
        const idx = children.indexOf(el);
        for (let i = idx + 1; i < children.length; i++) {
          const val = children[i].textContent.trim();
          if (val && !isEmptyValue(val) && val.length < 200) return val;
        }
        const parentNext = parent.nextElementSibling;
        if (parentNext) {
          const val = parentNext.textContent.trim();
          if (val && !isEmptyValue(val) && val.length < 200) return val;
        }
      }
    }
    return "";
  }

  function ttFindName() {
    const title = document.title || "";
    if (title) {
      const parts = title.split(/[|\-–—·]/);
      const firstPart = cleanName(parts[0].trim());
      if (firstPart.length >= 3 && firstPart.length < 50 && firstPart.includes(" ") &&
          !ttIsStageName(firstPart) && !firstPart.toLowerCase().includes("teamtailor")) {
        return firstPart;
      }
    }
    const headings = document.querySelectorAll("h1");
    for (const h of headings) {
      const text = cleanName(h.textContent.trim());
      if (!text || text.length < 3 || text.length > 50 || ttIsStageName(text)) continue;
      const words = text.split(/\s+/);
      if (words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-ZÅÄÖÜÉÈÊËÀÂ]/.test(w))) return text;
    }
    const allHeadings = document.querySelectorAll("h1, h2");
    for (const h of allHeadings) {
      const text = cleanName(h.textContent.trim());
      if (!text || text.length < 3 || text.length > 50 || ttIsStageName(text)) continue;
      if (text.includes(" ") && /^[A-ZÅÄÖÜ]/.test(text)) return text;
    }
    return "";
  }

  function ttFindEmail() {
    const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
    for (const link of mailtoLinks) {
      const email = link.href.replace("mailto:", "").split("?")[0].trim();
      if (email.includes("@")) return email;
    }
    const byLabel = ttFindByLabels(TT_EMAIL_LABELS);
    if (byLabel && byLabel.includes("@")) return byLabel;
    const emailRegex = /[\w.+-]+@[\w-]+\.[\w.]+/g;
    const matches = document.body.innerText.match(emailRegex);
    if (matches) {
      const filtered = matches.filter((e) => !e.includes("teamtailor") && !e.includes("noreply") && !e.includes("support"));
      return filtered[0] || "";
    }
    return "";
  }

  function ttFindPhone() {
    const telLinks = document.querySelectorAll('a[href^="tel:"]');
    for (const link of telLinks) return link.href.replace("tel:", "").trim();
    const byLabel = ttFindByLabels(TT_PHONE_LABELS);
    if (byLabel) return byLabel;
    const phoneRegex = /(\+\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{2,4}[\s.-]?\d{0,4})/g;
    const matches = document.body.innerText.match(phoneRegex);
    if (matches) return matches[0].trim();
    return "";
  }

  function scrapeTeamtailor() {
    const name = ttFindName();
    const email = ttFindEmail();
    const phone = ttFindPhone();
    const location = ttFindByLabels(TT_LOCATION_LABELS);
    const source = (() => {
      const allEls = document.querySelectorAll("span, p, div, a");
      for (const el of allEls) {
        const text = el.textContent.trim();
        if (text.toLowerCase().startsWith("via ") && text.length < 60) return text;
      }
      return "";
    })();

    const notesParts = [];
    if (source) notesParts.push("Source: " + source);
    if (location) notesParts.push("Location: " + location);

    return {
      platform: "teamtailor",
      name: name,
      email: email,
      phone: phone,
      role: "",
      notes: notesParts.join(". "),
      profile_url: window.location.href,
      candidate_id: (() => { const m = window.location.pathname.match(/candidates\/([^/?#]+)/); return m ? m[1] : ""; })(),
    };
  }

  // ========================
  // LinkedIn Scraping
  // ========================

  function liFindName() {
    // LinkedIn Recruiter uses different DOM than regular LinkedIn
    // Recruiter candidate profile: name is often in specific profile card elements
    const isRecruiter = window.location.hostname.includes("linkedin.com") &&
      (window.location.pathname.includes("/talent/") || window.location.pathname.includes("/recruiter/") || window.location.pathname.includes("/hire/"));

    // Strategy 1: LinkedIn Recruiter specific selectors
    if (isRecruiter) {
      const recruiterSelectors = [
        ".profile-topcard-person-entity__name",
        "[data-test-topcard-name]",
        ".topcard-person-entity h1",
        ".profile-topcard h1",
        ".artdeco-entity-lockup__title",
        ".topcard__flavor--black",
        ".profile-info h1",
        '[class*="topcard"] [class*="name"]',
        '[class*="profile"] [class*="name"] h1',
        '[class*="profile-card"] h1',
      ];
      for (const sel of recruiterSelectors) {
        try {
          const el = document.querySelector(sel);
          if (el) {
            const text = cleanName(el.textContent.trim());
            if (text && text.length >= 2 && text.length < 60 && text.includes(" ")) return text;
          }
        } catch (e) { /* ignore */ }
      }

      // Recruiter fallback: scan all elements for a name pattern near a profile photo
      // The name is typically near an img with a profile photo
      const nameNearPhoto = document.querySelectorAll("h1, h2, span[class*='name'], a[class*='name']");
      for (const el of nameNearPhoto) {
        const text = cleanName(el.textContent.trim());
        if (!text || text.length < 4 || text.length > 50) continue;
        const lower = text.toLowerCase();
        // Skip job titles, project names, UI elements
        if (lower.includes("from ") || lower.includes("operations") || lower.includes("manager") ||
            lower.includes("engineer") || lower.includes("director") || lower.includes("linkedin") ||
            lower.includes("search") || lower.includes("project") || lower.includes("recruiter") ||
            lower.includes("similar") || lower.includes("tools") || lower.includes("profiles")) continue;
        // Must look like a person name: 2-4 words, capitalized
        const words = text.split(/\s+/);
        if (words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-ZÅÄÖÜÉÈÊËÀÂ]/.test(w))) {
          return text;
        }
      }
    }

    // Strategy 2: Regular LinkedIn profile selectors
    const selectors = [
      "h1.text-heading-xlarge",
      ".pv-top-card h1",
      ".text-heading-xlarge",
      ".topcard-link h1",
      "h1[class*='inline']",
    ];
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const text = cleanName(el.textContent.trim());
          if (text && text.length >= 2 && text.length < 60) return text;
        }
      } catch (e) { /* ignore */ }
    }

    // Strategy 3: First h1 that looks like a person name (not a job/project title)
    const headings = document.querySelectorAll("h1");
    for (const h of headings) {
      const text = cleanName(h.textContent.trim());
      if (!text || text.length < 4 || text.length > 50) continue;
      const lower = text.toLowerCase();
      if (lower.includes("linkedin") || lower.includes("search") || lower.includes("home") ||
          lower.includes("feed") || lower.includes("from ") || lower.includes("project") ||
          lower.includes("similar")) continue;
      const words = text.split(/\s+/);
      if (words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-ZÅÄÖÜÉÈÊËÀÂ]/.test(w))) {
        return text;
      }
    }

    // Strategy 4: Document title — "Pernilla Nicklasson | LinkedIn" on regular pages
    const title = document.title || "";
    if (title) {
      const parts = title.split(/[|\-–—·]/);
      const firstPart = cleanName(parts[0].trim());
      if (firstPart.length >= 4 && firstPart.length < 50 && firstPart.includes(" ") &&
          !firstPart.toLowerCase().includes("linkedin") && !firstPart.toLowerCase().startsWith("from ")) {
        // Verify it looks like a name, not a job title
        const words = firstPart.split(/\s+/);
        if (words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-ZÅÄÖÜÉÈÊËÀÂ]/.test(w))) {
          return firstPart;
        }
      }
    }

    return "";
  }

  function scrapeLinkedIn() {
    const name = liFindName();

    // LinkedIn profile URL is the candidate ID
    const profileUrl = window.location.href.split("?")[0];

    return {
      platform: "linkedin",
      name: name,
      email: "",
      phone: "",
      role: "",
      notes: "",
      profile_url: profileUrl,
      candidate_id: "",
    };
  }

  // ========================
  // Main Scrape Function
  // ========================

  function scrapeCandidate() {
    const platform = detectPlatform();
    if (platform === "teamtailor") return scrapeTeamtailor();
    if (platform === "linkedin") return scrapeLinkedIn();
    return { platform: "unknown", name: "", email: "", phone: "", role: "", notes: "", profile_url: window.location.href, candidate_id: "" };
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrape") {
      sendResponse({ success: true, data: scrapeCandidate() });
    }
    return true;
  });
})();
