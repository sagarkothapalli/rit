declare const file: {
  snapshot: string;
  source: string;
  portal_total: number;
  count: number;
  raw_row_count: number;
  duplicate_id_rows: number;
  reconciliation_note: string;
  label: string;
  authorities: Array<{
    pa_code: string;
    name: string;
    ministry: string;
    level: number;
    boost: boolean;
    keywords: string[];
  }>;
};
export default file;
