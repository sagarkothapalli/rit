[New: Introducing Workspaces→](https://here.now/blog/workspaces)

# here.now Documentation

## [Overview](https://here.now/docs\#overview)

here.now lets agents publish websites, apps, and files to live URLs in seconds.

Every site gets a live URL at `<slug>.here.now`. They can also be served from custom domains.

- No account required for anonymous sites (24 hour expiry).
- Use an API key for permanent sites and higher limits.

Teams can publish together in [Workspaces](https://here.now/docs#workspaces) — shared accounts where sites belong to the team, with memorable URLs at`{label}.{workspace}.here.now`.

## [Install here.now](https://here.now/docs\#install-skill)

Copy instructions for my agentCopied! Now paste in your agent

Install the here.now skill so your agent publish automatically:

```
npx skills add heredotnow/skill --skill here-now -g
```

For repo-pinned/project-local installs, run the Skills command without `-g`.

If that fails, try this fallback installer:

```
curl -fsSL https://here.now/install.sh | bash
```

Once installed, agents can publish with a single script call. See the [skill repo](https://github.com/heredotnow/skill) for details.

## [Quick start](https://here.now/docs\#quick-start)

Publish a site in three steps. No account needed:

1\. Create site

```
curl -sS https://here.now/api/v1/publish \
  -H "X-HereNow-Client: cursor/direct-api" \
  -H "content-type: application/json" \
  -d '{
    "files": [\
      { "path": "index.html", "size": 1234, "contentType": "text/html; charset=utf-8" }\
    ]
  }'
```

2\. Upload file

```
curl -X PUT "<upload.uploads[0].url>" \
  -H "Content-Type: text/html; charset=utf-8" \
  --data-binary @index.html
```

3\. Finalize

```
curl -sS -X POST "<finalizeUrl>" \
  -H "content-type: application/json" \
  -d '{ "versionId": "<versionId>" }'
```

The response to step 1 includes the live `siteUrl`, presigned upload URLs, and a `finalizeUrl`. Anonymous sites expire in 24 hours. Only anonymous sites include `claimUrl`; share it with the user, copied byte-for-byte, so they can keep the site permanently.

## [Authentication](https://here.now/docs\#auth)

Two modes:

- **Authenticated**: include `Authorization: Bearer <API_KEY>`. Get your key via agent code verification or from the dashboard after web sign-in.
- **Anonymous**: omit the header. Sites expire in 24 hours with lower limits.
- **Optional attribution**: include `X-HereNow-Client: <harness>/<detail>` naming the agent platform you run in (example: `claude-code/publish-sh`, or `grok-bot/research-bot` for a custom bot inside Grok Bot). Use the platform's name, not your bot or persona name — a "finance-bot" running in Cursor sends `cursor/finance-bot`, not `finance-bot`. Missing or invalid values are ignored.

### [Getting an API key](https://here.now/docs\#auth-signup)

There are two ways to get an API key:

**Option A: Agent-assisted sign-up.** The sign-up flow can be completed entirely within the agent. Request a one-time code by email:

```
curl -sS https://here.now/api/auth/agent/request-code \
  -H "content-type: application/json" \
  -d '{"email": "user@example.com"}'
```

The user copies the code from email and pastes it into the agent. Then verify the code to receive the API key:

```
curl -sS https://here.now/api/auth/agent/verify-code \
  -H "content-type: application/json" \
  -d '{"email":"user@example.com","code":"ABCD-2345","keyName":"my-tool"}'
```

If the email is new, the account is created automatically.

`keyName` is optional but recommended: when provided, the returned `apiKey`is a named key for that tool — your existing key with that name if one is active, or a freshly minted one (one key per agent or tool — see [API keys](https://here.now/docs#api-keys)) — instead of the account's shared legacy key. Repeat logins return the same key (`keyReused: true`). If key issuance fails (key cap, rate limit, or an internal error), the response falls back to the legacy key and sets `keyMintError`.

**Option B: Dashboard sign-up.** Sign in at [here.now/dashboard](https://here.now/dashboard) and copy the API key from the dashboard.

### [Storing the API key](https://here.now/docs\#storing-api-key)

After obtaining a key (via either method), save it to the credentials file:

```
mkdir -p ~/.herenow && echo "<API_KEY>" > ~/.herenow/credentials && chmod 600 ~/.herenow/credentials
```

The publish script reads the key from these sources (first match wins):

- `--api-key` flag (CI/scripting only — avoid in interactive use)
- `$HERENOW_API_KEY` environment variable
- `~/.herenow/credentials` file (recommended)

## [API keys](https://here.now/docs\#api-keys)

An account can hold up to 50 named API keys, each individually revocable. Use one key per agent or tool (e.g. `claude`, `cursor`) so revoking one credential doesn't break the others. Named keys start with `hnk_` and work everywhere`Authorization: Bearer <API_KEY>` is accepted. The original key from sign-up appears in the key list with a blank name and id `legacy`.

Keys can be managed from the dashboard or via the API.

### [Create a key](https://here.now/docs\#api-keys-create)

`POST /api/v1/me/keys`

```
curl -sS https://here.now/api/v1/me/keys \
  -H "Authorization: Bearer <API_KEY>" \
  -H "content-type: application/json" \
  -d '{"name": "claude"}'
```

Response:

```
{
  "id": "9f4e...",
  "name": "claude",
  "key": "hnk_<64 hex chars>",
  "keySuffix": "a1b2",
  "createdAt": "2026-06-11T00:00:00.000Z"
}
```

### [List keys](https://here.now/docs\#api-keys-list)

`GET /api/v1/me/keys`

```
curl -sS https://here.now/api/v1/me/keys \
  -H "Authorization: Bearer <API_KEY>"
```

Returns every active key including its full value (`id`, `name`, `key`,`keySuffix`, `createdAt`, `lastUsedAt`, `current`), so keys can be re-read later. `current` marks the key used to authenticate the request.

### [Revoke a key](https://here.now/docs\#api-keys-revoke)

`DELETE /api/v1/me/keys/:id`

```
curl -sS -X DELETE https://here.now/api/v1/me/keys/<KEY_ID> \
  -H "Authorization: Bearer <API_KEY>"
```

Revocation is immediate and only affects that key. Use `DELETE /api/v1/me/keys/legacy` to revoke the original key from sign-up.

API keys belong to you, not to an account: the same key publishes to your personal account by default and into any workspace you belong to when the request carries an account selector — see [Workspaces → Account selector](https://here.now/docs#workspace-selector).

## [Create a site](https://here.now/docs\#create)

`POST /api/v1/publish` (alias: `POST /api/v1/artifact`)

Request body:

```
{
  "files": [\
    { "path": "index.html", "size": 1234, "contentType": "text/html; charset=utf-8", "hash": "a1b2c3d4..." },\
    { "path": "assets/app.js", "size": 999, "contentType": "text/javascript; charset=utf-8", "hash": "e5f6a7b8..." }\
  ],
  "ttlSeconds": null,
  "displayName": "My site",
  "displayDescription": "A short summary shown in your dashboard and search results.",
  "viewer": {
    "title": "My site",
    "description": "Published by an agent",
    "ogImagePath": "assets/cover.png"
  }
}
```

- `files` (required): array of `{ path, size, contentType, hash }`. Paths should be relative to the site root (e.g. `index.html`, `assets/style.css`) — don't include a parent directory name like `my-project/index.html`.
- `hash` (optional): SHA-256 hex digest (64 lowercase chars). When updating, files whose hash matches the previous version are skipped from `upload.uploads[]` and listed in `upload.skipped[]`. The server copies them at finalize.
- `ttlSeconds` (optional): expiry in seconds, applied at finalize (expiry runs from when the version goes live). Ignored for anonymous sites. On update: omitted preserves the current TTL, `null` clears it.
- `displayName` (optional, max 80 chars): owner-facing Site title used in the dashboard, search, profile cards, and API responses.
- `displayDescription` (optional, max 280 chars): owner-facing Site summary used in the dashboard, search, and API responses.
- `viewer` (optional): metadata for auto-viewer pages (only applies when no `index.html`).

Response (authenticated):

```
{
  "slug": "bright-canvas-a7k2",
  "siteUrl": "https://bright-canvas-a7k2.here.now/",
  "displayName": "My site",
  "displayDescription": "A short summary shown in your dashboard and search results.",
  "upload": {
    "versionId": "01J...",
    "uploads": [\
      {\
        "path": "index.html",\
        "method": "PUT",\
        "url": "https://<presigned-url>",\
        "headers": { "Content-Type": "text/html; charset=utf-8" }\
      }\
    ],
    "skipped": ["assets/app.js"],
    "finalizeUrl": "https://here.now/api/v1/publish/bright-canvas-a7k2/finalize",
    "expiresInSeconds": 3600
  }
}
```

Anonymous responses also include:

```
{
  "claimToken": "4fQ9tK2mXb7cW1pZ",
  "claimUrl": "https://here.now/c/4fQ9tK2mXb7cW1pZ",
  "expiresAt": "2026-02-19T01:00:00.000Z",
  "anonymous": true,
  "warning": "IMPORTANT: Save the claimToken and claimUrl. They are returned only once and cannot be recovered. Share the claimUrl with the user as a clickable link, copied byte-for-byte — never shorten, redact, summarize, or replace any part of it with '...'. A modified claim link will not work and the site cannot be kept without it."
}
```

**IMPORTANT:** The `claimToken` and `claimUrl` are returned only once and cannot be recovered. Always save the `claimToken` and share the `claimUrl` with the user so they can claim the site and keep it permanently. Copy the `claimUrl` byte-for-byte as a clickable link — never shorten, redact, summarize, or replace any part of it with `...`; a modified link fails with an invalid-token error. If you lose the claim token, the site will expire in 24 hours with no way to save it.

`claimToken`, `claimUrl`, and `expiresAt` are only present for anonymous sites. Authenticated sites do not include these fields. Claim links issued before compact tokens (the `/claim?slug=...&token=...` form) keep working.

To create a Site owned by a workspace instead of your personal account, add`"account": "<workspace-subdomain>"` to the create body (or the `X-HereNow-Account`header) — see [Workspaces → Publish](https://here.now/docs#workspace-publish).

## [Upload files](https://here.now/docs\#upload)

For each entry in `upload.uploads[]`, PUT the file to the presigned URL:

```
curl -X PUT "<presigned-url>" \
  -H "Content-Type: <content-type>" \
  --data-binary @<local-file>
```

Uploads can run in parallel. Presigned URLs are valid for 1 hour.

## [Finalize](https://here.now/docs\#finalize)

`POST /api/v1/publish/:slug/finalize` (alias: `POST /api/v1/artifact/:slug/finalize`)

```
{ "versionId": "01J..." }
```

Owned sites require `Authorization: Bearer`. Anonymous sites can finalize without auth.

Response:

```
{
  "success": true,
  "slug": "bright-canvas-a7k2",
  "siteUrl": "https://bright-canvas-a7k2.here.now/",
  "previousVersionId": null,
  "currentVersionId": "01J...",
  "publishStatus": { "requestAuth": "api_key", "ownership": "personal", "accountId": "…", "persistence": "permanent", "expiresAt": null, "state": "live" }
}
```

Finalize is idempotent by `versionId`: retrying a finalize that already succeeded (for example after a timeout) returns the live state with `replayed: true` instead of an error. Staged settings changes (TTL) apply at finalize. The response's`publishStatus` is the authoritative ownership/persistence state — report from it rather than inferring from which credentials were sent.

## [Update an existing site](https://here.now/docs\#update)

`PUT /api/v1/publish/:slug` (alias: `PUT /api/v1/artifact/:slug`)

Same request body as create. Returns new presigned upload URLs and a new `finalizeUrl`.

- **Owned sites**: requires `Authorization: Bearer <API_KEY>`.
- **Anonymous sites**: include `claimToken` in the request body. Updates do not extend the expiration. An API key neither authorizes the update nor claims the Site — to keep an anonymous Site, use the claim endpoint below.
- **Settings are patches**: omitted `ttlSeconds`/`viewer` preserve current values; explicit `null` clears them; `viewer` fields merge individually (sending only a new `title` keeps the existing `description`). TTL changes apply at finalize.
- **Incremental deploys**: include `hash` (SHA-256 hex) on each file. Files whose hash matches the previous version appear in `upload.skipped[]` instead of `upload.uploads[]` — no upload needed. The server copies them at finalize.
- **Interrupted uploads**: re-presign with `POST /api/v1/publish/:slug/uploads/refresh` — API key for owned Sites, `{ "claimToken": "..." }` in the body for anonymous Sites — then finalize with the same `versionId`.

## [Claim an anonymous site](https://here.now/docs\#claim)

`POST /api/v1/publish/:slug/claim` (alias: `POST /api/v1/artifact/:slug/claim`)

Requires `Authorization: Bearer <API_KEY>`.

```
{ "claimToken": "4fQ9tK2mXb7cW1pZ" }
```

Transfers ownership, removes the expiration. Users can also claim by visiting the`claimUrl` and signing in. Claiming is retry-safe: repeating a claim that already succeeded for the same account returns success (`alreadyOwned: true`); a Site claimed by another account returns 409 `already_claimed`.

## [Duplicate a site](https://here.now/docs\#duplicate)

`POST /api/v1/publish/:slug/duplicate`

Creates a complete server-side copy of the site under a new slug. All files are copied server-side — no client upload or finalize step needed. The new site is immediately live.

Requires `Authorization: Bearer <API_KEY>` (must own the source site).

Request body (optional):

```
{
  "viewer": {
    "title": "My Copy",
    "description": "Copy of bright-canvas-a7k2"
  }
}
```

- `viewer` (optional): Shallow-merged with the source site's viewer metadata. Only provided fields are overridden; omitted fields are preserved from the source.

Response:

```
{
  "slug": "warm-lake-f3k9",
  "siteUrl": "https://warm-lake-f3k9.here.now/",
  "sourceSlug": "bright-canvas-a7k2",
  "status": "active",
  "currentVersionId": "01J...",
  "filesCount": 36
}
```

Copies all files and viewer metadata, plus the Site Data schema (collections) — but not the stored records. Does not copy password protection, restricted access rules, subdomain handle/custom domain links, or TTL.

On workspace Sites, any active member can duplicate a member-visible Site into the same workspace (send the `X-HereNow-Account` header). The copy keeps its audience but never a password, and gets a fresh label — see [Workspaces → Manage Sites](https://here.now/docs#workspace-manage).

## [SPA routing](https://here.now/docs\#spa-routing)

For single-page applications (React, Vue, Svelte), enable SPA mode so unknown paths serve `index.html` instead of returning 404. This lets client-side routing work on refresh and direct links.

Enable at publish time with `spaMode: true` in the request body, or toggle on an existing site via `PATCH /api/v1/publish/:slug/metadata` with `{"spaMode": true}`.

Static assets still resolve normally — only paths that don't match any file fall through to the`index.html` fallback. Works with both root `index.html` and subdirectory-based app structures.

Make sure the build uses root-relative asset paths (`/assets/app.js`). Vite and Create React App do this by default.

## [Patch metadata](https://here.now/docs\#metadata)

`PATCH /api/v1/publish/:slug/metadata` (alias: `PATCH /api/v1/artifact/:slug/metadata`)

Requires `Authorization: Bearer <API_KEY>`.

```
{
  "displayName": "Updated site title",
  "displayDescription": "A short updated summary for dashboard and search results.",
  "ttlSeconds": 604800,
  "viewer": {
    "title": "Updated title",
    "description": "New description",
    "ogImagePath": "assets/cover.png"
  },
  "password": "secret123"
}
```

All fields optional. `ogImagePath` must reference an image within the current site. Viewer metadata only affects the root document when no `index.html` exists.

`displayName` and `displayDescription` are Site-level owner metadata for dashboards, search, profile cards, and API responses. `displayName` is capped at 80 characters;`displayDescription` is capped at 280 characters.

When a Site is published without them, here.now generates a display name and description from the published content shortly after finalize, so every Site is recognizable in dashboards and search. The`metadata` object on [Get site details](https://here.now/docs#get) reports each value's source: `caller` (set via the API or dashboard), or a system source —`html_metadata` (taken from the page's own title/description), `content_generated`, or`fallback`. Values you set are kept — generation only fills in what's missing and never overwrites a caller value.

`password`: string to set or change, `null` to remove, omit for no change. When set, visitors must enter the password before any content is served (server-side enforcement). Setting a password switches the site to password mode and clears restricted email/domain rules.

## [Delete](https://here.now/docs\#delete)

`DELETE /api/v1/publish/:slug` (alias: `DELETE /api/v1/artifact/:slug`)

Requires `Authorization: Bearer <API_KEY>`. Hard deletes the site and all stored files, including version history.

## [Access control](https://here.now/docs\#access-control)

A site can use one access mode at a time: `anyone_with_link`, `password`, or `restricted`. The default is `anyone_with_link`, which means anyone with the URL can view the site.

Use `password` when the user wants a shared secret that does not require visitor identity. Use `restricted` when the user wants invite-only access based on verified email addresses or email domains. A restricted site with no allowed emails or domains is owner-only.

Restricted access requires a claimed site with an owner account. If the user wants identity-based access on an anonymous site, claim the site first. Users can also manage site access from the dashboard if they prefer a UI.

Workspace-owned Sites use a different set of modes: `account_members` (the default) or Public, with an optional password — `restricted` allowlists are personal-Site-only. See [Workspaces → Access](https://here.now/docs#workspace-access).

### [Access API](https://here.now/docs\#restricted-api)

`GET /api/v1/publish/:slug/access` reads the current policy. The response includes the active mode, policy version, exact-email rules, and domain rules.

```
{
  "access": {
    "mode": "restricted",
    "accessPolicyVersion": 3,
    "allowedEmails": ["person@example.com"],
    "allowedDomains": ["example.com"]
  }
}
```

`PATCH /api/v1/publish/:slug/access` updates link or restricted access. The endpoint requires `Authorization: Bearer <API_KEY>` and ownership of the site. The response echoes the saved policy.

```
curl -sS https://here.now/api/v1/publish/bright-canvas-a7k2/access \
  -X PATCH \
  -H "Authorization: Bearer $HERENOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "restricted",
    "allowedEmails": ["person@example.com"],
    "allowedDomains": ["example.com"],
    "notify": true
  }'

{
  "access": {
    "mode": "restricted",
    "accessPolicyVersion": 4,
    "allowedEmails": ["person@example.com"],
    "allowedDomains": ["example.com"]
  },
  "notifications": {
    "sent": ["person@example.com"],
    "failed": [],
    "skipped": []
  }
}
```

- `mode`: use `anyone_with_link` or `restricted`. Use metadata, not this endpoint, to set password mode.
- `allowedEmails` and `allowedDomains`: used only with `restricted`. Values are normalized to lowercase. Each list accepts up to 200 entries.
- The PATCH body replaces the full email and domain lists. To add one person or domain, read the current policy, merge your change, then write the complete lists back.
- `notify: true` sends real invite emails to newly added exact-email recipients. Confirm with the user before sending notifications. Domain rules do not send invite emails.
- If `notify: true` sends or skips invite emails, the PATCH response includes `notifications`; no follow-up invite call is needed to inspect delivery results.
- Any successful access PATCH switches the site away from password mode and clears an existing password. It also clears any legacy paid gate. Do not call it unless the user wants that mode change.
- Password and restricted access remove the site from public profile/discovery surfaces.

### [Access API errors](https://here.now/docs\#access-control-errors)

- `409 Restricted access requires a claimed Site.` Claim the site first, then retry restricted access.
- `409 Use the password endpoint to enable password protection.` Set passwords with `PATCH /api/v1/publish/:slug/metadata`.
- `409 Cannot update access on an unfinalized site.` Finalize the site first.
- `403 Forbidden` means the API key belongs to a different account than the site owner.

### [Access control examples](https://here.now/docs\#access-control-examples)

Make a site owner-only:

```
curl -sS https://here.now/api/v1/publish/bright-canvas-a7k2/access \
  -X PATCH \
  -H "Authorization: Bearer $HERENOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "restricted",
    "allowedEmails": [],
    "allowedDomains": []
  }'
```

Invite one email. Read first, preserve existing entries, then PATCH the merged list:

```
# 1. Read the current policy.
curl -sS https://here.now/api/v1/publish/bright-canvas-a7k2/access \
  -H "Authorization: Bearer $HERENOW_API_KEY"

# 2. Write the complete merged list.
curl -sS https://here.now/api/v1/publish/bright-canvas-a7k2/access \
  -X PATCH \
  -H "Authorization: Bearer $HERENOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "restricted",
    "allowedEmails": ["existing@example.com", "person@example.com"],
    "allowedDomains": ["example.com"],
    "notify": false
  }'
```

Allow anyone at a domain. Read first if the site already has exact-email entries or other domains:

```
curl -sS https://here.now/api/v1/publish/bright-canvas-a7k2/access \
  -X PATCH \
  -H "Authorization: Bearer $HERENOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "restricted",
    "allowedEmails": [],
    "allowedDomains": ["example.com"]
  }'
```

Return a site to normal link access:

```
curl -sS https://here.now/api/v1/publish/bright-canvas-a7k2/access \
  -X PATCH \
  -H "Authorization: Bearer $HERENOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "mode": "anyone_with_link" }'
```

### [Restricted viewer flow](https://here.now/docs\#restricted-viewer-flow)

Visitors to a restricted site see an invite-only gate. They verify access with Google or an email magic link, and the gate does not reveal the allowlist.

here.now checks the current access policy before granting access. If an email or domain was removed after an invite was sent, the invite link no longer opens the site. API access still uses here.now API keys.

### [Invite notifications](https://here.now/docs\#invite-notifications)

To notify exact-email recipients after access is already configured, call `POST /api/v1/publish/:slug/access/invites`. The request accepts up to 200 emails. The endpoint sends only to emails that are currently allowed on that site and reports any skipped emails as `not_allowed`.

```
curl -sS https://here.now/api/v1/publish/bright-canvas-a7k2/access/invites \
  -X POST \
  -H "Authorization: Bearer $HERENOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "emails": ["person@example.com"] }'

{
  "notifications": {
    "sent": ["person@example.com"],
    "failed": [],
    "skipped": []
  }
}
```

The response uses the same `notifications` shape returned by `PATCH /api/v1/publish/:slug/access` when `notify` sends or skips invite emails.

### [Security behavior](https://here.now/docs\#access-control-security)

Access controls are enforced before site content is returned, including direct file paths and custom-domain or handle mounts. Restricted viewer grants are scoped to the site and host, and changing the access policy invalidates older grants. Gated sites also return restrictive robots/noindex responses before authorization.

### [Password protection](https://here.now/docs\#password)

Password mode is mutually exclusive with restricted access. Setting a password switches the site to password access and clears restricted email/domain rules. Password mode is controlled through metadata, not the access endpoint.

Add a password to any authenticated site so visitors must authenticate before viewing. This is server-side enforcement — content is never sent to the browser until the password is verified. All files under the site are protected, not just the index page.

Set or change a password via `PATCH /api/v1/publish/:slug/metadata` with `{"password": "secret"}`. Remove it with `{"password": null}`. You can also manage passwords from the dashboard.

Password protection survives redeploys — it's metadata, not content. Changing or removing a password immediately invalidates all existing sessions. Requires an authenticated site (anonymous sites cannot be password-protected).

Password-protected sites cannot be shown on a public profile. If a site is already on your profile, adding a password removes it from the profile.

## [URL structure](https://here.now/docs\#urls)

Each site gets its own subdomain: `https://<slug>.here.now/`

Asset paths work naturally from the subdomain root. Relative paths also work.

Workspace-owned Sites additionally get a memorable label URL under the workspace's subdomain —`https://{label}.{workspace}.here.now/` — alongside the canonical slug URL, which keeps serving. See [Workspaces → Publish & label URLs](https://here.now/docs#workspace-publish).

### [Serving rules](https://here.now/docs\#serving-rules)

1. If `index.html` exists at root, serve it.
2. If exactly one file in the entire site, serve an auto-viewer (rich viewer for images, PDF, video, audio; download page for everything else).
3. If an `index.html` exists in any subdirectory, serve the first one found.
4. Otherwise, serve an auto-generated directory listing. Folders are clickable, images render as a gallery, and other files are listed with sizes. No `index.html` required.

Direct file paths always work: `https://<slug>.here.now/report.pdf`

## [Custom domains](https://here.now/docs\#domains)

Bring your own domain and serve sites from it. Free plan: 1 domain. Hobby plan: up to 5. Developer plan: up to 20.

- `POST /api/v1/domains` — add a domain
- `GET /api/v1/domains` — list your domains
- `GET /api/v1/domains/:domain` — check status
- `DELETE /api/v1/domains/:domain` — remove a domain

Add a domain:

```
curl -sS https://here.now/api/v1/domains \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com"}'
```

The response includes `dns_instructions` — an array of records to add at your DNS provider. Each has `type`, `host`, and `value` fields. For apex domains, we automatically set up both `example.com` and `www.example.com`.

**Subdomains** (e.g. `docs.example.com`): add a **CNAME** record. The `host` is the subdomain part (e.g. `docs`), and the `value` is `fallback.here.now`.

**Apex domains** (e.g. `example.com`): add the records from `dns_instructions`. The `host` will be `@` (meaning the root domain — some providers use a blank field). Typically two **A** records plus a **CNAME** with `host: "www"` pointing to `fallback.here.now`. Visitors to `www.example.com` are automatically redirected to `example.com`.

SSL is provisioned automatically once DNS is verified. Status is `pending` until verified, then `active`. Query `GET /api/v1/domains/:domain` to check progress — this also triggers on-demand verification.

Custom domains also work on workspaces: same endpoints with the `X-HereNow-Account` header, admin-managed — see [Workspaces → Domains & Variables](https://here.now/docs#workspace-domains-variables).

### [Primary domain](https://here.now/docs\#primary-domain)

Once a site is linked to a custom domain, you can make that domain **primary**: the site's here.now-hosted addresses (`<slug>.here.now` and, for workspace sites, the workspace label URL) permanently redirect (`308`, path and query preserved) to the domain instead of serving duplicate content. Old shared links keep working — they forward.

- `GET /api/v1/publish/:slug/primary-domain` — current state and eligible links
- `PUT /api/v1/publish/:slug/primary-domain` — set or clear

Make a domain primary (the site must already be linked to it):

```
curl -sS -X PUT https://here.now/api/v1/publish/<slug>/primary-domain \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com"}'
```

If the site is linked at multiple locations on the domain, disambiguate with`"location"` (`""` for root). Stop redirecting with`{"domain": null}` — turning it off can take up to an hour to reach returning visitors because permanent redirects are briefly cached. Redirects start within about 60 seconds of setting. The same control lives in the dashboard under **Manage site → Domains → Primary domain**. Workspace sites: admins only.

## [Subdomain Handles](https://here.now/docs\#handle)

A subdomain handle is a stable here.now subdomain like `yourname.here.now` that routes locations to your sites. Handles are grandfathered: existing handles keep working, but new handles can no longer be registered (`POST /api/v1/handle` returns `410 handle_claims_frozen`). For a named subdomain, use a [workspace](https://here.now/docs#workspaces) — every workspace gets `{workspace}.here.now`.

- `GET /api/v1/handle`
- `DELETE /api/v1/handle`

Subdomain handles cannot be renamed. Deleting a subdomain handle removes the namespace and deletes its links.

## [Links](https://here.now/docs\#links)

Links connect a site to a location on your subdomain handle or custom domain. The same endpoints work for both — omit the `domain` parameter to target your subdomain handle, or include it to target a custom domain. Use an empty location for root.

- `POST /api/v1/links`
- `GET /api/v1/links`
- `GET /api/v1/links/:location`
- `PATCH /api/v1/links/:location`
- `DELETE /api/v1/links/:location`

Link to your subdomain handle:

```
{
  "location": "docs",
  "slug": "bright-canvas-a7k2"
}
```

Link to a custom domain:

```
{
  "location": "",
  "slug": "bright-canvas-a7k2",
  "domain": "example.com"
}
```

For root, send `"location": ""`. In path params, use `__root__` for the root location:`/api/v1/links/__root__`.

To delete a link from a custom domain, add `?domain=example.com` as a query parameter to the DELETE request.

Link updates are written to Cloudflare KV and can take up to 60 seconds to propagate globally.

## [Site Data](https://here.now/docs\#sitedata)

Site Data is built-in storage for a published Site. With a small `.herenow/data.json` manifest, a static page can save and share data across visitors straight from browser JavaScript, with no server, database, or third-party service to set up. Use it for things like a shared checklist, form, survey, poll, interactive widgets, feedback, etc. Every record is validated and access-controlled by here.now.

The usual workflow is simple: add a manifest, publish the Site, then call the Site-local data endpoints from your page. Use the owner API when an agent, script, or dashboard needs to inspect or manage records with an API key.

### [Build flow](https://here.now/docs\#sitedata-build-flow)

1. Create `.herenow/data.json` at the root of the directory you publish.
2. Declare each collection, its fields, access rules, and optional rate limit.
3. Publish a new Site or update an existing one with `./scripts/publish.sh ./site-dir` or the publish API.
4. From browser JavaScript, call `./.herenow/data/:collection` relative to the published page.
5. Use the owner API under `/api/v1/publishes/:slug/data/...` for authenticated admin workflows.

### [Manifest](https://here.now/docs\#sitedata-manifest)

A manifest has up to 10 collections. Each collection has up to 50 fields. Collection and field names must be lowercase identifiers: `^[a-z][a-z0-9_]*$`, max 64 characters.

```
// .herenow/data.json
{
  "collections": {
    "entries": {
      "fields": {
        "name": { "type": "string", "required": true, "maxLength": 80, "trim": true },
        "message": { "type": "string", "required": true, "maxLength": 1000, "trim": true },
        "attending": { "type": "boolean", "default": true }
      },
      "access": {
        "read": "public",
        "insert": "public",
        "update": "owner",
        "delete": "owner"
      },
      "rateLimit": "10/hour/ip"
    }
  }
}
```

Supported field types: `string`, `number`, `integer`, `boolean`, `url`,`email`, `datetime`, `array`, and `object`. String, array, and object fields can have size caps; number and integer fields can have `minimum` and `maximum`; URL fields can limit`allowedProtocols`.

Reserved field names: `id`, `site_slug`, `collection`, `data`, `status`,`created_at`, `updated_at`, and `created_by_account_id`.

### [Browser API](https://here.now/docs\#sitedata-browser-api)

Site Data endpoints are relative to the published Site, not to `https://here.now`. In browser code, use a relative URL so the same page works on the slug URL, a handle, a custom domain, or a mounted path.

```
// List the newest records in the "entries" collection.
const listRes = await fetch("./.herenow/data/entries?limit=50");
const { records, nextCursor } = await listRes.json();

// Page forward when nextCursor is present.
if (nextCursor) {
  const nextRes = await fetch(
    `./.herenow/data/entries?limit=50&cursor=${encodeURIComponent(nextCursor)}`
  );
  const nextPage = await nextRes.json();
}

// Create a record. Use Idempotency-Key when a retry might repeat the same submit.
const createRes = await fetch("./.herenow/data/entries", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "Idempotency-Key": crypto.randomUUID()
  },
  body: JSON.stringify({
    name: "Ada",
    message: "See you there",
    attending: true
  })
});
const { record } = await createRes.json();

// Read one record by id.
const readRes = await fetch(`./.herenow/data/entries/${record.id}`);
const { record: freshRecord } = await readRes.json();
```

List responses include `records` and `nextCursor`. Create and read responses return`{ record }`. If a request fails, check the JSON error body; here.now returns an `error`string plus structured fields such as `code`, `message`, `retry_after`, and`docs_url` when available.

If a collection allows public mutation, browser code can update or delete records too. Enable it only for data that can tolerate visitor edits.

```
// PATCH is available publicly only when update is public and publicMutation is "open".
await fetch(`./.herenow/data/todos/${recordId}`, {
  method: "PATCH",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ done: true })
});

// DELETE is available publicly only when delete is public and publicMutation is "open".
await fetch(`./.herenow/data/todos/${recordId}`, {
  method: "DELETE"
});
```

### [Owner API](https://here.now/docs\#sitedata-owner-api)

Use the owner API from agents, scripts, and admin tools. It talks to `https://here.now`, requires`Authorization: Bearer <API_KEY>`, and only works for Sites owned by that account.

Signed-in owners can also use the dashboard: open a Site's `Manage` view, then its`Database` section to view collections, inspect records, refresh the list, and delete individual records. Dashboard deletes use the same owner path as the API and soft-delete the record.

```
# List records in a collection.
curl -sS "https://here.now/api/v1/publishes/{slug}/data/entries?limit=50" \
  -H "Authorization: Bearer $HERENOW_API_KEY"

# Create a record.
curl -sS "https://here.now/api/v1/publishes/{slug}/data/entries" \
  -X POST \
  -H "Authorization: Bearer $HERENOW_API_KEY" \
  -H "content-type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"name":"Ada","message":"See you there","attending":true}'

# Read, patch, or delete one record.
curl -sS "https://here.now/api/v1/publishes/{slug}/data/entries/{recordId}" \
  -H "Authorization: Bearer $HERENOW_API_KEY"

curl -sS "https://here.now/api/v1/publishes/{slug}/data/entries/{recordId}" \
  -X PATCH \
  -H "Authorization: Bearer $HERENOW_API_KEY" \
  -H "content-type: application/json" \
  -d '{"attending":false}'

curl -sS "https://here.now/api/v1/publishes/{slug}/data/entries/{recordId}" \
  -X DELETE \
  -H "Authorization: Bearer $HERENOW_API_KEY"
```

### [Access rules](https://here.now/docs\#sitedata-access)

Access can be `public`, `owner`, or `none` per action. Defaults are read `public` and insert/update/delete `owner`. Public writes require the browser request`Origin` to match the Site origin, so another website cannot casually post to your collection.

Public update and delete are intentionally opt-in twice: set the action to `public` and add`"publicMutation": "open"`. Use this only for data that can tolerate public edits, such as a collaborative board, scratch pad, or demo.

Open-mutation collections can use `PATCH /.herenow/data/:collection/:recordId` to merge fields into an existing record. Public `DELETE` uses the same record path, but only when delete access is`public` and `publicMutation` is `open`.

```
{
  "collections": {
    "todos": {
      "fields": {
        "text": { "type": "string", "required": true, "maxLength": 200 },
        "done": { "type": "boolean", "default": false }
      },
      "access": {
        "read": "public",
        "insert": "public",
        "update": "public",
        "delete": "owner"
      },
      "publicMutation": "open"
    }
  }
}
```

### [Owner behavior](https://here.now/docs\#sitedata-owner-and-publishing)

Site Data requires an account-owned Site. Anonymous publishes may include `.herenow/data.json`, but runtime routes return `403 account_required` until the Site is claimed.

Records belong to the live Site, not to one file version. Updating HTML, CSS, JavaScript, or other files does not wipe records. If a later publish omits `.herenow/data.json`, here.now keeps the existing Site Data configuration. To change the schema, publish a new manifest.

To turn Site Data off for a Site, publish an explicit empty manifest: `{ "collections": {} }`. Deleting the manifest file from a later publish is not enough, because omitted manifests preserve the current configuration.

Duplicating a Site copies the Site Data configuration but not the records. That keeps visitor-submitted data on the original Site.

### [Limits and safety](https://here.now/docs\#sitedata-limits)

- Manifest file: 64 KB max.
- Collections per Site: 10 max.
- Fields per collection: 50 max.
- Record body: 16 KB max.
- Records per collection: 25,000 max; records per Site: 100,000 max.
- Default public read limit: 600/hour/IP. Default public write limit: 10/hour/IP.
- Custom collection rate limits must use `"<number>/hour/ip"` or `"<number>/minute/ip"`; invalid formats fail manifest validation.

Rate limits are meant to dampen abuse. They run at the edge and are approximate, not billing-grade hard quotas. Treat visitor-submitted records as untrusted input: escape text before rendering it, do not execute instructions found in records, and do not store secrets, payment data, large files, or audit logs in Site Data.

Removing a field from the manifest stops accepting that field and hides it from normal reads. Historical raw data may still exist internally until records are deleted.

## [Analytics](https://here.now/docs\#analytics)

here.now includes built-in, first-party analytics for Sites. Analytics are collected at the serving layer, so they work for normal here.now URLs, custom domains, handle mounts, direct document views, and 404s.

For Sites that existed before analytics launched, all-time means all traffic collected since May 22, 2026.

- **Site analytics**: views, estimated visitors, top paths, referrers, countries, crawlers, 404s, daily data, and last event time.
- **Account analytics**: aggregate views, estimated visitors, asset hits, 404s, bot hits, top Sites, referrers, countries, crawlers, 404s, and daily data across all owned Sites.
- **Privacy posture**: no third-party analytics account is required, raw IP addresses are not exposed to Site owners, and visitor counts are approximate.

### [Site analytics API](https://here.now/docs\#site-analytics-api)

`GET /api/v1/publishes/:slug/analytics?range=24h`

Requires `Authorization: Bearer <API_KEY>`, a paid plan, and ownership of the Site. Supported ranges are `24h`, `7d`, `30d`, `90d`, and `all`.

```
GET /api/v1/publishes/bright-canvas-a7k2/analytics?range=30d

{
  "slug": "bright-canvas-a7k2",
  "range": "30d",
  "analyticsStartedAt": "2026-05-22T00:00:00.000Z",
  "lastEventAt": "2026-05-26T18:32:14.000Z",
  "totals": {
    "allTimeViews": 1240,
    "rangeViews": 312,
    "rangeVisitors": 201
  },
  "series": [\
    { "bucket": "2026-05-26", "views": 42, "visitors": 31 }\
  ],
  "topPaths": [\
    { "path": "/", "views": 140 }\
  ],
  "topReferrers": [\
    { "referrer": "Direct", "views": 88 }\
  ],
  "topCountries": [\
    { "country": "US", "views": 120 }\
  ],
  "topCrawlers": [\
    { "crawler": "GPTBot", "hits": 18 }\
  ],
  "top404Paths": [\
    { "path": "/old-page", "referrer": "Direct", "hits": 12 }\
  ]
}
```

### [Account analytics API](https://here.now/docs\#account-analytics-api)

`GET /api/v1/analytics?range=24h`

Returns account-level rollups across all owned Sites for paid accounts. The dashboard uses this endpoint for the Analytics tab. Supported ranges are `24h`, `7d`, `30d`, `90d`, and `all`.

```
GET /api/v1/analytics?range=30d

{
  "range": "30d",
  "analyticsStartedAt": "2026-05-22T00:00:00.000Z",
  "lastEventAt": "2026-05-26T18:32:14.000Z",
  "totals": {
    "allTimeViews": 8420,
    "rangeViews": 1204,
    "rangeVisitors": 822,
    "assetHits": 330,
    "notFoundHits": 18,
    "botHits": 91
  },
  "series": [\
    { "bucket": "2026-05-26", "views": 120, "visitors": 84 }\
  ],
  "topSites": [\
    { "slug": "bright-canvas-a7k2", "views": 312, "visitors": 201 }\
  ],
  "topReferrers": [\
    { "referrer": "Direct", "views": 420 }\
  ],
  "topCountries": [\
    { "country": "US", "views": 510 }\
  ],
  "topCrawlers": [\
    { "crawler": "GPTBot", "hits": 91 }\
  ],
  "top404Paths": [\
    { "slug": "bright-canvas-a7k2", "path": "/old-page", "hits": 12 }\
  ]
}
```

### [Definitions and limits](https://here.now/docs\#analytics-definitions)

- **View**: a successful top-level Site navigation. Asset requests, downloads, 404s, errors, and known crawler requests are tracked separately.
- **Visitor**: an approximate daily unique visitor derived from privacy-preserving request signals. It is useful as an estimate, not as an exact count of people.
- **Direct**: traffic with no usable referrer.
- **Crawlers**: known bot and AI crawler user agents, such as GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot, Googlebot, Bingbot, Bytespider, Amazonbot, and Applebot.
- **Raw events**: retained for a short debugging window. Long-term analytics are served from durable daily rollups.

## [Versions](https://here.now/docs\#versions)

Every publish records an immutable version: the initial create, every update, console edits, and duplications. Versions capture the site's files plus its rendering settings (viewer metadata, SPA mode, proxy routes, and Site Data schema), so an old version previews and restores exactly as it served. Access mode, passwords, prices, and domains are site-level settings and are never changed by version operations.

Versions are recorded for every account. **Browsing, previewing, and restoring them requires a paid plan** (any paid tier) and is included for all workspace Sites — a free account's history is kept and unlocks on upgrade.

Republishing byte-identical content does not create a new version: finalize responds with`"unchanged": true` and the already-live `currentVersionId` (which will differ from the versionId minted at create/update). Settings carried by the update, such as`ttlSeconds` or `viewer`, are still applied.

### [List versions](https://here.now/docs\#versions-list)

`GET /api/v1/publish/:slug/versions`

Requires `Authorization: Bearer <API_KEY>` (must own the site). Newest first.

```
{
  "slug": "bright-canvas-a7k2",
  "currentVersionId": "01J...",
  "versions": [\
    {\
      "versionId": "01J...",\
      "createdAt": "2026-08-11T18:02:11.000Z",\
      "source": "publish-finalize",\
      "fileCount": 12,\
      "totalBytes": 482133,\
      "restoredFromVersionId": null,\
      "clientSource": "cursor",\
      "current": true,\
      "thumbnailUrl": "/api/thumbnails/bright-canvas-a7k2/01J...",\
      "previewUrl": "https://01j...--bright-canvas-a7k2.here.now/"\
    }\
  ]
}
```

Entries with `restoredFromVersionId` set are restore events — audit history recording when a rollback happened. Their `thumbnailUrl` and `previewUrl` point at the restored content version; they cannot themselves be restored or deleted.

`clientSource` is the normalized client that published the version, from the`X-HereNow-Client` header (for example `cursor`, `claude_code`,`codex`, `dashboard`). It is `null` for versions published before attribution was recorded.

### [Preview a version](https://here.now/docs\#versions-preview)

Every version has a permanent preview host: `{versionId}--{slug}.here.now` (the`previewUrl` in the list response). Previews serve the full version — sub-pages and assets included — and are **owner-only**: opening one in a browser signed in to here.now authenticates automatically; signed-out visitors are asked to sign in. Previews are never indexed and are not shareable with non-owners. Non-browser requests receive`401` — preview hosts are a browser surface.

### [Restore a version](https://here.now/docs\#versions-restore)

`POST /api/v1/publish/:slug/versions/:versionId/restore`

Instantly makes the version live again — a pointer flip, no re-upload, typically serving within seconds. The restored version's files, viewer settings, SPA mode, proxies, and Site Data schema take effect; access mode, password, price, and domains keep their current values. The restore is recorded in the history as a restore event, so the timeline stays honest. Nothing is deleted — you can restore forward again at any time.

```
{
  "success": true,
  "slug": "bright-canvas-a7k2",
  "siteUrl": "https://bright-canvas-a7k2.here.now/",
  "currentVersionId": "01J...",
  "eventVersionId": "01J..."
}
```

Returns `409 conflict` if the version is already live, if it is a restore event, or if a publish is currently in flight (finalize it or let it expire first). Site metadata (display name/description) regenerates for the restored content shortly after.

### [Delete a version](https://here.now/docs\#versions-delete)

`DELETE /api/v1/publish/:slug/versions/:versionId`

Permanently removes a historical version — its files, snapshot, thumbnail, and history entry. Use this when a past version contained something that should no longer be retrievable (a leaked key, private data) without deleting the whole site. The live version cannot be deleted; restore events cannot be deleted. This is irreversible.

In the dashboard, the site drawer's **Versions** panel shows the same history with thumbnails, preview links, and Restore/Delete controls. From the CLI:`herenow versions <slug>` and `herenow rollback <slug> <versionId>`.

## [Profile](https://here.now/docs\#profile)

Every account gets a public profile at `https://here.now/@username`. The profile shows the Sites the user wants to share publicly. Profiles are on by default, but new Sites are not added to a profile by default. A JSON version is also available at `https://here.now/@username/feed.json` as a convenience for agents and tooling.

### [Username](https://here.now/docs\#profile-username)

A username is assigned when the account is created. The user can change it at any time. The profile URL uses the current username:

```
https://here.now/@username
```

Example:

```
https://here.now/@user7k29mx
```

Usernames must be lowercase letters, numbers, or hyphens, with no leading or trailing hyphen. Changing the username changes the profile URL. It does not change the account, API key, Sites, custom domains, subdomain handles, Drives, or billing settings.

Change username:

```
curl -sS -X PATCH https://here.now/api/v1/profile/username \
  -H "Authorization: Bearer <API_KEY>" \
  -H "content-type: application/json" \
  -d '{ "username": "adam" }'
```

### [Profile settings](https://here.now/docs\#profile-settings)

Agents can read and update whether the profile is enabled and whether future Sites are added to the profile automatically.

Get the current profile:

```
curl -sS https://here.now/api/v1/profile \
  -H "Authorization: Bearer <API_KEY>"
```

Update profile settings:

```
curl -sS -X PATCH https://here.now/api/v1/profile \
  -H "Authorization: Bearer <API_KEY>" \
  -H "content-type: application/json" \
  -d '{ "enabled": true, "addNewSitesToProfile": false }'
```

Use `enabled` to turn the public profile on or off. Use`addNewSitesToProfile` to control whether future authenticated Sites are added to the profile automatically.

Users can also do this from the dashboard's `Profile` settings, where they can view their profile URL, edit their username, turn the profile on or off, and toggle automatic profile listing for new Sites.

### [Add or remove Sites](https://here.now/docs\#profile-sites)

List Sites on the profile:

```
curl -sS https://here.now/api/v1/profile/sites \
  -H "Authorization: Bearer <API_KEY>"
```

Add a Site to the profile:

```
curl -sS -X POST https://here.now/api/v1/profile/sites \
  -H "Authorization: Bearer <API_KEY>" \
  -H "content-type: application/json" \
  -d '{ "slug": "bright-canvas-a7k2" }'
```

Adding a Site that is already on the profile is safe and returns success.

Remove a Site from the profile:

```
curl -sS -X DELETE https://here.now/api/v1/profile/sites/bright-canvas-a7k2 \
  -H "Authorization: Bearer <API_KEY>"
```

Password-protected and restricted Sites cannot be shown on a public profile. If a Site is already on the profile, enabling either access mode removes it from the profile.

Via dashboard: users can open a Site's manage view and toggle `Show on my profile` under Access & visibility. When it is off, the Site stays published but no longer appears on the profile.

### [Profile errors](https://here.now/docs\#profile-errors)

Profile API errors include a human-readable `error` and a stable machine-readable `code`:

```
{
  "error": "This username is unavailable.",
  "code": "username_unavailable",
  "message": "This username is unavailable."
}
```

Common profile error codes:

```
unauthorized
invalid_request
invalid_username
username_unavailable
site_not_found
site_gated
```

## [Variables](https://here.now/docs\#variables)

Store API keys and secrets on your account. Sites reference them in proxy route manifests to make authenticated API calls server-side — without exposing keys in client-side code.

### [Create or update a variable](https://here.now/docs\#variables-create)

`PUT /api/v1/me/variables/:name`

Requires `Authorization: Bearer <API_KEY>`.

```
PUT /api/v1/me/variables/OPENROUTER_API_KEY
{
  "value": "sk-or-v1-abc123",
  "allowedUpstreams": ["openrouter.ai"]  // optional
}
```

Variable names must be uppercase letters, digits, and underscores, starting with a letter. Max 50 variables per account, 4 KB per value. `allowedUpstreams` restricts which upstream domains the variable can be sent to (optional, omit for no restriction).

### [List variables](https://here.now/docs\#variables-list)

`GET /api/v1/me/variables` — returns variable names, upstream pinning, and timestamps. Values are never returned.

### [Delete a variable](https://here.now/docs\#variables-delete)

`DELETE /api/v1/me/variables/:name`

You can also manage variables from the dashboard (Variables tab).

## [Proxy routes](https://here.now/docs\#proxy-routes)

Sites can make authenticated API calls to external services by including a `.herenow/proxy.json` manifest in the published files. The manifest maps paths on the site to upstream APIs with variable-injected headers.

```
// .herenow/proxy.json
{
  "proxies": {
    "/api/chat": {
      "upstream": "https://openrouter.ai/api/v1/chat/completions",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer ${OPENROUTER_API_KEY}"
      }
    },
    "/api/db/*": {
      "upstream": "https://xyz.supabase.co/rest/v1",
      "headers": {
        "apikey": "${SUPABASE_KEY}"
      }
    }
  }
}
```

Keys are site-local paths. Exact paths (`/api/chat`) match that path only. Prefix patterns (`/api/db/*`) match any path starting with that prefix — the rest is appended to the upstream URL. Query parameters are forwarded automatically.

`${VAR_NAME}` references in headers are resolved from the account's variables at request time. Headers like `Content-Type` and `Accept` are forwarded from the browser automatically. The manifest only needs to declare the auth header.

The frontend calls a relative URL on the site (`fetch('/api/chat')`). here.now intercepts the request, injects the credentials server-side, forwards to the upstream, and streams the response back. Streaming (SSE) works out of the box for LLM responses.

Proxy routes require an authenticated site. Rate limit: 100 requests/hour/IP by default, overridable per route with `"rateLimit": "20/hour/ip"`. Request body limit: 10 MB. The `.herenow/proxy.json` file is never served to site visitors.

## [List sites](https://here.now/docs\#list)

`GET /api/v1/publishes` (alias: `GET /api/v1/artifacts`)

Requires `Authorization: Bearer <API_KEY>`. Returns all sites owned by the authenticated user.

By default the list is scoped to one account at a time: without a selector it returns your personal Sites only; with `X-HereNow-Account` it returns that workspace's Sites instead. Add`?scope=all` to list everything you can see in one call — personal, shared, and all joined workspaces. `scope=all` responses are cursor-paginated (`limit` up to 100, opaque`nextCursor`) and each row adds `displayName`, `ownership`(`owned`/`shared`/`workspace`), a `workspace` object on workspace rows, and`primaryUrl` (the label URL where one exists). It cannot be combined with an account selector.

```
{
  "publishes": [\
    {\
      "slug": "bright-canvas-a7k2",\
      "siteUrl": "https://bright-canvas-a7k2.here.now/",\
      "updatedAt": "2026-02-18T...",\
      "expiresAt": null,\
      "status": "active",\
      "currentVersionId": "01J...",\
      "pendingVersionId": null\
    }\
  ]
}
```

## [Get site details](https://here.now/docs\#get)

`GET /api/v1/publish/:slug` (alias: `GET /api/v1/artifact/:slug`)

Requires `Authorization: Bearer <API_KEY>` (owner only). Returns metadata and the full file manifest for the current live version.

```
{
  "slug": "bright-canvas-a7k2",
  "siteUrl": "https://bright-canvas-a7k2.here.now/",
  "status": "active",
  "createdAt": "2026-02-18T...",
  "updatedAt": "2026-02-18T...",
  "expiresAt": null,
  "currentVersionId": "01J...",
  "pendingVersionId": null,
  "displayName": "Bright Canvas",
  "displayDescription": "A small static site with generated artwork and notes.",
  "metadata": {
    "displayName": "Bright Canvas",
    "displayDescription": "A small static site with generated artwork and notes.",
    "displayNameSource": "caller",
    "displayDescriptionSource": "content_generated"
  },
  "manifest": [\
    { "path": "index.html", "size": 1234, "contentType": "text/html; charset=utf-8", "hash": "a1b2c3d4..." },\
    { "path": "assets/app.js", "size": 999, "contentType": "text/javascript; charset=utf-8", "hash": "e5f6a7b8..." }\
  ]
}
```

`displayName` and `displayDescription` are owner-facing Site metadata. Personal Site URLs continue to use `slug` and `siteUrl`. The `metadata` object repeats the effective values with their source. The `manifest` lists all files in the current version. File contents can be fetched from the live `siteUrl` (e.g. `https://bright-canvas-a7k2.here.now/index.html`).

## [Refresh upload URLs](https://here.now/docs\#refresh)

`POST /api/v1/publish/:slug/uploads/refresh` (alias: `POST /api/v1/artifact/:slug/uploads/refresh`)

Requires `Authorization: Bearer <API_KEY>`. Returns fresh presigned URLs for a pending upload (same version). Use when URLs expire mid-upload.

## [Search sites](https://here.now/docs\#search-sites)

`GET /api/v1/publishes/search?q=<query>`

Requires `Authorization: Bearer <API_KEY>`. Searches the authenticated user's active owned Sites by slug, URL/domain, viewer title and description, file path, and indexed text content. Password-protected Sites are included for the owner because search reads stored publish files, not public URLs.

Optional query parameters: `limit` defaults to `20` and is capped at `100`;`cursor` accepts the opaque `nextCursor` returned by a previous page. Add `includeShared=1` to include accepted/opened Sites shared with the authenticated account.

With `includeShared=1`, personal-scope search also spans every workspace you belong to — one call covers personal, shared, and workspace Sites (workspace-owned results carry a`workspace: { displayName, subdomain }` object and a label `primaryUrl`). Send`X-HereNow-Account` to scope the search to a single workspace instead.

```
GET /api/v1/publishes/search?q=hyperliquid&limit=20&includeShared=1

{
  "query": "hyperliquid",
  "nextCursor": null,
  "results": [\
    {\
      "slug": "amber-cosmos-wzq3",\
      "siteUrl": "https://amber-cosmos-wzq3.here.now/",\
      "primaryUrl": "https://research.example.com/",\
      "displayName": "Hyperliquid Notes",\
      "ownership": "owned",\
      "sharedSource": null,\
      "currentVersionId": "01K...",\
      "indexedVersionId": "01K...",\
      "updatedAt": "2026-05-19T18:23:11.000Z",\
      "matchedFields": ["display_name", "domain", "content"],\
      "matchedPaths": ["notes/markets.html"],\
      "snippet": "matches in notes/markets.html: notes about Hyperliquid liquidity..."\
    }\
  ]
}
```

Use `primaryUrl` when present as the preferred owner-facing URL; keep `siteUrl` as the canonical`{slug}.here.now` URL. `matchedPaths` identifies matching files. `matchedFields` can include values such as `slug`, `url`, `domain`, `display_name`, `viewer_title`, `viewer_description`, and `content`.`ownership` is `owned` or `shared`. For shared results, `sharedSource` is `email` or `domain`.

Shared results are limited to Sites the authenticated account has already opened and verified through the restricted access gate. Exact-email and domain allowlist entries do not automatically make a Site searchable for the recipient.

Search indexes current live Site versions only. It covers HTML, Markdown, plain text, SVG text, file paths, and Site metadata. It does not currently extract PDF body text, Office docs, JSON bodies, JavaScript bundles, CSS, images, audio, video, archives, historical versions, or Drive files. Very large files are capped, so terms deep in a large page may not match.

## [Workspaces](https://here.now/docs\#workspaces)

A workspace is a shared here.now account for a team.

Sites published into a workspace are owned by the workspace — not by the person who published them — so teammates can find, view, update, and duplicate them, and they survive any individual member leaving.

Every workspace has its own subdomain (`{workspace}.here.now`), and workspace Sites get memorable URLs like `{label}.{workspace}.here.now`.

You join a workspace by accepting an email invite from an admin, or — when an admin has enabled auto-join for the team's email domain — just by signing in with a matching address and joining yourself, either from the dashboard or automatically on your first visit to a member-gated Site. See [Members, invites & auto-join](https://here.now/docs#workspace-members).

- Two roles: `admin` (manages members, settings, domains, variables, and every Site) and `member` (publishes Sites, manages their own, duplicates any member-visible Site).
- Your personal account is unchanged: requests without an account selector always target it.
- Workspace membership uses normal here.now sign-in (email code/link or Google) — no separate SSO setup.

### [Account selector](https://here.now/docs\#workspace-selector)

Your API key is personal. To act inside a workspace, add an account selector to the request: the`X-HereNow-Account` header (workspace subdomain or account UUID) on any endpoint that supports it, or the `"account"` body field on publish create. No selector means your personal account.

```
curl -sS https://here.now/api/v1/accounts \
  -H "Authorization: Bearer <API_KEY>"
```

`GET /api/v1/accounts` lists your personal account and every workspace you belong to — each with its`subdomain`, role, and a ready-to-use `selector` object — so agents can discover valid selectors in one call. A selector that does not resolve returns `404 account_not_found` (by UUID) or`409 account_selector_stale` (by subdomain — re-list accounts and retry).

### [Create a workspace](https://here.now/docs\#workspace-create)

```
curl -sS https://here.now/api/v1/accounts \
  -H "Authorization: Bearer <API_KEY>" \
  -H "content-type: application/json" \
  -d '{ "displayName": "Acme", "subdomain": "acme" }'
```

One call creates the workspace, records you as admin, claims the subdomain, and provisions serving (wildcard DNS/SSL for label URLs). The response reports provisioning status; a `degraded` status includes a `retryEndpoint` — publishing into the workspace returns `409 workspace_not_ready`until provisioning is `active` (usually under a couple of minutes).

- Check a name first with `GET /api/v1/accounts/subdomain-availability?subdomain=acme` (advisory, not a reservation).
- Each user can have up to 3 live workspaces they created; over the cap returns `409 workspace_creation_limit` (deleting a workspace frees the slot).

### [Publish & label URLs](https://here.now/docs\#workspace-publish)

Publishing into a workspace is the same create → upload → finalize flow with an account selector on create:

```
curl -sS https://here.now/api/v1/publish \
  -H "Authorization: Bearer <API_KEY>" \
  -H "content-type: application/json" \
  -d '{
    "account": "acme",
    "files": [\
      { "path": "index.html", "size": 1234, "contentType": "text/html; charset=utf-8" }\
    ]
  }'
```

Finalize gives the Site a workspace **label URL** — `{label}.acme.here.now`, returned as `accountUrl` — alongside the canonical `{slug}.here.now` URL, which keeps serving. Omit `workspaceLabel` and a readable label is generated from the Site's content; supply one to choose it (colliding labels are auto-suffixed). To require an exact name, send`"workspaceLabelStrategy": "exact"` — a collision then returns `409 workspace_label_taken`instead of bumping.

### [Access](https://here.now/docs\#workspace-access)

Workspace Sites default to **workspace members** (`account_members`): visitors must sign in and hold a membership. The other audience is **Public** (`anyone_with_link`), and a Public Site can additionally require a shared **password** (set via the metadata endpoint; members are password-challenged like any visitor). Per-address `restricted` allowlists are personal-Site-only — on workspace Sites the access API returns `409 workspace_access_mode_unsupported`.

### [Members, invites & auto-join](https://here.now/docs\#workspace-members)

People join a workspace one of two ways. An admin sends an **email invite** (choosing their role), and the recipient accepts from the email using their normal here.now sign-in. Or, if an admin has set an **auto-join rule** for the team's email domain, anyone who signs in with a matching address can join themselves — one click in the dashboard, or automatically when they first visit a member-gated Site. Members can leave at any time, admins can remove members or change roles, and every membership action is available via the API:

- `GET/POST /api/v1/accounts/{accountId}/invites` — list or send email invites (with a role); revoke with `DELETE .../invites/{inviteId}`. Invitees accept from the email or via the API below.
- `GET /api/v1/me/invites` — your own pending workspace invites, each with ready-to-call accept/decline endpoints (`POST /api/v1/accounts/{accountId}/invites/{inviteId}/accept` or `.../decline`).
- `GET /api/v1/accounts/{accountId}/members` — list members; `PATCH .../members/{userId}` changes a role; `DELETE .../members/{userId}` removes a member (or yourself, to leave). A workspace always keeps at least one admin.
- `GET/POST /api/v1/accounts/{accountId}/domain-rules` — admin-managed auto-join rules: anyone signing in with a matching email domain can join in one click from the dashboard, and gains access when visiting member-gated Sites. Consumer email domains (gmail.com etc.) can't be rules.
- `GET /api/v1/accounts?includeJoinable=1` — adds a `joinable` list: workspaces you could join right now because an active auto-join rule matches your email domain. Join one with `POST /api/v1/accounts/{accountId}/domain-rules/apply`.

### [Managing workspace Sites](https://here.now/docs\#workspace-manage)

Updates, metadata, access changes, and deletes on a workspace Site are allowed for the Site's original publisher and workspace admins (send the account selector). Any active member can duplicate a member-visible Site into the same workspace with `POST /api/v1/publish/{slug}/duplicate`. Site Data works on workspace Sites with the same publisher-or-admin management rule.

Labels can be renamed with `PATCH /api/v1/accounts/{accountId}/site-labels/{label}` (admins or the original publisher): the new URL serves immediately and the old label 307-redirects, so shared links keep working.

### [Domains & Variables](https://here.now/docs\#workspace-domains-variables)

Workspaces support custom domains and service variables at parity with personal accounts — the same`/api/v1/domains` and `/api/v1/me/variables` endpoints with the `X-HereNow-Account`header. Admins add domains and manage variables; the original publisher or an admin connects a Site to a workspace domain. Variable values are write-only, and the workspace subdomain itself never takes domain mounts.

### [Rename & delete](https://here.now/docs\#workspace-admin)

Admins can rename the workspace's display name (`PATCH /api/v1/accounts/{accountId}` with`displayName`; the subdomain is permanent), set a workspace icon (`iconEmoji` — a single emoji, or `null` to remove it), and delete the workspace (`DELETE /api/v1/accounts/{accountId}`) — deletion permanently removes its Sites, memberships, domains, and variables.

### [Workspace limits](https://here.now/docs\#workspace-limits)

Workspaces are free. Each workspace includes 500 Sites, 10 GB storage, 1 custom domain, and up to 50 members; each user can create up to 3 workspaces. Limits may evolve as we learn how teams use workspaces — contact [hello@here.now](mailto:hello@here.now) if you need more today.

## [Drives](https://here.now/docs\#drives)

Drives are private cloud folders where agents can store files (documents, context, memory, plans, assets, media, research, code, etc), share them with other agents, and continue across sessions and tools.

Drives are personal-account only for now: workspaces do not have shared Drives, and Drive requests ignore the account selector.

- Drive IDs look like `drv_abc...`; version IDs look like `dv_abc...`; token IDs look like `dtok_abc...`.
- Drive tokens start with `drv_live_`, are stored hashed, and are shown only once when minted.
- Tokens can be read-only or write, can be scoped to a `pathPrefix`, and can optionally manage narrower tokens.
- Writes are staged to storage, finalized with ETag preconditions, and committed into a versioned manifest.
- Every signed-in account has a default Drive named `My Drive`. The default endpoint is idempotent and can repair missing defaults.

### [Drive helper](https://here.now/docs\#drive-helper)

Fresh skill installs include `scripts/drive.sh`. It wraps Drive API calls, handles staged uploads, preserves ETags, prints share blocks, and imports/exports folders.

```
./scripts/drive.sh default
./scripts/drive.sh create "Research"
./scripts/drive.sh put Research notes/today.md --from ./notes/today.md
./scripts/drive.sh ls Research notes/
./scripts/drive.sh import My Drive agent-context/ --from ./notes --dry-run
./scripts/drive.sh export My Drive agent-context/ --to ./agent-context
./scripts/drive.sh share Research --perms write --prefix notes/ --ttl 7d
./scripts/drive.sh share Research --perms write --ttl 7d --manage-tokens --label "token manager"
```

### [Sharing Drives](https://here.now/docs\#drive-sharing)

If you are giving an agent access to your own here.now account, the simplest option is usually your account API key. Put it in `~/.herenow/credentials` or pass `--api-key`; the agent can then use your default`My Drive` and any other Drives you own.

Use Drive tokens when you want scoped access instead of full account access. Tokens are tied to one Drive, can be read-only or write, can expire, and can be limited to a folder with `pathPrefix`. This is the right shape for another person's agent, a temporary handoff, or one of your own agents that should only touch part of a Drive.

```
# Give another agent write access only under notes/ for 7 days
./scripts/drive.sh share Research --perms write --prefix notes/ --ttl 7d --label "docs agent"

# Give full-Drive read access
./scripts/drive.sh share Research --perms read --ttl 24h

# List and revoke tokens later
./scripts/drive.sh tokens Research
./scripts/drive.sh revoke Research dtok_...
```

`drive.sh share` prints a pasteable share block. The block includes a short explanation plus a structured`herenow_drive` payload with `api_base`, Drive `id`, bearer `token`, permissions, `scope`, expiry, and optional `pathPrefix`. You can paste the whole block into another agent without explaining here.now first.

Agents that receive a share block should use the included token as `Authorization: Bearer <token>`, stay inside `pathPrefix` when present, and preserve ETags on writes. A `pathPrefix` of`null` means full-Drive access for that token.

### [Drive attribution](https://here.now/docs\#drive-attribution)

Drive history attributes changes to the account API key or Drive token that made the change. If per-agent attribution matters, mint one token per agent or session and give each token a descriptive label. Shared tokens produce shared attribution.

```
./scripts/drive.sh share Research --perms write --prefix notes/ --ttl 7d --label "OpenClaw RC3 docs writer"
```

File listings include `lastModifiedBy` and `lastOperation` metadata. The dashboard displays the same data as `Last Edited By`. A token minted with`--label "OpenClaw RC3 docs writer"` appears as `OpenClaw RC3 docs writer` on files that token creates or edits. Without a label, the dashboard falls back to the `dtok_...` token id; account writes show the account email. ETags are only for concurrency control; they do not identify an agent or account.

### [Drive API](https://here.now/docs\#drive-api)

Drive routes require `Authorization: Bearer <API_KEY>` or a Drive token unless noted.

- `POST /api/v1/drives` — create a Drive.
- `GET /api/v1/drives` — list account Drives.
- `GET /api/v1/drives/default` — get the account default Drive, lazily creating `My Drive` if needed.
- `GET /api/v1/drives/:driveId/files?prefix=...` — list files.
- `GET /api/v1/drives/:driveId/files/:path` — read a file.
- `POST /api/v1/drives/:driveId/files/uploads` — stage a write and receive a presigned PUT URL.
- `POST /api/v1/drives/:driveId/files/finalize` — finalize a staged upload.
- `PATCH /api/v1/drives/:driveId/files` — atomically apply a batch against `baseVersionId` or per-op ETags.
- `POST /api/v1/drives/:driveId/files/move` and `DELETE /api/v1/drives/:driveId/files/:path` — move or delete.
- `POST /api/v1/drives/:driveId/tokens` — mint a scoped token, optionally with `manageTokens`; `GET` lists active tokens; `DELETE` revokes.

For direct file read/delete routes, URL-encode each path segment. The helper does this automatically. A delete whose path does not match a file returns `404`; it is not treated as a successful no-op. Direct finalize requires either `ifMatch` or `ifNoneMatch: "*"` from the staging request. Delete requests require an `If-Match` header for the current file ETag. Batch commits may instead use a top-level `baseVersionId` to commit a multi-file change atomically. Move requests require `ifMatch` for the source file and optionally accept `overwriteIfMatch` when replacing an existing destination.

Token mint requests use `perms` (`permissions` is accepted as an alias), and unknown fields are rejected. The one-time live token secret is returned as `secret`; the `token` field contains token metadata.

### [Publish from Drive](https://here.now/docs\#publish-from-drive)

Account owners can publish a Drive version server-side without downloading and re-uploading files. The publish route snapshots the selected Drive version into a normal published site.

```
./scripts/publish.sh --from-drive drv_... --slug my-site
./scripts/publish.sh --from-drive drv_... --version dv_... --client cursor
```

API route: `POST /api/v1/publish/from-drive` with `{ "driveId": "drv_...", "versionId": "dv_...", "slug": "optional" }`.

## [Error responses](https://here.now/docs\#errors)

Public API errors return JSON with a stable `error` field plus structured fields agents can use for recovery. Existing clients can keep reading `error`; new agents should prefer `code`, `message`, `retry_after`, and `docs_url` when present.

```
{
  "error": "Rate limit exceeded. Max 60 anonymous sites per hour.",
  "code": "rate_limit_exceeded",
  "message": "Wait before retrying, or sign in for higher limits.",
  "retry_after": 3600,
  "docs_url": "https://here.now/docs#limits"
}
```

- `400 invalid_request`: fix the request body, parameters, file paths, or JSON syntax before retrying.
- `401 unauthorized`: provide `Authorization: Bearer <API_KEY>` or use the documented anonymous flow when supported.
- `403 forbidden`: the API key or Drive token does not have access to that resource.
- `404 not_found`: check the slug, Drive id, file path, endpoint path, or account ownership.
- `409 conflict`: complete or resolve the current resource state before retrying.
- `410 gone`: the resource expired or was deleted; create a new resource instead.
- `429 rate_limit_exceeded`: wait for `retry_after` seconds or follow the `Retry-After` header.
- `503 storage_not_configured` or `service_unavailable`: retry later or contact support if it persists.
- `409 workspace_not_ready`: the workspace is still provisioning; retry the provisioning endpoint, then publish again.
- `409 workspace_label_taken`: the exact label is in use; pick another or drop `workspaceLabelStrategy`.
- `409 workspace_access_mode_unsupported`: workspace Sites support members/Public/password, not `restricted`.
- `409 workspace_creation_limit`: per-user workspace cap reached; delete an unused workspace or contact support.
- `409 account_selector_stale` / `404 account_not_found`: re-list `/api/v1/accounts` and retry with a current selector.

## [OpenAPI](https://here.now/docs\#openapi)

The stable public API is described by an OpenAPI 3.1 specification at [`/openapi.json`](https://here.now/openapi.json). Agents can use this file to discover request schemas, response schemas, authentication, and operation IDs.

The specification covers public agent-facing routes for Sites, Drives, custom domains, subdomain handles, links, variables, support, and agent-assisted API key creation. It intentionally excludes admin and internal endpoints.

## [Agent discovery](https://here.now/docs\#agent-discovery)

here.now publishes well-known discovery files so agents can find the product, docs, API spec, and skill installation surfaces without scraping the homepage.

- [`/.well-known/agent.json`](https://here.now/.well-known/agent.json) — product capabilities, auth model, docs, OpenAPI, and skill links.
- [`/.well-known/agent-card.json`](https://here.now/.well-known/agent-card.json) — agent card describing here.now skills and capabilities.
- [`/.well-known/ai-plugin.json`](https://here.now/.well-known/ai-plugin.json) — OpenAI-style plugin manifest pointing to `/openapi.json`.
- [`/.well-known/api-catalog`](https://here.now/.well-known/api-catalog) — RFC 9727 API catalog/linkset.
- [`/pricing.md`](https://here.now/pricing.md) — machine-readable pricing tiers, features, and limits.
- [`/schema-map.xml`](https://here.now/schema-map.xml) — schema map advertised from `/robots.txt`.
- [`/schema-feeds/agent-resources.jsonl`](https://here.now/schema-feeds/agent-resources.jsonl) — JSONL structured-data feed for agent resources.

These files advertise current public surfaces only. here.now does not currently claim public MCP or OAuth support.

## [Limits](https://here.now/docs\#limits)

The table below covers personal accounts. Workspace limits are listed in [Workspaces → Limits](https://here.now/docs#workspace-limits).

|  | Anonymous | Free | Hobby | Developer |
| --- | --- | --- | --- | --- |
| Storage | — | 10 GB total | 500 GB total | 2 TB total |
| Sites | — | 500 | 1,000 | Unlimited |
| Site Data | — | Included | Included | Included |
| Analytics | — | Upgrade required | Included | Included |
| Custom domains | — | 1 | 5 | 20 |
| Drives | — | 1 | 5 | 10 |
| Subdomain handle | — | — | 1 | 1 |
| Max site file size | 250 MB | 5 GB | 5 GB | 5 GB |
| Max Drive file size | — | 500 MB | 500 MB | 500 MB |
| Site expiry | 24 hours | Permanent (or custom TTL) | Permanent (or custom TTL) | Permanent (or custom TTL) |
| Drive version history | — | 7 days | 30 days | 90 days |
| Publish rate limit | 60 / hour / IP | 60 / hour | 200 / hour | 200 / hour |
| Account needed | No | Yes (sign in at here.now/dashboard) | Yes (sign in at here.now/dashboard) | Yes (sign in at here.now/dashboard) |

Total storage is shared by published site versions and current Drive files. Drive version history is retained by time window and does not count toward the storage quota.