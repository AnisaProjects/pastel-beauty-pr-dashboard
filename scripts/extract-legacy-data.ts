// One-off helper: pulls window.__PR_DATA__ (the 179 base PR-send records)
// out of the old static dashboard HTML file and writes it to
// scripts/legacy-data.json — a clean, committed snapshot that
// migrate-legacy-data.ts reads from. This lets the legacy-data migration
// keep working even after pastel_beauty_pr_dashboard.html itself is removed
// from the repo (it stays recoverable via git history regardless).
//
// Already run once as part of the Stage 1 conversion — scripts/legacy-data.json
// is committed. Re-run only if the source HTML file changes before you delete it:
//   npm run migrate:legacy:extract -- <path-to-html>   (path optional; see default below)
import fs from "node:fs";
import path from "node:path";

const DEFAULT_HTML_PATH = path.resolve(__dirname, "..", "pastel_beauty_pr_dashboard.html");
const OUTPUT_PATH = path.resolve(__dirname, "legacy-data.json");

function main() {
  const htmlPath = process.argv[2] || DEFAULT_HTML_PATH;
  if (!fs.existsSync(htmlPath)) {
    console.error(`Could not find ${htmlPath}.`);
    console.error(
      "If pastel_beauty_pr_dashboard.html has already been deleted, scripts/legacy-data.json should already exist — nothing to do.",
    );
    process.exit(1);
  }

  const html = fs.readFileSync(htmlPath, "utf8");
  const marker = 'window.__PR_DATA__ = ';
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) {
    throw new Error("Could not find `window.__PR_DATA__ = ` in the HTML file.");
  }
  const jsonStart = startIdx + marker.length;
  const scriptEndIdx = html.indexOf("</script>", jsonStart);
  if (scriptEndIdx === -1) {
    throw new Error("Could not find the closing </script> tag after window.__PR_DATA__.");
  }
  // The data literal is followed by an optional trailing `;` then the closing tag.
  let jsonText = html.slice(jsonStart, scriptEndIdx).trim();
  if (jsonText.endsWith(";")) jsonText = jsonText.slice(0, -1).trim();

  const data = JSON.parse(jsonText);
  if (!data || !Array.isArray(data.records)) {
    throw new Error("Parsed data did not look like { categories, shadesByCategory, records }.");
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`Wrote ${data.records.length} records to ${OUTPUT_PATH}`);
}

main();
