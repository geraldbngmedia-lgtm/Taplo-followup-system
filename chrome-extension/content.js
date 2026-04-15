/**
 * Taplo Content Script — runs on Teamtailor pages.
 * Scrapes candidate data from Swedish & English Teamtailor profiles.
 */

(function () {
  "use strict";

  // Multi-language label mappings
  const EMAIL_LABELS = ["e-post", "email", "e-mail", "mail"];
  const PHONE_LABELS = ["telefon", "phone", "mobile", "mobil", "tel"];
  const LOCATION_LABELS = ["plats", "location", "ort", "stad", "city"];
  const TAGS_LABELS = ["taggar", "tags", "etiketter"];
  const LINKEDIN_LABELS = ["linkedin"];
  const SALARY_LABELS = ["lön", "salary", "loneförväntning"];
  const STAGE_LABELS = ["stage", "steg", "status", "fas"];
  const EMPTY_VALUES = ["tomt", "empty", "—", "-", ""];

  /**
   * Find a value by scanning rows of label-value pairs.
   * Teamtailor uses rows where the label and value are siblings or in table-like layouts.
   */
  function findByLabels(labelTexts) {
    // Strategy 1: Look for all text nodes and find label-value pairs
    const allElements = document.querySelectorAll("span, div, td, dd, p, label, dt, li, a");

    for (const el of allElements) {
      const text = el.textContent.trim().toLowerCase();
      // Check if this element's text matches one of our labels
      const isLabel = labelTexts.some((l) => text === l || text === l + ":");

      if (!isLabel) continue;

      // Found a label — now find the adjacent value
      // Strategy 1a: Next sibling element
      let value = getAdjacentValue(el);
      if (value) return value;

      // Strategy 1b: Parent's other children
      const parent = el.parentElement;
      if (parent) {
        const children = Array.from(parent.children);
        const idx = children.indexOf(el);
        for (let i = idx + 1; i < children.length; i++) {
          const val = children[i].textContent.trim();
          if (val && !isEmptyValue(val) && val.length < 200) return val;
        }

        // Strategy 1c: Parent's next sibling
        const parentNext = parent.nextElementSibling;
        if (parentNext) {
          const val = parentNext.textContent.trim();
          if (val && !isEmptyValue(val) && val.length < 200) return val;
        }

        // Strategy 1d: Grandparent's children (for row-based layouts)
        const grandparent = parent.parentElement;
        if (grandparent) {
          const gpChildren = Array.from(grandparent.children);
          const pIdx = gpChildren.indexOf(parent);
          for (let i = pIdx + 1; i < gpChildren.length; i++) {
            const val = gpChildren[i].textContent.trim();
            if (val && !isEmptyValue(val) && val.length < 200) return val;
          }
        }
      }
    }

    return "";
  }

  function getAdjacentValue(el) {
    // Check all next siblings
    let sibling = el.nextElementSibling;
    let attempts = 0;
    while (sibling && attempts < 5) {
      const text = sibling.textContent.trim();
      if (text && !isEmptyValue(text) && text.length < 200) {
        return text;
      }
      sibling = sibling.nextElementSibling;
      attempts++;
    }
    return "";
  }

  function isEmptyValue(text) {
    return EMPTY_VALUES.includes(text.toLowerCase());
  }

  function findEmail() {
    // Strategy 1: mailto links (most reliable)
    const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
    for (const link of mailtoLinks) {
      const email = link.href.replace("mailto:", "").split("?")[0].trim();
      if (email.includes("@")) return email;
    }

    // Strategy 2: By label
    const byLabel = findByLabels(EMAIL_LABELS);
    if (byLabel && byLabel.includes("@")) return byLabel;

    // Strategy 3: Regex scan — find emails in page text
    const emailRegex = /[\w.+-]+@[\w-]+\.[\w.]+/g;
    const bodyText = document.body.innerText;
    const matches = bodyText.match(emailRegex);
    if (matches) {
      const filtered = matches.filter(
        (e) => !e.includes("teamtailor") && !e.includes("noreply") && !e.includes("support") && !e.includes("@example")
      );
      return filtered[0] || matches[0] || "";
    }

    return "";
  }

  function findPhone() {
    // Strategy 1: tel links
    const telLinks = document.querySelectorAll('a[href^="tel:"]');
    for (const link of telLinks) {
      return link.href.replace("tel:", "").trim();
    }

    // Strategy 2: By label
    const byLabel = findByLabels(PHONE_LABELS);
    if (byLabel) return byLabel;

    // Strategy 3: Regex for phone numbers
    const phoneRegex = /(\+\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{2,4}[\s.-]?\d{0,4})/g;
    const bodyText = document.body.innerText;
    const matches = bodyText.match(phoneRegex);
    if (matches && matches.length > 0) return matches[0].trim();

    return "";
  }

  function findName() {
    // On Teamtailor candidate pages, the name is typically the largest heading
    // It's usually an h1 or a prominent element near the top

    // Strategy 1: Look for h1 that contains a person's name (not navigation text)
    const headings = document.querySelectorAll("h1, h2");
    for (const h of headings) {
      const text = h.textContent.trim();
      // Filter out UI headings
      const lower = text.toLowerCase();
      if (
        text &&
        text.length < 60 &&
        text.length > 2 &&
        !lower.includes("kandidat") &&
        !lower.includes("candidate") &&
        !lower.includes("dashboard") &&
        !lower.includes("pipeline") &&
        !lower.includes("inställning") &&
        !lower.includes("settings") &&
        !lower.includes("teamtailor") &&
        !lower.includes("logga") &&
        !lower.includes("login") &&
        // Name should have at least a space (first + last) or be reasonable
        /^[A-ZÅÄÖÜÉÈÊËÀÂÆÇÎÏÔŒÙÛŒ][a-zåäöüéèêëàâæçîïôœùûœ]+(\s+[A-ZÅÄÖÜÉÈÊËÀÂÆÇÎÏÔŒÙÛŒ][a-zåäöüéèêëàâæçîïôœùûœ]+)+$/u.test(text)
      ) {
        return text;
      }
    }

    // Strategy 2: Less strict — first h1 that looks like a name
    for (const h of headings) {
      const text = h.textContent.trim();
      if (text && text.length > 2 && text.length < 50 && text.includes(" ")) {
        // Likely a name if it has 2-4 words, starts with uppercase
        const words = text.split(/\s+/);
        if (words.length >= 2 && words.length <= 4 && /^[A-ZÅÄÖÜ]/.test(words[0])) {
          return text;
        }
      }
    }

    // Strategy 3: Document title
    const title = document.title;
    if (title) {
      const parts = title.split(/[|\-–—·]/);
      const firstPart = parts[0].trim();
      if (firstPart.length > 2 && firstPart.length < 50 && firstPart.includes(" ")) {
        return firstPart;
      }
    }

    return "";
  }

  function findRole() {
    // Try common labels for the applied position
    const role = findByLabels(["position", "tjänst", "roll", "job", "role", "applied for", "ansökt till", "jobb"]);
    if (role) return role;

    // Look for job title in breadcrumbs or subtitle areas
    const breadcrumbs = document.querySelectorAll('[class*="breadcrumb"] a, nav a');
    for (const a of breadcrumbs) {
      const text = a.textContent.trim();
      // Job titles are usually longer than 5 chars and don't look like nav items
      if (text.length > 5 && text.length < 80 && !text.toLowerCase().includes("kandidat") && !text.toLowerCase().includes("candidate")) {
        return text;
      }
    }

    return "";
  }

  function findStage() {
    return findByLabels(STAGE_LABELS);
  }

  function findLocation() {
    return findByLabels(LOCATION_LABELS);
  }

  function findTags() {
    const tagsText = findByLabels(TAGS_LABELS);
    if (tagsText && !isEmptyValue(tagsText)) {
      // Tags might be comma-separated or in separate elements
      return tagsText.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
    }

    // Also look for badge/chip elements near "Taggar" or "Tags"
    const tagContainers = document.querySelectorAll('[class*="tag"], [class*="chip"], [class*="badge"], [class*="label"]');
    const tags = [];
    tagContainers.forEach((el) => {
      const text = el.textContent.trim();
      if (text && text.length > 1 && text.length < 30 && !text.includes("\n") && !isEmptyValue(text)) {
        tags.push(text);
      }
    });
    return [...new Set(tags)].slice(0, 10);
  }

  function findSource() {
    // "via Arbetsförmedlingen" etc — look for "via" text
    const allEls = document.querySelectorAll("span, p, div, a");
    for (const el of allEls) {
      const text = el.textContent.trim();
      if (text.toLowerCase().startsWith("via ") && text.length < 60) {
        return text;
      }
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
    const role = findRole();
    const stage = findStage();
    const location = findLocation();
    const tags = findTags();
    const source = findSource();

    // Build notes from extra info
    const notesParts = [];
    if (source) notesParts.push(`Source: ${source}`);
    if (location) notesParts.push(`Location: ${location}`);

    return {
      name: name,
      email: email,
      phone: phone,
      role: role,
      stage: stage,
      tags: tags,
      notes: notesParts.join(". "),
      tt_profile_url: window.location.href,
      tt_candidate_id: extractCandidateId(),
      gdpr_consent: true,
    };
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrape") {
      const data = scrapeCandidate();
      sendResponse({ success: true, data });
    }
    return true;
  });
})();
