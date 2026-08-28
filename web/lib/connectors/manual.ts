import type { OfficialConnector } from "./types";

/** The default connector: the citizen files on the official channel. */
export const manualConnector: OfficialConnector = {
  destination: "manual",
  capabilities: [],
  enabled: true,
};

export function activeConnectors(): OfficialConnector[] {
  return [manualConnector];
}
