/**
 * Taplo Content Script — runs on Teamtailor pages.
 * Attempts to scrape candidate data from the DOM using multiple strategies.
 * Sends data to the popup when requested.
 */

(function () {
  "use strict";

  function getTextContent(el) {
    return el ? el.textContent.trim() : "";
  }

  function queryText(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) return el.textContent.trim();
      } catch (e) { /* ignore invalid selectors */ }
    }
    return "";
  }

  function findByLabel(labelText) {
    const labels = document.querySelectorAll("label, dt, th, span, div");
    for (const label of labels) {
      if (label.textContent.trim().toLowerCase().includes(labelText.toLowerCase())) {
        // Try next sibling, parent's next sibling, adjacent dd/td
        const next = label.nextElementSibling;
        if (next) {
          const text = next.textContent.trim();
          if (text && text.length < 200) return text;
        }
        // Try parent's next child
        const parent = label.parentElement;
        if (parent) {
          const children = parent.querySelectorAll("a, span, div, p, dd, td");
          for (const child of children) {
            if (child !== label && child.textContent.trim()) {
              return child.textContent.trim();
            }
          }
        }
      }
    }
    return "";
  }

  function findEmail() {
    // Strategy 1: mailto links
    const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
    for (const link of mailtoLinks) {
      const email = link.href.replace("mailto:", "").split("?")[0].trim();
      if (email.includes("@")) return email;
    }

    // Strategy 2: common selectors
    const emailSelectors = [
      '[data-testid*="email"]', '[class*="email"]', '[id*="email"]',
      'a[href*="mailto"]'
    ];
    const emailText = queryText(emailSelectors);
    if (emailText.includes("@")) return emailText;

    // Strategy 3: regex scan of visible text
    const emailRegex = /[\w.+-]+@[\w-]+\.[\w.]+/g;
    const bodyText = document.body.innerText;
    const matches = bodyText.match(emailRegex);
    if (matches && matches.length > 0) {
      // Filter out common non-candidate emails
      const filtered = matches.filter(
        (e) => !e.includes("teamtailor") && !e.includes("noreply") && !e.includes("support")
      );
      return filtered[0] || matches[0];
    }

    return "";
  }

  function findPhone() {
    // Strategy 1: tel links
    const telLinks = document.querySelectorAll('a[href^="tel:"]');
    for (const link of telLinks) {
      return link.href.replace("tel:", "").trim();
    }

    // Strategy 2: by label
    return findByLabel("phone") || findByLabel("telefon") || findByLabel("mobile");
  }

  function findName() {
    // Strategy 1: Page title often has candidate name
    const h1 = document.querySelector("h1");
    if (h1) {
      const text = h1.textContent.trim();
      // Filter out generic headings
      if (text && !text.toLowerCase().includes("candidate") && !text.toLowerCase().includes("dashboard") && text.length < 60) {
        return text;
      }
    }

    // Strategy 2: Common selectors
    const nameSelectors = [
      '[data-testid*="name"]', '[class*="candidate-name"]',
      'h1', 'h2', '[class*="profile-name"]', '[class*="header"] h1',
      '[class*="header"] h2'
    ];
    const name = queryText(nameSelectors);
    if (name && name.length < 60) return name;

    // Strategy 3: From document title
    const title = document.title;
    if (title && !title.toLowerCase().includes("teamtailor")) {
      const parts = title.split(/[|\-–—]/);
      if (parts[0].trim().length < 60) return parts[0].trim();
    }

    return "";
  }

  function findRole() {
    // Look for job title / position applied for
    const role = findByLabel("position") || findByLabel("job") || findByLabel("role") || findByLabel("applied for");
    if (role) return role;

    // Try breadcrumb or subtitle
    const subtitles = document.querySelectorAll("h2, h3, [class*='subtitle'], [class*='position'], [class*='job-title']");
    for (const el of subtitles) {
      const text = el.textContent.trim();
      if (text && text.length < 80 && !text.includes("@")) return text;
    }

    return "";
  }

  function findStage() {
    return findByLabel("stage") || findByLabel("status") || findByLabel("pipeline") || "";
  }

  function findTags() {
    const tagElements = document.querySelectorAll('[class*="tag"], [class*="chip"], [class*="badge"]');
    const tags = [];
    tagElements.forEach((el) => {
      const text = el.textContent.trim();
      if (text && text.length < 30 && !text.includes("\n")) {
        tags.push(text);
      }
    });
    return [...new Set(tags)].slice(0, 10);
  }

  function scrapeCandidate() {
    return {
      name: findName(),
      email: findEmail(),
      phone: findPhone(),
      role: findRole(),
      stage: findStage(),
      tags: findTags(),
      tt_profile_url: window.location.href,
      tt_candidate_id: extractCandidateId(),
      gdpr_consent: true,
      notes: "",
    };
  }

  function extractCandidateId() {
    // Try to extract candidate ID from URL: /candidates/12345 or /candidates/abc-123
    const match = window.location.pathname.match(/candidates\/([^/]+)/);
    return match ? match[1] : "";
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrape") {
      const data = scrapeCandidate();
      sendResponse({ success: true, data });
    }
    return true; // Keep message channel open for async response
  });
})();
