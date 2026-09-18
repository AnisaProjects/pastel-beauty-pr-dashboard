const { sql } = require("@vercel/postgres");

// The three overlay buckets the dashboard persists on top of the read-only
// base workbook data: newly-added entries, edits to base rows, and removed
// base rows. Keep these in sync with STORAGE_KEY / EDITS_KEY / DELETES_KEY
// in pastel_beauty_pr_dashboard.html.
const ALLOWED_KEYS = new Set([
  "pastelBeautyPR_customEntries_v1",
  "pastelBeautyPR_baseEdits_v1",
  "pastelBeautyPR_baseDeletes_v1"
]);

let tableReady = null;
function ensureTable() {
  if (!tableReady) {
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS pr_overlay_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
  }
  return tableReady;
}

module.exports = async function handler(req, res) {
  if (!process.env.POSTGRES_URL) {
    res.status(503).json({ error: "Database not configured" });
    return;
  }

  try {
    await ensureTable();

    if (req.method === "GET") {
      const { rows } = await sql`SELECT key, value FROM pr_overlay_state`;
      const state = {};
      rows.forEach((row) => {
        state[row.key] = row.value;
      });
      res.status(200).json(state);
      return;
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const { key, value } = body;
      if (!ALLOWED_KEYS.has(key)) {
        res.status(400).json({ error: "Unknown key" });
        return;
      }
      await sql`
        INSERT INTO pr_overlay_state (key, value, updated_at)
        VALUES (${key}, ${JSON.stringify(value ?? null)}::jsonb, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `;
      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("pr_overlay_state error", err);
    res.status(500).json({ error: "Server error" });
  }
};
