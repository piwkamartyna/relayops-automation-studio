const scenarios = {
  priority: {
    title: "Priority route completed",
    state: "success",
    icon: "✓",
    key: "evt_lead_8f21",
    duration: "1.8s",
    route: "Priority",
    score: 86,
    steps: [
      ["trigger", "Webhook authenticated · payload accepted", "ok"],
      ["validate", "Schema valid · consent confirmed", "ok"],
      ["enrich", "Company enriched · 240 employees", "ok"],
      ["condition", "Lead score 86 · priority route selected", "ok"],
      ["crm", "CRM contact and company upserted", "ok"],
      ["slack", "Priority alert delivered to sales", "ok"],
      ["task", "Owner task created · 30 min SLA", "ok"]
    ],
    output: { status: "completed", route: "priority", score: 86, actions: 3 }
  },
  nurture: {
    title: "Nurture route completed",
    state: "success",
    icon: "✓",
    key: "evt_lead_4c07",
    duration: "1.4s",
    route: "Nurture",
    score: 44,
    steps: [
      ["trigger", "Webhook authenticated · payload accepted", "ok"],
      ["validate", "Schema valid · consent confirmed", "ok"],
      ["enrich", "Company enriched · 8 employees", "ok"],
      ["condition", "Lead score 44 · nurture route selected", "ok"],
      ["crm-nurture", "CRM lifecycle set to nurture", "ok"],
      ["email", "Three-step email sequence enrolled", "ok"],
      ["log", "Decision reason and rule version logged", "ok"]
    ],
    output: { status: "completed", route: "nurture", score: 44, actions: 3 }
  },
  retry: {
    title: "API failure recovered",
    state: "recovered",
    icon: "↻",
    key: "evt_lead_b913",
    duration: "4.9s",
    route: "Priority",
    score: 78,
    steps: [
      ["trigger", "Webhook authenticated · payload accepted", "ok"],
      ["validate", "Schema valid · consent confirmed", "ok"],
      ["enrich", "Attempt 1 timed out · retrying in 1s", "warning"],
      ["enrich", "Attempt 2 succeeded · response cached", "ok"],
      ["condition", "Lead score 78 · priority route selected", "ok"],
      ["crm", "CRM contact and company upserted", "ok"],
      ["slack", "Priority alert delivered to sales", "ok"],
      ["task", "Owner task created · 30 min SLA", "ok"]
    ],
    output: { status: "recovered", route: "priority", retry_count: 1, actions: 3 }
  },
  duplicate: {
    title: "Duplicate safely skipped",
    state: "skipped",
    icon: "≠",
    key: "evt_lead_8f21",
    duration: "0.2s",
    route: "Duplicate",
    score: null,
    steps: [
      ["trigger", "Webhook authenticated · payload accepted", "ok"],
      ["validate", "Idempotency key already processed", "skip"]
    ],
    output: { status: "skipped", reason: "duplicate_event", previous_run: "run_1284" }
  }
};

const runButton = document.querySelector("#runSimulation");
const scenarioSelect = document.querySelector("#scenarioSelect");
const logList = document.querySelector("#logList");
const runTitle = document.querySelector("#runTitle");
const runId = document.querySelector("#runId");
const resultState = document.querySelector("#resultState");
const outputJson = document.querySelector("#outputJson");
const outputBox = document.querySelector("#outputBox");
const stepCounter = document.querySelector("#stepCounter");
const runCount = document.querySelector("#runCount");
const recoveredCount = document.querySelector("#recoveredCount");
const eventKey = document.querySelector("#eventKey");
const runsTable = document.querySelector("#runsTable");
let currentCount = 1284;
let currentScenario = scenarios.priority;
let running = false;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resetFlow() {
  document.querySelectorAll("[data-node]").forEach(node => {
    node.classList.remove("running", "complete", "failed", "skipped");
    const state = node.querySelector(".step-state");
    if (state) state.textContent = node.dataset.node === "trigger" ? "Ready" : "Waiting";
  });
  document.querySelectorAll("[data-branch]").forEach(branch => branch.classList.remove("active", "inactive"));
}

function setNodeState(id, state) {
  const node = document.querySelector(`[data-node="${id}"]`);
  if (!node) return;
  node.classList.remove("running", "complete", "failed", "skipped");
  node.classList.add(state);
  const label = node.querySelector(".step-state");
  if (label) label.textContent = state === "running" ? "Running" : state === "complete" ? "Complete" : state;
}

