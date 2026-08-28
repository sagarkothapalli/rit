CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email_normalized text UNIQUE NOT NULL,
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY,
  owner_id uuid REFERENCES users (id),
  owner_email text NOT NULL,
  praja_reference text UNIQUE NOT NULL,
  access_token_hash text NOT NULL,
  case_type text NOT NULL,
  parent_case_id uuid REFERENCES cases (id),
  target_official_reference_id uuid,
  jurisdiction text NOT NULL,
  authority_code text,
  authority_name text NOT NULL,
  authority_level text,
  filing_channel text,
  preparation_status text NOT NULL,
  filing_status text NOT NULL,
  outcome_status text NOT NULL,
  title text NOT NULL,
  language text NOT NULL,
  draft_version integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS cases_owner_email_idx ON cases (owner_email, updated_at DESC);
CREATE INDEX IF NOT EXISTS cases_parent_idx ON cases (parent_case_id);

CREATE TABLE IF NOT EXISTS case_applicants (
  case_id uuid PRIMARY KEY REFERENCES cases (id) ON DELETE CASCADE,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS case_drafts (
  id uuid PRIMARY KEY,
  case_id uuid REFERENCES cases (id) ON DELETE CASCADE,
  version integer NOT NULL,
  payload jsonb NOT NULL,
  portal_text text NOT NULL,
  character_count integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  UNIQUE (case_id, version)
);

CREATE TABLE IF NOT EXISTS official_references (
  id uuid PRIMARY KEY,
  case_id uuid REFERENCES cases (id) ON DELETE CASCADE,
  registration_number text NOT NULL,
  reference_kind text NOT NULL,
  source text NOT NULL,
  filed_at timestamptz,
  received_at timestamptz,
  parent_official_reference_id uuid,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_events (
  id uuid PRIMARY KEY,
  case_id uuid REFERENCES cases (id) ON DELETE CASCADE,
  official_reference_id uuid,
  event_type text NOT NULL,
  source text NOT NULL,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  idempotency_key text UNIQUE
);

CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY,
  case_id uuid REFERENCES cases (id) ON DELETE CASCADE,
  event_id uuid,
  kind text NOT NULL,
  original_name text NOT NULL,
  stored_name text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL,
  sha256 text NOT NULL,
  storage_key text NOT NULL,
  page_count integer,
  language text,
  verification_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS deadlines (
  id uuid PRIMARY KEY,
  case_id uuid REFERENCES cases (id) ON DELETE CASCADE,
  official_reference_id uuid,
  kind text NOT NULL,
  starts_at timestamptz NOT NULL,
  due_at timestamptz NOT NULL,
  rule_version text NOT NULL,
  status text NOT NULL,
  satisfied_by_event_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY,
  case_id uuid REFERENCES cases (id) ON DELETE CASCADE,
  deadline_id uuid,
  channel text NOT NULL,
  template text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL,
  idempotency_key text UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS filing_rule_versions (
  id text PRIMARY KEY,
  destination text NOT NULL,
  case_type text NOT NULL,
  effective_from date NOT NULL,
  verified_at timestamptz NOT NULL,
  source_url text NOT NULL,
  rules jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
