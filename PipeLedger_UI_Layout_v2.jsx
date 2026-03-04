import { useState } from "react";

const PAGES = [
  "home", "pipelines", "data-review", "connectors", "schemas", "activity", "settings"
];

const PAGE_LABELS = {
  home: "Home",
  pipelines: "Pipelines",
  "data-review": "Data Review",
  connectors: "Connectors",
  schemas: "Schemas",
  activity: "Activity",
  settings: "Settings",
};

const PAGE_ICONS = {
  home: "⌂",
  pipelines: "▷",
  "data-review": "☑",
  connectors: "⚡",
  schemas: "◈",
  activity: "↗",
  settings: "⚙",
};

const Badge = ({ status, children }) => {
  const colors = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    error: "bg-red-50 text-red-700 border-red-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    neutral: "bg-gray-50 text-gray-600 border-gray-200",
    pending: "bg-orange-50 text-orange-700 border-orange-200",
    draft: "bg-gray-100 text-gray-500 border-gray-200",
    connected: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${colors[status] || colors.neutral}`}>
      {children}
    </span>
  );
};

const StatCard = ({ label, value, sublabel, color = "gray" }) => {
  const dotColors = {
    red: "bg-red-500", green: "bg-emerald-500", orange: "bg-orange-500", blue: "bg-blue-500", gray: "bg-gray-400",
  };
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-2">
        <div className={`w-2 h-2 rounded-full ${dotColors[color]}`} />
        <span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase truncate">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sublabel && <div className="text-xs text-gray-500 mt-0.5">{sublabel}</div>}
    </div>
  );
};

// ========== HOME PAGE ==========
const HomePage = () => (
  <div className="space-y-6">
    <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
      <div className="text-3xl mb-2">⚡</div>
      <h2 className="text-xl font-semibold text-gray-900">3 pipelines ready for review</h2>
      <p className="text-gray-500 mt-1">2.4M records processed today · Last sync 12 min ago</p>
      <div className="grid grid-cols-4 gap-3 mt-5">
        <StatCard label="Pending Review" value="3" sublabel="Input + output" color="orange" />
        <StatCard label="Records Today" value="2.4M" sublabel="Across 4 pipelines" color="blue" />
        <StatCard label="Freshness" value="12m" sublabel="Last ERP sync" color="green" />
        <StatCard label="Errors (24h)" value="0" sublabel="All systems healthy" color="green" />
      </div>
      <div className="flex gap-3 mt-5 justify-center">
        <button className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">Open Review Queue</button>
        <button className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50">View Pipelines</button>
        <button className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50">Manage Connectors</button>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Recent Pipeline Runs</h3>
        <div className="space-y-2.5">
          {[
            { name: "NetSuite GL → MCP Server", status: "success", records: "847K", time: "2m 14s", ago: "12 min ago" },
            { name: "Dynamics 365 GL → REST API", status: "pending", records: "1.2M", time: "—", ago: "Running..." },
            { name: "NetSuite GL → Parquet Export", status: "success", records: "847K", time: "1m 58s", ago: "2 hours ago" },
            { name: "NetSuite GL + Budget → MCP Server", status: "warning", records: "892K", time: "3m 02s", ago: "4 hours ago" },
          ].map((r, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.status === "success" ? "bg-emerald-500" : r.status === "pending" ? "bg-blue-500 animate-pulse" : "bg-amber-500"}`} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{r.name}</div>
                  <div className="text-xs text-gray-500">{r.records} records · {r.time}</div>
                </div>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{r.ago}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Connector Health</h3>
        <div className="space-y-2.5">
          {[
            { name: "NetSuite (Production)", status: "connected", lastSync: "12 min ago", records: "4.2M total" },
            { name: "Dynamics 365 (US Entity)", status: "connected", lastSync: "Running...", records: "2.8M total" },
            { name: "Pigment (FP&A Budget)", status: "connected", lastSync: "45 min ago", records: "48K total" },
            { name: "CSV Budget Upload", status: "connected", lastSync: "2 days ago", records: "12K total" },
            { name: "SAP S/4HANA (EU Entity)", status: "error", lastSync: "Token expired", records: "—" },
          ].map((c, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.status === "connected" ? "bg-emerald-500" : "bg-red-500"}`} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.records}</div>
                </div>
              </div>
              <span className={`text-xs flex-shrink-0 ml-2 ${c.status === "error" ? "text-red-500 font-medium" : "text-gray-400"}`}>{c.lastSync}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ========== PIPELINES PAGE ==========
const PipelinesPage = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Data Pipelines</h1>
        <p className="text-sm text-gray-500">Configure GL extraction, transformation, and delivery workflows</p>
      </div>
      <button className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">+ Create Pipeline</button>
    </div>

    <div className="grid grid-cols-4 gap-3">
      <StatCard label="Total Pipelines" value="5" color="gray" />
      <StatCard label="Active" value="4" color="green" />
      <StatCard label="Runs Today" value="11" color="blue" />
      <StatCard label="Records Processed" value="3.6M" color="blue" />
    </div>

    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Pipeline Name", "Source", "Delivery", "Schedule", "Last Run", "Status", "Records", ""].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { name: "NetSuite GL → MCP Server", desc: "Full GL enriched with dimensions and context for Claude / LLM consumption", source: "NetSuite", output: "MCP Server", schedule: "Daily 6AM", lastRun: "12 min ago", status: "success", records: "847K" },
            { name: "Dynamics 365 GL → REST API", desc: "Enriched GL with budget variance data served via authenticated API", source: "Dynamics 365", output: "REST API (JSON)", schedule: "Every 4 hours", lastRun: "Running...", status: "running", records: "1.2M" },
            { name: "NetSuite GL → Parquet Export", desc: "Columnar export of transformed GL for data science and ML workflows", source: "NetSuite", output: "Parquet (GCS)", schedule: "Weekly Mon", lastRun: "2 hours ago", status: "success", records: "847K" },
            { name: "NetSuite GL + Budget → MCP Server", desc: "GL actuals joined with Pigment budget data, variance context enriched", source: "NetSuite + Pigment", output: "MCP Server", schedule: "Daily 7AM", lastRun: "4 hours ago", status: "warning", records: "892K" },
            { name: "NetSuite GL → CSV Export", desc: "Flat CSV with enriched headers for legacy system integration and Excel users", source: "NetSuite", output: "CSV (GCS)", schedule: "Manual", lastRun: "3 days ago", status: "success", records: "847K" },
          ].map((p, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{p.name}</div>
                <div className="text-xs text-gray-500">{p.desc}</div>
              </td>
              <td className="px-4 py-3 text-gray-600">{p.source}</td>
              <td className="px-4 py-3 text-gray-600 text-xs">{p.output}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{p.schedule}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{p.lastRun}</td>
              <td className="px-4 py-3">
                <Badge status={p.status === "success" ? "success" : p.status === "running" ? "info" : "warning"}>
                  {p.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-gray-600 text-xs font-mono">{p.records}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">Configure</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ========== DATA REVIEW PAGE ==========
const DataReviewPage = () => {
  const [selectedEntry, setSelectedEntry] = useState(0);
  const entries = [
    { name: "NetSuite GL → MCP Server", type: "Output Review", age: "12m", records: "847,231", checkpoint: "output" },
    { name: "Dynamics 365 GL → REST API", type: "Input Review", age: "28m", records: "1,203,847", checkpoint: "input" },
    { name: "NetSuite GL → Parquet Export", type: "Output Review", age: "4h", records: "847,231", checkpoint: "output" },
  ];

  return (
    <div className="flex gap-0 -mx-6 -mt-6 h-[calc(100vh-120px)]">
      {/* Left panel - queue */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Review Queue</div>
          <select className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5">
            <option>Pending review (3)</option>
            <option>All checkpoints</option>
          </select>
        </div>
        <div className="overflow-y-auto flex-1">
          {entries.map((e, i) => (
            <div
              key={i}
              onClick={() => setSelectedEntry(i)}
              className={`px-4 py-3 border-b border-gray-100 cursor-pointer ${i === selectedEntry ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-gray-50 border-l-2 border-l-transparent"}`}
            >
              <div className="text-sm font-medium text-gray-900">{e.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge status={e.checkpoint === "input" ? "info" : "pending"}>{e.type}</Badge>
                <span className="text-xs text-gray-400">{e.age}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{e.records} records</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - review detail */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-4xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{entries[selectedEntry].name}</h2>
              <p className="text-sm text-gray-500">
                {entries[selectedEntry].type} · {entries[selectedEntry].records} records · Waiting {entries[selectedEntry].age}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white text-red-600 text-sm font-medium rounded-lg border border-red-200 hover:bg-red-50">Reject</button>
              <button className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">Approve & Deliver</button>
            </div>
          </div>

          {/* Quality checks */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Automated Quality Checks</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { check: "Balance decomposition verified", status: "pass", detail: "Opening balances stripped, period movements match source" },
                { check: "Dimension mapping complete", status: "pass", detail: "All 47 cost centers mapped to standard taxonomy" },
                { check: "Currency normalization applied", status: "pass", detail: "3 currencies converted to USD at period-end rates" },
                { check: "Record count reconciliation", status: "pass", detail: "847,231 records in = 847,231 records out" },
                { check: "Period alignment", status: "pass", detail: "All transactions mapped to fiscal calendar months" },
                { check: "Context enrichment applied", status: "pass", detail: "NL descriptions generated for all 847,231 records" },
                { check: "Row-level security applied", status: "pass", detail: "23 records redacted for current reviewer role (exec comp, M&A project codes)" },
                { check: "Sensitive field masking", status: "pass", detail: "Vendor bank details and SSN fields masked per security policy" },
              ].map((c, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50">
                  <span className={`text-sm mt-0.5 ${c.status === "pass" ? "text-emerald-500" : "text-amber-500"}`}>
                    {c.status === "pass" ? "✓" : "⚠"}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{c.check}</div>
                    <div className="text-xs text-gray-500">{c.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sample data preview */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Data Preview (first 7 records)</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Viewing as:</span>
                <select className="text-xs border border-gray-300 rounded px-2 py-1">
                  <option>Operator (standard access)</option>
                  <option>Approver (elevated access)</option>
                  <option>Owner (full access)</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    {["Period", "Account", "Department", "Class", "Amount (USD)", "Movement", "Context", "Access"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { cells: ["Jan 2026", "SaaS Subscription Revenue (4100)", "Sales > Enterprise", "SaaS > Annual", "$1,247,500", "+$124,500 (+11.1%)", "Recurring subscription revenue from enterprise annual contracts", ""], access: "open" },
                    { cells: ["Jan 2026", "Cloud Hosting (5200)", "Engineering > Infrastructure", "SaaS > Platform", "$342,100", "+$18,200 (+5.6%)", "AWS and GCP infrastructure costs for SaaS platform", ""], access: "open" },
                    { cells: ["Jan 2026", "████████", "████████", "████████", "████████", "████████", "████████", ""], access: "redacted" },
                    { cells: ["Jan 2026", "Marketing Programs (6300)", "Marketing > Demand Gen", "SaaS > Enterprise", "$189,400", "+$42,300 (+28.7%)", "Demand generation campaigns targeting enterprise segment", ""], access: "open" },
                    { cells: ["Jan 2026", "████████", "████████", "████████", "████████", "████████", "████████", ""], access: "redacted" },
                    { cells: ["Jan 2026", "Professional Services Revenue (4200)", "Services > Consulting", "Prof. Services", "$285,000", "-$15,000 (-5.0%)", "Consulting engagement revenue, recognized on completion", ""], access: "open" },
                    { cells: ["Jan 2026", "████████", "████████", "████████", "████████", "████████", "████████", ""], access: "redacted" },
                  ].map((row, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      {row.cells.map((cell, j) => (
                        <td key={j} className={`px-3 py-2 whitespace-nowrap ${row.access === "redacted" ? "text-gray-300 bg-gray-50" : "text-gray-700"}`}>
                          {cell}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        {row.access === "redacted" ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-red-50 text-red-600 rounded border border-red-200">
                            🔒 Restricted
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Open</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span className="text-amber-600">⚠</span>
              <span>3 of 847,231 records are redacted for your current role. <button className="text-amber-700 font-medium underline">Request elevated access</button> to view restricted data.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== CONNECTORS PAGE ==========
const ConnectorsPage = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900">ERP & Data Connectors</h1>
        <p className="text-sm text-gray-500">Manage GL data sources and FP&A budget integrations</p>
      </div>
      <button className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">+ Add Connector</button>
    </div>

    <div className="grid grid-cols-4 gap-3">
      <StatCard label="Total Connectors" value="5" color="gray" />
      <StatCard label="Connected" value="4" color="green" />
      <StatCard label="Syncs Today" value="18" color="blue" />
      <StatCard label="Errors" value="1" color="red" />
    </div>

    {/* Connected — ERP */}
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">ERP Connectors</h2>
      {[
        { name: "NetSuite (Production)", type: "SuiteQL API", status: "connected", synced: "12 min ago", tables: "GL Transactions, Chart of Accounts, Departments, Classes, Locations, Projects, Custom Segments", records: "4.2M" },
        { name: "Dynamics 365 (US Entity)", type: "OData API", status: "connected", synced: "28 min ago", tables: "GL Transactions, Chart of Accounts, Departments, Cost Centers, Financial Dimensions", records: "2.8M" },
      ].map((c, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-400">
                {c.name.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{c.name}</div>
                <div className="text-sm text-gray-500">{c.type}</div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Connected</span>
                  <span>Last synced: {c.synced}</span>
                  <span>{c.records} records</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">Extracts: {c.tables}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Test</button>
              <button className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Sync Now</button>
              <button className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Configure</button>
            </div>
          </div>
        </div>
      ))}

      {/* Error state */}
      <div className="bg-white rounded-xl border border-red-200 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-lg font-bold text-red-400">S</div>
            <div>
              <div className="font-semibold text-gray-900">SAP S/4HANA (EU Entity)</div>
              <div className="text-sm text-gray-500">RFC/BAPI</div>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1 text-red-600"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Token expired</span>
                <span className="text-gray-500">Last synced: 3 days ago</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">Extracts: GL Transactions, Chart of Accounts, Profit Centers, Cost Centers</div>
            </div>
          </div>
          <button className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50">Reconnect</button>
        </div>
      </div>
    </div>

    {/* Connected — FP&A & Budget */}
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">FP&A / Budget Sources</h2>
      {[
        { name: "Pigment (Annual Budget FY2026)", type: "REST API", synced: "45 min ago", tables: "Budget by Account, Department, Class, Period · Forecast v3 · Scenario Models (Base, Upside, Downside)", records: "48K" },
        { name: "CSV Budget Upload (Q1 Re-forecast)", type: "Manual Upload", synced: "2 days ago", tables: "Budget by Account, Department, Period · Re-forecast amounts", records: "12K" },
      ].map((c, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-lg font-bold text-blue-400">
                {c.name.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{c.name}</div>
                <div className="text-sm text-gray-500">{c.type}</div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Connected</span>
                  <span>Last synced: {c.synced}</span>
                  <span>{c.records} records</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">Data: {c.tables}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Configure</button>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Available connectors */}
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Available Connectors</h2>
      <div className="grid grid-cols-2 gap-3">
        {[
          { name: "SAP S/4HANA", desc: "Extract GL transactions, Chart of Accounts, profit centers, and financial dimensions via RFC/BAPI" },
          { name: "Oracle Cloud Financials", desc: "Connect via REST API for GL, CoA, and dimensional data extraction" },
          { name: "QuickBooks Online", desc: "Extract chart of accounts, GL transactions, and class tracking data" },
          { name: "Xero", desc: "Extract GL, CoA, and tracking categories via Xero API" },
          { name: "Sage Intacct", desc: "Connect via REST API for multi-entity GL and dimensional data" },
          { name: "Adaptive Planning", desc: "Import budget and forecast data with dimensional alignment to GL" },
          { name: "Anaplan", desc: "Connect budget models and scenario planning data for variance analysis" },
          { name: "CSV / Excel Upload", desc: "Upload GL exports, trial balances, budget files, and chart of accounts" },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{c.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{c.desc}</div>
            </div>
            <button className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex-shrink-0 ml-4">Connect</button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ========== SCHEMAS PAGE ==========
const SchemasPage = () => {
  const [schemasTab, setSchemasTab] = useState("transformations");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Schemas & Mappings</h1>
          <p className="text-sm text-gray-500">Configure transformation rules, review account mappings, and manage dimension labels</p>
        </div>
      </div>

      <div className="flex gap-6 border-b border-gray-200">
        {[
          { id: "transformations", label: "Core Transformations" },
          { id: "taxonomy", label: "Account Taxonomy Mapping" },
          { id: "dimensions", label: "Dimension Management" },
          { id: "budget", label: "Budget Dimension Mapping" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSchemasTab(t.id)}
            className={`pb-3 text-sm font-medium ${schemasTab === t.id ? "border-b-2 border-gray-900 text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {schemasTab === "transformations" && (
        <div className="space-y-3">
          {[
            {
              name: "Balance Decomposition — Period Movements",
              tags: ["CORE", "AUTOMATED"],
              severity: "CRITICAL",
              desc: "Strips opening and closing balances from GL exports, isolating period-over-period movements. Required for all pipeline outputs. Runs automatically — no customer configuration needed.",
              badges: ["All ERPs"],
              version: "v3",
              created: "1/10/2026",
              owner: "PipeLedger",
            },
            {
              name: "Account Taxonomy Normalization",
              tags: ["CORE", "CUSTOMER QA"],
              severity: "CRITICAL",
              desc: "Maps company-specific Chart of Accounts to standard US GAAP / IFRS hierarchy. Auto-suggested by PipeLedger, reviewed and approved by customer via the Account Taxonomy Mapping tab.",
              badges: ["All ERPs"],
              version: "v2",
              created: "1/12/2026",
              owner: "Customer QA",
            },
            {
              name: "Dimension Denormalization & Labeling",
              tags: ["CORE", "CUSTOMER QA"],
              severity: "CRITICAL",
              desc: "Resolves hierarchical dimension codes into flat labeled paths on every GL record. Auto-generated labels reviewed and overridden by customer via the Dimension Management tab.",
              badges: ["All ERPs"],
              version: "v2",
              created: "1/15/2026",
              owner: "Customer QA",
            },
            {
              name: "Multi-Currency Standardization",
              tags: ["CORE", "AUTOMATED"],
              severity: "CRITICAL",
              desc: "Converts all transactions to reporting currency using period-end or average rates. Tags functional vs. reporting currency and FX rate used. Runs automatically.",
              badges: ["All ERPs"],
              version: "v2",
              created: "1/8/2026",
              owner: "PipeLedger",
            },
            {
              name: "Period Alignment",
              tags: ["CORE", "AUTOMATED"],
              severity: "WARNING",
              desc: "Maps all GL transactions to normalized fiscal/calendar periods. Handles 4-4-5, non-December year-end, and custom fiscal calendars. Auto-detected from ERP config.",
              badges: ["All ERPs"],
              version: "v1",
              created: "1/20/2026",
              owner: "PipeLedger",
            },
            {
              name: "Context Enrichment",
              tags: ["CORE", "AUTOMATED"],
              severity: "INFO",
              desc: "Generates natural language descriptions for every GL record using approved taxonomy mappings, dimension labels, and parsed company documents. The primary transformation that makes data LLM-ready.",
              badges: ["All ERPs"],
              version: "v2",
              created: "1/22/2026",
              owner: "PipeLedger",
            },
            {
              name: "Row-Level Security Tagging",
              tags: ["SECURITY", "CUSTOMER CONFIG"],
              severity: "CRITICAL",
              desc: "Tags GL records with security classifications based on customer-defined rules (account ranges, dimension values, project codes). Enforced at query time in BigQuery via row-level access policies.",
              badges: ["All ERPs", "All Outputs"],
              version: "v1",
              created: "2/10/2026",
              owner: "Customer Config",
            },
            {
              name: "Budget vs. Actual Integration",
              tags: ["FP&A", "CUSTOMER CONFIG"],
              severity: "INFO",
              desc: "Joins FP&A budget data to GL actuals by aligned dimensions. Computes variance amount, percentage, favorability, and run-rate projection. Requires budget dimension mapping.",
              badges: ["All ERPs", "Pigment", "Adaptive", "CSV"],
              version: "v1",
              created: "2/15/2026",
              owner: "Customer Config",
            },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{s.name}</span>
                    {s.tags.map(t => (
                      <span key={t} className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                        t === "AUTOMATED" ? "bg-emerald-50 text-emerald-700" :
                        t === "CUSTOMER QA" ? "bg-amber-50 text-amber-700" :
                        t === "CUSTOMER CONFIG" ? "bg-blue-50 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{t}</span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-1.5">{s.desc}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {s.badges.map(b => (
                      <span key={b} className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-600 rounded-full border border-blue-100">{b}</span>
                    ))}
                    <span className="text-xs text-gray-400 ml-2">{s.version} · {s.owner} · Created {s.created}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 ml-4">
                  {s.owner !== "PipeLedger" && <button className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Configure</button>}
                  <button className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg">View Details</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {schemasTab === "taxonomy" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Account Taxonomy Mapping — Your QA Workspace</p>
            <p>PipeLedger auto-suggests mappings from your Chart of Accounts to the standard US GAAP / IFRS taxonomy. Review each mapping below, correct any suggestions, and approve to lock the version. Changes require a new version with a review trail.</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <select className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"><option>NetSuite (Production)</option><option>Dynamics 365 (US Entity)</option></select>
              <select className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"><option>Show all accounts (247)</option><option>Show unmapped only (3)</option><option>Show low confidence (&lt;80%)</option></select>
            </div>
            <div className="flex gap-2">
              <Badge status="success">244 mapped</Badge>
              <Badge status="warning">3 unmapped</Badge>
              <button className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg">Approve Version v3</button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-16">Acct #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Your Account Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-10">→</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Standard Taxonomy Mapping</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-20">Conf.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { num: "4100", name: "SaaS Subscription Revenue", type: "Income", mapping: "Revenue > Recurring Revenue > Subscription", conf: "98%", status: "approved", confColor: "text-emerald-600" },
                  { num: "4200", name: "Professional Services Revenue", type: "Income", mapping: "Revenue > Service Revenue > Consulting", conf: "95%", status: "approved", confColor: "text-emerald-600" },
                  { num: "5100", name: "Cost of Revenue - Hosting", type: "COGS", mapping: "Cost of Revenue > Infrastructure > Cloud Computing", conf: "92%", status: "approved", confColor: "text-emerald-600" },
                  { num: "5200", name: "R&D Software Costs", type: "COGS", mapping: "Cost of Revenue > Technology > Capitalized Software", conf: "74%", status: "review", confColor: "text-amber-600" },
                  { num: "6100", name: "Salaries & Wages", type: "Expense", mapping: "Operating Expenses > Personnel > Compensation", conf: "97%", status: "approved", confColor: "text-emerald-600" },
                  { num: "6110", name: "Executive Compensation", type: "Expense", mapping: "Operating Expenses > Personnel > Executive Comp", conf: "96%", status: "approved", confColor: "text-emerald-600" },
                  { num: "6300", name: "Marketing Programs", type: "Expense", mapping: "Operating Expenses > Sales & Marketing > Programs", conf: "91%", status: "approved", confColor: "text-emerald-600" },
                  { num: "6800", name: "Miscellaneous Expense", type: "Expense", mapping: "", conf: "—", status: "unmapped", confColor: "text-gray-400" },
                  { num: "7100", name: "Depreciation", type: "Expense", mapping: "Operating Expenses > D&A > Depreciation", conf: "99%", status: "approved", confColor: "text-emerald-600" },
                  { num: "8100", name: "Interest Income", type: "Other Income", mapping: "Other Income > Interest > Bank Interest", conf: "94%", status: "approved", confColor: "text-emerald-600" },
                ].map((row, i) => (
                  <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${row.status === "unmapped" ? "bg-amber-50" : row.status === "review" ? "bg-blue-50" : ""}`}>
                    <td className="px-4 py-2.5 font-mono text-gray-500 text-xs">{row.num}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{row.type}</td>
                    <td className="px-4 py-2.5 text-center text-gray-300">→</td>
                    <td className="px-4 py-2.5 text-gray-700">{row.mapping || <span className="text-amber-600 italic">Click to map...</span>}</td>
                    <td className={`px-4 py-2.5 text-center font-semibold text-xs ${row.confColor}`}>{row.conf}</td>
                    <td className="px-4 py-2.5">
                      <Badge status={row.status === "approved" ? "success" : row.status === "review" ? "info" : "warning"}>
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {schemasTab === "dimensions" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Dimension Management — Your QA Workspace</p>
            <p>PipeLedger auto-generates hierarchy label paths from your ERP dimension structure. Review and override labels below to control exactly what the LLM sees. Every GL record will carry these labels as flat, self-describing attributes.</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <select className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"><option>NetSuite (Production)</option></select>
              <select className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"><option>Department (47 values)</option><option>Class (23 values)</option><option>Location (8 values)</option><option>Project (34 values)</option><option>Product Line (6 values)</option></select>
            </div>
            <button className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg">Save Labels</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Hierarchy tree */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Department Hierarchy</h3>
              <div className="space-y-1 text-sm font-mono">
                <div className="text-gray-900 font-semibold">▼ 100 — Engineering</div>
                <div className="ml-5 text-gray-700 py-0.5 px-2 rounded hover:bg-gray-50 cursor-pointer">110 — Backend Infrastructure</div>
                <div className="ml-5 text-gray-700 py-0.5 px-2 rounded hover:bg-gray-50 cursor-pointer">120 — Frontend & Mobile</div>
                <div className="ml-5 text-gray-700 py-0.5 px-2 rounded hover:bg-gray-50 cursor-pointer">130 — Data Engineering</div>
                <div className="ml-5 text-gray-700 py-0.5 px-2 rounded bg-blue-50 border border-blue-200 cursor-pointer">140 — Platform & DevOps</div>
                <div className="text-gray-900 font-semibold mt-2">▼ 200 — Sales</div>
                <div className="ml-5 text-gray-700 py-0.5 px-2 rounded hover:bg-gray-50 cursor-pointer">210 — Enterprise Sales</div>
                <div className="ml-5 text-gray-700 py-0.5 px-2 rounded hover:bg-gray-50 cursor-pointer">220 — Mid-Market Sales</div>
                <div className="ml-5 text-gray-700 py-0.5 px-2 rounded hover:bg-gray-50 cursor-pointer">230 — Sales Engineering</div>
                <div className="text-gray-900 font-semibold mt-2">▼ 300 — Revenue Operations</div>
                <div className="ml-5 text-gray-700 py-0.5 px-2 rounded hover:bg-gray-50 cursor-pointer">310 — Deal Desk</div>
                <div className="ml-5 text-gray-700 py-0.5 px-2 rounded hover:bg-gray-50 cursor-pointer">320 — Sales Enablement</div>
                <div className="text-gray-900 font-semibold mt-2">▶ 400 — Marketing (6 sub-depts)</div>
                <div className="text-gray-900 font-semibold mt-2">▶ 500 — G&A (5 sub-depts)</div>
                <div className="text-gray-900 font-semibold mt-2">▶ 600 — Customer Success (4 sub-depts)</div>
              </div>
            </div>

            {/* Label editor */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Edit Label — Dept 140</h3>
              <p className="text-xs text-gray-500 mb-4">This label will appear on every GL record tagged with Department 140</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">ERP Code</label>
                  <div className="mt-1 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-500 font-mono">140</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">ERP Name (from NetSuite)</label>
                  <div className="mt-1 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-500">Platform & DevOps</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Auto-Generated Label Path</label>
                  <div className="mt-1 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-500">Engineering → Platform & DevOps</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Your Override Label <span className="text-gray-400">(optional)</span></label>
                  <input className="mt-1 w-full border border-blue-300 rounded-lg px-3 py-2 text-sm bg-blue-50" defaultValue="Engineering → Platform Infrastructure & DevOps" />
                  <p className="text-xs text-gray-400 mt-1">The LLM will see this label instead of the auto-generated one</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Description for LLM Context <span className="text-gray-400">(optional)</span></label>
                  <textarea className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-16" placeholder="e.g., Responsible for cloud infrastructure, CI/CD pipelines, and developer tooling. Reports to VP Engineering." />
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs font-medium text-gray-600 mb-1">Preview — How this GL record will look:</div>
                <div className="text-xs text-gray-700 font-mono bg-white rounded p-2 border border-gray-200">
                  <span className="text-gray-400">department:</span> "Engineering → Platform Infrastructure & DevOps"<br/>
                  <span className="text-gray-400">department_code:</span> "140"<br/>
                  <span className="text-gray-400">department_context:</span> "Cloud infrastructure, CI/CD pipelines, and developer tooling. Reports to VP Engineering."
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {schemasTab === "budget" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Budget Dimension Mapping</p>
            <p>Align your FP&A system's dimension names with your GL dimensions. FP&A systems often use different names for the same things ("Marketing" vs "400 — Marketing"). Map them here so PipeLedger can join budget to actuals correctly.</p>
          </div>

          <div className="flex gap-2">
            <select className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"><option>Pigment (Annual Budget FY2026)</option><option>CSV Budget Upload (Q1 Re-forecast)</option></select>
            <select className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"><option>Department Mapping</option><option>Account Mapping</option><option>Class Mapping</option></select>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">FP&A Dimension (Pigment)</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-10">→</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">GL Dimension (NetSuite)</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-20">Conf.</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { fpa: "Engineering", gl: "100 — Engineering", conf: "99%", status: "approved" },
                  { fpa: "Sales", gl: "200 — Sales", conf: "99%", status: "approved" },
                  { fpa: "Revenue Ops", gl: "300 — Revenue Operations", conf: "87%", status: "approved" },
                  { fpa: "Marketing", gl: "400 — Marketing", conf: "99%", status: "approved" },
                  { fpa: "G&A", gl: "500 — General & Administrative", conf: "93%", status: "approved" },
                  { fpa: "CX", gl: "600 — Customer Success", conf: "72%", status: "review" },
                  { fpa: "New Product Team", gl: "", conf: "—", status: "unmapped" },
                ].map((row, i) => (
                  <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${row.status === "unmapped" ? "bg-amber-50" : row.status === "review" ? "bg-blue-50" : ""}`}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{row.fpa}</td>
                    <td className="px-4 py-2.5 text-center text-gray-300">→</td>
                    <td className="px-4 py-2.5 text-gray-700">{row.gl || <span className="text-amber-600 italic">Click to map...</span>}</td>
                    <td className={`px-4 py-2.5 text-center font-semibold text-xs ${row.conf === "—" ? "text-gray-400" : parseInt(row.conf) >= 90 ? "text-emerald-600" : "text-amber-600"}`}>{row.conf}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge status={row.status === "approved" ? "success" : row.status === "review" ? "info" : "warning"}>
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ========== ACTIVITY PAGE ==========
const ActivityPage = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Activity</h1>
        <p className="text-sm text-gray-500">Pipeline execution history, data deliveries, and audit trail</p>
      </div>
      <button className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50">Export Audit Log</button>
    </div>

    <div className="flex gap-3">
      <select className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"><option>All Status</option></select>
      <select className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"><option>All Pipelines</option></select>
      <select className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"><option>All Connectors</option></select>
    </div>

    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Timestamp", "Pipeline", "Event", "Status", "Records", "Duration", "User", "Details"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { time: "Feb 26, 10:14 AM", pipeline: "GL → MCP Server", event: "Output delivered", status: "success", records: "847K", dur: "—", user: "System", detail: "MCP endpoint" },
            { time: "Feb 26, 10:12 AM", pipeline: "GL → MCP Server", event: "Output approved", status: "success", records: "847K", dur: "—", user: "Alexander R.", detail: "Approved" },
            { time: "Feb 26, 10:00 AM", pipeline: "GL → MCP Server", event: "Transform complete", status: "success", records: "847K", dur: "2m 14s", user: "System", detail: "8 transforms" },
            { time: "Feb 26, 9:58 AM", pipeline: "GL → MCP Server", event: "Input approved", status: "success", records: "847K", dur: "—", user: "Alexander R.", detail: "Approved" },
            { time: "Feb 26, 9:45 AM", pipeline: "GL → MCP Server", event: "Extraction complete", status: "success", records: "847K", dur: "45s", user: "System", detail: "NetSuite SuiteQL" },
            { time: "Feb 26, 9:44 AM", pipeline: "GL → REST API", event: "Pipeline started", status: "info", records: "—", dur: "—", user: "Schedule", detail: "Auto-trigger (4h)" },
            { time: "Feb 26, 6:02 AM", pipeline: "GL + Budget → MCP", event: "Transform warning", status: "warning", records: "892K", dur: "3m 02s", user: "System", detail: "3 unmapped budget dims" },
            { time: "Feb 26, 4:00 AM", pipeline: "GL → Parquet Export", event: "Output delivered", status: "success", records: "847K", dur: "—", user: "System", detail: "GCS bucket" },
            { time: "Feb 25, 6:00 PM", pipeline: "SAP EU", event: "Connection failed", status: "error", records: "—", dur: "—", user: "System", detail: "Token expired" },
            { time: "Feb 25, 2:00 PM", pipeline: "All", event: "Taxonomy mapping updated", status: "info", records: "—", dur: "—", user: "Sarah Chen", detail: "v2 → v3 (3 accounts remapped)" },
            { time: "Feb 25, 11:00 AM", pipeline: "GL → MCP Server", event: "Delivery revoked", status: "error", records: "847K", dur: "—", user: "Alexander R.", detail: "Incorrect period extracted" },
          ].map((a, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{a.time}</td>
              <td className="px-4 py-3 font-medium text-gray-900 text-xs">{a.pipeline}</td>
              <td className="px-4 py-3 text-gray-700 text-xs">{a.event}</td>
              <td className="px-4 py-3"><Badge status={a.status}>{a.status}</Badge></td>
              <td className="px-4 py-3 text-gray-500 text-xs font-mono">{a.records}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{a.dur}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{a.user}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{a.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ========== SETTINGS PAGE ==========
const SettingsPage = () => {
  const [settingsTab, setSettingsTab] = useState("organization");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Configure your organization, delivery endpoints, documents, and integrations</p>
      </div>

      <div className="flex gap-6 border-b border-gray-200">
        {["organization", "users", "delivery", "documents", "integrations", "audit", "billing"].map(t => (
          <button
            key={t}
            onClick={() => setSettingsTab(t)}
            className={`pb-3 text-sm font-medium capitalize ${settingsTab === t ? "border-b-2 border-gray-900 text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t === "delivery" ? "Delivery Endpoints" : t === "audit" ? "Audit & Controls" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {settingsTab === "organization" && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Organization Details</h3>
            <div className="space-y-3">
              <div><label className="text-sm text-gray-600">Organization Name</label><input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" defaultValue="Vortex Corp" /></div>
              <div><label className="text-sm text-gray-600">Industry</label>
                <select className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option>SaaS / Technology</option><option>Manufacturing</option><option>Professional Services</option><option>Financial Services</option></select>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Default Output Configuration</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm text-gray-600">Reporting Currency</label><input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" defaultValue="USD" /></div>
              <div><label className="text-sm text-gray-600">Fiscal Year End</label><input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" defaultValue="December" /></div>
              <div><label className="text-sm text-gray-600">Accounting Standard</label>
                <select className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option>US GAAP</option><option>IFRS</option><option>Local GAAP</option></select>
              </div>
              <div><label className="text-sm text-gray-600">Default Delivery Format</label>
                <select className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option>MCP Server</option><option>JSON / JSONL</option><option>Parquet</option><option>CSV</option></select>
              </div>
            </div>
          </div>
        </div>
      )}

      {settingsTab === "users" && (
        <div className="max-w-3xl">
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Invite Team Member</h3>
            <div className="flex gap-3">
              <input className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="user@example.com" />
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm"><option>Operator</option><option>Viewer</option><option>Approver</option><option>Admin</option></select>
              <button className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg">Send Invite</button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Roles: Viewer (read-only), Operator (run pipelines), Approver (approve/reject deliveries), Admin (configure schemas & settings), Owner (full access)</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                {["Name", "Email", "Role", "Joined"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody>
                {[
                  ["Alexander R.", "alexander@capitani.io", "Owner", "1/10/2026"],
                  ["Sarah Chen", "sarah@vortexcorp.com", "Approver", "1/15/2026"],
                  ["Mike Johnson", "mike@vortexcorp.com", "Operator", "1/20/2026"],
                  ["Data Pipeline (Service)", "api@pipeledger.ai", "Operator", "1/10/2026"],
                ].map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {row.map((cell, j) => <td key={j} className="px-4 py-3 text-gray-700">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {settingsTab === "delivery" && (
        <div className="space-y-4 max-w-3xl">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">MCP Server</h3>
              <Badge status="connected">Active</Badge>
            </div>
            <p className="text-sm text-gray-500 mb-3">Native LLM integration via Model Context Protocol. Claude and other AI tools can query your financial data directly with row-level security enforced.</p>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-700">
              Endpoint: https://mcp.pipeledger.ai/org/vortex-corp
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">REST API</h3>
              <Badge status="connected">Active</Badge>
            </div>
            <p className="text-sm text-gray-500 mb-3">Query transformed financial data via authenticated REST API. Returns JSON/JSONL with full dimension context and NL descriptions.</p>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-700">
              Base URL: https://api.pipeledger.ai/v1/org/vortex-corp
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">File Export (Google Cloud Storage)</h3>
              <Badge status="connected">Active</Badge>
            </div>
            <p className="text-sm text-gray-500 mb-3">Auto-deliver Parquet or CSV files to your GCS bucket after each approved pipeline run.</p>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-700">
              Bucket: gs://vortex-corp-pipeledger/exports/
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">RAG Vector Store</h3>
              <Badge status="neutral">Not configured</Badge>
            </div>
            <p className="text-sm text-gray-500 mb-3">Export financial data as chunked narrative with structured metadata for vector search and RAG applications.</p>
            <button className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg">Configure</button>
          </div>
        </div>
      )}

      {settingsTab === "documents" && (
        <div className="space-y-4 max-w-3xl">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Company Documents for Context Enrichment</p>
            <p>Upload company policies, accounting procedures, and organizational documents. These are parsed and used during the context enrichment transformation to add company-specific meaning to your GL records. This is optional but dramatically improves LLM comprehension.</p>
          </div>

          <div className="space-y-3">
            {[
              { name: "Vortex Corp - Company Overview & Strategy FY2026.pdf", type: "Company Overview & Strategy", status: "active", parsed: "Feb 20, 2026", pages: 24, snippets: 47 },
              { name: "Chart of Accounts Guide v3.pdf", type: "Accounting & Finance Procedures", status: "active", parsed: "Feb 15, 2026", pages: 12, snippets: 31 },
              { name: "Expense Policy - Updated Jan 2026.pdf", type: "Company Overview & Strategy", status: "active", parsed: "Jan 28, 2026", pages: 8, snippets: 18 },
              { name: "Org Chart & Department Descriptions.pdf", type: "Organizational Context", status: "active", parsed: "Feb 10, 2026", pages: 6, snippets: 22 },
              { name: "R&D Capitalization Policy.pdf", type: "Accounting & Finance Procedures", status: "inactive", parsed: "Jan 15, 2026", pages: 4, snippets: 9 },
            ].map((doc, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-sm font-bold text-red-400">PDF</div>
                    <div>
                      <div className="font-medium text-gray-900">{doc.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{doc.type} · {doc.pages} pages · {doc.snippets} context snippets extracted</div>
                      <div className="text-xs text-gray-400 mt-0.5">Parsed: {doc.parsed}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={doc.status === "active" ? "success" : "neutral"}>{doc.status}</Badge>
                    <button className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg">Preview Snippets</button>
                    <button className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg">{doc.status === "active" ? "Deactivate" : "Activate"}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
            <div className="text-3xl mb-2">📄</div>
            <p className="text-sm font-medium text-gray-700">Drop PDF or PPTX files here to upload</p>
            <p className="text-xs text-gray-500 mt-1">Company overview, accounting procedures, org charts, financial guidelines</p>
            <button className="mt-3 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg">Browse Files</button>
          </div>
        </div>
      )}

      {settingsTab === "integrations" && (
        <div className="space-y-4 max-w-3xl">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Connected</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-lg">📊</div>
                  <div>
                    <div className="font-semibold text-gray-900">Pigment</div>
                    <div className="text-sm text-gray-500">FP&A / Budgeting Platform</div>
                    <div className="text-xs text-gray-400 mt-1">Syncs budget and forecast data by account, department, class, period. Used in Budget vs. Actual transformation.</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status="connected">Connected</Badge>
                  <button className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg">Configure</button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Available</h2>
            {[
              { name: "Adaptive Planning", icon: "📊", desc: "Connect budget and forecast models from Adaptive Planning for variance analysis", status: "Connect" },
              { name: "Anaplan", icon: "📊", desc: "Import Anaplan planning models and scenario data for budget integration", status: "Connect" },
              { name: "Notion", icon: "📝", desc: "Connect your Notion workspace for strategic context enrichment — OKRs, project docs, decision logs", status: "Coming Soon", disabled: true },
            ].map((int, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-lg">{int.icon}</div>
                    <div>
                      <div className="font-semibold text-gray-900">{int.name}</div>
                      <div className="text-sm text-gray-500">{int.desc}</div>
                    </div>
                  </div>
                  <button className={`px-3 py-1.5 text-xs font-medium rounded-lg ${int.disabled ? "text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed" : "text-gray-600 bg-white border border-gray-300 hover:bg-gray-50"}`} disabled={int.disabled}>{int.status}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {settingsTab === "audit" && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Review Policy</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg border-2 border-blue-500 bg-blue-50 cursor-pointer">
                <div className="font-medium text-gray-900">Dual Checkpoint</div>
                <div className="text-xs text-gray-500 mt-1">Review at both input extraction and output delivery stages</div>
              </div>
              <div className="p-4 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <div className="font-medium text-gray-900">Output Only</div>
                <div className="text-xs text-gray-500 mt-1">Review only the final transformed data before delivery</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Row-Level Security Rules</h3>
            <p className="text-sm text-gray-500 mb-3">Define which GL records are sensitive. These rules are enforced in BigQuery at query time — security lives at the data layer, not the application layer.</p>
            <div className="space-y-2">
              {[
                { rule: "Account range 6100–6199", label: "Executive Compensation", level: "Owner only" },
                { rule: "Project = 'M&A Due Diligence'", label: "M&A Activity", level: "Admin + Owner" },
                { rule: "Account range 8500–8599", label: "Board-Related Expenses", level: "Owner only" },
                { rule: "Department = 'Legal'", label: "Legal Department", level: "Admin + Owner" },
              ].map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-red-500 text-sm">🔒</span>
                    <div>
                      <div className="text-sm text-gray-900 font-mono">{r.rule}</div>
                      <div className="text-xs text-gray-500">{r.label}</div>
                    </div>
                  </div>
                  <Badge status="error">{r.level}</Badge>
                </div>
              ))}
            </div>
            <button className="mt-3 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg">+ Add Security Rule</button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Data Retention</h3>
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">Current configuration:</p>
              <p>Pipeline run history: 7 years · Audit log retention: 7 years · Immutable audit trail: Enabled · Export formats: CSV, JSON, Parquet</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Compliance Controls</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="rounded" defaultChecked readOnly />
                <div><div className="text-sm font-medium text-gray-900">Require approval before delivery</div><div className="text-xs text-gray-500">All pipeline outputs must be approved before reaching delivery endpoints</div></div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="rounded" readOnly />
                <div><div className="text-sm font-medium text-gray-900">Zero-retention processing</div><div className="text-xs text-gray-500">Transform data in memory only — never persist raw ERP data on PipeLedger servers</div></div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="rounded" defaultChecked readOnly />
                <div><div className="text-sm font-medium text-gray-900">Reconciliation check on every run</div><div className="text-xs text-gray-500">Verify record counts and control totals match between source and output</div></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {settingsTab === "billing" && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Professional Plan</h3>
                <p className="text-sm text-gray-500">$1,299/month (annual billing)</p>
              </div>
              <button className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg">Upgrade</button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">ERP Connectors:</span> <span className="font-medium">2 of 3 used</span></div>
              <div><span className="text-gray-500">Users:</span> <span className="font-medium">4 of 10 used</span></div>
              <div><span className="text-gray-500">Records this month:</span> <span className="font-medium">287K of 500K</span></div>
              <div><span className="text-gray-500">Pipeline runs today:</span> <span className="font-medium">11 (unlimited)</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ========== MAIN APP ==========
export default function PipeLedgerApp() {
  const [activePage, setActivePage] = useState("home");

  const pages = {
    home: <HomePage />,
    pipelines: <PipelinesPage />,
    "data-review": <DataReviewPage />,
    connectors: <ConnectorsPage />,
    schemas: <SchemasPage />,
    activity: <ActivityPage />,
    settings: <SettingsPage />,
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Top nav */}
      <nav className="bg-white border-b border-gray-200 px-4 h-12 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          {PAGES.map(page => (
            <button
              key={page}
              onClick={() => setActivePage(page)}
              className={`flex items-center gap-1.5 text-sm font-medium py-3 border-b-2 transition-colors ${
                activePage === page
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="text-xs">{PAGE_ICONS[page]}</span>
              {PAGE_LABELS[page]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">Organization</span>
          <span className="text-sm font-medium text-gray-900">Vortex Corp ▾</span>
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">AR</div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {pages[activePage]}
      </main>

      {/* Floating brand badge */}
      <div className="fixed bottom-4 left-4 bg-white shadow-lg rounded-lg px-3 py-1.5 border border-gray-200 flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-gray-900 flex items-center justify-center">
          <span className="text-white text-[9px] font-bold">PL</span>
        </div>
        <span className="text-xs font-semibold text-gray-700">PipeLedger AI</span>
        <span className="text-[10px] text-gray-400">UI Prototype v2</span>
      </div>
    </div>
  );
}
