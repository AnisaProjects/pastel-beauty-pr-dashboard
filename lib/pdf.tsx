// react-pdf document for downloading an AI report as a PDF (Stage 3).
//
// Requires `serverExternalPackages: ["@react-pdf/renderer"]` in
// next.config.ts — Next.js's Server Components bundler otherwise pulls in a
// stripped-down React build that breaks react-pdf's react-reconciler
// dependency (see next.config.ts comment / diegomura/react-pdf#2350).
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

import type {
  CategoryRow,
  FiscalYearRow,
  RepeatRow,
  ReportAggregates,
  ShadeRow,
  TopRecipientRow,
} from "@/lib/aggregations";
import { SECTION_HEADINGS } from "@/lib/prompt";

export type PdfReport = {
  id: number | string;
  generatedAt: string | Date;
  model: string;
  contentMd: string;
  inputSnapshot: ReportAggregates;
};

// Palette translated from app/globals.css's :root custom properties.
const COLORS = {
  ink: "#3A2A2E",
  inkSoft: "#8C7378",
  panel: "#FFFFFF",
  line: "#F1DFE1",
  primary: "#DD7C99",
  primarySoft: "#FBE6EC",
  primaryDark: "#B85570",
  liner: "#A98BC7",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontSize: 10.5,
    fontFamily: "Helvetica",
    color: COLORS.ink,
    backgroundColor: "#FFFFFF",
  },
  coverEyebrow: {
    fontSize: 10,
    color: COLORS.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  coverTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    marginBottom: 10,
  },
  coverMeta: {
    fontSize: 10,
    color: COLORS.inkSoft,
    marginTop: 4,
  },
  coverDivider: {
    marginTop: 22,
    marginBottom: 22,
    height: 2,
    backgroundColor: COLORS.primarySoft,
  },
  sectionHeading: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primaryDark,
    marginTop: 20,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  paragraph: {
    fontSize: 10.5,
    lineHeight: 1.5,
    color: COLORS.ink,
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 12,
    fontSize: 10.5,
    color: COLORS.primary,
  },
  bulletText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 1.45,
    color: COLORS.ink,
  },
  table: {
    marginTop: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 3,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: COLORS.primarySoft,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    backgroundColor: "#FCF9F8",
  },
  th: {
    flex: 1,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primaryDark,
    padding: 6,
  },
  td: {
    flex: 1,
    fontSize: 9.5,
    color: COLORS.ink,
    padding: 6,
  },
  tdRight: {
    flex: 1,
    fontSize: 9.5,
    color: COLORS.ink,
    padding: 6,
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    fontSize: 8,
    color: COLORS.inkSoft,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

// ---- Minimal markdown -> react-pdf mapper (headings/paragraphs/bullets only) ----
type MdBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] };

function parseMarkdownSections(md: string): Map<string, MdBlock[]> {
  const sections = new Map<string, MdBlock[]>();
  const lines = md.replace(/\r\n/g, "\n").split("\n");

  let currentHeading = "Untitled";
  let currentBlocks: MdBlock[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = () => {
    if (bulletBuffer.length) {
      currentBlocks.push({ type: "bullets", items: bulletBuffer });
      bulletBuffer = [];
    }
  };
  const flushSection = () => {
    flushBullets();
    sections.set(currentHeading, currentBlocks);
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushBullets();
      continue;
    }
    const headingMatch = /^#{1,3}\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushSection();
      currentHeading = headingMatch[1].trim();
      currentBlocks = [];
      continue;
    }
    const bulletMatch = /^[-*]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1].trim());
      continue;
    }
    flushBullets();
    // Strip **bold**/_italic_ markers — react-pdf's plain <Text> can't render
    // inline emphasis without nested spans, not worth the complexity here.
    const plain = line.replace(/\*\*(.*?)\*\*/g, "$1").replace(/_(.*?)_/g, "$1");
    currentBlocks.push({ type: "paragraph", text: plain });
  }
  flushSection();
  return sections;
}

