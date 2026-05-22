const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const pageMetaEl = document.getElementById("pageMeta");
const apiBaseUrlInput = document.getElementById("apiBaseUrl");
const saveSettingsButton = document.getElementById("saveSettings");
const scanButton = document.getElementById("scanPage");

const setStatus = (message, tone = "default") => {
  statusEl.textContent = message;
  statusEl.style.color = tone === "error" ? "#fda4af" : tone === "success" ? "#bbf7d0" : "rgba(255,255,255,0.64)";
};

const setResult = (result) => {
  resultEl.classList.remove("hidden");
  resultEl.innerHTML = `
    <div class="score-card">
      <div class="label">Verdict</div>
      <div>${result.verdict}</div>
      <div class="small">Source: ${result.sourceMode}</div>
      <div class="small">Model: ${result.model?.name ?? "custom_rf_model"}</div>
    </div>
    <div class="score-card">
      <div class="label">AI risk score</div>
      <div class="score">${result.aiScore}</div>
    </div>
    <div class="score-card">
      <div class="label">Authenticity score</div>
      <div class="score">${result.authenticityScore}</div>
    </div>
    <div class="score-card">
      <div class="label">Reviews found</div>
      <div>${result.reviewCount ?? "N/A"}</div>
      <div class="small">${result.marketplaceHint.marketplace}${result.marketplaceHint.hostname ? ` • ${result.marketplaceHint.hostname}` : ""}</div>
    </div>
  `;
};

const getStoredApiBaseUrl = async () =>
  new Promise((resolve) => {
    chrome.storage.sync.get(["vertexshieldApiBaseUrl"], (items) => {
      resolve(items.vertexshieldApiBaseUrl || "http://localhost:3010");
    });
  });

const saveApiBaseUrl = async (value) =>
  new Promise((resolve) => {
    chrome.storage.sync.set({ vertexshieldApiBaseUrl: value }, resolve);
  });

const getActiveTab = async () =>
  new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0]));
  });

const sendMessageToTab = async (tabId, message) =>
  new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });

const analyzeReviews = async (apiBaseUrl, reviews, productUrl) => {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/quick-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reviews,
      productUrl,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Unable to analyze page");
  }

  return data;
};

const scrapePage = async (apiBaseUrl, url) => {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/scrape-page`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Unable to scrape page");
  }

  return data;
};

const init = async () => {
  apiBaseUrlInput.value = await getStoredApiBaseUrl();

  const tab = await getActiveTab();
  if (tab?.url) {
    pageMetaEl.textContent = tab.url;
  }
};

saveSettingsButton.addEventListener("click", async () => {
  const value = apiBaseUrlInput.value.trim() || "http://localhost:3010";
  await saveApiBaseUrl(value);
  setStatus("Saved API URL.", "success");
});

scanButton.addEventListener("click", async () => {
  try {
    setStatus("Scanning page...");
    resultEl.classList.add("hidden");

    const tab = await getActiveTab();
    if (!tab?.id) {
      throw new Error("No active tab found.");
    }

    const apiBaseUrl = apiBaseUrlInput.value.trim() || "http://localhost:3010";
    let pageData;
    try {
      pageData = await scrapePage(apiBaseUrl, tab.url || "");
    } catch (error) {
      const fallback = await sendMessageToTab(tab.id, { type: "SCAN_REVIEWS" });
      pageData = fallback;
    }

    const reviews = pageData?.reviews || [];
    pageMetaEl.textContent = `${pageData.pageTitle} • ${reviews.length} reviews detected`;

    if (reviews.length < 3) {
      throw new Error("Need at least 3 reviews on the page to run analysis.");
    }

    const result = await analyzeReviews(apiBaseUrl, reviews, pageData.pageUrl);
    setResult({ ...result, reviewCount: reviews.length });
    setStatus("Analysis complete.", "success");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to scan page.", "error");
  }
});

init().catch((error) => {
  setStatus(error instanceof Error ? error.message : "Unable to initialize extension.", "error");
});
