declare const file: {
  snapshot: string;
  source: string;
  portal_total: number;
  count: number;
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