function MdBlocks({ blocks }: { blocks: MdBlock[] | undefined }) {
  if (!blocks || blocks.length === 0) {
    return <Text style={styles.paragraph}>No content available for this section.</Text>;
  }
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === "paragraph") {
          return (
            <Text key={i} style={styles.paragraph}>
              {b.text}
            </Text>
          );
        }
        return (
          <View key={i}>
            {b.items.map((item, j) => (
              <View key={j} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>{"•"}</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </>
  );
}

function DataTable({
  columns,
  rows,
}: {
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: Record<string, string | number>[];
}) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        {columns.map((c) => (
          <Text key={c.key} style={styles.th}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={i} style={i % 2 === 1 ? styles.tableRowAlt : styles.tableRow}>
          {columns.map((c) => (
            <Text key={c.key} style={c.align === "right" ? styles.tdRight : styles.td}>
              {String(row[c.key])}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function pct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function fmtInt(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtOptionalInt(n: number | undefined): string {
  return n === undefined ? "—" : fmtInt(n);
}

// Real data tables rendered from input_snapshot (never from LLM text) for
// the sections where numbers matter most.
const SECTIONS_WITH_DATA_TABLE = new Set<string>([
  "Fiscal-Year Performance",
  "Top Recipients",
  "Product/Category Performance",
  "Shade Performance",
  "Repeat Recipient Analysis",
]);

function fyTable(rows: FiscalYearRow[]) {
  return (
    <DataTable
      columns={[
        { key: "fiscalYear", label: "Fiscal Year" },
        { key: "sends", label: "Sends", align: "right" },
        { key: "units", label: "Units", align: "right" },
        { key: "prValue", label: "PR Value (NPR)", align: "right" },
        { key: "incomplete", label: "Incomplete Sends", align: "right" },
        { key: "change", label: "vs. Prior FY", align: "right" },
      ]}
      rows={rows.map((r) => ({
        fiscalYear: `FY ${r.fiscalYear}`,
        sends: fmtInt(r.sends),
        units: fmtInt(r.units),
        prValue: fmtOptionalInt(r.prValueNpr),
        incomplete: fmtOptionalInt(r.incompleteValuationSends),
        change: pct(r.unitsChangePct),
      }))}
    />
  );
}

function topRecipientsTable(rows: TopRecipientRow[]) {
  return (
    <DataTable
      columns={[
        { key: "name", label: "Recipient" },
        { key: "sends", label: "Sends", align: "right" },
        { key: "units", label: "Units", align: "right" },
      ]}
      rows={rows.map((r) => ({ name: r.name, sends: fmtInt(r.sends), units: fmtInt(r.units) }))}
    />
  );
}

function categoryTable(rows: CategoryRow[]) {
  return (
    <DataTable
      columns={[
        { key: "category", label: "Category" },
        { key: "units", label: "Units", align: "right" },
        { key: "prValue", label: "PR Value (NPR)", align: "right" },
        { key: "unpriced", label: "Unpriced Lines", align: "right" },
        { key: "pct", label: "% of Total", align: "right" },
      ]}
      rows={rows.map((r) => ({ category: r.category, units: fmtInt(r.units), prValue: fmtOptionalInt(r.prValueNpr), unpriced: fmtOptionalInt(r.unpricedProductLines), pct: pct(r.pctOfTotal) }))}
    />
  );
}

function shadeTable(rows: ShadeRow[]) {
  return (
    <DataTable
      columns={[
        { key: "category", label: "Category" },
        { key: "shade", label: "Shade" },
        { key: "units", label: "Units", align: "right" },
        { key: "prValue", label: "PR Value (NPR)", align: "right" },
        { key: "unpriced", label: "Unpriced Lines", align: "right" },
        { key: "pct", label: "% of Total", align: "right" },
      ]}
      rows={rows.map((r) => ({
        category: r.category,
        shade: r.shade,
        units: fmtInt(r.units),
        prValue: fmtOptionalInt(r.prValueNpr),
        unpriced: fmtOptionalInt(r.unpricedProductLines),
        pct: pct(r.pctOfTotal),
      }))}
    />
  );
}

function repeatTable(rows: RepeatRow[]) {
  return (
    <DataTable
      columns={[
        { key: "fiscalYear", label: "Fiscal Year" },
        { key: "newSends", label: "New", align: "right" },
        { key: "repeatSends", label: "Repeat", align: "right" },
        { key: "repeatPct", label: "Repeat Rate", align: "right" },
      ]}
      rows={rows.map((r) => ({
        fiscalYear: `FY ${r.fiscalYear}`,
        newSends: fmtInt(r.newSends),
        repeatSends: fmtInt(r.repeatSends),
        repeatPct: pct(r.repeatPct),
      }))}
    />
  );
}

function SectionDataTable({ heading, snapshot }: { heading: string; snapshot: ReportAggregates }) {
  switch (heading) {
    case "Fiscal-Year Performance":
      return fyTable(snapshot.perFiscalYear);
    case "Top Recipients":
      return topRecipientsTable(snapshot.topRecipients);
    case "Product/Category Performance":
      return categoryTable(snapshot.categoryBreakdown);
    case "Shade Performance":
      return shadeTable(snapshot.shadeBreakdown);
    case "Repeat Recipient Analysis":
      return repeatTable(snapshot.repeatVsNew);
    default:
      return null;
  }
}

export function ReportPdfDocument({ report }: { report: PdfReport }) {
  const sections = parseMarkdownSections(report.contentMd);
  const generatedAtStr = new Date(report.generatedAt).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <Document title="Pastel Beauty - PR Performance Management Report">
      <Page size="A4" style={styles.page}>
        <Text style={styles.coverEyebrow}>Pastel Beauty</Text>
        <Text style={styles.coverTitle}>PR Performance Management Report</Text>
        <Text style={styles.coverMeta}>Generated {generatedAtStr}</Text>
        <Text style={styles.coverMeta}>Model: {report.model}</Text>
        <Text style={styles.coverMeta}>
          Total sends analyzed: {fmtInt(report.inputSnapshot.overall.sends)} - Total units:{" "}
          {fmtInt(report.inputSnapshot.overall.units)}
        </Text>
        <Text style={styles.coverMeta}>
          ({fmtInt(report.inputSnapshot.overall.excludedTestSends)} test/internal sends excluded from analysis)
        </Text>
        {report.inputSnapshot.prValue && (
          <Text style={styles.coverMeta}>
            Known PR product value: NPR {fmtInt(report.inputSnapshot.prValue.knownValueNpr)} - Fully valued sends:{" "}
            {fmtInt(report.inputSnapshot.prValue.valuedSends)} - Incomplete sends: {fmtInt(report.inputSnapshot.prValue.incompleteSends)}
          </Text>
        )}
        <View style={styles.coverDivider} />
        <Text style={styles.paragraph}>
          This report is generated from live data in the Pastel Beauty PR tracking database. All totals,
          percentages, and comparisons below are computed directly from stored records; narrative commentary is
          provided for context only.
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        {SECTION_HEADINGS.map((heading) => (
          <View key={heading} wrap={false} minPresenceAhead={40}>
            <Text style={styles.sectionHeading}>{heading}</Text>
            <MdBlocks blocks={sections.get(heading)} />
            {SECTIONS_WITH_DATA_TABLE.has(heading) && (
              <SectionDataTable heading={heading} snapshot={report.inputSnapshot} />
            )}
          </View>
        ))}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Pastel Beauty PR Report - Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
