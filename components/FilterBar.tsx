"use client";

export default function FilterBar({
  allFys,
  activeFys,
  onToggleFy,
  includeTest,
  onToggleIncludeTest,
  search,
  onSearchChange,
  onReset,
}: {
  allFys: string[];
  activeFys: Set<string>;
  onToggleFy: (fy: string) => void;
  includeTest: boolean;
  onToggleIncludeTest: (v: boolean) => void;
  search: string;
  onSearchChange: (v: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="filterbar">
      <div className="filter-group">
        <span className="filter-label">Fiscal Year</span>
        {allFys.map((fy) => (
          <span
            key={fy}
            className={"chip" + (activeFys.has(fy) ? " active" : "")}
            onClick={() => onToggleFy(fy)}
          >
            FY {fy}
          </span>
        ))}
      </div>
      <label className="toggle">
        <input
          type="checkbox"
          checked={includeTest}
          onChange={(e) => onToggleIncludeTest(e.target.checked)}
        />
        Include test / internal sends
      </label>
      <div className="searchbox">
        <input
          type="text"
          placeholder="Search recipient or address…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <span className="reset-link" onClick={onReset}>
        Reset filters
      </span>
    </div>
  );
}
