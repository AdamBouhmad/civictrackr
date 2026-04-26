import "./styles.css";

type Bill = {
  bill_id: string;
  title: string;
  date_created: string;
  congressional_session: string;
  bill_url: string;
};

type SearchResult = {
  title: string;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";
const SEARCH_PAGE_SIZE = 10;

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root not found");

app.innerHTML = `
  <div class="layout fade-in">
    <header class="hero stagger-1">
      <p class="eyebrow">CivicTracker</p>
      <h1>Know your representatives through policy, not headlines.</h1>
      <p class="lead">A clean civic workspace to scan active bills, search fast, and stay grounded in official records.</p>
      <p class="endpoint">API base: ${API_BASE}</p>
    </header>

    <section class="panel controls-panel stagger-2">
      <div>
        <h2>Live Bills</h2>
        <p class="panel-copy">Load the latest bills from your current backend feed.</p>
      </div>
      <form id="controls" class="controls">
        <label>
          Session
          <input id="session-input" type="text" value="119" maxlength="3" />
        </label>
        <label>
          Page Size
          <select id="limit-input">
            <option value="10">10</option>
            <option value="20" selected>20</option>
            <option value="30">30</option>
            <option value="50">50</option>
          </select>
        </label>
        <button type="submit">Load Bills</button>
      </form>
      <p id="status" class="status">Loading bills...</p>
      <div id="stats" class="stats-grid"></div>
      <div id="topics" class="topics"></div>
    </section>

    <section class="panel search-panel stagger-3">
      <div class="search-head">
        <div>
          <h2>Bill Search</h2>
          <p class="panel-copy">Searches your current backend endpoint, 10 results per page.</p>
        </div>
        <form id="search-form" class="search-controls">
          <input id="search-input" type="text" placeholder="Try: veterans, border, housing" />
          <button type="submit">Search</button>
        </form>
      </div>
      <p id="search-status" class="status">Type a term to search bill titles.</p>
      <div id="search-list" class="search-list"></div>
      <div class="pager">
        <button id="prev-page" type="button">Previous</button>
        <p id="pager-label">Page 1</p>
        <button id="next-page" type="button">Next</button>
      </div>
    </section>

    <section class="panel stagger-4">
      <h2>Bill Feed</h2>
      <div id="bill-list" class="bill-grid"></div>
    </section>
  </div>
`;

const controlsForm = document.querySelector<HTMLFormElement>("#controls");
const sessionInput = document.querySelector<HTMLInputElement>("#session-input");
const limitInput = document.querySelector<HTMLSelectElement>("#limit-input");
const searchForm = document.querySelector<HTMLFormElement>("#search-form");
const searchInput = document.querySelector<HTMLInputElement>("#search-input");
const searchStatusNode = document.querySelector<HTMLParagraphElement>("#search-status");
const searchListNode = document.querySelector<HTMLDivElement>("#search-list");
const prevPageButton = document.querySelector<HTMLButtonElement>("#prev-page");
const nextPageButton = document.querySelector<HTMLButtonElement>("#next-page");
const pagerLabel = document.querySelector<HTMLParagraphElement>("#pager-label");
const statusNode = document.querySelector<HTMLParagraphElement>("#status");
const statsNode = document.querySelector<HTMLDivElement>("#stats");
const topicsNode = document.querySelector<HTMLDivElement>("#topics");
const billListNode = document.querySelector<HTMLDivElement>("#bill-list");

if (
  !controlsForm ||
  !sessionInput ||
  !limitInput ||
  !searchForm ||
  !searchInput ||
  !searchStatusNode ||
  !searchListNode ||
  !prevPageButton ||
  !nextPageButton ||
  !pagerLabel ||
  !statusNode ||
  !statsNode ||
  !topicsNode ||
  !billListNode
) {
  throw new Error("UI nodes missing");
}

let searchOffset = 0;
let hasNextSearchPage = false;

const normalizeRow = (row: unknown): Bill | null => {
  if (Array.isArray(row) && row.length >= 5) {
    const [bill_id, title, date_created, congressional_session, bill_url] = row;
    return {
      bill_id: String(bill_id),
      title: String(title),
      date_created: String(date_created),
      congressional_session: String(congressional_session),
      bill_url: String(bill_url)
    };
  }

  if (row && typeof row === "object") {
    const obj = row as Record<string, unknown>;
    if (obj.bill_id && obj.title && obj.date_created && obj.congressional_session && obj.bill_url) {
      return {
        bill_id: String(obj.bill_id),
        title: String(obj.title),
        date_created: String(obj.date_created),
        congressional_session: String(obj.congressional_session),
        bill_url: String(obj.bill_url)
      };
    }
  }

  return null;
};

const normalizeSearchRow = (row: unknown): SearchResult | null => {
  if (Array.isArray(row) && row.length >= 1) {
    const [title] = row;
    return {
      title: String(title)
    };
  }

  if (row && typeof row === "object") {
    const obj = row as Record<string, unknown>;
    if (obj.title) {
      return {
        title: String(obj.title)
      };
    }
  }

  return null;
};

const billChamber = (id: string): "House" | "Senate" | "Unknown" => {
  const normalized = id.toLowerCase();
  if (normalized.startsWith("hr") || normalized.startsWith("hjres") || normalized.startsWith("hconres")) return "House";
  if (normalized.startsWith("s") || normalized.startsWith("sjres") || normalized.startsWith("sconres")) return "Senate";
  return "Unknown";
};

const topTerms = (bills: Bill[]): string[] => {
  const stop = new Set(["act", "of", "the", "and", "for", "to", "in", "a", "on", "with", "bill"]);
  const counts = new Map<string, number>();
  bills.forEach((b) => {
    b.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stop.has(w))
      .forEach((w) => counts.set(w, (counts.get(w) ?? 0) + 1));
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([term]) => term);
};

const renderStats = (bills: Bill[]): void => {
  const house = bills.filter((b) => billChamber(b.bill_id) === "House").length;
  const senate = bills.filter((b) => billChamber(b.bill_id) === "Senate").length;
  const latest = bills.map((b) => b.date_created).sort().reverse()[0] ?? "n/a";

  statsNode.innerHTML = `
    <article class="stat-card"><p>Loaded Bills</p><strong>${bills.length}</strong></article>
    <article class="stat-card"><p>House Bills</p><strong>${house}</strong></article>
    <article class="stat-card"><p>Senate Bills</p><strong>${senate}</strong></article>
    <article class="stat-card"><p>Most Recent Date</p><strong>${latest}</strong></article>
  `;

  const terms = topTerms(bills);
  topicsNode.innerHTML = terms.length
    ? terms.map((term) => `<span class="topic">${term}</span>`).join("")
    : "";
};

const renderBills = (bills: Bill[]): void => {
  billListNode.innerHTML = bills
    .map(
      (bill) => `
      <article class="bill-card">
        <div class="bill-head">
          <strong>${bill.bill_id}</strong>
          <span>${billChamber(bill.bill_id)}</span>
        </div>
        <h3>${bill.title}</h3>
        <p class="meta">Issued ${bill.date_created} · Session ${bill.congressional_session}</p>
        <a class="bill-link" href="${bill.bill_url}" target="_blank" rel="noreferrer">Open source record</a>
      </article>
    `
    )
    .join("");
};

const renderSearch = (items: SearchResult[]): void => {
  if (items.length === 0) {
    searchListNode.innerHTML = '<p class="search-empty">No title matches found for this query.</p>';
    return;
  }

  searchListNode.innerHTML = items
    .map(
      (item, index) => `
      <article class="search-item">
        <span>${searchOffset + index + 1}.</span>
        <p>${item.title}</p>
      </article>
    `
    )
    .join("");
};

const updatePager = (): void => {
  prevPageButton.disabled = searchOffset === 0;
  nextPageButton.disabled = !hasNextSearchPage;
  const page = Math.floor(searchOffset / SEARCH_PAGE_SIZE) + 1;
  pagerLabel.textContent = `Page ${page}`;
};

const loadSearch = async (): Promise<void> => {
  const query = searchInput.value.trim();
  if (!query) {
    searchStatusNode.textContent = "Type a term to search bill titles.";
    searchListNode.innerHTML = "";
    hasNextSearchPage = false;
    updatePager();
    return;
  }

  try {
    searchStatusNode.textContent = "Searching titles...";
    const params = new URLSearchParams({
      q: query,
      limit: String(SEARCH_PAGE_SIZE),
      offset: String(searchOffset)
    });

    const response = await fetch(`${API_BASE}/search/bills?${params.toString()}`);
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);

    const raw = (await response.json()) as unknown;
    if (!Array.isArray(raw)) throw new Error("Unexpected response shape");

    const items = raw
      .map((row) => normalizeSearchRow(row))
      .filter((row): row is SearchResult => row !== null);

    hasNextSearchPage = items.length === SEARCH_PAGE_SIZE;
    searchStatusNode.textContent = `Showing ${items.length} result${items.length === 1 ? "" : "s"} for "${query}"`;
    renderSearch(items);
    updatePager();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    searchStatusNode.textContent = `Search failed: ${message}`;
    searchListNode.innerHTML = "";
    hasNextSearchPage = false;
    updatePager();
  }
};

