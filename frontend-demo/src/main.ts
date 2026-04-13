import "./styles.css";

type Bill = {
  bill_id: string;
  title: string;
  date_created: string;
  congressional_session: string;
  bill_url: string;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root not found");

app.innerHTML = `
  <div class="layout">
    <header class="hero">
      <p class="eyebrow">CivicTracker</p>
      <h1>What Congress is actually doing</h1>
      <p class="lead">Live bill feed from your backend with quick civic signals for demos.</p>

      <form id="controls" class="controls">
        <label>
          Session
          <input id="session-input" type="text" value="119" maxlength="3" />
        </label>
        <label>
          Limit
          <select id="limit-input">
            <option value="10">10</option>
            <option value="20" selected>20</option>
            <option value="30">30</option>
            <option value="50">50</option>
          </select>
        </label>
        <label class="search-wrap">
          Search title
          <input id="search-input" type="text" placeholder="health, veterans, budget..." />
        </label>
        <button type="submit">Refresh</button>
      </form>
      <p class="endpoint">Endpoint: ${API_BASE}/bills</p>
    </header>

    <section class="panel">
      <h2>Snapshot</h2>
      <p id="status" class="status">Loading bills...</p>
      <div id="stats" class="stats-grid"></div>
      <div id="topics" class="topics"></div>
    </section>

    <section class="panel">
      <h2>Bills</h2>
      <div id="bill-list" class="bill-grid"></div>
    </section>
  </div>
`;

const controlsForm = document.querySelector<HTMLFormElement>("#controls");
const sessionInput = document.querySelector<HTMLInputElement>("#session-input");
const limitInput = document.querySelector<HTMLSelectElement>("#limit-input");
const searchInput = document.querySelector<HTMLInputElement>("#search-input");
const statusNode = document.querySelector<HTMLParagraphElement>("#status");
const statsNode = document.querySelector<HTMLDivElement>("#stats");
const topicsNode = document.querySelector<HTMLDivElement>("#topics");
const billListNode = document.querySelector<HTMLDivElement>("#bill-list");

if (!controlsForm || !sessionInput || !limitInput || !searchInput || !statusNode || !statsNode || !topicsNode || !billListNode) {
  throw new Error("UI nodes missing");
}

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

const billChamber = (id: string): "House" | "Senate" | "Unknown" => {
  const normalized = id.toLowerCase();
  if (normalized.includes("hr") || normalized.includes("hjres") || normalized.includes("hconres")) return "House";
  if (normalized.includes("s") || normalized.includes("sjres") || normalized.includes("sconres")) return "Senate";
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

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void loadBills();
  }
});

void loadBills();
