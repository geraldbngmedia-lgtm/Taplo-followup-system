/**
 * Taplo Content Script — runs on Teamtailor pages.
 * Scrapes candidate data from Swedish & English Teamtailor profiles.
 */

(function () {
  "use strict";

  const EMAIL_LABELS = ["e-post", "email", "e-mail", "mail"];
  const PHONE_LABELS = ["telefon", "phone", "mobile", "mobil", "tel"];
  const LOCATION_LABELS = ["plats", "location", "ort", "stad", "city"];
  const EMPTY_VALUES = ["tomt", "empty", "—", "-", "", "kandidater", "candidates"];

  // Swedish stage/status words to exclude from name detection
  const STAGE_WORDS = [
    "reference taking", "referenstagning", "inbox", "inkorg", "rejected", "avvisad",
    "hired", "anställd", "interview", "intervju", "screening", "offer", "erbjudande",
    "new", "ny", "in process", "i process", "disqualified", "diskvalificerad",
    "withdrawn", "återkallad", "on hold", "parkerad", "kandidater", "candidates",
    "candidate", "kandidat", "dashboard", "pipeline", "inställningar", "settings",
    "teamtailor", "logga in", "login", "overview", "översikt"
  ];

  function isEmptyValue(text) {
    return EMPTY_VALUES.includes(text.toLowerCase().trim());
  }

  function isStageName(text) {
    return STAGE_WORDS.some((s) => text.toLowerCase().trim() === s);
  }

  function findByLabels(labelTexts) {
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

  function cleanName(raw) {
    // Strip leading "(number) " pattern from titles like "(49) Lea Anton"
    return raw.replace(/^\(\d+\)\s*/, "").trim();
  }

  function findName() {
    // Strategy 1: Document title — most reliable on Teamtailor
    // Title is usually "Lea Anton - Company - Teamtailor" or "Lea Anton | Teamtailor"
    const title = document.title || "";
    if (title) {
      const parts = title.split(/[|\-–—·]/);
      const firstPart = cleanName(parts[0].trim());
      if (
        firstPart.length >= 3 &&
        firstPart.length < 50 &&
        firstPart.includes(" ") &&
        !isStageName(firstPart) &&
        !firstPart.toLowerCase().includes("teamtailor")
      ) {
        return firstPart;
      }
    }

    // Strategy 2: h1 elements — look for a proper person name
    const headings = document.querySelectorAll("h1");
    for (const h of headings) {
      const text = cleanName(h.textContent.trim());
      if (!text || text.length < 3 || text.length > 50) continue;
      if (isStageName(text)) continue;

      // Check if it looks like a person name: 2-4 words, each capitalized
      const words = text.split(/\s+/);
      if (words.length >= 2 && words.length <= 4) {
        const allCapitalized = words.every((w) => /^[A-ZÅÄÖÜÉÈÊËÀÂ]/.test(w));
        if (allCapitalized) return text;
      }
    }

    // Strategy 3: Any h1/h2 with a name-like pattern
    const allHeadings = document.querySelectorAll("h1, h2");
    for (const h of allHeadings) {
      const text = cleanName(h.textContent.trim());
      if (!text || text.length < 3 || text.length > 50) continue;
      if (isStageName(text)) continue;
      if (text.includes(" ") && /^[A-ZÅÄÖÜ]/.test(text)) {
        return text;
      }
    }

    return "";
  }

  function findEmail() {
    const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
    for (const link of mailtoLinks) {
      const email = link.href.replace("mailto:", "").split("?")[0].trim();
      if (email.includes("@")) return email;
    }

    const byLabel = findByLabels(EMAIL_LABELS);
    if (byLabel && byLabel.includes("@")) return byLabel;

    const emailRegex = /[\w.+-]+@[\w-]+\.[\w.]+/g;
    const matches = document.body.innerText.match(emailRegex);
    if (matches) {
      const filtered = matches.filter(
        (e) => !e.includes("teamtailor") && !e.includes("noreply") && !e.includes("support")
      );
      return filtered[0] || "";
    }
    return "";
  }

  function findPhone() {
    const telLinks = document.querySelectorAll('a[href^="tel:"]');
    for (const link of telLinks) return link.href.replace("tel:", "").trim();

    const byLabel = findByLabels(PHONE_LABELS);
    if (byLabel) return byLabel;

    const phoneRegex = /(\+\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{2,4}[\s.-]?\d{0,4})/g;
    const matches = document.body.innerText.match(phoneRegex);
    if (matches) return matches[0].trim();
    return "";
  }

  function findLocation() {
    return findByLabels(LOCATION_LABELS);
  }

  function findSource() {
    const allEls = document.querySelectorAll("span, p, div, a");
    for (const el of allEls) {
      const text = el.textContent.trim();
      if (text.toLowerCase().startsWith("via ") && text.length < 60) return text;
    }
    return "";
  }

  function extractCandidateId() {
    const match = window.location.pathname.match(/candidates\/([^/?#]+)/);
    return match ? match[1] : "";
  }

  function scrapeCandidate() {
    const name = findName();
    const email = findEmail();
    const phone = findPhone();
    const location = findLocation();
    const source = findSource();

    const notesParts = [];
    if (source) notesParts.push("Source: " + source);
    if (location) notesParts.push("Location: " + location);

    return {
      name: name,
      email: email,
      phone: phone,
      role: "",
      stage: "",
      notes: notesParts.join(". "),
      tt_profile_url: window.location.href,
      tt_candidate_id: extractCandidateId(),
      gdpr_consent: true,
    };
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrape") {
      sendResponse({ success: true, data: scrapeCandidate() });
    }
    return true;
  });
})();