const loadBills = async (): Promise<void> => {
  try {
    const params = new URLSearchParams({
      congressional_session: sessionInput.value.trim() || "119",
      limit: limitInput.value
    });

    statusNode.textContent = "Loading bills...";
    const response = await fetch(`${API_BASE}/bills?${params.toString()}`);
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);

    const raw = (await response.json()) as unknown;
    if (!Array.isArray(raw)) throw new Error("Unexpected response shape");

    const bills = raw
      .map((row) => normalizeRow(row))
      .filter((row): row is Bill => row !== null);

    const query = searchInput.value.trim().toLowerCase();
    const filtered = query ? bills.filter((b) => b.title.toLowerCase().includes(query)) : bills;

    statusNode.textContent = `Showing ${filtered.length} of ${bills.length} bills`;
    renderStats(filtered);

    if (filtered.length === 0) {
      billListNode.innerHTML = "";
      return;
    }

    renderBills(filtered);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    statusNode.textContent = `Failed to load bills: ${message}`;
    statsNode.innerHTML = "";
    topicsNode.innerHTML = "";
    billListNode.innerHTML = "";
  }
};

controlsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void loadBills();
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchOffset = 0;
  void loadSearch();
});

prevPageButton.addEventListener("click", () => {
  if (searchOffset === 0) return;
  searchOffset -= SEARCH_PAGE_SIZE;
  void loadSearch();
});

nextPageButton.addEventListener("click", () => {
  if (!hasNextSearchPage) return;
  searchOffset += SEARCH_PAGE_SIZE;
  void loadSearch();
});

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim();
  if (!q) {
    searchOffset = 0;
    hasNextSearchPage = false;
    searchStatusNode.textContent = "Type a term to search bill titles.";
    searchListNode.innerHTML = "";
    updatePager();
  }
});

updatePager();
void loadBills();
