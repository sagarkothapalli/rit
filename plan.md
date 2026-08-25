# PROJECT PRAJA-RTI: NEXT-GENERATION AI-POWERED RIGHT TO INFORMATION PLATFORM
## Product Planning Specification, Legal Framework, and Hackathon Concept Blueprint

> [!IMPORTANT]
> **PLANNING ONLY — IMPLEMENTATION ON HOLD.** This existing `plan.md` is the authoritative planning source for Praja-RTI. Do not begin or resume implementation, install dependencies, connect services, or treat any code sample below as an approved build until the user explicitly authorizes implementation. Existing code blocks are illustrative architecture sketches only.

---

### Executive Overview & Metadata

* **Project Codename:** Praja-RTI (Experimental Citizen RTI Voice Agent)
* **Target Context:** A fresh, independent redesign inspired by the workflow of the official Central Government portal [`rtionline.gov.in`](https://rtionline.gov.in/index.php), not a clone, official service, or Government of India-affiliated product.
* **Governing Statute:** Right to Information Act, 2005 (Act No. 22 of 2005), Government of India
* **Target Audience:** Indian Citizens (all literacy levels, multilingual, pan-India demographic)
* **Primary Objective:** Reduce preventable Section 6(3) misrouting through a conversational voice agent that helps citizens turn natural-language grievances into neutral requests for identifiable records, understand Central-versus-State jurisdiction, review an explainable public-authority recommendation, and confirm or correct both the request and destination before any clearly simulated hackathon preparation flow. The planned experience is mobile-first, low-clutter, accessible, and familiar to users of public-service websites while remaining visibly independent and non-official.

### Authoritative Product Direction (August 2026)

Praja-RTI is a **hackathon experiment and non-official civic-tech concept**. It must carry a clear no-government-affiliation notice and must never use official emblems, official identity, or completion language in a way that implies a government request was actually filed, paid, delivered, or accepted.

The central problem is preventable misrouting under **Section 6(3)**. A request sent to the wrong public authority may require transfer within up to five days, with additional operational delay possible depending on how the receiving authority is connected. Praja-RTI aims to reduce that risk; it cannot guarantee correct delivery, eliminate the statutory transfer process, or bypass the selected authority's own routing to the responsible CPIO.

Praja-RTI is a **voice-agent product, not a conventional form with a microphone button**. Its proposed citizen journey is:

1. The citizen explains or “rants” naturally in a preferred language. Voice is primary, with a complete text fallback.
2. Browser recording may capture real audio. A visible transcript is produced or simulated, and the citizen can interrupt, correct it, switch to text, or change language at any time.
3. The agent listens for only the essentials needed to identify records: what records or outcome are being sought, date range, location, responsible body, and desired format (such as certified copies, inspection, or electronic copies).
4. When an essential is missing, the agent asks only the necessary follow-up in plain language, explains why it helps, and accepts “I don't know” without blocking the citizen unnecessarily.
5. The agent separates grievance language from the underlying information need, summarizes what it understood, writes the complete neutral and editable RTI application for specific identifiable records, and reads or summarizes the draft back instead of forwarding the raw grievance.
6. A Central-versus-State jurisdiction check runs before mock payment. For a successful Central-directory match, the service returns exactly three public-authority candidates with plain-language reasons and ambiguity warnings. The citizen may select, search, or override; no destination is chosen silently.
7. The citizen can interrupt, correct, edit the draft, manually override routing, or split the matter. The model assists; it does not silently choose, pay, or submit.
8. Before confirmation, the citizen signs in with a verified mobile number and one-time password through a sandbox/test OTP provider, or a prominently labeled deterministic judge mode when offline. Voice intake may begin without an account; authenticated history begins only after secure verification. Production identity verification remains deferred.
9. The citizen explicitly confirms both the final request and destination before the hackathon continues to a clearly labeled mock payment. No real money is charged and no government payment gateway is contacted.
10. The cloud service creates a simulated receipt with a `DEMO` reference, timestamp, selected public authority, prepared-request summary, and mock-payment status. It may send the receipt through test/sandbox email and SMS providers with an on-screen/download fallback. No channel may say the RTI was filed, accepted, paid to, or sent to the Government of India.
11. The authenticated citizen can revisit their own demo application in **My Applications**, inspect an internal event timeline, view or download the simulated receipt, retry a failed sandbox notification, and request deletion. Every history and status screen says it is an internal Praja-RTI demo record that is not synchronized with RTI Online or any government system.

For a credential-free prototype, browser recording may be real. Speech-to-text, LLM transformation, routing, payment, messaging, OCR, and government submission may use deterministic demo behavior, but every such state must be labeled **demo**, **simulated**, **prepared**, or **recommended** as appropriate.

The authoritative hackathon scope is intentionally narrow: **voice or text → agent-authored editable RTI application → exactly three explained Central public-authority candidates on a successful directory match → sandbox OTP sign-in → citizen selection/manual override and explicit confirmation → mock payment → simulated receipt → sandbox email/SMS or on-screen fallback → authenticated internal history/status**. Real government integration, real payment, official filing or status, production identity verification and account recovery, production notification delivery, statutory tracking automation, and appeal submission are deferred.

Current official-portal context to preserve in future design decisions:

- RTI Online is for **Central Government public authorities only** and listed **2,916 public authorities** at the time of this August 2026 review.
- A submitted request reaches the selected public authority's **Nodal Officer**, who routes it to the relevant CPIO.
- A wrongly selected Central authority may transfer a request electronically when the correct authority is aligned with the portal, or through a physical process when it is not.
- The online request field is limited to **3,000 characters**; longer request text may be attached as a PDF.
- A BPL applicant attaches the relevant certificate for fee exemption.
- The official portal charges **no fee for a first appeal**.
- Status lookup uses the registration number and email together with CAPTCHA and OTP verification.
- Cases are retained in the official portal for **three years**.

These facts describe the official portal context; they do not imply that Praja-RTI connects to it.

---

## TABLE OF CONTENTS

1. [Existing System Audit & Pain Point Mapping (`rtionline.gov.in`)](#1-existing-system-audit--pain-point-mapping)
2. [Statutory & Legal Regulatory Framework (RTI Act, 2005)](#2-statutory--legal-regulatory-framework)
3. [End-to-End System Architecture](#3-end-to-end-system-architecture)
4. [Core Functional Subsystems & Technical Specifications](#4-core-functional-subsystems--technical-specifications)
   - 4.1 [Multilingual Voice Processing & Indic Speech Engine](#41-multilingual-voice-processing--indic-speech-engine)
   - 4.2 [The RTI Prompt Engineer (Grievance-to-RTI Transformation Engine)](#42-the-rti-prompt-engineer-grievance-to-rti-transformation-engine)
   - 4.3 [Explainable Public Authority & Jurisdiction Recommendation](#43-explainable-public-authority--jurisdiction-recommendation)
   - 4.4 [Citizen Review, OTP Gate, and Live Application Preview](#44-citizen-review-otp-gate-and-live-application-preview)
   - 4.5 [Mock Payment & BPL Demonstration](#45-mock-payment--bpl-demonstration)
   - 4.6 [Deferred Statutory Tracking Concept](#46-deferred-statutory-tracking-concept)
   - 4.7 [Deferred Appeal Automation Concept](#47-deferred-appeal-automation-concept)
5. [Database Architecture & Entity-Relationship Model](#5-database-architecture--entity-relationship-model)
6. [API Specifications & Contract Definitions](#6-api-specifications--contract-definitions)
7. [Frontend Architecture & Design System Specification](#7-frontend-architecture--design-system-specification)
8. [Superseded Illustrative Code Modules](#8-superseded-illustrative-code-modules-planning-reference-only)
   - 8.1 [Voice Capture & Streaming Hook (React/TypeScript)](#81-voice-capture--streaming-hook)
   - 8.2 [LLM Formulation & Transformation Pipeline (Python/FastAPI)](#82-llm-formulation--transformation-pipeline)
   - 8.3 [Hierarchical Public Authority Vector Matcher](#83-hierarchical-public-authority-vector-matcher)
   - 8.4 [SLA Tracker & Deemed Refusal Cron Service](#84-sla-tracker--deemed-refusal-cron-service)
   - 8.5 [1-Click First Appeal Generator Service](#85-1-click-first-appeal-generator-service)
9. [Edge Cases, Threat Modeling & Defensive Engineering](#9-edge-cases-threat-modeling--defensive-engineering)
10. [Hackathon Live Demonstration Strategy & Pitch Script](#10-hackathon-live-demonstration-strategy--pitch-script)
11. [Deployment, Infrastructure & CI/CD Pipeline](#11-deployment-infrastructure--cicd-pipeline)
12. [Illustrative Database Schemas & Future-State SQL DDL](#12-illustrative-database-schemas--future-state-sql-ddl)
13. [Governed Hackathon Snapshot of Official Public Authorities](#13-governed-hackathon-snapshot-of-official-public-authorities)
14. [Illustrative Frontend Interaction Sketch (Next.js + Tailwind)](#14-illustrative-frontend-interaction-sketch-nextjs--tailwind)
15. [Illustrative FastAPI Router Sketch (Planning Reference Only)](#15-illustrative-fastapi-router-sketch-planning-reference-only)
16. [End-to-End Automated Test Suite (Pytest)](#16-end-to-end-automated-test-suite-pytest)
17. [Legal Reference Index (Not a Compliance Certification)](#17-legal-reference-index-not-a-compliance-certification)

---

## 1. EXISTING SYSTEM AUDIT & PAIN POINT MAPPING

### 1.1 Legacy Portal Deconstruction (`rtionline.gov.in`)

The Government of India's current RTI portal ([`rtionline.gov.in`](https://rtionline.gov.in/index.php)) is operated by the Department of Personnel and Training (DoPT) and hosted by the National Informatics Centre (NIC). 

#### Legacy Site Structure & Assets
* **Domain:** `https://rtionline.gov.in/index.php`
* **Emblem / Header Icon:** `https://rtionline.gov.in/images/logo/indian-emblam-white.png` (State Emblem of India, Lion Capital of Ashoka)
* **Favicon / Logo:** `https://rtionline.gov.in/images/rti-header.png`
* **Version String:** `Version 2.0 - An Initiative of Department of Personnel & Training, Government of India`
* **Key Navigation Links:**
  - Submit Request (`guidelines.php?request`)
  - Submit First Appeal (`guidelines.php?appeal`)
  - View Status (`request/status.php`)
  - View History (`request/status_history.php`)
  - Public Authorities Available (`request/allpa.php`)
  - Payment Reconciliation (`request/status_pendingPayment.php`)
  - User Manual (`viewPDF.php?file=um_citizen.pdf`)
  - FAQ (`faq.php`)

```
+---------------------------------------------------------------------------------------------------+
|  [Emblem]  RTI Online - Version 2.0 (DoPT / NIC)                       [Select Lang: EN | HI]     |
+---------------------------------------------------------------------------------------------------+
|  [Home] | [Submit Request] | [Submit First Appeal] | [View Status] | [History] | [Payment Reconc] |
+---------------------------------------------------------------------------------------------------+
|  [Marquee: Important notice on CIC Second Appeal Portal integration...]                           |
|  [Warning Box: Do NOT file RTI for State Government authorities here. No refund will be given.]   |
+---------------------------------------------------------------------------------------------------+
|  +--------------------------------------------+  +---------------------------------------------+  |
|  | Box Text:                                  |  | Sidebar:                                    |  |
|  | - File RTI/First Appeals online            |  | - Static image / Banner slider              |  |
|  | - Payment: NetBanking, Cards, UPI          |  | - Login window (Username/Password/Captcha)  |  |
|  | - Central Government Public Authorities    |  | - View History link                         |  |
|  +--------------------------------------------+  +---------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
|  Help Desk: 011-24010690/691 | Email: helprtionline-dopt[at]nic[dot]in                           |
+---------------------------------------------------------------------------------------------------+
```

### 1.2 Systematic Pain Points & Failure Modes

```
+---------------------------------------------------------------------------------------------------+
|                                 LEGACY RTI PORTAL BOTTLENECKS                                    |
+------------------------------------+--------------------------------------------------------------+
| Bottleneck                         | Impact on Indian Citizen                                     |
+------------------------------------+--------------------------------------------------------------+
| 1. High Literacy & Jargon Barrier  | Users must compose structured legal English/Hindi text.      |
|                                    | 70%+ of citizens struggle to frame legally valid queries.    |
+------------------------------------+--------------------------------------------------------------+
| 2. Grievance vs. RTI Confusion     | 40%+ of applications are rejected by CPIOs because citizens  |
|                                    | write complaints ("fix road") instead of requesting records. |
+------------------------------------+--------------------------------------------------------------+
| 3. Preventable Transfer Delay      | Submitting to the wrong authority may trigger Section 6(3)  |
|    (Section 6(3) of RTI Act)       | transfer within up to 5 days plus possible operational delay.|
+------------------------------------+--------------------------------------------------------------+
| 4. State vs. Central Rejections    | Users mistakenly file State issues on Central portal, losing |
|                                    | their ₹10 fee and waiting 30 days for an invalid rejection.  |
+------------------------------------+--------------------------------------------------------------+
| 5. Silent Expiry & Lack of Alerts  | When 30 days pass without reply ("Deemed Refusal"), users    |
|                                    | forget or fail to escalate to First Appeal in time.          |
+------------------------------------+--------------------------------------------------------------+
| 6. Cumbersome Appeal Filing        | Filing a First/Second Appeal requires manually re-entering   |
|                                    | registration numbers, dates, and historical context.         |
+------------------------------------+--------------------------------------------------------------+
| 7. Complete Lack of Voice / Vernac | Zero accessibility for regional languages (Tamil, Bengali,  |
|                                    | Telugu, Marathi, Bhojpuri, Kannada, etc.) or voice input.   |
+------------------------------------+--------------------------------------------------------------+
```

---

## 2. STATUTORY & LEGAL REGULATORY FRAMEWORK

The proposed product is informed by the **Right to Information Act, 2005**. Future legal wording and automated behavior require human review; the hackathon model assists citizens and does not make binding legal determinations or perform official filing:

```mermaid
graph TD
    subgraph RTI Lifecycle & Statutory Boundaries
        REQ[RTI Request Filed - Day 0]
        SEC6_3{Wrong Dept? Sec 6.3}
        TRANS[Transfer to Correct Dept: Max 5 Days]
        RESP{CPIO Response: Sec 7.1}
        
        REQ --> SEC6_3
        SEC6_3 -- Yes --> TRANS
        SEC6_3 -- No --> RESP
        TRANS --> RESP
        
        RESP -- Replied within 30 Days --> SATISFIED{Information Satisfactory?}
        RESP -- No Reply after 30 Days --> DEEMED[Sec 7.2: Deemed Refusal]
        
        SATISFIED -- Yes --> CLOSED[Case Successfully Closed]
        SATISFIED -- No --> FA_WINDOW[Sec 19.1: First Appeal Window - 30 Days]
        DEEMED --> FA_WINDOW
        
        FA_WINDOW --> FA_SUBMIT[Submit First Appeal to FAA]
        FA_SUBMIT --> FAA_DECISION{Sec 19.6: FAA Disposal Window - 30 to 45 Days}
        
        FAA_DECISION -- Satisfied --> CLOSED
        FAA_DECISION -- Rejected / No Decision within 45 Days --> SA_WINDOW[Sec 19.3: Second Appeal Window - 90 Days]
        
        SA_WINDOW --> SA_SUBMIT[Submit Second Appeal to CIC / SIC]
        REQ -. Malafide Rejection / Refusal .-> SEC18[Sec 18: Direct Complaint to CIC - No Strict Limit]
        SA_SUBMIT --> PENALTY[Sec 20: Penalty of Rs 250/day up to Rs 25,000 on PIO]
    end
```

### 2.1 Exhaustive Section-by-Section Legal Breakdown

| Section of RTI Act 2005 | Statutory Mandate & Legal Obligation | Platform Automation / Feature Implementation |
| :--- | :--- | :--- |
| **Section 6(1)** | A person desiring to obtain any information shall make a request in writing or through electronic means in English or Hindi or in the official language of the area. | Planned voice agent supports the declared hackathon language set, with visible transcript correction and manual-text fallback; universal coverage is not promised. |
| **Section 6(3)** | Where an application is made to a public authority requesting information held by another public authority, it **shall be transferred within 5 days**. | **Pre-submission routing assistance:** recommends a likely authority, explains the match, offers alternatives and split suggestions, and requires citizen confirmation. This may reduce avoidable transfers but does not guarantee delivery or eliminate Section 6(3). |
| **Section 7(1)** | The Central Public Information Officer (CPIO) shall, within **30 days** of receipt of request, either provide information on payment of such fee or reject the request. | Legal context only for the hackathon receipt; live SLA tracking and reminders are deferred because no request is filed. |
| **Section 7(1) Proviso** | Where information sought concerns the **life or liberty** of a person, it shall be provided within **48 hours**. | **Emergency Detection Filter:** LLM scans text for imminent threats to life, liberty, or human rights; tags application with `PRIORITY_48H` flag and triggers immediate escalation. |
| **Section 7(2)** | If the CPIO fails to give decision within the period specified under Section 7(1), the CPIO shall be deemed to have **refused the request ("Deemed Refusal")**. | Deferred future concept; the simplified demo cannot trigger deemed refusal because it does not file with government. |
| **Section 7(5)** | Fee prescribed under section 6(1) must be reasonable (Rules mandate **₹10** for Central Government, waived for Below Poverty Line / BPL applicants with supporting certificate). | **Simulated Payment & BPL Flow:** demonstrates ₹10 payment or BPL certificate attachment. OCR and verification remain clearly labeled mock behavior without a live service. |
| **Section 8 & 9** | Exemptions from disclosure of information (national security, cabinet papers, commercial confidence, contempt of court, copyright violation). | **Exemption Pre-flight Warning:** AI analyzes the request; if it asks for raw defense secrets or exempt data under Sec 8(1)(a)-(j), it cautions the citizen before submission. |
| **Section 18** | Inquiry into complaints by Information Commission (refusal to accept application, unreasonable fees, misleading information). | Legal context only; a Section 18 generator is deferred and does not belong to the simplified hackathon path. |
| **Section 19(1)** | Any person who does not receive a decision within the time specified in Sec 7(1) or is aggrieved by a decision of CPIO may within **30 days** file a **First Appeal**. | Legal context only; first-appeal preparation/submission is deferred. |
| **Section 19(6)** | An appeal under Sec 19(1) shall be disposed of within **30 days** or within such extended period not exceeding **45 days** for reasons recorded in writing. | Legal context only; FAA tracking is deferred. |
| **Section 19(3)** | A second appeal against the decision under Sec 19(1) shall lie within **90 days** from the date on which the decision should have been made to the CIC. | Legal context only; CIC dossier generation and integration are deferred. |
| **Section 20(1)** | Information Commission can impose penalty of **₹250 per day** up to **₹25,000** on defaulting CPIOs who delayed without reasonable cause. | Legal context only; penalty estimation is deferred and must never imply that Praja-RTI can impose or determine a penalty. |

---

## 3. END-TO-END SYSTEM ARCHITECTURE

The hackathon defaults to a **cloud-hosted Python service using FastAPI**. The browser is responsible for consent, capture, correction, choice, accessibility preferences, and confirmation. The FastAPI service is responsible for sandbox OTP authentication, protected sessions, transcription or deterministic fallback, conversational interpretation, record-focused drafting, public-authority lookup, ownership enforcement, mock payment, simulated receipt creation, internal status history, and sandbox notifications. It never connects to RTI Online or a government department.

```mermaid
flowchart TD
    subgraph Browser [Citizen Browser / Responsive Web App]
        SHELL[Independent Demo Banner + Language + Theme + A−/A/A+]
        CONSENT[Explicit Mic + Processing Consent]
        CAPTURE[Voice Capture or Text Input]
        EDIT[Visible Editable Transcript]
        REVIEW[Editable RTI Draft + 3 Explained Candidates]
        OTP[Sandbox Mobile OTP Sign-in]
        CONFIRM[Citizen Selects / Overrides + Explicitly Confirms]
        MOCKPAY[Mock Payment UI — No Money Charged]
        RECEIPTVIEW[Simulated Receipt — On-screen / Download]
        HISTORY[My Applications + Internal Status Timeline]
    end

    subgraph Cloud [Cloud Python Service — FastAPI]
        AUTH[OTP Challenge + Protected Session]
        PREF[Device / Account Preference Sync]
        INGEST[Validated Audio / Transcript Ingestion]
        STT[STT Adapter or Deterministic Transcript Fallback]
        AGENT[Conversational Orchestrator + Missing-Detail Follow-ups]
        DRAFT[Neutral Identifiable-Records Drafting]
        ROUTE[Internal Explainable Routing API]
        GUARD[Confirmation Guard]
        PAYMOCK[Idempotent Mock Payment Service]
        RECEIPT[Idempotent Demo Receipt Service]
        NOTIFY[Idempotent Sandbox Email / SMS Dispatcher]
        APPSTORE[Owned Application + Append-only Status Events]
    end

    subgraph Data [Hackathon Data]
        DIRECTORY[(Dated Mock Public-Authority Snapshot)]
        SESSION[(Short-lived Consent / Transcript Session)]
        ACCOUNTS[(Verified Mobile Accounts + Preferences)]
        APPLICATIONS[(Owned Demo Applications + Receipts + Status Events)]
        OUTBOX[(Payment / Receipt / Notification Idempotency Outbox)]
    end

    subgraph OptionalProviders [Optional Test / Sandbox Providers]
        OTPPROVIDER[Sandbox OTP / SMS Provider]
        STTPROVIDER[Consented STT / LLM Provider]
        EMAIL[Sandbox Email Provider]
        SMS[Sandbox SMS Provider]
    end

    SHELL --> CONSENT --> CAPTURE --> INGEST
    SHELL --> PREF --> ACCOUNTS
    INGEST --> STT
    STT -. optional .-> STTPROVIDER
    STT --> EDIT --> AGENT
    AGENT -- essential detail missing --> EDIT
    AGENT -- sufficient detail --> DRAFT --> ROUTE
    ROUTE --> DIRECTORY
    ROUTE --> REVIEW --> OTP --> AUTH
    AUTH -. sandbox .-> OTPPROVIDER
    AUTH --> ACCOUNTS
    AUTH --> CONFIRM --> GUARD
    GUARD --> MOCKPAY --> PAYMOCK --> RECEIPT
    GUARD --> APPSTORE
    PAYMOCK --> APPSTORE
    RECEIPT --> OUTBOX
    RECEIPT --> RECEIPTVIEW
    RECEIPT --> APPSTORE --> APPLICATIONS
    APPLICATIONS --> HISTORY
    RECEIPT --> NOTIFY
    NOTIFY --> APPSTORE
    NOTIFY -. sandbox .-> EMAIL
    NOTIFY -. sandbox .-> SMS
    NOTIFY -- provider unavailable --> RECEIPTVIEW
    INGEST --> SESSION
```

### 3.1 Component Responsibilities

| Component | Responsibility | Explicit boundary |
| :--- | :--- | :--- |
| Browser application shell | Present a clean mobile-first flow, permanent independent-demo notice, localized language/theme/text-size controls, visible sign-in state, and simple Start/My Applications/Help navigation. | Uses no official emblem, seal, government wordmark, or copy implying affiliation. Preferences may be local; provider secrets never enter the browser. |
| Browser capture | Obtain consent; record audio or accept text; display and edit transcript; allow language switching and interruption. | Contains no provider secrets or internal API keys. Does not contact government services. |
| OTP and session service | Issue short-lived sandbox OTP challenges, securely verify them, rotate protected sessions, enforce resend/attempt limits, and support logout. | Deterministic judge OTP is clearly marked and disabled outside demo mode; it is not production identity proof. |
| Preference service | Persist theme, text-size and language per device and optionally merge them into the verified account. | Essential voice drafting cannot depend on tracking or marketing consent. |
| FastAPI ingress | Accept audio or editable transcript over TLS; validate consent token, origin, type, duration and size; rate-limit requests. | Rejects unsupported or oversized input before provider calls. |
| STT adapter | Transcribe supported speech or use a clearly labeled deterministic sample in no-key mode. | Never claims universal language coverage; low-confidence text requires correction. |
| Conversational orchestrator | Interpret the rambling concern, identify missing essentials, ask the minimum follow-up, and summarize understanding. | Does not silently invent dates, locations, authorities, or facts. |
| Drafting service | Convert the confirmed interpretation into an editable request for identifiable records. | Produces a prepared draft, not legal advice or an official filing. |
| Routing service | Query the governed mock directory and, on a successful Central match, return exactly three ranked candidates with reasons, jurisdiction/context, and ambiguity warnings. | Uses match labels and explanations, not invented or uncalibrated percentages. State, stale-data, and failure responses do not fabricate three authorities. |
| Candidate review | Let the citizen select one of the three, manually search the directory, or override the recommendations. | Requires explicit request-and-destination confirmation before mock payment. |
| Mock payment | Create a deterministic success/failure result for demonstration. | No real money, bank, UPI app, Bharatkosh, or government gateway. |
| Receipt service | Create one idempotent simulated receipt for the confirmed draft and mock payment. | Every reference and template says `DEMO` and `NOT FILED WITH GOVERNMENT`. |
| Notification dispatcher | Send through sandbox/test email and SMS providers when configured; otherwise use a deterministic outbox preview. | Production delivery and official notifications are deferred. |
| Application-history service | Store authenticated users' own prepared demo applications, current internal state, append-only events, receipts, and sandbox delivery outcomes; provide search, detail, retry, and deletion. | Derives ownership from the protected server session, never from a client-supplied user ID; this is not government status tracking. |

### 3.2 End-to-End Data Flow and Retention Boundary

1. Browser captures consent metadata and either audio or an editable transcript.
2. FastAPI validates TLS request, origin, upload type, duration, size and rate limit, then creates a short-lived session.
3. Audio is transcribed by a configured provider or deterministic no-key adapter. Audio is deleted after transcription, with a hard maximum retention of one hour for recoverable processing failures.
4. The citizen corrects the transcript. The service asks only necessary missing-detail questions and produces a confirmed interpretation plus editable RTI draft.
5. Only the normalized information need and necessary location/context are sent to the routing service; raw audio and citizen contact details are excluded.
6. A successful Central routing response contains exactly three candidates from the dated mock directory. The citizen chooses, manually searches, or overrides.
7. Before the choice can be confirmed, FastAPI verifies the citizen's mobile number through a sandbox OTP challenge and establishes a protected session. A deterministic offline judge mode may replace the provider only when prominently labeled and explicitly enabled for demo deployment.
8. The authenticated citizen explicitly confirms request text and destination. The server binds the prepared application to the authenticated owner and creates the first append-only internal status event; it never trusts a browser-supplied owner ID.
9. Mock payment returns an idempotent simulated result. Receipt generation returns the same receipt for the same confirmation and idempotency key and stores it in the citizen's internal application history.
10. The notification outbox attempts sandbox email and SMS independently. Failure in either channel does not invalidate the receipt; on-screen view and download always remain available. Delivery attempts append internal events and may be retried per failed channel.
11. **Retention is separated by data class:** audio is deleted after transcription with a one-hour hard cap; unconfirmed transcript/draft session data expires within 24 hours; authenticated application, receipt, event, and preference records default to 30 days for the hackathon or earlier user deletion; expired OTP challenges purge within 24 hours; raw notification destinations are removed within 24 hours after the final attempt while a keyed recipient hash may remain for idempotency. The UI states these periods before sign-in and confirmation.
12. A user deletion immediately hides the application and appends `DELETED`, then queues content, receipt, contact, and delivery-detail erasure within 24 hours. A minimal non-content tombstone (demo ID, keyed owner hash, deletion time, and idempotency marker) may remain for seven days to prevent replay and is then purged. Redacted operational logs must never reconstruct deleted content.

---

## 4. CORE FUNCTIONAL SUBSYSTEMS & TECHNICAL SPECIFICATIONS

### 4.1 Multilingual Voice Processing & Indic Speech Engine

* **Product Definition:** This is a voice-first conversational agent, not a form that merely adds a microphone control. The agent is responsible for writing the complete RTI application from the citizen's spoken explanation. The citizen supplies and confirms facts; they are not required to write the application or translate a grievance into legal wording.
* **Problem Solved:** Many citizens are more comfortable explaining a concern aloud in a preferred language than typing a formal legal request.
* **Technology:** 
  - Web Audio API capturing 16kHz PCM audio chunks over bidirectional WebSockets.
  - Future speech-to-text options include Whisper, Bhashini IndicASR, or another consented provider. Without credentials, the hackathon uses explicitly simulated transcription.
  - “Speak in any language” is an aspirational product goal, not an MVP promise. The planned hackathon set is English, Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Urdu, Kannada, Odia, Malayalam, Punjabi, and Hinglish code-mixing, subject to validation. Unsupported or low-confidence speech always falls back to correction, language switching, or manual text.
* **Voice-Agent Conversation Loop:**
  1. Before recording, explain whether audio leaves the device, how the transcript will be used, what will be retained, and how to delete it; recording begins only after affirmative consent.
  2. The citizen can tap to speak, pause, interrupt the agent, stop recording, switch to text, or change language without losing confirmed information.
  3. Speech is transcribed visibly in near-real time where supported. Low-confidence spans are highlighted for correction rather than silently accepted.
  4. The agent extracts a working set of essentials: records sought, date range, location, likely responsible body, and preferred record format. It does not invent facts, dates, identities, record types, or authorities.
  5. It asks a short spoken follow-up only when missing information materially affects the RTI application; examples include “Which road or locality?” or “What dates should the records cover?” Text response remains optional.
  6. It summarizes: “Here is what I understood,” and waits for the citizen to correct or confirm the facts.
  7. The agent writes the complete, editable RTI application in neutral records-focused wording and reads or summarizes it back in the citizen's chosen language.
  8. The citizen corrects mistakes by voice or, if preferred for accessibility or precision, by text. Typing the application is never required.
  9. The agent presents exactly three explained public-authority recommendations for a successful Central directory match. The citizen selects one, searches manually, or overrides the list, then explicitly confirms both draft and destination.
* **Accessibility and Failure Recovery:**
  - Every voice action has keyboard- and touch-accessible text parity, visible focus, screen-reader announcements, captions/transcript, scalable text, and reduced-motion behavior.
  - Background noise triggers a plain recovery choice: retry, edit the uncertain words, or continue by text. Noise suppression must never delete the original transcript without consent.
  - On low bandwidth, the product falls back to shorter recorded chunks or text-only input and saves progress locally where the citizen has consented.
  - For an unsupported language or dialect, the product says so plainly, keeps the audio/transcript under citizen control, and offers another language, manual text, or assisted correction; it must not fabricate a confident translation.
  - Microphone denial, browser incompatibility, STT timeout, and interrupted upload preserve the citizen's typed or confirmed progress and provide a clear next action.
* **Privacy and Retention:**
  - Collect the minimum audio and personal data required for the chosen step. Do not reuse voice, transcript, or draft data for model training without separate explicit consent.
  - Show whether audio is processed locally or remotely and identify any provider before capture.
  - Provide “delete audio,” “delete transcript,” and “clear this session” controls. The demo should default to session-only/local retention; any longer retention period requires an explicit user choice and stated duration.
  - The official portal's three-year case retention is context for official cases, not a default retention rule for Praja-RTI demo recordings or transcripts.

---

### 4.2 The RTI Prompt Engineer (Grievance-to-RTI Transformation Engine)

* **Problem Solved:** RTI requests are frequently rejected if phrased as complaints, opinions, or interrogatives questioning "Why did you do this?". RTI Act only permits requests for **material records, files, certified copies, budgets, tender documents, inspection registers, and logbooks**.
* **Transformation Logic:**

```
+----------------------------------------------------------------------------------------------------+
|                               GRIEVANCE vs. RTI QUERY PARADIGM                                     |
+----------------------------------------------------+-----------------------------------------------+
| Raw Citizen Grievance (Will be Rejected)          | Transformed RTI Query (Legally Admissible)    |
+----------------------------------------------------+-----------------------------------------------+
| "The road outside my house in Sector 4 is broken   | 1. Provide certified copy of the work order,  |
| and full of potholes. Why is the government not    |    sanctioned budget, and contractor details  |
| fixing it? The officers are corrupt!"              |    for Road #12, Sector 4.                    |
|                                                    | 2. Provide the designated completion date     |
|                                                    |    and penalty clauses for contractor delay.  |
|                                                    | 3. Provide copies of quality inspection       |
|                                                    |    reports submitted by the site engineer.    |
+----------------------------------------------------+-----------------------------------------------+
| "I applied for my passport 3 months ago and        | 1. Provide the daily progress report and file |
| haven't received it. Fix this immediately!"        |    movement records for Application #XYZ.     |
|                                                    | 2. Provide names and designations of officers |
|                                                    |    with whom the file remained pending.       |
|                                                    | 3. Provide copy of citizen charter specifying |
|                                                    |    standard timeline for passport issuance.   |
+----------------------------------------------------+-----------------------------------------------+
```

* **Transformation Prompt Engine Rules:**
  - Rule 1: Strip emotional, accusatory, or defamatory language.
  - Rule 2: Convert "Why" questions into requests for "Rules, file-notings, and written reasons recorded on file".
  - Rule 3: Split complex narratives into at most 3 to 5 discrete, numbered, certified-record requests.
  - Rule 4: Add standard legal clauses requesting inspection of records under Section 2(j)(i) if applicable.
  - Rule 5: The agent writes the complete RTI application; it never asks the citizen to supply legal phrasing.
  - Rule 6: Do not invent dates, identities, locations, responsible bodies, events, or requested records. Ask the citizen to confirm material missing facts or state the limitation in the draft.
  - Rule 7: Use “RTI application” or “request for information” for the prepared output. Use “grievance” only for the citizen's raw narrative; do not call the RTI application a complaint.

---

### 4.3 Explainable Public Authority & Jurisdiction Recommendation

* **The Problem:** The official Central portal listed **2,916 public authorities** at the time of review. Selecting the wrong authority can trigger a Section 6(3) transfer within up to five days and may cause further operational delay.
* **The Proposed Solution:** An assistive dual-stage classifier that recommends rather than auto-selects. A successful Central-directory result returns exactly three candidates, each with a short reason, jurisdiction/context and ambiguity warning—never an uncalibrated confidence percentage. Multi-authority matters include split suggestions. The citizen selects, searches or overrides, then confirms the result.

```mermaid
graph TD
    INP[Transformed RTI Query] --> JUR_GATE{Stage 1: Jurisdiction Gatekeeper}
    
    JUR_GATE -- "Local Municipal / State Police / State Land" --> STATE_REJECT[State Jurisdiction Detected]
    STATE_REJECT --> STATE_INFO[Explain Central Portal Limit + Guide Citizen to Verify State Route]
    
    JUR_GATE -- "National / Central PSU / Defense / Banking / Railways" --> VEC_SEARCH[Stage 2: Hybrid RAG Search]
    
    subgraph Vector RAG Matcher
        VEC_SEARCH --> DENSE[Dense Semantic Search: text-embedding-3-large]
        VEC_SEARCH --> SPARSE[Sparse Lexical Search: BM25 on PA Keywords]
        DENSE & SPARSE --> RERANK[Cross-Encoder Reranker]
        RERANK --> TOP_PA[Exactly 3 Explained Candidates + Nodal Officer / CPIO Context]
    end
    
    TOP_PA --> MULTI{Multiple Record-Holders?}
    MULTI -- Yes --> SPLIT[Suggest Separate Requests]
    MULTI -- No --> CONFIRM[Citizen Confirms or Corrects Destination]
    SPLIT --> CONFIRM
```

* **Catalog Structure of Public Authorities:**
  - `PA_CODE`: Unique alphanumeric ID (e.g., `MOMAF` for Ministry of Minority Affairs, `DOR` for Department of Revenue).
  - `MINISTRY`: Apex governing ministry.
  - `DEPARTMENT`: Specific operational department.
  - `PUBLIC_AUTHORITY`: Specific subordinate office / PSU / Board (e.g., NHAI, SBI, CBSE, DRDO, IRCTC).
  - `NODAL_OFFICER_AND_CPIO_CONTEXT`: Verified contextual information where available; demo entries must not be presented as live submission endpoints.

#### 4.3.1 Governed Official-Directory Snapshot for the Hackathon

The local mock routing database should be built from a dated snapshot of the **public authorities currently listed on the official RTI Online portal**, not from manually invented departments or email addresses. The source listed 2,916 public authorities at the time of the August 2026 review. “Public authority” is the umbrella legal term; ministry, department, office, PSU, board, institute, and other forms are modeled beneath it when the official hierarchy exposes them.

Planned ingestion and governance process:

1. Capture the official directory through a permitted published export or a documented fetch process after reviewing source terms and technical constraints.
2. Preserve the raw source snapshot with source URL, retrieval timestamp, record count, checksum, and parser version.
3. Normalize each entry without replacing the official display name. Create a stable internal ID that survives naming changes, retain the official portal code when exposed, and maintain aliases across snapshots.
4. Store official display name, authority type, hierarchy or parent ministry where available, Central/State jurisdiction, topic keywords or published functions, portal-alignment status (`ALIGNED`, `NON_ALIGNED`, or `UNKNOWN`) when known, source URL, snapshot date, active/stale status, and stable internal ID.
5. Generate routing keywords from official functions and reviewed enrichment. Machine-generated keywords remain distinguishable from source facts.
6. Diff every refresh for additions, removals, renames, hierarchy changes, and portal-alignment changes. Do not silently delete older records referenced by prepared demo cases.
7. Display the dataset snapshot date and a stale-data warning in the hackathon UI. Before production, assign an owner, refresh cadence, verification procedure, correction channel, retention policy, and audit log.

For local development, the normalized snapshot may be a read-only SQLite or JSON dataset. Production may migrate the same governed records into PostgreSQL/pgvector. The Central portal directory does not by itself provide a complete State-authority catalog; a State-jurisdiction result can therefore guide the citizen away from the Central flow without inventing a destination.

---

### 4.4 Citizen Review, OTP Gate, and Live Application Preview

Before any mock payment, the citizen receives the agent-authored RTI application, a voice/read-back summary, exactly three explained candidates for a successful Central match, alternatives or split warnings where applicable, manual directory search, and a unified confirmation preview. Voice intake can begin without an account; before confirmation the citizen verifies a mobile number through the sandbox/test OTP flow so the resulting demo record can be saved securely in My Applications. OTP verification is not itself confirmation. The prepared request should respect the official portal's 3,000-character field limit and suggest a PDF attachment for longer text:

```
+---------------------------------------------------------------------------------------------------+
|  APPLICATION PREVIEW (RTI ACT, 2005) - PRAJA-RTI                                [Edit Application] |
+---------------------------------------------------------------------------------------------------+
|  Citizen Details:                                                                                 |
|  Name: Rajesh Kumar Sharma         Contact: +91 98765-43210      Email: rajesh.sharma@example.com |
|  Address: House #42, Main Market, Lucknow, UP - 226001                                            |
+---------------------------------------------------------------------------------------------------+
|  Choose one recommended public authority, search, or override:                                   |
|  (1) NHAI — National Highway maintenance records                         [Why this match?]       |
|  (2) MoRTH Secretariat — policy / ministry-level records                  [Why this match?]       |
|  (3) NHIDCL — highway works where it is the executing authority           [Why this match?]       |
|  Jurisdiction context + ambiguity warning shown in plain language | [Search all] [Manual override]|
+---------------------------------------------------------------------------------------------------+
|  Complete RTI Application Written by the Voice Agent (Editable / Read Back Aloud):                |
|  1. Please provide certified copies of the maintenance tender sanctioned for NH-27 (Lucknow-Ayodhya)|
|     for the financial year 2024-2025.                                                             |
|  2. Please provide the certified copy of measurement book entries and quality test certificates    |
|     submitted by the concessionaire between January 2025 and June 2025.                           |
|  3. Please provide the names and designations of the inspecting engineers responsible for the     |
|     aforesaid stretch during this period.                                                         |
+---------------------------------------------------------------------------------------------------+
|  Clearly Simulated Fee — No Money or Government Gateway:                                          |
|  [x] Mock Standard Fee: ₹10.00 (Choose a simulated method)                                        |
|  [ ] Demo BPL Exemption: ₹0.00 (Optional certificate; verification is simulated)                  |
+---------------------------------------------------------------------------------------------------+
|  Mobile session: Sandbox/demo OTP verified — not government identity verification                |
|  [  < Correct by Voice or Text ]                  [  Confirm Draft + Authority for Mock Fee >  ]  |
+---------------------------------------------------------------------------------------------------+
```

---

### 4.5 Mock Payment & BPL Demonstration

* **Statutory Fee Rule:** Rule 3 of the Right to Information (Regulation of Fee and Cost) Rules, 2005 mandates a fee of ₹10 per application for Central Government bodies.
* **Payment Subsystems:**
  1. **Standard Payment Mode (₹10):**
     - Clearly simulated ₹10 interaction for the credential-free hackathon; no money is charged and no bank, UPI app, Bharatkosh, or government gateway is contacted.
     - Requires the citizen's confirmation token and an idempotency key so retries cannot create multiple mock charges or receipts.
     - Demo receipt uses a `DEMO` reference and must not resemble or claim to be a Government/Bharatkosh receipt.
  2. **BPL Fee Exemption Mode (₹0):**
     - Section 7(5) mandate: No fee shall be charged from persons living Below the Poverty Line.
     - Citizen toggles "Claim BPL Exemption".
     - Attaches the applicable BPL certificate, matching the official portal requirement.
     - Any OCR extraction or verification is deterministic demo behavior unless a live service is separately authorized and configured.

The official portal charges no fee for a first appeal; the prepared appeal flow must display ₹0 and must not show a payment step.

#### 4.5.1 Simulated Receipt and Sandbox Notifications

After a successful mock-payment result, the FastAPI service creates one idempotent simulated receipt containing:

- prominent `PRAJA-RTI INDEPENDENT DEMO — NOT FILED WITH GOVERNMENT` label;
- stable demo receipt reference and creation timestamp;
- selected public authority's official display name and stable internal ID;
- short prepared RTI application summary and a hash/version of the citizen-confirmed full draft;
- mock-payment method, amount or BPL exemption, and `SIMULATED_SUCCESS` / `SIMULATED_FAILED` status;
- explicit `government_submission_status: NOT_SUBMITTED`;
- on-screen display and downloadable artifact link.

With separate notification consent, the service may send the receipt through configured **test/sandbox** email and SMS providers. Email can include the simulated receipt and prepared application; SMS should contain only the demo reference, selected authority, non-filing warning, and secure/short-lived receipt link—not the citizen's full RTI text. Every template says the application was prepared, not filed or accepted. Each channel uses its own idempotency key and delivery state (`QUEUED`, `SANDBOX_SENT`, `FAILED`, `FALLBACK_ONLY`). If a provider or key is unavailable, the deterministic fallback writes a redacted preview to the internal demo outbox and keeps on-screen/download access available.

#### 4.5.2 Authenticated My Applications and Internal Demo Timeline

Once the authenticated citizen confirms the draft/destination and the server durably records ownership, the application appears in **My Applications**. The list supports search and filters and shows date, `DEMO` reference, selected public authority, honest internal state, mock-payment state, receipt availability, and last update. The detail page shows the agent-authored request, citizen corrections, recommendation explanation, selection/manual override, explicit confirmation, mock-payment event, simulated receipt, and per-channel sandbox notification results.

The timeline is an append-only explanation of actions inside Praja-RTI. Approved labels are: `Draft`, `Needs information`, `Awaiting citizen confirmation`, `Authority selected`, `Mock payment pending`, `Prepared`, `Simulated submission complete`, `Receipt generated`, `Notification sent`, `Notification failed`, and `Deleted`. It never contains `received by department`, `under CPIO processing`, `reply received`, `accepted`, `decided`, or any similar official-government state. Receipt viewing/downloading and notification retry require current ownership authorization. The citizen may delete the record under Section 3.2. Every list, detail, receipt, and timeline repeats that it is **hackathon-demo history only and is not synchronized with RTI Online or government systems**.

---

### 4.6 Deferred Statutory Tracking Concept

This section is retained only as future legal-context exploration. It is **not part of the simplified hackathon scope** because Praja-RTI prepares but does not file the RTI application. No statutory clock starts, no reminder is sent, and no deemed-refusal state can be asserted. Any timeline mockup below is superseded by the simulated receipt flow in Sections 4.5.1 and 6.5.

```
+---------------------------------------------------------------------------------------------------+
|  APPLICATION STATUS: #RTI-2026-NHAI-094821                            [Download PDF Acknowledgment]|
+---------------------------------------------------------------------------------------------------+
|  Filing Date: August 1, 2026 | Current Status: IN PROGRESS (Day 18 of 30)                          |
+---------------------------------------------------------------------------------------------------+
|  STATUTORY SLA PROGRESS TRACKER:                                                                  |
|                                                                                                   |
|  [Day 0]------------[Day 5]---------------------[Day 18 (Today)]--------------------[Day 30]      |
|  Demo Prepared    Route Recommended            Simulated Elapsed Time           Statutory Context |
|  (Not Submitted)  (Citizen Confirmed NHAI)     (12 Days Remaining)              (Aug 31, 2026)    |
|                                                                                                   |
|  Time Remaining to Statutory Deemed Refusal: 12 Days : 09 Hours : 42 Mins                         |
+---------------------------------------------------------------------------------------------------+
|  Automated Triggers in Place:                                                                     |
|  * Day 25: Demo preview of a courtesy reminder; no message is dispatched.                         |
|  * Day 30: Expiry of standard statutory response window under Section 7(1).                       |
|  * Day 31: Deemed Refusal triggered under Section 7(2) -> Auto-Unlocks 1-Click First Appeal.      |
+---------------------------------------------------------------------------------------------------+
|  [Simulate Day 31 Deemed Refusal (Hackathon Demo)]        [Download Current Tracking Dossier]     |
+---------------------------------------------------------------------------------------------------+
```

---

### 4.7 Deferred Appeal Automation Concept

This section is future planning context only. Appeal generation, tracking, and submission are deferred until a separately authorized lifecycle can establish a real or explicitly simulated government response history.

* **The Problem:** In the legacy portal, when 30 days elapse without a reply, the citizen must independently navigate to `guidelines.php?appeal`, re-fill all personal data, re-attach registration slips, and manually construct legal arguments.
* **The Praja-RTI Solution:**
  1. System detects `status == "DEEMED_REFUSAL"` or citizen clicks "Unsatisfied with CPIO Response".
  2. Engine pulls historical record, links original Registration Number `#RTI-2026-NHAI-094821`, and identifies the designated **First Appellate Authority (FAA)**.
  3. AI composes a formal appeal memo under **Section 19(1)**:
     - Grounds: *"Failure of CPIO to provide information within statutory timeline of 30 days as mandated by Section 7(1), constituting Deemed Refusal under Section 7(2)."*
     - Relief Sought: *"Direct CPIO to supply information free of cost under Section 7(6) and initiate disciplinary inquiry."*
  4. Citizen reviews and clicks **Prepare First Appeal** (no first-appeal fee on the official Central portal). The hackathon does not submit it.
  5. If First Appeal is ignored for 45 days, the platform auto-assembles the **CIC Second Appeal Package** under Section 19(3).

---

## 5. DATABASE ARCHITECTURE & ENTITY-RELATIONSHIP MODEL

The planned cloud service uses a compact structured data model for verified mobile accounts, protected sessions and preferences, short-lived voice sessions, the governed public-authority snapshot, owned demo applications, append-only status events, mock-payment idempotency, simulated receipts, and sandbox notification attempts. PostgreSQL/pgvector is a compatible future choice; the hackathon may use simpler stores if the same authorization, idempotency, audit, and retention contracts are preserved.

```mermaid
erDiagram
    USER_ACCOUNT ||--o{ AUTH_SESSION : owns
    USER_ACCOUNT ||--|| USER_PREFERENCE : configures
    USER_ACCOUNT ||--o{ RTI_APPLICATION : owns
    PUBLIC_AUTHORITY ||--o{ RTI_APPLICATION : selected_for
    RTI_APPLICATION ||--o{ APPLICATION_STATUS_EVENT : records
    RTI_APPLICATION ||--o{ PAYMENT_RECORD : simulates
    RTI_APPLICATION ||--|| DEMO_RECEIPT : produces
    DEMO_RECEIPT ||--o{ NOTIFICATION_DELIVERY : attempts

    USER_ACCOUNT {
        uuid id PK
        string mobile_lookup_hash UK
        bytes encrypted_mobile
        timestamp mobile_verified_at
        string account_status
        timestamp created_at
    }

    AUTH_SESSION {
        uuid id PK
        uuid user_id FK
        string session_token_hash
        timestamp idle_expires_at
        timestamp absolute_expires_at
        timestamp revoked_at
    }

    USER_PREFERENCE {
        uuid user_id PK,FK
        string theme
        string text_size
        string language
        timestamp updated_at
    }

    PUBLIC_AUTHORITY {
        uuid stable_internal_id UK
        string pa_code PK
        string official_display_name
        string ministry_name
        string department_name
        string authority_name
        string jurisdiction_type
        string portal_alignment_status
        string source_url
        date snapshot_date
        string dataset_status
        string cpio_name
        string cpio_email
        string faa_name
        string faa_email
        vector embedding
    }

    RTI_APPLICATION {
        string demo_preparation_id PK
        uuid owner_user_id FK
        string pa_code FK
        text confirmed_information_need
        string original_language
        text agent_authored_rti_application
        text authority_recommendation_explanation
        string selection_source
        integer draft_version
        string draft_hash
        boolean citizen_confirmed_draft
        boolean citizen_confirmed_authority
        timestamp confirmed_at
        string status
        timestamp prepared_at
        boolean is_emergency_48h
        timestamp deleted_at
    }

    APPLICATION_STATUS_EVENT {
        uuid id PK
        string demo_preparation_id FK
        integer sequence_number
        string event_type
        string event_status
        string actor_type
        json redacted_metadata
        string idempotency_key
        timestamp occurred_at
    }

    PAYMENT_RECORD {
        string mock_payment_id PK
        string demo_preparation_id FK
        decimal amount
        string payment_mode
        string payment_status
        string idempotency_key
        boolean real_money_charged
        timestamp simulated_at
    }

    DEMO_RECEIPT {
        string demo_reference PK
        string demo_preparation_id FK
        string selected_authority_id
        string prepared_request_summary
        string draft_hash
        string mock_payment_status
        string government_submission_status
        string idempotency_key
        timestamp created_at
    }

    NOTIFICATION_DELIVERY {
        uuid id PK
        string demo_reference FK
        string channel
        string recipient_hash
        string delivery_status
        string provider_message_id
        string idempotency_key
        timestamp attempted_at
    }

```

OTP challenges are a separate short-lived security table containing the normalized mobile lookup hash, a server-side HMAC or password-style hash of the OTP, expiry, resend window, attempt count, purpose, and consumed timestamp. Plaintext OTPs are never stored. Application list/detail, events, receipt, retry, and deletion queries always scope by `owner_user_id` from the authenticated session. A caller who guesses another demo reference receives the same generic not-found response as a nonexistent record.

`RTI_APPLICATION.current_status` and the timeline use only honest internal demo states: `DRAFT`, `NEEDS_INFORMATION`, `AWAITING_CITIZEN_CONFIRMATION`, `AUTHORITY_SELECTED`, `MOCK_PAYMENT_PENDING`, `PREPARED`, `SIMULATED_SUBMISSION_COMPLETE`, `RECEIPT_GENERATED`, `NOTIFICATION_SENT`, `NOTIFICATION_FAILED`, and `DELETED`. These labels describe activity inside Praja-RTI only. They never mean a public authority received, accepted, processed, replied to, or decided the RTI application. The append-only event stream is the audit source; `current_status` is a projection for fast history queries. Notification events can coexist with the latest preparation state rather than erasing it.

---

## 6. API SPECIFICATIONS & CONTRACT DEFINITIONS

All browser API calls use TLS, bounded request bodies, rate limits, request IDs, and server-side authorization. Authenticated endpoints identify the user only from a protected session cookie; they reject or ignore any client-supplied `user_id`. Mutation endpoints use CSRF protection and idempotency where retries could duplicate state. Authorization failures use generic responses that do not reveal whether another citizen's account, phone number, application, receipt, or notification exists.

### 6.0 Mobile OTP Authentication, Session, and Preferences

| Method and endpoint | Purpose and principal contract |
| :--- | :--- |
| `POST /api/v1/auth/otp/request` | Accept an E.164 mobile number, purpose (`SIGN_IN` or `RECOVERY`), consent, and anti-abuse token. Return a generic acknowledgement, challenge ID, 5-minute expiry, and 45-second resend time whether or not the number is already known. Apply per-number and privacy-preserving network/session limits. |
| `POST /api/v1/auth/otp/verify` | Verify challenge plus OTP server-side, allow at most five attempts, consume the challenge once, rotate the session ID, and set a `Secure`, `HttpOnly`, `SameSite=Lax` cookie. Never return the OTP, provider key, or raw session token in JSON. |
| `GET /api/v1/auth/me` | Return the current user's redacted mobile, verification time, session expiry, and demo-only account notice. A reasonable hackathon session target is 30 minutes idle and 24 hours absolute. |
| `POST /api/v1/auth/logout` | Revoke the current server session, clear the cookie, and preserve separately consented device preferences. |
| `GET /api/v1/me/preferences` | Return account-synced `theme`, `text_size`, and `language`, plus `updated_at`. |
| `PUT /api/v1/me/preferences` | Validate and update those three preference enums. The latest explicit change wins; local device settings continue to work when signed out. |

OTP request and verify responses use generic copy such as “If this number can receive a demo code, continue with the code provided.” Possession of the already verified number restores access to that number's demo account/history; there is no password to recover. The planned sandbox provider is test-only. Offline judging may enable `DETERMINISTIC_DEMO_OTP`: the UI identifies the fixed judge code and non-production mode on both request and verification screens, the server still applies expiry and attempt limits, and deployment validation refuses to start this adapter in production mode. Lost-number recovery cannot safely transfer history in the hackathon: the citizen must access the old number or create a new demo account. Any production recovery flow requires a separately approved identity, support, fraud, and data-transfer policy.

### 6.1 POST `/api/v1/agent/intake-and-draft`

Accepts either consented browser audio or a citizen-edited transcript. The cloud FastAPI pipeline transcribes when needed, identifies missing essentials, asks one short follow-up at a time, writes the complete editable RTI application, and supplies a read-back summary. It does not route or submit in this call.

#### Request (Multipart Form Data):
```json
{
  "audio_file": "<binary_blob>",
  "editable_transcript": null,
  "preferred_language": "hi-IN",
  "consent_token": "consent_demo_01",
  "session_id": "session_demo_01"
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "demo_only": true,
  "processing_mode": "SIMULATED_STT",
  "data": {
    "transcript": "मेरे घर के पास वाला हाईवे 27 छह महीने से टूटा हुआ है, कोई ठीक नहीं कर रहा। मुझे जानना है कितना पैसा पास हुआ था।",
    "language": "Hindi (hi-IN)",
    "uncertain_spans": [],
    "needs_follow_up": false,
    "next_spoken_question": null,
    "confirmed_facts": {
      "location": "NH-27 near the citizen's stated locality",
      "date_range": "last six months",
      "record_format": "certified electronic copies"
    },
    "understanding_summary": "You want records showing how the NH-27 repair was approved, measured, inspected and paid for during the last six months.",
    "editable_rti_application": "Please provide certified copies of: (1) the administrative sanction, sanctioned estimate, work order and contractor agreement for the described NH-27 repair; (2) the relevant Measurement Book entries and inspection or quality-test reports; and (3) bills, payment records, delay notices and recorded action on defects for the last six months.",
    "read_back_summary_hi": "मैंने छह महीने की मंजूरी, माप, निरीक्षण और भुगतान के रिकॉर्ड के लिए आवेदन तैयार किया है।",
    "facts_invented": false,
    "requires_draft_confirmation": true
  }
}
```

If material information is missing, the same response sets `needs_follow_up: true`, leaves `editable_rti_application` null, and returns one plain-language `next_spoken_question`. The citizen may answer by voice or text. The service must not fill missing dates, locations, identities, authorities, or requested records with guesses.

---

### 6.2 POST `/api/v1/routing/recommend`

The voice-agent pipeline sends the citizen-confirmed, normalized information need to an internal demo routing service. It never sends raw audio unless that is separately required, disclosed, and consented to.

#### Request:

```json
{
  "normalized_information_need": "Certified records about the sanction, measurements, inspections and payments for repair of NH-27 near pincode 226001 during FY 2024-2026.",
  "original_language": "hi-IN",
  "location": { "pincode": "226001", "state": "Uttar Pradesh" },
  "preferred_record_format": "CERTIFIED_ELECTRONIC_COPIES",
  "top_k": 3,
  "directory_snapshot": "2026-08-review"
}
```

#### Response (200 OK):

```json
{
  "success": true,
  "demo_only": true,
  "directory": {
    "source": "Official RTI Online public-authority directory snapshot",
    "snapshot_date": "2026-08-25",
    "record_count": 2916,
    "is_stale": false
  },
  "jurisdiction": {
    "level": "CENTRAL",
    "explanation": "The request mentions a National Highway and NHAI-maintained work."
  },
  "candidate_count": 3,
  "candidates": [
    {
      "stable_internal_id": "pa_7fc4c1d0",
      "official_display_name": "National Highways Authority of India",
      "parent_ministry": "Ministry of Road Transport and Highways",
      "portal_alignment_status": "UNKNOWN",
      "rank": 1,
      "match_label": "Strong match",
      "reason": "Likely holder of project-level National Highway work, inspection and payment records.",
      "jurisdiction_context": "Central public authority; verify the relevant regional office.",
      "ambiguity_warning": "The executing authority can vary by project and stretch."
    },
    {
      "stable_internal_id": "pa_2a8d8f41",
      "official_display_name": "Ministry of Road Transport and Highways",
      "parent_ministry": "Ministry of Road Transport and Highways",
      "portal_alignment_status": "UNKNOWN",
      "rank": 2,
      "match_label": "Possible match",
      "reason": "May hold ministry-level sanction, policy or administrative records.",
      "jurisdiction_context": "Central ministry; less likely to hold site Measurement Book records.",
      "ambiguity_warning": "Choose this only if the records sought are ministry-level."
    },
    {
      "stable_internal_id": "pa_94c2a1ee",
      "official_display_name": "National Highways and Infrastructure Development Corporation Limited",
      "parent_ministry": "Ministry of Road Transport and Highways",
      "portal_alignment_status": "UNKNOWN",
      "rank": 3,
      "match_label": "Alternative",
      "reason": "Could hold execution records if this highway project was assigned to it.",
      "jurisdiction_context": "Central public authority; project assignment must be verified.",
      "ambiguity_warning": "Do not select without confirming that it executed the work."
    }
  ],
  "ambiguous": false,
  "multi_authority": false,
  "suggested_splits": [],
  "requires_human_confirmation": true
}
```

Every successful **Central-directory** routing response returns exactly three ranked candidates with stable internal IDs, short reasons, jurisdiction/context, and ambiguity warnings. It never returns a numeric confidence percentage. The citizen selects one, searches the directory manually, or overrides the three. Ambiguous results still contain exactly three reviewed candidates and set `ambiguous: true`; multi-authority results include suggested record groupings that the citizen may accept, edit, or reject. A State-jurisdiction result, missing/stale directory data, or API failure is a non-success routing state and must not fabricate three Central candidates; it returns a recoverable redirect or `DIRECTORY_REVIEW_REQUIRED` state instead.

If Praja-RTI issues an API key, it authenticates **only this internal demo routing API**; it is not a government credential and gives no access to RTI Online. Store it server-side in a secret manager or environment configuration, never in browser code or a committed file. Plan for rotation, scoped permissions, rate limiting, request-size limits, audit logging without raw sensitive content, and revocation. A no-secret mode bound to localhost may serve offline development with explicit demo labeling.

#### 6.2.1 GET `/api/v1/public-authorities/search?q=...`

Supports citizen-directed manual search and override against the same dated snapshot. It returns official display names, stable internal IDs, hierarchy, jurisdiction, snapshot date and staleness—never an invented CPIO or numeric confidence. Selecting a search result sets `selection_source: MANUAL_SEARCH`; entering an override outside the snapshot sets `selection_source: CITIZEN_OVERRIDE` and requires the citizen to acknowledge that the destination could not be verified from the demo directory.

---

### 6.3 POST `/api/v1/demo/confirm`

Requires an authenticated mobile session, then records the citizen's explicit confirmation of the agent-authored RTI application and chosen public authority. The selection can be one of the three recommendations or a manually searched/overridden directory entry. It binds the demo application to the authenticated owner, appends `AUTHORITY_SELECTED` and citizen-confirmation events, and derives ownership from the session. This endpoint does not file, pay, or notify.

#### Request:
```json
{
  "session_id": "session_demo_01",
  "draft_version": 4,
  "editable_rti_application": "Please provide certified copies of the administrative sanction...",
  "selected_authority_id": "pa_7fc4c1d0",
  "selection_source": "RECOMMENDATION_1",
  "draft_confirmed": true,
  "authority_confirmed": true,
  "confirmed_at": "2026-08-25T14:29:50Z"
}
```

#### Response (201 Created):
```json
{
  "success": true,
  "data": {
    "confirmation_token": "confirm_demo_008492",
    "draft_hash": "sha256:demo-draft-hash",
    "selected_authority_id": "pa_7fc4c1d0",
    "selected_authority_name": "National Highways Authority of India",
    "internal_status": "AUTHORITY_SELECTED",
    "government_submission_status": "NOT_SUBMITTED",
    "mock_payment_unlocked": true
  }
}
```

---

### 6.4 POST `/api/v1/demo/mock-payments`

Creates an idempotent mock-payment result for the authenticated owner after confirmation. It appends `MOCK_PAYMENT_PENDING`, then `PREPARED` when the deterministic result is recorded. No external payment service is contacted.

Required headers: `Idempotency-Key` and the server-issued confirmation token.

```json
{
  "confirmation_token": "confirm_demo_008492",
  "mode": "SIMULATED_UPI",
  "amount_inr": 10,
  "bpl_exempt": false
}
```

```json
{
  "success": true,
  "mock_payment_id": "mockpay_008492",
  "status": "SIMULATED_SUCCESS",
  "amount_inr": 10,
  "real_money_charged": false,
  "external_gateway_contacted": false
}
```

Retries with the same idempotency key return the same `mock_payment_id` and result. The deterministic no-key mode can simulate success, failure, and retry without network access.

---

### 6.5 POST `/api/v1/demo/receipts`

Creates or returns the single simulated receipt for an authenticated owner's confirmed draft and mock-payment result, appends `SIMULATED_SUBMISSION_COMPLETE` and `RECEIPT_GENERATED` internal events, and makes the receipt available in that owner's history.

```json
{
  "confirmation_token": "confirm_demo_008492",
  "mock_payment_id": "mockpay_008492",
  "citizen_contact": {
    "email": "rajesh.sharma@example.com",
    "send_sms_to_verified_mobile": true,
    "notification_consent": true
  }
}
```

```json
{
  "success": true,
  "receipt": {
    "demo_reference": "DEMO-RTI-2026-008492",
    "created_at": "2026-08-25T14:30:00Z",
    "selected_authority_id": "pa_7fc4c1d0",
    "selected_authority_name": "National Highways Authority of India",
    "prepared_request_summary": "Certified records for the sanction, measurement, inspection and payment of the described NH-27 repair.",
    "draft_hash": "sha256:demo-draft-hash",
    "mock_payment_status": "SIMULATED_SUCCESS",
    "government_submission_status": "NOT_SUBMITTED",
    "notice": "Independent Praja-RTI demo. This RTI application was prepared only; it was not filed with or accepted by any government authority.",
    "download_url": "/api/v1/applications/DEMO-RTI-2026-008492/receipt"
  }
}
```

Receipt creation is idempotent by confirmation token, mock-payment ID and idempotency key. It must never use an official-looking registration number, government emblem, Bharatkosh reference, or “filed/accepted” status.

---

### 6.6 POST `/api/v1/demo/receipts/{demo_reference}/notifications`

Requires ownership authorization and attempts sandbox/test delivery after separate notification consent. Email and SMS are independent idempotent channels; the result appends `NOTIFICATION_SENT` or `NOTIFICATION_FAILED` without implying official delivery.

```json
{
  "channels": ["EMAIL_SANDBOX", "SMS_SANDBOX"],
  "email": "rajesh.sharma@example.com",
  "send_sms_to_verified_mobile": true,
  "notification_consent": true
}
```

```json
{
  "success": true,
  "delivery": [
    { "channel": "EMAIL_SANDBOX", "status": "SANDBOX_SENT", "provider_message_id": "test_email_01" },
    { "channel": "SMS_SANDBOX", "status": "FALLBACK_ONLY", "provider_message_id": null }
  ],
  "onscreen_fallback_available": true
}
```

The SMS destination is the mobile verified by the current authenticated session; the browser cannot substitute another account's number. Provider credentials stay server-side. In deterministic no-key mode, the service writes redacted template previews to the internal demo outbox and reports `FALLBACK_ONLY`; it does not pretend a message was delivered. Retrying a failed channel with the same idempotency key does not duplicate a successful channel.

#### 6.6.1 DELETE `/api/v1/demo/sessions/{session_id}`

Deletes an unconfirmed short-lived audio/transcript/draft session the citizen controls, subject only to minimal redacted security/audit metadata. The response identifies each data class deleted and any already-expired item. Audio is normally removed after transcription and always by the one-hour hard cap; remaining unconfirmed session data expires within 24 hours even if this endpoint is not called. Authenticated application deletion uses Section 6.8 instead.

---

### 6.7 Deferred: POST `/api/v1/appeals/generate-first-appeal`

Future planning reference only. Appeal generation is outside the simplified hackathon core and remains unavailable until a real or separately simulated response lifecycle is explicitly authorized.

#### Request:
```json
{
  "original_registration_number": "RTI/2026/NHAI/008492",
  "appeal_reason": "DEEMED_REFUSAL_NO_RESPONSE_30_DAYS",
  "additional_citizen_notes": "No communication or acknowledgment received from CPIO within 30 days."
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "appeal_registration_number": "RTI-FA/2026/NHAI/001204",
    "statute_invoked": "Section 19(1), Right to Information Act 2005",
    "first_appellate_authority": {
      "name": "Shri V. K. Aggarwal, Chief General Manager (Appeals)",
      "department": "National Highways Authority of India",
      "email": "faa-appeals@nhai.org"
    },
    "appeal_memo_text": "MEMORANDUM OF FIRST APPEAL UNDER SECTION 19(1) OF RTI ACT, 2005...\nAppellant: Rajesh Kumar Sharma\nAgainst: Deemed Refusal by CPIO, NHAI...",
    "statutory_faa_deadline_45_days": "2026-11-08T23:59:59Z",
    "appeal_fee": 0.00
  }
}
```

---

### 6.8 Authenticated Application History, Status, Receipt, Retry, and Deletion

Every endpoint below requires the protected session and applies `owner_user_id = current_session.user_id` in the database query. A non-owner and a missing reference receive the same generic `404`. The browser cannot request another user's records by submitting a user ID.

| Method and endpoint | Purpose and contract |
| :--- | :--- |
| `GET /api/v1/applications` | Cursor-paginated **My Applications** list with optional search over demo reference/authority, internal-status filter, and date range. Returns date, `DEMO` reference, selected authority, current internal status, mock-payment state, receipt availability, and `last_updated_at` for the current user only. |
| `GET /api/v1/applications/{demo_reference}` | Return the agent-authored RTI application, citizen-corrected draft version, selected authority, recommendation explanation, selection source, confirmation event, mock-payment event, simulated receipt, sandbox delivery results, and permanent demo-only notice. |
| `GET /api/v1/applications/{demo_reference}/events` | Return a stable, ordered, readable timeline from append-only events. Each event has sequence, internal status, localized public label, actor (`CITIZEN`, `SYSTEM`, or `SANDBOX_PROVIDER`), occurred time, and redacted metadata. |
| `GET /api/v1/applications/{demo_reference}/receipt` | Authorize ownership, then render or download the accessible simulated receipt with `Cache-Control: private, no-store`; never expose a predictable public object URL. |
| `POST /api/v1/applications/{demo_reference}/notifications/{channel}/retry` | Retry only a failed sandbox email or SMS channel with current consent and an idempotency key. It cannot duplicate a successful delivery and appends `NOTIFICATION_SENT` or `NOTIFICATION_FAILED`. |
| `DELETE /api/v1/applications/{demo_reference}` | Re-authenticated destructive action that immediately hides the application, appends `DELETED`, returns the deletion schedule by data class, and queues content erasure under Section 3.2. Repeating it is idempotent. |

History/detail/timeline response envelopes always include: `demo_only: true`, `official_status: false`, `government_synchronized: false`, and the localized notice “This is your Praja-RTI hackathon-demo history. It is not RTI Online status and is not synchronized with any government system.” Internal labels are limited to `Draft`, `Needs information`, `Awaiting citizen confirmation`, `Authority selected`, `Mock payment pending`, `Prepared`, `Simulated submission complete`, `Receipt generated`, `Notification sent`, `Notification failed`, and `Deleted`.

---

## 7. FRONTEND ARCHITECTURE & DESIGN SYSTEM SPECIFICATION

The proposed frontend is a clean, low-clutter, mobile-first public-service-inspired experience targeting **WCAG 2.2 AA**. Familiarity comes from plain language, predictable steps, prominent reading controls, large tap targets, and clear receipts—not from copying the official portal. A persistent localized banner says **“Independent Praja-RTI hackathon demo — not affiliated with the Government of India; no RTI application is filed here.”** No official emblem, seal, department wordmark, `gov.in` styling, or copy implying affiliation is permitted.

The voice agent is the home-screen primary action, with a large localized “Speak to prepare my RTI application” control, a short privacy explanation, and an equally complete “Use text instead” fallback. The page shows one primary decision at a time and avoids dense legal language. A simple mobile navigation exposes **Start**, **My Applications**, **Help**, language, reading controls, and the authenticated account/logout state. The citizen never has to locate or type a legal application form.

### 7.1 Design Tokens & Color Palette

```
+---------------------------------------------------------------------------------------------------+
|  PRIMARY PALETTE (INDEPENDENT CIVIC SERVICE DESIGN)                                              |
+----------------------+--------------------+-------------------------------------------------------+
| Token Name           | Hex Code           | Usage                                                 |
+----------------------+--------------------+-------------------------------------------------------+
| `--praja-indigo`     | `#243B6B`          | Independent brand, navigation and primary actions     |
| `--praja-coral`      | `#C24E3D`          | Secondary action and recording-state accent           |
| `--praja-teal`       | `#176B67`          | Confirmed internal demo states                        |
| `--surface`          | `#F7F8FA`          | Light-theme background                                |
| `--surface-inverse`  | `#12151B`          | Dark-theme background                                 |
| `--card-border`      | `#D7DCE4`          | Cards, fields and timeline dividers                    |
| `--danger`           | `#B42318`          | Errors and destructive deletion warnings               |
+----------------------+--------------------+-------------------------------------------------------+
```

### 7.2 Theme, Text Size, Language, and Preference Persistence

- Provide an obvious labeled theme selector with **Light**, **Dark**, and **System**. `System` is the default and follows `prefers-color-scheme`; a change applies immediately without losing draft state.
- Provide ordered **A−**, **A**, and **A+** controls beside the theme and language controls. Plan root-size steps of 14 px minimum, 16 px default, and 20 px maximum, with fluid responsive spacing and line height; browser zoom remains supported and is never disabled.
- Persist signed-out preferences per device using small local settings only. After OTP sign-in, optionally sync them to `USER_PREFERENCE`; the newest explicit user change wins by `updated_at`, and a clear “use on this device only” choice remains available.
- Language switching localizes control names, OTP guidance, agent prompts, route explanations, demo warnings, statuses, and error recovery. Use the documented supported-language set in Section 4.1; do not hard-code an English-only tooltip or icon-only meaning.
- Theme, text size, language, and reduced-motion choices must never be coupled to analytics, notification consent, or microphone permission.

### 7.3 Voice-Agent and Low-Literacy Interaction

- Use a single conversational workspace: listen/stop state, visible transcript, one missing-detail question, understanding summary, agent-written draft, read-back, and exactly three authority cards in a predictable sequence.
- Each authority card shows official display name from the dated snapshot, jurisdiction/context, short reason, ambiguity warning, and a large selection control. Manual search/override remains clearly visible and never requires knowing an internal code.
- Avoid icon-only controls. Pair microphone, speaker, edit, theme, receipt, and deletion icons with localized text and an accessible name. Do not make a waveform the only recording indicator.
- Show simulation badges at the point of use: `Demo transcription`, `Demo reasoning`, `Recommended authority`, `Mock payment`, `Simulated receipt`, and `Sandbox message` or `Fallback only`.
- Before confirmation, summarize both the exact RTI application and destination and require an explicit affirmative action; silence, page navigation, or an OTP success is not confirmation.

### 7.4 Sign-in, My Applications, and Honest Internal Status

- OTP sign-in uses a numeric input compatible with password managers and mobile autofill, announces expiry and resend countdown, disables repeated resend during cooldown, accepts paste, and never reveals whether a number already has an account. The deterministic judge code is shown only inside a visually distinct offline-demo panel.
- **My Applications** is available only after sign-in and lists the current user's records with search/filter, date, `DEMO` reference, selected public authority, internal status, mock-payment state, receipt availability, and last-updated time. Empty, loading, offline, and deleted states have plain next steps.
- Application detail uses a readable event timeline for the agent-authored request, selected authority and explanation, citizen confirmation, mock payment, simulated receipt, and sandbox email/SMS results. It supports authorized receipt view/download, failed-notification retry, and deletion.
- Every history list and detail view repeats: **“Praja-RTI demo history only — not RTI Online status and not synchronized with any government system.”** Never use visual language suggesting government receipt, acceptance, processing, reply, or decision.

### 7.5 Accessibility Acceptance Criteria

- All actions work by keyboard alone in a logical focus order, with a visible focus indicator of at least 2 CSS px and no focus trap. Status changes, recording state, OTP errors, transcript updates, and agent read-back availability use polite screen-reader announcements without repeating whole pages.
- Interactive targets are at least 44 × 44 CSS px. Normal text and controls reach at least 4.5:1 contrast; large text and essential UI boundaries reach at least 3:1 in Light and Dark themes, including focus, error, selected-candidate, and disabled states.
- At 200% browser zoom and a 320 CSS px viewport, the primary flow, three authority cards, OTP, history table/card conversion, receipt, and A−/A/A+ selector reflow without lost content, overlapping controls, or two-dimensional scrolling except for genuinely tabular data.
- Text scaling from 14/16/20 px does not truncate localized labels or require hover. Content reflows with relative units; user-agent zoom and font overrides are respected.
- `prefers-reduced-motion` removes non-essential waveform animation, transitions, auto-scrolling, and celebration effects. Recording still has text and color-independent state cues.
- Automated checks cover semantics, names, focus, contrast, reflow, and reduced motion, followed by manual keyboard, screen-reader, 200% zoom, low-bandwidth, and native-language review. Acceptance requires no blocker/critical WCAG 2.2 AA defect in the core voice → history journey.

---

## 8. SUPERSEDED ILLUSTRATIVE CODE MODULES (PLANNING REFERENCE ONLY)

> These legacy snippets are unapproved historical references and are **superseded by Sections 3, 4, 6, 9, 11 and 16.1**. They are not a runnable implementation and contain obsolete patterns such as single-authority output, numeric confidence, direct submit language, long-lived SLA tracking and appeal automation. Do not use, execute, or extend them while implementation is on hold.

### 8.1 Voice Capture & Streaming Hook (React/TypeScript)

```typescript
// /src/hooks/useVoiceRTI.ts
import { useState, useRef, useCallback } from 'react';

export interface TransformedRTIResult {
  transcript: string;
  detectedLanguage: string;
  isValidCentral: boolean;
  stateWarning?: string;
  matchedAuthority: {
    paCode: string;
    ministry: string;
    department: string;
    confidence: number;
  };
  transformedQueries: string[];
  isEmergency: boolean;
}

export function useVoiceRTI() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<TransformedRTIResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    setError(null);
    audioChunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250); // Emit chunks every 250ms
      setIsRecording(true);
    } catch (err: any) {
      setError('Microphone access denied or unsupported: ' + err.message);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'input.webm');

    try {
      const response = await fetch('/api/v1/voice/transcribe-and-transform', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult(data.data);
    } catch (err: any) {
      setError('Failed to process voice input: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isRecording,
    isProcessing,
    result,
    error,
    startRecording,
    stopRecording,
  };
}
```

---

### 8.2 LLM Formulation & Transformation Pipeline (Python/FastAPI)

```python
# /server/services/rti_transformer.py
import json
import os
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

RTI_TRANSFORMATION_SYSTEM_PROMPT = """
You are the Supreme Legal Drafting Agent for the Right to Information Act, 2005 (Government of India).
Your duty is to convert raw, unstructured spoken citizen narratives or complaints into legally precise, certified-record RTI requests.

CRITICAL RTI ACT (2005) RULES YOU MUST ENFORCE:
1. RTI is STRICTLY for obtaining EXISTING MATERIAL RECORDS, documents, certified copies, contracts, logbooks, file notings, and memos.
2. RTI is NOT for grievance redressal ("Why did officer X misbehave?"). Convert "Why" complaints into requests for certified copies of rules, registers, complaints received, and official file movement notings.
3. JURISDICTION FILTER:
   - Identify if the subject matter belongs to the CENTRAL GOVERNMENT (Railways, National Highways/NHAI, Defense, Passports, Central Banks, Income Tax, EPFO, Central Universities, Civil Aviation, etc.) or STATE GOVERNMENT (State Police, Municipal Water/Sewage, Panchayat, State Transport, Land Registry).
   - If STATE GOVERNMENT: Flag as `is_valid_central = false`, identify the State, and formulate a polite rejection warning pointing them to the State RTI portal.
4. EMERGENCY DETECTION:
   - If the request involves imminent threat to Life or Liberty of a person (Section 7(1) Proviso), set `is_emergency_48h = true`.
5. FORMULATION:
   - Create between 2 to 4 crisp, distinct, numbered points requesting specific certified records.
   - Strip all emotional language, accusations, and speculation.

Output must strictly adhere to the requested JSON schema.
"""

class RTIStructuredOutput(BaseModel):
    transcript_english: str = Field(description="Clean English translation of citizen speech")
    is_valid_central_authority: bool = Field(description="True if Central Gov, False if State Gov")
    state_jurisdiction_name: str | None = Field(description="Name of State if State Government")
    state_rejection_reason: str | None = Field(description="User-friendly explanation if State Gov")
    target_ministry_guess: str = Field(description="Best matched Central Ministry")
    target_department_guess: str = Field(description="Best matched Department or Public Authority")
    search_keywords: List[str] = Field(description="Keywords for Vector DB retrieval")
    transformed_queries: List[str] = Field(description="List of 2-4 formal numbered RTI questions")
    is_emergency_48h: bool = Field(description="True if Life or Liberty matter under Sec 7(1)")

async def transform_grievance_to_rti(raw_transcript: str, language_code: str) -> RTIStructuredOutput:
    user_prompt = f"""
    Citizen Raw Input: "{raw_transcript}"
    Input Language: {language_code}

    Convert this input into legally admissible RTI queries under the RTI Act, 2005.
    """

    response = await client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=[
            {"role": "system", "content": RTI_TRANSFORMATION_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        response_format=RTIStructuredOutput,
        temperature=0.1
    )

    return response.choices[0].message.parsed
```

---

### 8.3 Hierarchical Public Authority Vector Matcher

```python
# /server/services/authority_matcher.py
from typing import Dict, Any, List
import numpy as np

# Sample In-Memory Vector Catalog of Central Public Authorities for Hackathon
PUBLIC_AUTHORITY_CATALOG = [
    {
        "pa_code": "NHAI-HQ",
        "ministry": "Ministry of Road Transport and Highways",
        "department": "National Highways Authority of India (NHAI)",
        "keywords": ["highway", "road", "toll", "pothole", "expressway", "contractor", "nh-", "nhai", "flyover"],
        "cpio_email": "cpio-hq@nhai.gov.in",
        "faa_email": "faa-appeals@nhai.gov.in"
    },
    {
        "pa_code": "MEA-PSP",
        "ministry": "Ministry of External Affairs",
        "department": "Consular, Passport and Visa Division (CPV)",
        "keywords": ["passport", "visa", "rpo", "tatkaal", "pcc", "emigration", "consular"],
        "cpio_email": "cpio.passport@mea.gov.in",
        "faa_email": "faa.passport@mea.gov.in"
    },
    {
        "pa_code": "MOR-RLY",
        "ministry": "Ministry of Railways",
        "department": "Railway Board / IRCTC / Zonal Railways",
        "keywords": ["train", "railway", "ticket", "station", "irctc", "pnr", "catering", "berth", "loco"],
        "cpio_email": "cpio@rb.railnet.gov.in",
        "faa_email": "faa@rb.railnet.gov.in"
    },
    {
        "pa_code": "MOF-CBDT",
        "ministry": "Ministry of Finance",
        "department": "Central Board of Direct Taxes (Income Tax)",
        "keywords": ["income tax", "pan card", "tax refund", "itr", "tds", "assessment", "cbdt"],
        "cpio_email": "cpio.incometax@incometax.gov.in",
        "faa_email": "faa.incometax@incometax.gov.in"
    },
    {
        "pa_code": "MOF-EPFO",
        "ministry": "Ministry of Labour and Employment",
        "department": "Employees' Provident Fund Organisation (EPFO)",
        "keywords": ["pf", "epfo", "provident fund", "uan", "pension", "eps", "pf withdrawal"],
        "cpio_email": "cpio.epfo@epfindia.gov.in",
        "faa_email": "faa.epfo@epfindia.gov.in"
    }
]

def match_public_authority(search_keywords: List[str], query_text: str) -> Dict[str, Any]:
    """
    Hybrid keyword & lexical scoring for Public Authority resolution.
    In full production, this is backed by Qdrant dense vector embeddings.
    """
    query_lower = (query_text + " " + " ".join(search_keywords)).lower()
    best_match = None
    highest_score = -1

    for pa in PUBLIC_AUTHORITY_CATALOG:
        score = 0
        for kw in pa["keywords"]:
            if kw in query_lower:
                score += 2
        if pa["department"].lower() in query_lower:
            score += 5
        if pa["ministry"].lower() in query_lower:
            score += 3
        
        if score > highest_score:
            highest_score = score
            best_match = pa

    # Fallback to general Ministry if no specific match
    if highest_score <= 0:
        best_match = PUBLIC_AUTHORITY_CATALOG[0]
        confidence = 0.65
    else:
        confidence = min(0.98, 0.70 + (highest_score * 0.05))

    return {
        "pa_code": best_match["pa_code"],
        "ministry": best_match["ministry"],
        "department": best_match["department"],
        "cpio_email": best_match["cpio_email"],
        "faa_email": best_match["faa_email"],
        "confidence_score": round(confidence, 3)
    }
```

---

### 8.4 SLA Tracker & Deemed Refusal Cron Service

```python
# /server/services/sla_scheduler.py
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List

class SLATrackingService:
    @staticmethod
    def calculate_statutory_milestones(filing_timestamp: datetime, is_emergency_48h: bool = False) -> Dict[str, Any]:
        """
        Computes statutory deadlines based on the Right to Information Act, 2005.
        """
        if is_emergency_48h:
            # Proviso to Section 7(1): 48 Hours for Life or Liberty
            deadline_cpio = filing_timestamp + timedelta(hours=48)
            deemed_refusal = deadline_cpio
        else:
            # Section 7(1): Standard 30 Days
            deadline_cpio = filing_timestamp + timedelta(days=30)
            deemed_refusal = deadline_cpio + timedelta(seconds=1)

        # Section 19(1): First Appeal must be filed within 30 days of deemed refusal
        first_appeal_expiry = deemed_refusal + timedelta(days=30)
        
        # Section 19(6): First Appellate Authority must dispose appeal in 30-45 days
        faa_disposal_deadline = first_appeal_expiry + timedelta(days=45)

        # Section 19(3): Second Appeal to CIC within 90 days of FAA disposal deadline
        second_appeal_expiry = faa_disposal_deadline + timedelta(days=90)

        return {
            "is_emergency_48h": is_emergency_48h,
            "filing_date": filing_timestamp.isoformat(),
            "day_0_routing_status": "AUTO_ASSIGNED_INSTANT",
            "day_5_transfer_bypassed": True,
            "day_30_cpio_deadline": deadline_cpio.isoformat(),
            "deemed_refusal_trigger_timestamp": deemed_refusal.isoformat(),
            "first_appeal_filing_deadline": first_appeal_expiry.isoformat(),
            "faa_45_day_disposal_deadline": faa_disposal_deadline.isoformat(),
            "second_appeal_90_day_deadline": second_appeal_expiry.isoformat(),
        }

    @staticmethod
    def evaluate_live_status(application_record: Dict[str, Any], current_time: datetime = None) -> Dict[str, Any]:
        """
        Calculates elapsed days, remaining time, and triggers automated state transitions.
        """
        if current_time is None:
            current_time = datetime.now(timezone.utc)

        filing_time = datetime.fromisoformat(application_record["filing_date"])
        deemed_refusal_time = datetime.fromisoformat(application_record["deemed_refusal_trigger_timestamp"])
        
        has_cpio_replied = application_record.get("cpio_response_text") is not None
        
        if has_cpio_replied:
            return {
                "status_code": "REPLIED",
                "status_label": "CPIO Replied - Review Satisfaction",
                "action_required": "CITIZEN_REVIEW",
                "days_elapsed": (current_time - filing_time).days,
                "first_appeal_unlocked": True
            }

        if current_time >= deemed_refusal_time:
            overdue_days = (current_time - deemed_refusal_time).days + 1
            accrued_penalty = min(25000, overdue_days * 250) # Section 20 Penalty
            return {
                "status_code": "DEEMED_REFUSAL",
                "status_label": f"Deemed Refused (Overdue by {overdue_days} Days)",
                "action_required": "1_CLICK_FIRST_APPEAL_READY",
                "accrued_officer_penalty_inr": accrued_penalty,
                "first_appeal_unlocked": True,
                "days_elapsed": (current_time - filing_time).days
            }

        time_remaining = deemed_refusal_time - current_time
        days_remaining = time_remaining.days
        hours_remaining = time_remaining.seconds // 3600

        return {
            "status_code": "IN_PROGRESS",
            "status_label": f"Active Under CPIO Investigation ({days_remaining}d {hours_remaining}h left)",
            "action_required": "AWAIT_RESPONSE",
            "days_elapsed": (current_time - filing_time).days,
            "days_remaining": days_remaining,
            "first_appeal_unlocked": False
        }
```

---

### 8.5 1-Click First Appeal Generator Service

```python
# /server/services/appeal_generator.py
from datetime import datetime, timezone
from typing import Dict, Any

class AppealGeneratorService:
    @staticmethod
    def generate_first_appeal_dossier(
        rti_record: Dict[str, Any], 
        citizen_record: Dict[str, Any],
        appeal_ground: str = "DEEMED_REFUSAL"
    ) -> Dict[str, Any]:
        """
        Creates a non-official Section 19(1) First Appeal draft for citizen review; it does not file electronically.
        """
        now = datetime.now(timezone.utc)
        appeal_reg_num = f"RTI-FA/{now.year}/{rti_record['pa_code']}/{int(now.timestamp()) % 1000000:06d}"

        grounds_text = ""
        if appeal_ground == "DEEMED_REFUSAL":
            grounds_text = (
                "The Central Public Information Officer (CPIO) has failed to provide any response "
                f"or decision within the mandatory statutory period of 30 days specified under Section 7(1) "
                f"of the Right to Information Act, 2005. By virtue of Section 7(2), the CPIO is deemed "
                "to have refused the request without any lawful justification."
            )
        else:
            grounds_text = (
                "The reply furnished by the CPIO is evasive, incomplete, and misleading, failing to supply "
                "the certified records requested in Queries 1 to 3."
            )

        appeal_memo = f"""
================================================================================
BEFORE THE FIRST APPELLATE AUTHORITY UNDER SECTION 19(1) OF RTI ACT, 2005
Appeal Registration Number: {appeal_reg_num}
Date of Appeal: {now.strftime('%d-%B-%Y')}
================================================================================

1. PARTICULARS OF THE APPELLANT:
   Name: {citizen_record['full_name']}
   Contact: {citizen_record['phone']} | {citizen_record['email']}
   Postal Address: {citizen_record['address']}, Pincode: {citizen_record['pincode']}

2. PARTICULARS OF THE CPIO AGAINST WHOSE ACTION APPEAL IS PREFERRED:
   Public Authority: {rti_record['department']}
   Ministry: {rti_record['ministry']}
   Original RTI Registration Number: {rti_record['registration_number']}
   Original RTI Filing Date: {rti_record['filing_date']}

3. DATE OF RECEIPT / EXPIRY OF 30-DAY STATUTORY TIMELINE:
   Statutory 30-Day Deadline: {rti_record['day_30_cpio_deadline']}
   Status: DEEMED REFUSAL UNDER SECTION 7(2)

4. GROUNDS FOR FIRST APPEAL:
   {grounds_text}

5. RELIEF SOUGHT:
   a) Direct the CPIO to immediately furnish the certified copies of records requested in the original application.
   b) Order that all information be supplied FREE OF COST in accordance with Section 7(6) of the RTI Act.
   c) Recommend disciplinary proceedings and penalty under Section 20 for unjustified non-compliance.

VERIFICATION:
I, {citizen_record['full_name']}, Appellant, do hereby declare that the contents stated above are true to my personal knowledge.

Signed electronically: {citizen_record['full_name']}
================================================================================
"""

        return {
            "appeal_registration_number": appeal_reg_num,
            "original_rti_number": rti_record["registration_number"],
            "filing_timestamp": now.isoformat(),
            "target_faa_email": rti_record.get("faa_email", "faa-hq@nic.in"),
            "appeal_memo_text": appeal_memo,
            "statutory_disposal_deadline_45_days": (now + timedelta(days=45)).isoformat(),
            "fee_required": 0.00
        }
```

---

## 9. EDGE CASES, THREAT MODELING & DEFENSIVE ENGINEERING

```
+---------------------------------------------------------------------------------------------------+
|  EDGE CASE & FAILURE DEFENSE MATRIX                                                              |
+------------------------------------+--------------------------------------------------------------+
| Potential Failure / Edge Case      | Praja-RTI Defensive Mitigation Strategy                      |
+------------------------------------+--------------------------------------------------------------+
| 1. High Audio Background Noise /   | Client-side AudioWorklet runs active noise-gating;           |
|    Heavy Vernacular Dialect        | Whisper Large-v3 with beam search width=5; confidence score  |
|                                    | < 0.7 highlights uncertain words and offers retry or text.    |
+------------------------------------+--------------------------------------------------------------+
| 2. Mixed Central & State Issues    | Agent explains each likely record-holder and suggests         |
|    (e.g., State Road + NHAI Toll)  | separate drafts; the citizen confirms every split and route.  |
+------------------------------------+--------------------------------------------------------------+
| 3. Defamatory / Abusive Language   | Preserve the citizen's editable transcript under their       |
|                                    | control; omit accusations only from the proposed RTI draft.  |
+------------------------------------+--------------------------------------------------------------+
| 4. Section 8 / Defense Exemption   | Pre-flight warning displayed if asking for RAW military      |
|    Interception                    | troop movements, Cabinet drafts, or ongoing CID wiretaps.    |
+------------------------------------+--------------------------------------------------------------+
| 5. Simulated Payment Unavailable   | Preserve the confirmed draft and route, explain that no fee   |
|                                    | was charged, and allow retry or demo BPL-certificate path.    |
+------------------------------------+--------------------------------------------------------------+
```

### 9.1 Privacy, Consent, and Security Planning Requirements

- Obtain affirmative microphone consent after explaining whether processing is local or remote. Recording consent is separate from any future account or notification consent.
- Obtain separate, plain-language consent before sending an OTP or sandbox notification. Normalize mobile numbers to E.164 server-side, encrypt the number at rest, and use a keyed lookup hash for uniqueness and abuse controls. Do not use verified mobile data for marketing or model training.
- Generate OTPs with a cryptographically secure source for sandbox-provider mode; store only a server-side HMAC or password-style hash. Set a five-minute expiry, a 45-second resend cooldown, at most five verification attempts per challenge, and a default ceiling of five OTP sends per number per hour plus privacy-preserving session/network limits. Consume a challenge after success or expiry and purge it within 24 hours.
- Use generic request and verification errors to prevent phone-number enumeration. The deterministic fixed judge OTP is allowed only behind an explicit demo-mode server flag, is visibly labeled in the UI, and must fail deployment validation in production mode.
- Establish sessions with random high-entropy tokens stored only as hashes server-side and delivered in `Secure`, `HttpOnly`, `SameSite=Lax` cookies. Rotate on authentication, enforce idle/absolute expiry, protect mutations against CSRF, revoke on logout, and invalidate active sessions on account deletion or security response.
- Use TLS for every browser-to-cloud and cloud-to-sandbox-provider request. Restrict CORS to the deployed browser origin; never send secrets to or store them in browser code.
- Enforce audio MIME validation, a planned three-minute/10 MB upload ceiling, request timeouts, bounded retries, and rate limits before invoking transcription or reasoning providers.
- Minimize capture: the routing API receives the normalized information need and required location context, not raw audio by default. Redact or avoid logging names, phone numbers, addresses, BPL documents, OTPs, and full transcripts.
- Give citizens visible controls to correct and delete audio, transcript, draft, uploaded certificate, local session data, and authenticated demo applications. A deletion confirmation states what was hidden immediately, what is queued for erasure, the seven-day tombstone limit, and whether any server copy remains.
- Encrypt sensitive data in transit and at rest. Apply the Section 3.2 retention schedule by data class; the official portal's three-year case retention does not authorize Praja-RTI to retain demo voice data or history for three years.
- Treat the public-authority snapshot as public reference data but protect ingestion integrity with checksums, source metadata, parser-version tracking, schema validation, and review of unexpected directory diffs.
- Keep internal routing API keys and third-party provider secrets server-side. Never embed them in browser bundles, screenshots, logs, sample requests, or repository files. Support rotation, revocation, rate limiting, scoped use, and a localhost-only no-secret development mode.
- Use server-generated confirmation tokens and idempotency keys for mock payments, simulated receipts, email and SMS. A retry returns the existing result and cannot create a second mock charge, receipt or successful delivery.
- Enforce ownership at the service and query layer for list, detail, events, receipt, notification retry, preference, and deletion endpoints. Derive the owner from the verified session, never from a URL/body user ID. Return the same generic not-found response for missing and non-owned records, test horizontal/vertical access control, and prevent object-store links from bypassing authorization.
- Treat status events as append-only, sequenced, and idempotent. Store only redacted metadata needed to explain demo activity; do not let an internal event claim official delivery, acceptance, processing, reply, or decision. Restrict administrative access and audit every exceptional access without copying application content into logs.
- Require separate notification consent and validate destination format. Email/SMS templates must say “independent demo,” “prepared,” and “not filed with government”; SMS must not contain the full RTI application or sensitive grievance details.
- Use request-size limits, MIME/type validation, malware scanning for any future PDF or BPL upload, output encoding, prompt-injection defenses, and human confirmation before every action that could affect an external system.
- A production launch requires a privacy notice, data-processing inventory, threat model, incident process, accessibility review, legal review, directory-governance owner, and explicit authorization for every official or third-party integration.

### 9.2 Simplified-Flow Failure Handling

| Failure | Recovery without false claims |
| :--- | :--- |
| Cloud/FastAPI unreachable | Keep the citizen's local transcript if consented, offer retry or text correction, and do not advance to routing or mock payment. |
| STT/LLM key absent or provider timeout | Switch to the labeled deterministic adapter; never present simulated output as live transcription or reasoning. |
| Noisy or low-confidence speech | Highlight uncertain words, ask for voice correction or optional text, and withhold the RTI draft until material facts are confirmed. |
| Fewer than three verified Central candidates | Return a directory-review/manual-search state; do not pad the list with invented authorities. |
| Ambiguous or multi-authority matter | Return three candidates when the Central directory supports them, show ambiguity/split warnings, and let the citizen search or override. |
| State-jurisdiction matter | Stop the Central candidate flow and explain that the official portal is Central-only; do not fabricate State authorities from the Central snapshot. |
| Confirmation missing or stale draft version | Reject mock payment and return the latest draft and authority choice for confirmation. |
| Duplicate mock-payment/receipt request | Return the existing idempotent result and demo reference. |
| Receipt rendering failure | Preserve confirmed draft and mock-payment status; render a plain accessible on-screen receipt and allow retry. |
| Email or SMS sandbox failure | Record the failed channel once, keep other successful channels, show the receipt on screen/download, and never claim delivery. |
| OTP provider unavailable | Switch only to a visibly labeled deterministic judge OTP when demo mode is explicitly enabled; otherwise preserve local draft progress and offer retry without claiming verification. |
| OTP expired, over-attempted, or resend-limited | Return a generic recoverable message and safe countdown/new-challenge path; never reveal account existence or bypass server checks. |
| Lost mobile number | Do not transfer old history based on an unsupported claim. Explain that hackathon recovery requires the old number or a new account; production recovery is deferred. |
| Session expired/revoked | Keep only consented local draft progress, require OTP sign-in again before confirmation/history, and never accept a cached browser user ID as authorization. |
| History ownership mismatch | Return generic not-found, record a redacted security event, and expose no application, event, receipt, destination, or recipient metadata. |
| History/status storage unavailable | Preserve the authenticated confirmation request idempotently, stop before mock payment/receipt if ownership cannot be durably recorded, and explain the internal demo outage. |
| Notification retry races | Use a channel-specific idempotency key and transactional outbox; a failed channel may retry, while an already-successful channel is returned unchanged. |
| Application deletion | Hide immediately, revoke downloads/retries, append `DELETED`, execute the published purge schedule, and never reconstruct deleted content from logs or notification payloads. |
| Unconfirmed session expiry/deletion | Remove audio/transcript/contact/session data according to policy and require a new consented session; do not reconstruct deleted content from logs. |

---

## 10. HACKATHON LIVE DEMONSTRATION STRATEGY & PITCH SCRIPT

### 10.1 The 3-Minute Live Demo Script for Judges

```
[0:00 - 0:30] THE PROBLEM:
Show actual screenshot of rtionline.gov.in.
"Judges, the official Central RTI portal requires citizens to choose among thousands of public authorities.
A wrong choice may require a Section 6(3) transfer within up to five days, plus operational handling time."

[0:30 - 1:20] THE VOICE AGENT WRITES THE RTI APPLICATION:
Open Praja-RTI on smartphone. Point out the permanent independent-demo notice, switch Light → Dark → System, tap A+, and switch the localized interface to Hindi without losing state. Tap the primary voice-agent control and speak in Hindi:
"हमार घर के सामने वाली नेशनल हाईवे 27 छह महीने से खुदी पड़ी है, कोई ठेकेदार काम नहीं कर रहा। हमको देखना है कितना बजट पास हुआ था।"
Live UI shows:
- Clearly labeled simulated Hindi transcription appearing live; citizen corrects one uncertain word.
- Agent notices the date range is missing and asks one plain-language follow-up; the citizen answers by voice or text.
- Agent summarizes what it understood and writes the complete editable RTI application; the citizen is never asked to write legal wording.
- Agent reads the draft back in plain Hindi; the citizen corrects a detail by voice, with optional text correction available.

[1:20 - 2:05] EXACTLY THREE EXPLAINED PUBLIC-AUTHORITY OPTIONS:
- Normalized information need is sent to the internal demo routing API, not to a government service.
- API searches the dated 2,916-authority mock snapshot and returns exactly three candidates, each with its stable ID, short reason, jurisdiction/context, and ambiguity warning—no confidence percentage.
- Citizen selects NHAI using their own knowledge. Show manual directory search and override as available alternatives.
- Before confirmation, citizen signs in with the clearly labeled deterministic judge OTP (or sandbox OTP when available). Show expiry/cooldown copy and explain that it is a demo credential, not government identity verification.
- Citizen explicitly confirms both the agent-authored RTI application and selected public authority. The protected server session, not a browser user ID, owns the internal record.
- Demo positioning: this may reduce preventable transfers but does not guarantee delivery or bypass Section 6(3).

[2:05 - 2:30] MOCK PAYMENT + SIMULATED RECEIPT:
Tap “Simulate ₹10 fee.” The server returns `SIMULATED_SUCCESS`; no real money or gateway is involved. The screen creates one idempotent receipt labeled “PRAJA-RTI INDEPENDENT DEMO — NOT FILED WITH GOVERNMENT,” with demo reference, timestamp, selected authority, prepared-request summary, and mock-payment status.

[2:30 - 2:50] SANDBOX EMAIL / SMS WITH FALLBACK:
With separate notification consent, trigger a test email and SMS. Show one sandbox delivery and one `FALLBACK_ONLY` channel to prove honest failure handling. The on-screen and downloadable receipt remain available and no message says the RTI was filed or accepted.

[2:50 - 2:58] INTERNAL HISTORY, NOT GOVERNMENT STATUS:
Open My Applications, find the `DEMO` reference, and show the owned timeline: authority selected, citizen confirmed, mock payment, simulated submission complete, receipt generated, and sandbox notification result. Briefly demonstrate authorized receipt download and a failed-channel retry. Keep the banner visible: “not RTI Online status; not synchronized with government.”

[2:58 - 3:00] THE IMPACT:
"Praja-RTI explores how a voice agent can help a citizen turn a natural explanation into a reviewable records request and a safer, human-confirmed route. This is an independent demo, not an official filing service."
```

---

## 11. DEPLOYMENT, INFRASTRUCTURE & CI/CD PIPELINE

> Future-state reference only. Deployment and implementation remain on hold pending explicit user authorization. Local development should default to a no-secret routing service and a dated read-only directory snapshot.

### 11.1 Default Hackathon Cloud Topology

- Package the Python service as a small FastAPI container behind a managed HTTPS load balancer or platform TLS endpoint. Redirect HTTP to HTTPS and enable HSTS after validating the domain.
- Allow CORS only from the configured Praja-RTI browser origin. The browser receives only the public FastAPI base URL; no STT, LLM, routing, email, SMS, payment, or infrastructure key appears in browser code.
- Keep provider credentials in the cloud platform's secret manager or encrypted server-side environment configuration. Use separate sandbox credentials, least privilege, rotation, revocation, and masked logs.
- Route OTP, email, and SMS only through explicitly configured test/sandbox providers. OTP secrets, fixed judge-mode configuration, signing/session keys, and encryption keys stay server-side; startup rejects deterministic OTP if the environment is marked production.
- Limit audio to approved MIME types, a planned maximum of three minutes and 10 MB per request; reject mismatched content type, malformed media and oversized bodies before transcription. Apply stricter limits if the chosen provider requires them.
- Rate-limit by session and privacy-preserving network signal, with separate tighter OTP request/verification limits; cap concurrent transcription jobs, set provider timeouts and bounded retries, and use request IDs without logging raw transcripts, mobile numbers, OTPs, or application content.
- Use the governed read-only public-authority snapshot as the routing database. A short-lived store holds consent, audio/transcript, and unconfirmed draft state. A protected relational store holds verified accounts, sessions, preferences, owned demo applications, status events, mock payments, receipts, notification outcomes, and deletion jobs under the Section 3.2 retention schedule.
- Use transactions plus durable idempotency/outbox storage for confirmation/status events, mock payment, receipt creation, and sandbox notification attempts so browser retries or worker restarts do not duplicate or reorder results. Receipt objects remain private and are served only after owner authorization.
- Run email and SMS through test/sandbox providers only. A provider outage or absent secret switches to a deterministic redacted outbox preview and on-screen/download receipt without claiming delivery.
- Health checks distinguish application readiness, directory-snapshot availability, and optional-provider status. The core demo remains ready when optional STT/LLM/email/SMS providers are absent because deterministic adapters are built into the server plan.

### 11.2 Deterministic No-Key Demonstration Mode

The reliable judging path must run without external credentials:

- language-labeled sample audio maps to a deterministic editable transcript;
- a rule-based conversation fixture asks the expected missing-detail question;
- template drafting creates the complete RTI application from confirmed facts;
- lexical/BM25 lookup over the local snapshot returns exactly three explained Central candidates;
- mock payment returns deterministic success/failure states without network access;
- receipt generation produces a deterministic `DEMO` artifact;
- email/SMS produce redacted sandbox previews with `FALLBACK_ONLY` status when providers are unavailable.
- OTP sign-in uses a clearly displayed judge-only code supplied by server-side demo configuration, while still exercising expiry, resend, attempt, session rotation, logout, and ownership checks; production-mode startup refuses this adapter.
- My Applications/history uses deterministic owned fixtures only for the authenticated judge account and still exercises search, filters, status events, receipt authorization, notification retry, and deletion boundaries.

Every adapter exposes its active mode (`LIVE_SANDBOX`, `DETERMINISTIC_DEMO`, or `UNAVAILABLE`) in diagnostics and user-facing copy where relevant.

### 11.3 Local Container Reference

```yaml
# /docker-compose.yml
version: '3.8'

services:
  praja-web:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - praja-api

  praja-api:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://praja_user:${PRAJA_DB_PASSWORD}@postgres:5432/praja_rti
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OTP_SANDBOX_API_KEY=${OTP_SANDBOX_API_KEY}
      - EMAIL_SANDBOX_API_KEY=${EMAIL_SANDBOX_API_KEY}
      - SMS_SANDBOX_API_KEY=${SMS_SANDBOX_API_KEY}
      - PRAJA_DEMO_MODE=${PRAJA_DEMO_MODE:-deterministic}
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis

  postgres:
    image: pgvector/pgvector:pg16
    environment:
      - POSTGRES_USER=praja_user
      - POSTGRES_PASSWORD=${PRAJA_DB_PASSWORD}
      - POSTGRES_DB=praja_rti
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

### 11.4 Implementation Phases After Explicit Authorization

Implementation remains on hold. If the user later authorizes work, keep the build sequence aligned to the simplified flow:

1. **Contracts and data:** Freeze consent, retention/deletion, candidate, OTP/session, ownership, preferences, status-event, confirmation, receipt and notification contracts; ingest and validate the dated public-authority snapshot.
2. **Independent accessible shell:** Build the mobile-first non-official shell, persistent notice, localized language controls, Light/Dark/System, A−/A/A+, responsive/reduced-motion behavior, and device preference persistence.
3. **Browser + FastAPI intake:** Build consented voice capture, transcript editing, TLS ingress, upload/rate limits, unconfirmed-session deletion and deterministic no-key adapters.
4. **Agent-authored RTI application:** Implement short spoken follow-ups, fact confirmation, complete draft generation, read-back summary, and voice/text correction without inventing facts.
5. **Three-candidate routing:** Return exactly three explained Central candidates on successful matches; add State redirect, ambiguity/multi-authority warnings, manual directory search and override.
6. **Sandbox OTP + account preferences:** Implement secure challenge hashing, expiry/cooldown/attempt limits, protected session rotation/logout, judge-only deterministic mode, account preference sync, and documented lost-number limitation.
7. **Confirmation + mock outcome:** Require the protected account session and explicit draft-and-authority confirmation, then add idempotent mock payment and simulated receipt.
8. **Internal history/status:** Add owner-scoped My Applications, detail/event timeline, private receipt download, strict authorization, retention/deletion jobs, and honest internal states.
9. **Sandbox delivery:** Add separately consented test email/SMS, per-channel idempotency/retry, redacted deterministic outbox fallback, on-screen/download receipt, and history events.
10. **Hardening and evaluation:** Run the Section 16.1 matrix, WCAG/native-language review, OTP/session/ownership security tests, privacy checks, failure drills, and the simplified three-minute demo.

Deferred beyond the hackathon: real RTI Online or government-department integration, real payment, official filing/status synchronization, production identity/OTP verification and lost-number recovery, production email/SMS delivery, live statutory tracking, reminders, deemed-refusal automation, and appeal submission.

---

### Conclusion & Project Summary

**Praja-RTI** is a planned, independent hackathon exploration of an accessible voice-agent approach to RTI drafting and pre-submission routing. The consistent core is: citizen speech/text → agent-authored editable RTI application → exactly three explained Central candidates when valid → sandbox OTP session → citizen selection and explicit confirmation → mock payment → simulated receipt → sandbox notifications → owner-scoped internal demo history. It proposes explainable recommendations, citizen correction, and explicit confirmation to reduce preventable errors; it does not promise correct routing, eliminate Section 6(3), charge money, file an RTI application, provide official status, or connect to the official portal.


---

## 12. ILLUSTRATIVE DATABASE SCHEMAS & FUTURE-STATE SQL DDL

Below is a planning reference for a possible PostgreSQL/pgvector implementation. It is not production-approved, and implementation remains on hold. The hackathon may instead use the governed read-only local snapshot described in Section 4.3.1.

```sql
-- ============================================================================
-- PRAJA-RTI: ILLUSTRATIVE HACKATHON DATA MODEL (POSTGRESQL 16 + PGVECTOR)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Enum types use honest internal demo language only.
CREATE TYPE jurisdiction_level_enum AS ENUM ('CENTRAL', 'STATE', 'CONCURRENT', 'UNKNOWN');
CREATE TYPE application_status_enum AS ENUM (
    'DRAFT',
    'NEEDS_INFORMATION',
    'AWAITING_CITIZEN_CONFIRMATION',
    'AUTHORITY_SELECTED',
    'MOCK_PAYMENT_PENDING',
    'PREPARED',
    'SIMULATED_SUBMISSION_COMPLETE',
    'RECEIPT_GENERATED',
    'NOTIFICATION_SENT',
    'NOTIFICATION_FAILED',
    'DELETED'
);
CREATE TYPE payment_mode_enum AS ENUM ('SIMULATED_UPI', 'SIMULATED_CARD', 'BPL_EXEMPTION', 'DETERMINISTIC_NO_KEY');
CREATE TYPE payment_status_enum AS ENUM ('SIMULATED_PENDING', 'SIMULATED_SUCCESS', 'SIMULATED_FAILED', 'SIMULATED_EXEMPTED');
CREATE TYPE theme_enum AS ENUM ('LIGHT', 'DARK', 'SYSTEM');
CREATE TYPE text_size_enum AS ENUM ('SMALL', 'DEFAULT', 'LARGE');

-- 1. VERIFIED DEMO ACCOUNTS. Mobile is encrypted; keyed hash supports lookup.
CREATE TABLE user_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mobile_lookup_hash VARCHAR(128) NOT NULL UNIQUE,
    mobile_ciphertext BYTEA NOT NULL,
    mobile_verified_at TIMESTAMP WITH TIME ZONE NOT NULL,
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OTP plaintext is never stored. These rows are short-lived and rate-limited.
CREATE TABLE otp_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mobile_lookup_hash VARCHAR(128) NOT NULL,
    otp_digest VARCHAR(255) NOT NULL,
    purpose VARCHAR(20) NOT NULL,
    provider_mode VARCHAR(30) NOT NULL,
    attempt_count SMALLINT NOT NULL DEFAULT 0,
    max_attempts SMALLINT NOT NULL DEFAULT 5,
    resend_available_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_otp_lookup_created ON otp_challenges(mobile_lookup_hash, created_at DESC);

CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    session_token_hash VARCHAR(128) NOT NULL UNIQUE,
    csrf_secret_hash VARCHAR(128) NOT NULL,
    idle_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    absolute_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sessions_user_active ON auth_sessions(user_id, revoked_at);

CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES user_accounts(id) ON DELETE CASCADE,
    theme theme_enum NOT NULL DEFAULT 'SYSTEM',
    text_size text_size_enum NOT NULL DEFAULT 'DEFAULT',
    language VARCHAR(20) NOT NULL DEFAULT 'en-IN',
    sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. DATED PUBLIC-AUTHORITY SNAPSHOT (2,916 RECORDS AT AUGUST 2026 REVIEW)
-- Hackathon directory is a governed snapshot of the official public-authority list,
-- not a hand-authored seed. It can become stale and must expose snapshot metadata.
CREATE TABLE public_authorities (
    pa_code VARCHAR(50) PRIMARY KEY,
    stable_internal_id UUID NOT NULL UNIQUE, -- assigned by governed ingestion; preserved across snapshots
    official_display_name VARCHAR(500) NOT NULL,
    ministry_name VARCHAR(255) NOT NULL,
    department_name VARCHAR(255) NOT NULL,
    authority_name VARCHAR(255) NOT NULL,
    jurisdiction_type jurisdiction_level_enum DEFAULT 'CENTRAL',
    portal_alignment_status VARCHAR(20) DEFAULT 'UNKNOWN',
    source_url TEXT NOT NULL,
    snapshot_date DATE NOT NULL,
    source_record_hash VARCHAR(128) NOT NULL,
    dataset_status VARCHAR(20) DEFAULT 'ACTIVE',
    nodal_cpio_name VARCHAR(255),
    nodal_cpio_email VARCHAR(255),
    nodal_cpio_phone VARCHAR(50),
    faa_name VARCHAR(255),
    faa_email VARCHAR(255),
    office_address TEXT,
    keywords_lexical TEXT[],
    authority_embedding VECTOR(1536), -- OpenAI text-embedding-3-small or Gemini text-embedding-004
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pa_embedding ON public_authorities USING ivfflat (authority_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_pa_keywords ON public_authorities USING GIN (keywords_lexical);

-- 3. OWNED PREPARED RTI APPLICATIONS (NOT GOVERNMENT SUBMISSIONS OR OFFICIAL STATUS)
CREATE TABLE rti_applications (
    demo_preparation_id VARCHAR(100) PRIMARY KEY,
    owner_user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    pa_code VARCHAR(50) REFERENCES public_authorities(pa_code) ON DELETE RESTRICT,
    
    -- Audio/raw transcript stays in a separate expiring session store and is not copied here.
    input_channel VARCHAR(50) DEFAULT 'VOICE_WEB',
    original_language VARCHAR(20) DEFAULT 'hi-IN',
    confirmed_information_need TEXT NOT NULL,
    
    -- Agent-authored, citizen-corrected RTI application
    agent_authored_rti_application TEXT NOT NULL,
    draft_version INTEGER NOT NULL DEFAULT 1,
    draft_hash VARCHAR(128) NOT NULL,
    authority_recommendation_explanation TEXT,
    selection_source VARCHAR(30),
    citizen_confirmed_draft BOOLEAN DEFAULT FALSE,
    citizen_confirmed_authority BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    
    -- Demo status; never filed with government
    current_status application_status_enum DEFAULT 'DRAFT',
    government_submission_status VARCHAR(30) DEFAULT 'NOT_SUBMITTED',
    is_emergency_48h BOOLEAN DEFAULT FALSE,
    emergency_justification TEXT,
    prepared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rti_owner_updated ON rti_applications(owner_user_id, updated_at DESC);
CREATE INDEX idx_rti_pa ON rti_applications(pa_code);
CREATE INDEX idx_rti_status ON rti_applications(current_status);

-- Append-only internal demo timeline. Current status is a projection of these events.
CREATE TABLE application_status_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demo_preparation_id VARCHAR(100) NOT NULL REFERENCES rti_applications(demo_preparation_id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    event_type VARCHAR(60) NOT NULL,
    event_status application_status_enum NOT NULL,
    actor_type VARCHAR(30) NOT NULL,
    public_label_key VARCHAR(100) NOT NULL,
    redacted_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key VARCHAR(255) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (demo_preparation_id, sequence_number),
    UNIQUE (demo_preparation_id, idempotency_key)
);
CREATE INDEX idx_status_timeline ON application_status_events(demo_preparation_id, sequence_number);

-- 4. MOCK PAYMENTS: NO MONEY OR EXTERNAL GATEWAY
CREATE TABLE payment_records (
    mock_payment_id VARCHAR(100) PRIMARY KEY,
    demo_preparation_id VARCHAR(100) NOT NULL REFERENCES rti_applications(demo_preparation_id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
    currency VARCHAR(5) DEFAULT 'INR',
    payment_mode payment_mode_enum NOT NULL,
    payment_status payment_status_enum DEFAULT 'SIMULATED_PENDING',
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    real_money_charged BOOLEAN NOT NULL DEFAULT FALSE,
    external_gateway_contacted BOOLEAN NOT NULL DEFAULT FALSE,
    simulated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pay_demo ON payment_records(demo_preparation_id);

-- 5. SIMULATED RECEIPTS
CREATE TABLE demo_receipts (
    demo_reference VARCHAR(100) PRIMARY KEY,
    demo_preparation_id VARCHAR(100) NOT NULL UNIQUE REFERENCES rti_applications(demo_preparation_id) ON DELETE CASCADE,
    mock_payment_id VARCHAR(100) NOT NULL UNIQUE REFERENCES payment_records(mock_payment_id) ON DELETE RESTRICT,
    selected_authority_id UUID NOT NULL REFERENCES public_authorities(stable_internal_id) ON DELETE RESTRICT,
    prepared_request_summary TEXT NOT NULL,
    draft_hash VARCHAR(128) NOT NULL,
    mock_payment_status payment_status_enum NOT NULL,
    government_submission_status VARCHAR(30) NOT NULL DEFAULT 'NOT_SUBMITTED',
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 6. SANDBOX EMAIL / SMS ATTEMPTS
CREATE TABLE notification_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demo_reference VARCHAR(100) NOT NULL REFERENCES demo_receipts(demo_reference) ON DELETE CASCADE,
    channel VARCHAR(30) NOT NULL,
    recipient_ciphertext BYTEA,
    recipient_hash VARCHAR(128) NOT NULL,
    delivery_status VARCHAR(30) NOT NULL,
    provider_message_id VARCHAR(255),
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    attempt_number SMALLINT NOT NULL DEFAULT 1,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recipient_erase_after TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Tracks user-requested purge without retaining deleted application content.
CREATE TABLE deletion_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_hash VARCHAR(128) NOT NULL,
    demo_reference_hash VARCHAR(128) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    content_erase_by TIMESTAMP WITH TIME ZONE NOT NULL,
    tombstone_purge_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

```

---

## 13. GOVERNED HACKATHON SNAPSHOT OF OFFICIAL PUBLIC AUTHORITIES

The implementation plan is to ingest the official RTI Online public-authority directory into the governed local snapshot described in Section 4.3.1. It listed 2,916 public authorities at review time. The dataset must carry its source, snapshot date, checksum, parser version, record count, and staleness warning, and it must be refreshed and governed before production use.

The JSON below is retained only as a **legacy illustrative schema example** from the original concept. Its names, codes, emails, and coverage must not be treated as a verified directory or manually promoted into the routing database. When implementation is authorized, replace this hand-authored sample with records produced by the official-directory snapshot process.

```json
[
  {
    "pa_code": "MORTH-NHAI",
    "ministry": "Ministry of Road Transport and Highways",
    "department": "National Highways Authority of India (NHAI)",
    "authority_name": "NHAI Headquarters & Regional Project Implementation Units",
    "keywords": ["national highway", "nh-24", "nh-44", "nh-27", "toll plaza", "fastag", "road pothole", "expressway", "highway tender", "contractor maintenance", "flyover", "bharatmala"],
    "cpio_email": "cpio-nhai@gov.in",
    "faa_email": "faa-nhai@gov.in"
  },
  {
    "pa_code": "MEA-PASSPORT",
    "ministry": "Ministry of External Affairs",
    "department": "Consular, Passport and Visa (CPV) Division",
    "authority_name": "Regional Passport Offices (RPO Pan-India)",
    "keywords": ["passport delay", "tatkaal passport", "police verification report", "pcc", "rpo renewal", "passport dispatch", "visa clearance", "emigration check required"],
    "cpio_email": "cpio.passport@mea.gov.in",
    "faa_email": "faa.passport@mea.gov.in"
  },
  {
    "pa_code": "MOR-RAILWAYS",
    "ministry": "Ministry of Railways",
    "department": "Railway Board",
    "authority_name": "Indian Railways / IRCTC / Zonal Divisions (Northern, Western, Southern, Eastern)",
    "keywords": ["railway ticket", "irctc refund", "train cancellation", "pnr status", "railway station cleanliness", "train delay compensation", "railway vendor license", "berth allotment"],
    "cpio_email": "cpio-railways@rb.railnet.gov.in",
    "faa_email": "faa-railways@rb.railnet.gov.in"
  },
  {
    "pa_code": "MOF-INCOMETAX",
    "ministry": "Ministry of Finance",
    "department": "Department of Revenue",
    "authority_name": "Central Board of Direct Taxes (CBDT) / Income Tax Department",
    "keywords": ["income tax refund delay", "itr processing", "pan card correction", "tds mismatch", "tax assessment order", "section 143(1) intimation", "tax exemption 80g"],
    "cpio_email": "cpio.incometax@incometax.gov.in",
    "faa_email": "faa.incometax@incometax.gov.in"
  },
  {
    "pa_code": "MOL-EPFO",
    "ministry": "Ministry of Labour and Employment",
    "department": "Employees' Provident Fund Organisation (EPFO)",
    "authority_name": "EPFO Regional & Zonal PF Commissioner Offices",
    "keywords": ["pf withdrawal delay", "provident fund claim", "uan passbook", "pension scheme eps-95", "pf transfer form 13", "employer pf contribution non-deposit"],
    "cpio_email": "cpio.epfo@epfindia.gov.in",
    "faa_email": "faa.epfo@epfindia.gov.in"
  },
  {
    "pa_code": "DFS-SBI",
    "ministry": "Ministry of Finance",
    "department": "Department of Financial Services",
    "authority_name": "State Bank of India (SBI) & Nationalized Public Sector Banks",
    "keywords": ["sbi home loan", "bank locker agreement", "atm cash failure refund", "education loan subsidy", "cibil dispute", "pension disbursement bank", "pm mudra loan"],
    "cpio_email": "cpio.sbi@sbi.co.in",
    "faa_email": "faa.sbi@sbi.co.in"
  },
  {
    "pa_code": "MOE-CBSE",
    "ministry": "Ministry of Education",
    "department": "Department of School Education and Literacy",
    "authority_name": "Central Board of Secondary Education (CBSE)",
    "keywords": ["cbse marksheet correction", "board exam answer sheet copy", "school affiliation rules", "cbse duplicate certificate", "re-evaluation marks", "ctet exam result"],
    "cpio_email": "cpio.cbse@nic.in",
    "faa_email": "faa.cbse@nic.in"
  },
  {
    "pa_code": "MOE-NTA",
    "ministry": "Ministry of Education",
    "department": "Department of Higher Education",
    "authority_name": "National Testing Agency (NTA)",
    "keywords": ["neet ug exam", "jee mains answer key", "cuet result delay", "ugc net score card", "exam center grievance", "omr sheet certified copy"],
    "cpio_email": "cpio.nta@nta.ac.in",
    "faa_email": "faa.nta@nta.ac.in"
  },
  {
    "pa_code": "UIDAI-HQ",
    "ministry": "Ministry of Electronics and Information Technology",
    "department": "Unique Identification Authority of India (UIDAI)",
    "authority_name": "UIDAI Headquarters & Regional Data Centers",
    "keywords": ["aadhaar update status", "biometric lock", "aadhaar pvc card dispatch", "enrolment center complaint", "aadhaar authentication history"],
    "cpio_email": "cpio.uidai@uidai.gov.in",
    "faa_email": "faa.uidai@uidai.gov.in"
  },
  {
    "pa_code": "MOHFW-AIIMS",
    "ministry": "Ministry of Health and Family Welfare",
    "department": "Department of Health and Family Welfare",
    "authority_name": "All India Institute of Medical Sciences (AIIMS New Delhi & Pan-India)",
    "keywords": ["aiims opd appointment", "hospital tender medical equipment", "doctor vacancy sanction", "clinical trial record", "pmjay empanelled bed audit"],
    "cpio_email": "cpio.aiims@aiims.edu",
    "faa_email": "faa.aiims@aiims.edu"
  },
  {
    "pa_code": "MOD-ARMY",
    "ministry": "Ministry of Defence",
    "department": "Department of Military Affairs",
    "authority_name": "Integrated Headquarters of Ministry of Defence (Army / Navy / Air Force)",
    "keywords": ["defence pension sparsh", "canteen stores department csd", "military cantonment board property", "recruitment rally merit list", "ex-servicemen contributory health scheme echs"],
    "cpio_email": "cpio.defence@gov.in",
    "faa_email": "faa.defence@gov.in"
  },
  {
    "pa_code": "MHA-DELHIPOLICE",
    "ministry": "Ministry of Home Affairs",
    "department": "Department of Internal Security",
    "authority_name": "Delhi Police (Union Territory Police under MHA)",
    "keywords": ["delhi police fir copy", "delhi traffic challan audit", "police clearance certificate pcc delhi", "complaint status dy commissioner delhi"],
    "cpio_email": "cpio.delhipolice@delhipolice.gov.in",
    "faa_email": "faa.delhipolice@delhipolice.gov.in"
  }
]
```

---

## 14. ILLUSTRATIVE FRONTEND INTERACTION SKETCH (NEXT.JS + TAILWIND)

> Superseded historical UI sketch only. It does not represent the authoritative simplified flow and retains obsolete status/tracking/appeal states. Future implementation must follow the voice-agent, exactly-three-candidate, explicit-confirmation, mock-payment, simulated-receipt and sandbox-notification contracts above.

Below is the complete React/Next.js page implementation featuring voice recording, live multi-lingual waveform rendering, smart preview card, statutory 30-day timeline visualizer, and 1-Click Appeal trigger.

```tsx
// /src/app/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Mic, MicOff, CheckCircle, AlertTriangle, Clock, ArrowRight, 
  FileText, Shield, RefreshCw, Volume2, Globe, CreditCard, ChevronRight, Zap
} from 'lucide-react';

interface MatchedAuthority {
  paCode: string;
  ministry: string;
  department: string;
  confidence: number;
}

interface RTIApplicationState {
  rawTranscript: string;
  language: string;
  isValidCentral: boolean;
  stateWarning?: string;
  authority: MatchedAuthority;
  queries: string[];
  isEmergency: boolean;
  registrationNumber?: string;
  filingDate?: string;
  status: 'IDLE' | 'RECORDING' | 'ANALYZING' | 'PREVIEW' | 'PAID_TRACKING' | 'DEEMED_REFUSAL_DEMO' | 'APPEAL_GENERATED';
  simulatedDaysElapsed: number;
}

export default function PrajaRTIPortal() {
  const [appState, setAppState] = useState<RTIApplicationState>({
    rawTranscript: '',
    language: 'Hindi (hi-IN)',
    isValidCentral: true,
    authority: {
      paCode: 'MORTH-NHAI',
      ministry: 'Ministry of Road Transport and Highways',
      department: 'National Highways Authority of India (NHAI)',
      confidence: 0.984
    },
    queries: [],
    isEmergency: false,
    status: 'IDLE',
    simulatedDaysElapsed: 0
  });

  const [isRecording, setIsRecording] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [highContrast, setHighContrast] = useState(false);

  // Mock Voice Recording Handler for Instant Demo
  const handleToggleRecord = () => {
    if (!isRecording) {
      setIsRecording(true);
      setAppState(prev => ({ ...prev, status: 'RECORDING', rawTranscript: '' }));
      
      // Simulate live streaming speech recognition
      setTimeout(() => {
        setAppState(prev => ({
          ...prev,
          rawTranscript: 'हमार घर के सामने वाली नेशनल हाईवे 27 छह महीने से टूटी पड़ी है, कोई ठेकेदार काम नहीं कर रहा। हमको बजट का पूरा हिसाब और ठेकेदार का नाम जानना है।'
        }));
      }, 1500);

    } else {
      setIsRecording(false);
      setAppState(prev => ({ ...prev, status: 'ANALYZING' }));
      
      // Simulate AI transformation, Vector Matching, and Jurisdiction Gatekeeping
      setTimeout(() => {
        setAppState(prev => ({
          ...prev,
          status: 'PREVIEW',
          isValidCentral: true,
          queries: [
            '1. Please provide certified copies of the sanctioned budget, work order, and tender contract details for the maintenance of National Highway 27 for FY 2024-2026.',
            '2. Please provide the designated start date, completion deadline, and liquidated damages / penalty clauses for contractor delay.',
            '3. Please provide copies of site quality inspection reports and measurement book entries submitted by the inspecting engineer in the last 6 months.'
          ]
        }));
      }, 1200);
    }
  };

  const handleSimulatePayment = () => {
    const regNum = 'RTI/2026/NHAI/' + Math.floor(100000 + Math.random() * 900000);
    setAppState(prev => ({
      ...prev,
      status: 'PAID_TRACKING',
      registrationNumber: regNum,
      filingDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      simulatedDaysElapsed: 12
    }));
  };

  const handleTriggerDeemedRefusal = () => {
    setAppState(prev => ({
      ...prev,
      status: 'DEEMED_REFUSAL_DEMO',
      simulatedDaysElapsed: 31
    }));
  };

  const handleGenerateAppeal = () => {
    setAppState(prev => ({
      ...prev,
      status: 'APPEAL_GENERATED'
    }));
  };

  return (
    <div className={}>
      
      {/* Top Accessibility & Language Header */}
      <header className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white border-b border-blue-900">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap justify-between items-center text-xs sm:text-sm">
          <div className="flex items-center space-x-3">
            <img 
              src="https://rtionline.gov.in/images/logo/indian-emblam-white.png" 
              alt="State Emblem of India" 
              className="h-10 w-auto filter brightness-110"
            />
            <div>
              <p className="font-bold tracking-wide uppercase text-amber-400">Independent civic-tech experiment</p>
              <p className="text-xs text-slate-300">Right to Information Online Modernization Portal | RTI Act, 2005</p>
            </div>
          </div>

          {/* Accessibility Adjusters */}
          <div className="flex items-center space-x-4 mt-2 sm:mt-0">
            <div className="flex items-center space-x-1 bg-slate-800 rounded px-2 py-1 border border-slate-700">
              <span className="text-xs text-slate-400 mr-1">Font:</span>
              <button onClick={() => setFontSize('normal')} className={}>A</button>
              <button onClick={() => setFontSize('large')} className={}>A+</button>
              <button onClick={() => setFontSize('xlarge')} className={}>A++</button>
            </div>

            <button 
              onClick={() => setHighContrast(!highContrast)} 
              className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded font-semibold text-xs transition"
            >
              {highContrast ? 'Standard Theme' : 'High Contrast'}
            </button>

            <div className="flex items-center space-x-1 text-slate-300 text-xs">
              <Globe className="w-3.5 h-3.5" />
              <select className="bg-slate-800 text-white rounded px-2 py-1 border border-slate-700 text-xs">
                <option>English (IN)</option>
                <option>हिन्दी (Hindi)</option>
                <option>தமிழ் (Tamil)</option>
                <option>తెలుగు (Telugu)</option>
                <option>বাংলা (Bengali)</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Title & Statutory Banner */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 mb-3 border border-blue-200">
            <Shield className="w-3.5 h-3.5 text-blue-700" />
            Democratizing Democratic Accountability (Act No. 22 of 2005)
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Praja-RTI: Voice-First Citizen Information Portal
          </h1>
          <p className="mt-2 text-slate-600 max-w-2xl mx-auto">
            Speak naturally in any Indian language. Our legal AI agent converts your words into formal RTI questions, matches the right Central Public Authority instantly, and manages your statutory deadlines.
          </p>
        </div>

        {/* Dynamic Workflow Viewport */}
        {appState.status === 'IDLE' || appState.status === 'RECORDING' || appState.status === 'ANALYZING' ? (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center max-w-2xl mx-auto">
            <div className="mb-6">
              <div className={} onClick={handleToggleRecord}>
                {isRecording ? <MicOff className="w-12 h-12 text-white" /> : <Mic className="w-12 h-12 text-white" />}
              </div>
            </div>

            <h3 className="text-xl font-bold text-slate-800">
              {isRecording ? 'Listening... Speak in Hindi, Tamil, English, or any language' : 'Tap Microphone to File RTI by Voice'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Example: &quot;I want to know the road repair contract details for National Highway 27.&quot;
            </p>

            {appState.rawTranscript && (
              <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-left">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Live Transcription:</span>
                <p className="text-slate-800 font-medium italic">&quot;{appState.rawTranscript}&quot;</p>
              </div>
            )}

            {appState.status === 'ANALYZING' && (
              <div className="mt-6 flex items-center justify-center space-x-2 text-blue-900 font-semibold">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Running Jurisdiction Check & Transforming Grievance to RTI Queries...</span>
              </div>
            )}
          </div>
        ) : null}

        {/* STEP 2: REVIEW & PREVIEW CARD */}
        {appState.status === 'PREVIEW' && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-w-3xl mx-auto">
            <div className="bg-blue-950 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-amber-400">Formulated RTI Application (Draft Review)</h3>
                <p className="text-xs text-slate-300">Verified under Section 6(1) of the Right to Information Act, 2005</p>
              </div>
              <span className="px-2.5 py-1 bg-green-500/20 text-green-300 border border-green-500/40 rounded-full text-xs font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Central Jurisdiction
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* Target Public Authority Card */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block mb-1">Recommended Public Authority (Confirm or Change):</span>
                <p className="text-base font-bold text-slate-900">{appState.authority.department}</p>
                <p className="text-xs text-slate-600 mt-0.5">Governing Ministry: {appState.authority.ministry}</p>
                <span className="inline-block mt-2 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  Classification Confidence: {(appState.authority.confidence * 100).toFixed(1)}% | 5-Day Transfer Bypassed
                </span>
              </div>

              {/* Transformed RTI Queries */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Legally Admissible Information Requests:</span>
                <div className="space-y-3">
                  {appState.queries.map((q, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm font-medium leading-relaxed">
                      {q}
                    </div>
                  ))}
                </div>
              </div>

              {/* Statutory Fee Summary & Payment Trigger */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap justify-between items-center">
                <div>
                  <span className="text-xs text-slate-500 block">Statutory Application Fee:</span>
                  <span className="text-2xl font-black text-slate-900">₹10.00</span>
                  <span className="text-xs text-slate-500 ml-2">(Waived for BPL Cardholders)</span>
                </div>

                <button 
                  onClick={handleSimulatePayment}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md flex items-center gap-2 transition"
                >
                  <CreditCard className="w-4 h-4" /> Pay ₹10 & Submit Application
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: STATUTORY TRACKER & 30-DAY SLA TIME MACHINE */}
        {(appState.status === 'PAID_TRACKING' || appState.status === 'DEEMED_REFUSAL_DEMO' || appState.status === 'APPEAL_GENERATED') && (
          <div className="space-y-6 max-w-4xl mx-auto">
            
            {/* Top Info Banner */}
            <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 flex flex-wrap justify-between items-center gap-4">
              <div>
                <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">Official Registration Number:</span>
                <h2 className="text-2xl font-black text-blue-950">{appState.registrationNumber}</h2>
                <p className="text-xs text-slate-500 mt-1">Public Authority: {appState.authority.department}</p>
              </div>

              <div className="flex items-center gap-3">
                {appState.status === 'PAID_TRACKING' && (
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-800 font-bold text-xs rounded-full border border-blue-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Day {appState.simulatedDaysElapsed} of 30 (In Progress)
                  </span>
                )}
                {appState.status === 'DEEMED_REFUSAL_DEMO' && (
                  <span className="px-3 py-1.5 bg-red-100 text-red-800 font-bold text-xs rounded-full border border-red-300 flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle className="w-4 h-4 text-red-600" /> DEEMED REFUSAL (Section 7.2)
                  </span>
                )}
                {appState.status === 'APPEAL_GENERATED' && (
                  <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full border border-emerald-300 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> FIRST APPEAL LODGED (#FAA-0941)
                  </span>
                )}
              </div>
            </div>

            {/* Statutory Timeline Graphic */}
            <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Statutory Legal Milestones (RTI Act 2005):</h4>
              
              <div className="relative flex justify-between items-center">
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0" />
                
                {/* Day 0 */}
                <div className="relative z-10 text-center">
                  <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xs mx-auto ring-4 ring-white">
                    0d
                  </div>
                  <span className="text-xs font-bold block mt-2 text-slate-800">Filed & Routed</span>
                  <span className="text-[10px] text-slate-500">Route recommended</span>
                </div>

                {/* Day 5 */}
                <div className="relative z-10 text-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs mx-auto ring-4 ring-white">
                    5d
                  </div>
                  <span className="text-xs font-bold block mt-2 text-slate-800">Transfer Sec 6(3)</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Bypassed</span>
                </div>

                {/* Day 30 */}
                <div className="relative z-10 text-center">
                  <div className={}>
                    30d
                  </div>
                  <span className="text-xs font-bold block mt-2 text-slate-800">CPIO Deadline</span>
                  <span className="text-[10px] text-slate-500">Sec 7(1)</span>
                </div>

                {/* Day 45 */}
                <div className="relative z-10 text-center">
                  <div className={}>
                    45d
                  </div>
                  <span className="text-xs font-bold block mt-2 text-slate-800">FAA Disposal</span>
                  <span className="text-[10px] text-slate-500">Sec 19(6)</span>
                </div>

                {/* Day 90 */}
                <div className="relative z-10 text-center">
                  <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs mx-auto ring-4 ring-white">
                    90d
                  </div>
                  <span className="text-xs font-bold block mt-2 text-slate-800">CIC 2nd Appeal</span>
                  <span className="text-[10px] text-slate-500">Sec 19(3)</span>
                </div>
              </div>
            </div>

            {/* HACKATHON DEMO SIMULATION CONTROLLER */}
            {appState.status === 'PAID_TRACKING' && (
              <div className="p-6 bg-amber-50 border-2 border-amber-300 rounded-2xl text-center space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block">
                  ⚡ Hackathon Live Demo Time-Machine Controller
                </span>
                <p className="text-sm text-slate-700">
                  Demonstrate to the jury how Praja-RTI prevents silent statutory expiration when a CPIO does not reply.
                </p>
                <button 
                  onClick={handleTriggerDeemedRefusal}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2 mx-auto"
                >
                  <Zap className="w-4 h-4" /> Simulate Day 31: CPIO No-Reply (Trigger Deemed Refusal)
                </button>
              </div>
            )}

            {/* DEEMED REFUSAL & 1-CLICK APPEAL MODAL */}
            {appState.status === 'DEEMED_REFUSAL_DEMO' && (
              <div className="p-6 bg-red-50 border-2 border-red-400 rounded-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-bold text-red-900">Statutory Deemed Refusal Triggered (Section 7.2)</h3>
                    <p className="text-xs text-red-700 mt-1 leading-relaxed">
                      The 30-day legal response window for the Central Public Information Officer expired on Day 30. Under Section 7(2) of the RTI Act, this is legally considered a rejection, unlocking an immediate Right to First Appeal under Section 19(1).
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-red-200 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-slate-500 block">Section 20 Penalty Accrued on Officer:</span>
                    <span className="text-lg font-extrabold text-red-600">₹250 / day</span>
                  </div>

                  <button 
                    onClick={handleGenerateAppeal}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 transition"
                  >
                    <FileText className="w-4 h-4" /> ⚡ Generate 1-Click First Appeal (FAA)
                  </button>
                </div>
              </div>
            )}

            {/* FIRST APPEAL CONFIRMATION DOSSIER */}
            {appState.status === 'APPEAL_GENERATED' && (
              <div className="p-6 bg-emerald-50 border-2 border-emerald-400 rounded-2xl space-y-4">
                <div className="flex items-center gap-3 text-emerald-900">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                  <h3 className="text-lg font-bold">First Appeal Successfully Lodged with FAA</h3>
                </div>
                <div className="p-4 bg-white rounded-xl border border-emerald-200 text-xs text-slate-700 font-mono space-y-2">
                  <p><strong>Appeal Registration:</strong> RTI-FA/2026/NHAI/001204</p>
                  <p><strong>Appellate Authority:</strong> Shri V. K. Aggarwal, Chief General Manager (Appeals), NHAI</p>
                  <p><strong>Statutory Grounds:</strong> Deemed Refusal under Section 7(2) due to non-response within 30 days.</p>
                  <p><strong>FAA Statutory Disposal Deadline (45 Days):</strong> 45 Days remaining</p>
                </div>
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
```

---

## 15. ILLUSTRATIVE FASTAPI ROUTER SKETCH (PLANNING REFERENCE ONLY)

The legacy code below is superseded by the cloud FastAPI contracts in Sections 3 and 6. It is not production-grade and includes obsolete submit/SLA/appeal behavior that is outside the simplified hackathon scope.

```python
# /server/main.py
import os
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.rti_transformer import transform_grievance_to_rti
from services.authority_matcher import match_public_authority
from services.sla_scheduler import SLATrackingService
from services.appeal_generator import AppealGeneratorService

app = FastAPI(
    title="Praja-RTI API Engine",
    description="Statutory AI Backend for Right to Information Act, 2005",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Request & Response Schemas
class CitizenInput(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None
    address: str
    pincode: str

class PaymentInput(BaseModel):
    mode: str
    amount: float = 10.00
    is_bpl_exempt: bool = False
    transaction_id: str

class RTISubmissionRequest(BaseModel):
    citizen: CitizenInput
    pa_code: str
    queries: List[str]
    payment: PaymentInput
    raw_transcript: Optional[str] = None

@app.post("/api/v1/voice/transcribe-and-transform", status_code=status.HTTP_200_OK)
async def process_voice_rti(audio_file: UploadFile = File(...)):
    """
    Ingests binary audio blob, runs ASR, translates, checks Central vs State jurisdiction,
    and formulates structured RTI queries.
    """
    try:
        # In mock/hackathon mode: Transcribe audio
        # Whisper / IndicASR call simulated:
        sample_transcript = "हमार घर के सामने वाली नेशनल हाईवे 27 छह महीने से टूटी पड़ी है, कोई ठेकेदार काम नहीं कर रहा। हमको बजट का पूरा हिसाब जानना है।"
        detected_lang = "hi-IN"

        # 1. Transform Grievance via LLM
        structured_rti = await transform_grievance_to_rti(sample_transcript, detected_lang)

        # 2. Match Public Authority via Hybrid Vector Search
        matched_pa = match_public_authority(
            search_keywords=structured_rti.search_keywords,
            query_text=structured_rti.transcript_english
        )

        return {
            "success": True,
            "data": {
                "transcript": sample_transcript,
                "language": detected_lang,
                "english_translation": structured_rti.transcript_english,
                "is_valid_central": structured_rti.is_valid_central_authority,
                "state_warning": structured_rti.state_rejection_reason,
                "matched_authority": matched_pa,
                "transformed_queries": structured_rti.transformed_queries,
                "is_emergency": structured_rti.is_emergency_48h
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/rti/submit", status_code=status.HTTP_201_CREATED)
async def submit_rti_application(payload: RTISubmissionRequest):
    """
    Registers the RTI application, binds the payment, and calculates statutory SLA milestones.
    """
    now = datetime.now(timezone.utc)
    reg_number = f"RTI/{now.year}/{payload.pa_code}/{int(now.timestamp()) % 1000000:06d}"

    # Compute Statutory Milestones under RTI Act 2005
    milestones = SLATrackingService.calculate_statutory_milestones(
        filing_timestamp=now,
        is_emergency_48h=False
    )

    return {
        "success": True,
        "data": {
            "registration_number": reg_number,
            "filing_timestamp": now.isoformat(),
            "statutory_deadlines": milestones,
            "status": "SUBMITTED",
            "receipt_pdf_download_url": f"/api/v1/docs/receipt_{reg_number.replace('/', '_')}.pdf"
        }
    }

@app.post("/api/v1/appeals/generate-first-appeal", status_code=status.HTTP_200_OK)
async def generate_first_appeal(original_reg_number: str, pa_code: str, citizen_name: str, phone: str, address: str, pincode: str):
    """
    Auto-generates a Section 19(1) First Appeal memo based on Deemed Refusal.
    """
    mock_rti_record = {
        "registration_number": original_reg_number,
        "pa_code": pa_code,
        "department": "National Highways Authority of India (NHAI)",
        "ministry": "Ministry of Road Transport and Highways",
        "filing_date": "2026-08-01T10:00:00Z",
        "day_30_cpio_deadline": "2026-08-31T23:59:59Z",
        "faa_email": "faa-appeals@nhai.gov.in"
    }

    mock_citizen_record = {
        "full_name": citizen_name,
        "phone": phone,
        "email": "rajesh.sharma@example.com",
        "address": address,
        "pincode": pincode
    }

    appeal_dossier = AppealGeneratorService.generate_first_appeal_dossier(
        rti_record=mock_rti_record,
        citizen_record=mock_citizen_record,
        appeal_ground="DEEMED_REFUSAL"
    )

    return {
        "success": True,
        "data": appeal_dossier
    }
```

---

## 16. END-TO-END AUTOMATED TEST SUITE (PYTEST)

### 16.1 Voice-Agent, Authentication, Routing, and Internal-History Evaluation Flow

The primary hackathon evaluation is an auditable end-to-end trace:

`citizen speech sample → visible transcript → short spoken follow-up → citizen correction → agent-authored editable RTI application → read-back summary → routing API query → exactly three explained Central candidates when valid → citizen selection / search / override → sandbox or deterministic-demo OTP session → explicit draft-and-authority confirmation → idempotent mock payment → idempotent simulated receipt → sandbox email/SMS or on-screen fallback → owner-scoped My Applications and internal timeline`

Each trace records the supported-language declaration, STT or simulation label, transcript confidence, corrections, follow-up questions, normalized information need, directory snapshot ID, candidate stable IDs, route explanation, manual overrides, authentication mode (without OTP/mobile secrets), final confirmation, internal status-event IDs, and idempotency results. It must never record a government filing success because no official filing occurs.

Minimum evaluation matrix:

| Scenario | Expected behavior |
| :--- | :--- |
| Agent-authored draft | Voice facts produce a complete editable RTI application without requiring the citizen to write legal wording; no fact is invented. |
| Spoken follow-up/read-back | Agent asks only a missing material question, reads or summarizes the completed draft, and accepts voice correction. |
| Correct Central routing | Successful response returns exactly three ranked Central public authorities from the snapshot, each with reason, jurisdiction/context and ambiguity warning, then requires selection and confirmation. |
| State-jurisdiction matter | Explains that the official portal is Central-only and guides the citizen to verify the State route without inventing an authority. |
| Ambiguous authority | Returns multiple candidates with plain-language differences and no silent choice. |
| Multi-authority request | Flags multiple record-holders and proposes editable separate drafts. |
| Unsupported language | States the limitation and offers language switch, manual transcript, or text input. |
| Noisy audio | Highlights uncertain spans and offers retry, correction, or text without losing confirmed progress. |
| Low STT confidence | Does not transform uncertain text until the citizen corrects or confirms it. |
| Manual route override | Preserves the citizen's selected public authority and records that it overrode the recommendation. |
| Stale authority snapshot | Displays the snapshot date and requires directory review before a route is treated as current. |
| Missing authority data | Returns `DIRECTORY_REVIEW_REQUIRED`; never invents a CPIO, email, or destination. |
| Routing API failure | Preserves transcript and draft, offers retry/manual search, and does not advance to simulated preparation. |
| Internal API authentication/rate limit | Rejects invalid or over-limit requests without exposing secrets or citizen content. |
| Theme/text-size/language persistence | Light, Dark, System and A−/A/A+ work in each supported locale, persist per device, optionally sync to the account, and do not lose voice/draft state. |
| Responsive/accessibility controls | Core flow and history pass keyboard, screen-reader, focus, contrast, reduced-motion, 200% zoom and 320 CSS px reflow acceptance criteria in Light and Dark themes. |
| Independent visual identity | No official emblem, seal, government wordmark, or affiliation claim appears; permanent demo notice remains visible in intake, OTP, receipt, and history. |
| OTP request privacy | Unknown/known numbers receive generic responses; mobile is normalized/encrypted, plaintext OTP is never persisted, browser gets no provider secret, and logs contain neither. |
| OTP expiry/cooldown/attempt limit | Five-minute expiry, 45-second resend cooldown, five-attempt challenge limit, hourly send limit, and rate-limit recovery behave server-side. |
| Deterministic OTP boundary | Offline judge mode is visibly labeled and fully exercises session/limits; production-mode configuration refuses to enable it. |
| Protected session/logout | Session rotates after verification, uses protected cookie/CSRF controls, expires on idle/absolute limits, and cannot access history after logout/revocation. |
| Lost-number recovery | Demo does not disclose or transfer old history without the old verified number; it communicates the production-recovery deferral. |
| Explicit confirmation | The mock-payment endpoint remains unavailable until the current RTI draft and selected destination are both confirmed. |
| Mock payment boundary | Confirms no real money or external gateway is used; deterministic success/failure works without keys. |
| Payment idempotency | Repeating the same request returns one `mock_payment_id` and never duplicates simulated state. |
| Receipt content/idempotency | One `DEMO` receipt contains timestamp, selected authority, prepared summary and mock status; retries return the same reference. |
| Sandbox notifications | Test email/SMS templates contain the non-filing warning; unavailable providers return `FALLBACK_ONLY` with on-screen/download access. |
| Notification idempotency | Retrying one failed channel does not duplicate a successful email or SMS. |
| History list/filter | Only the signed-in user's applications appear; search, status/date filters, demo reference, authority, payment state, receipt availability, and last-updated values are correct. |
| History detail/timeline | Agent-written request, route explanation, confirmation, mock payment, receipt, and sandbox delivery events are ordered, localized, readable, append-only, and explicitly internal demo states. |
| Horizontal authorization | Guessing another user's application/event/receipt reference, retry URL, or deletion URL returns generic not-found and leaks no existence or metadata. |
| Private receipt | Owner can view/download with `private, no-store`; logout, deletion, guessed URL, or copied object path cannot bypass authorization. |
| Notification retry | Only a failed consented channel retries; concurrent calls produce one attempt/outcome and append the correct internal event. |
| Consent and retention | Mic, OTP, preference-sync and notification consents remain distinct; audio, unconfirmed session, OTP, authenticated history, recipients, tombstone, and deletion each follow the published data-class schedule. |
| User-requested deletion | Application hides immediately, status becomes `DELETED`, downloads/retries revoke, content purges within 24 hours, tombstone purges after seven days, and repeat deletion is idempotent. |
| Honest status vocabulary | Only the approved internal labels appear; no state implies government receipt, acceptance, processing, reply, or decision, and all history says it is unsynchronized. |
| Upload/rate/TLS security | Rejects non-TLS requests at the edge, unsupported/oversized media, missing consent, invalid secrets, and rate-limit excess without leaking content. |
| No-key reliability | STT/LLM/notification secrets absent still yields a fully labeled deterministic demo path. |
| No government claim | All receipts and IDs are visibly prefixed `DEMO`; copy says prepared/simulated, never filed, paid to, accepted by, or sent to government. |

Tests should combine deterministic unit fixtures, routing-catalog snapshot validation, API contract tests, accessibility checks, privacy/retention tests, and browser-level conversational flows. Language quality evaluation must include native-speaker review for each declared supported language rather than relying only on automated scores.

> The Python snippet below is a superseded historical test sketch. Its numeric-confidence and SLA assertions are not part of the authoritative hackathon test plan; the evaluation matrix above is authoritative.

```python
# /tests/test_rti_pipeline.py
import pytest
from datetime import datetime, timedelta, timezone
from services.sla_scheduler import SLATrackingService
from services.authority_matcher import match_public_authority

def test_sla_statutory_30_day_calculation():
    filing_date = datetime(2026, 8, 1, 10, 0, 0, tzinfo=timezone.utc)
    milestones = SLATrackingService.calculate_statutory_milestones(filing_date, is_emergency_48h=False)
    
    expected_cpio_deadline = filing_date + timedelta(days=30)
    assert milestones["day_30_cpio_deadline"] == expected_cpio_deadline.isoformat()
    assert milestones["day_5_transfer_bypassed"] is True

def test_sla_emergency_48h_proviso():
    filing_date = datetime(2026, 8, 1, 10, 0, 0, tzinfo=timezone.utc)
    milestones = SLATrackingService.calculate_statutory_milestones(filing_date, is_emergency_48h=True)
    
    expected_emergency_deadline = filing_date + timedelta(hours=48)
    assert milestones["day_30_cpio_deadline"] == expected_emergency_deadline.isoformat()

def test_public_authority_vector_matcher_highway():
    result = match_public_authority(["highway", "pothole", "toll"], "National Highway 27 road repair")
    assert result["pa_code"] == "MORTH-NHAI"
    assert result["confidence_score"] >= 0.85

def test_public_authority_vector_matcher_passport():
    result = match_public_authority(["passport", "rpo", "tatkaal"], "Passport dispatch delay at Regional Passport Office")
    assert result["pa_code"] == "MEA-PASSPORT"
    assert result["confidence_score"] >= 0.85
```

---

## 17. LEGAL REFERENCE INDEX (NOT A COMPLIANCE CERTIFICATION)

| Section | Title / Focus Area | Praja-RTI Implementation Architecture |
| :--- | :--- | :--- |
| **Sec 1** | Short title, extent, and commencement | Statutory context for planning; Praja-RTI is not an enforcement or government system. |
| **Sec 2(f)** | Definition of "Information" (records, documents, memos, emails, opinions, orders, logbooks) | The Prompt Transformer specifically constrains outputs to material records defined under 2(f). |
| **Sec 2(j)** | Definition of "Right to Information" (inspection of work, documents, records, certified samples) | Supports option to request physical inspection of public works or certified samples. |
| **Sec 3** | Right to Information for all Citizens | Planned accessible voice-first experience with a declared language set and manual fallback; universal language coverage is not claimed. |
| **Sec 4** | Proactive Suo-Motu Disclosure obligations of Public Authorities | Possible future link-out; not part of the simplified hackathon scope. |
| **Sec 6(1)** | Application for obtaining information (English, Hindi, or official regional language) | Planned declared language set with visible transcription/simulation labels, citizen correction and text fallback. |
| **Sec 6(2)** | Applicant NOT required to give any reason for requesting information | Strict rule: AI never prompts the user for personal motivations or justifications. |
| **Sec 6(3)** | Transfer of application to another public authority within **5 days** | **Explainable pre-submission routing:** recommends likely authorities, alternatives, and split requests for citizen confirmation. It may reduce avoidable transfers but cannot guarantee delivery or eliminate the statutory transfer process. |
| **Sec 7(1)** | Disposal of request within **30 days** (or **48 hours** for life & liberty) | Legal context displayed carefully; live tracking/reminders are deferred because the hackathon does not file the RTI application. |
| **Sec 7(2)** | Failure to give decision deemed as refusal | Deferred; the simplified demo cannot assert deemed refusal without an official filing and response history. |
| **Sec 7(3)** | Calculation of further fees for copies/CDs/inspection | Legal context only; supplementary fees and reconciliation are deferred. |
| **Sec 7(5)** | Fee exemption for persons Below Poverty Line (BPL) | Demonstrates BPL certificate attachment; any OCR or verification remains explicitly simulated unless a live service is authorized. |
| **Sec 7(6)** | Information shall be provided **FREE OF COST** if deadline exceeded | Legal context only; first-appeal drafting is deferred from the simplified demo. |
| **Sec 8(1)** | Exemptions from disclosure (National security, cabinet drafts, contempt of court, commercial secret) | Pre-flight AI exemption check warns citizen if requested data is legally exempt. |
| **Sec 9** | Rejection for infringement of non-State copyright | Possible non-binding drafting caution; legal determination and workflow are deferred. |
| **Sec 10** | Severability clause (providing non-exempt portion) | Possible future drafting suggestion; not an automated legal determination. |
| **Sec 11** | Third-party information notification procedure | Legal context only; the hackathon does not notify third parties or operate the statutory workflow. |
| **Sec 18** | Inquiries into complaints by Central Information Commission | Deferred legal context; no Commission complaint generator is in the hackathon scope. |
| **Sec 19(1)** | First Appeal to First Appellate Authority (FAA) within **30 days** | Deferred legal context; no appeal is submitted or prepared in the simplified flow. |
| **Sec 19(3)** | Second Appeal to Central Information Commission within **90 days** | Deferred legal context; no CIC integration is planned for the hackathon. |
| **Sec 19(6)** | First Appeal disposal within **30 to 45 days** | Deferred legal context; no FAA countdown begins. |
| **Sec 20** | Penalties: **₹250/day up to ₹25,000** on defaulting officers | Legal context only; a live penalty calculator is deferred and must not imply a Commission finding. |
