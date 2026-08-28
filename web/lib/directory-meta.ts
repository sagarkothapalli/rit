/* ============================================================
   Tiny directory facts for pages that only need the counts.
   Importing retrieval.ts here would pull the 2,900-row snapshot
   into the homepage serverless function and its JS graph.
   Keep these in lockstep with data/rti-authorities.json.
   ============================================================ */

export const DIRECTORY_SNAPSHOT = "2026-08-27";
export const DIRECTORY_SOURCE = "rtionline.gov.in/request/allpa.php";
export const PORTAL_TOTAL = 2916;
export const DIRECTORY_COUNT = 2907;
export const MINISTRY_COUNT = 90;
export const DIRECTORY_LABEL =
  "dated snapshot of the official listing, not live; unique identifiers reconciled separately from the portal heading";
export const DIRECTORY_RECONCILIATION =
  "The official page heading claims 2,916 authorities. Its HTML contains 3,114 rendered rows, including 207 repeated data-id values, leaving 2,907 unique selectable identifiers in this snapshot.";
