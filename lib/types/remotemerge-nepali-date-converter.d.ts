// @remotemerge/nepali-date-converter ships index.d.ts, but its package.json
// "exports" map has no "types" condition, so TypeScript (under
// moduleResolution: "bundler") can't find it — see
// https://github.com/remotemerge/nepali-date-converter/issues (exports vs.
// the top-level "types" field). Re-declaring the shape we actually use here
// is simpler than patching node_modules.
declare module "@remotemerge/nepali-date-converter" {
  export default class DateConverter {
    constructor(dateInput: string);
    toAd(): { year: number; month: number; date: number; day: string };
    toBs(): { year: number; month: number; date: number; day: string };
  }
}
