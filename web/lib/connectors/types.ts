export type ConnectorCapability = "SUBMIT" | "PAY" | "READ_STATUS" | "READ_DOCUMENTS";

export interface SubmissionInput {
  caseId: string;
  officialDestination: string;
  portalText: string;
  attachmentKeys: string[];
}

export interface ConnectorSubmissionResult {
  ok: boolean;
  officialReference?: string;
  message: string;
}

export interface ConnectorStatusResult {
  officialReference: string;
  statusLabel: string;
  raw: Record<string, unknown>;
}

export interface OfficialConnector {
  destination: string;
  capabilities: ConnectorCapability[];
  enabled: boolean;
  submit?(input: SubmissionInput): Promise<ConnectorSubmissionResult>;
  readStatus?(officialReference: string): Promise<ConnectorStatusResult>;
}