function setBranch(route) {
  document.querySelectorAll("[data-branch]").forEach(branch => {
    branch.classList.toggle("active", branch.dataset.branch === route);
    branch.classList.toggle("inactive", branch.dataset.branch !== route);
  });
}

function addLog(message, type) {
  const item = document.createElement("li");
  item.textContent = message;
  if (type === "warning") item.className = "warning";
  if (type === "skip") item.className = "skip";
  logList.appendChild(item);
}

async function runScenario() {
  if (running) return;
  running = true;
  runButton.disabled = true;
  runButton.lastChild.textContent = " Running";
  currentScenario = scenarios[scenarioSelect.value];
  resetFlow();
  logList.innerHTML = "";
  runTitle.textContent = "Processing event";
  runId.textContent = `RUN #${currentCount + 1}`;
  eventKey.textContent = currentScenario.key;
  resultState.className = "result-state";
  resultState.innerHTML = `<div class="result-icon"><svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18"/></svg></div><p>Validating the event and resolving the matching workflow path...</p>`;
  outputJson.textContent = JSON.stringify({ status: "running" }, null, 2);
  stepCounter.textContent = `0 / ${currentScenario.steps.length} steps`;

  let previousNode = null;
  for (let i = 0; i < currentScenario.steps.length; i += 1) {
    const [nodeId, message, type] = currentScenario.steps[i];
    if (previousNode && previousNode !== nodeId) setNodeState(previousNode, "complete");
    setNodeState(nodeId, "running");
    if (nodeId === "crm" || nodeId === "crm-nurture") setBranch(currentScenario.route === "Nurture" ? "nurture" : "priority");
    addLog(message, type);
    stepCounter.textContent = `${i + 1} / ${currentScenario.steps.length} steps`;
    await delay(type === "warning" ? 700 : 380);
    if (scenarioSelect.value === "duplicate" && nodeId === "validate") setNodeState(nodeId, "skipped");
    previousNode = nodeId;
  }
  if (previousNode && scenarioSelect.value !== "duplicate") setNodeState(previousNode, "complete");
  if (scenarioSelect.value === "duplicate") {
    document.querySelectorAll('[data-node="enrich"], [data-node="condition"]').forEach(node => node.classList.add("skipped"));
    document.querySelectorAll("[data-branch]").forEach(branch => branch.classList.add("inactive"));
  }

  currentCount += 1;
  runCount.textContent = currentCount.toLocaleString("en-US");
  if (currentScenario.state === "recovered") recoveredCount.textContent = "13";
  runTitle.textContent = currentScenario.title;
  resultState.className = `result-state ${currentScenario.state}`;
  resultState.innerHTML = `<div class="result-icon"><strong>${currentScenario.icon}</strong></div><p><strong>${currentScenario.route} route</strong><br>${currentScenario.steps[currentScenario.steps.length - 1][1]}. Completed in ${currentScenario.duration}.</p>`;
  outputJson.textContent = JSON.stringify(currentScenario.output, null, 2);
  const statusLabel = currentScenario.state === "recovered" ? "Recovered" : currentScenario.state === "skipped" ? "Skipped" : "Success";
  const statusClass = currentScenario.state === "recovered" ? "recovered" : currentScenario.state === "skipped" ? "skipped" : "success";
  const row = document.createElement("tr");
  row.innerHTML = `<td><code>#${currentCount}</code></td><td>lead.form_submitted</td><td>${currentScenario.route}</td><td><span class="table-status ${statusClass}">${statusLabel}</span></td><td>${currentScenario.duration}</td><td>just now</td>`;
  runsTable.prepend(row);
  if (runsTable.children.length > 5) runsTable.lastElementChild.remove();
  runButton.disabled = false;
  runButton.lastChild.textContent = " Run event";
  running = false;
}

runButton.addEventListener("click", runScenario);

document.querySelector("#copyEvent").addEventListener("click", async () => {
  const payload = JSON.stringify({
    event: "lead.form_submitted",
    idempotency_key: currentScenario.key,
    source: "marketing-site",
    company: "Synthetic Labs",
    score: currentScenario.score
  }, null, 2);
  await navigator.clipboard.writeText(payload).catch(() => {});
  const toast = document.querySelector("#toast");
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
});

const sections = [...document.querySelectorAll("section[id]")];
const navItems = [...document.querySelectorAll(".nav-item")];
const observer = new IntersectionObserver(entries => {
  const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!visible) return;
  navItems.forEach(item => item.classList.toggle("active", item.dataset.section === visible.target.id));
}, { rootMargin: "-20% 0px -60% 0px", threshold: [0.05, 0.25] });
sections.forEach(section => observer.observe(section));
