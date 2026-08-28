"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchCaseByReference } from "@/lib/storage/cases.client";
import { casePath } from "@/lib/storage/paths";

export default function ApplicationAccess() {
  const router = useRouter();
  const [ack, setAck] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openByReference() {
    const normalized = ack.trim().toUpperCase();
    if (!normalized) {
      setError("Enter the Praja reference number printed on your acknowledgement.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const record = await fetchCaseByReference(normalized, token || undefined);
      if (!record) {
        setError("No saved case matched that number. Check every character and try again.");
        return;
      }
      router.push(casePath(record.id));
    } catch {
      setError("The case store could not be reached. Try again when you are online.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="application-access" id="saved-applications" aria-labelledby="saved-applications-title">
      <div className="application-access-copy">
        <h2 id="saved-applications-title">My RTI cases</h2>
        <p>
          Every packet you prepare here is saved with a Praja reference. That number reopens the case. It is not a
          government registration number.
        </p>
        <p className="application-access-boundary">
          Official status exists only on the portal or authority that issued a registration number.
        </p>
      </div>

      <div className="application-access-workspace">
        <div className="application-access-form">
          <label htmlFor="reference-number">Praja reference number</label>
          <div className="application-access-row">
            <input
              id="reference-number"
              value={ack}
              onChange={(event) => setAck(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter") void openByReference();
              }}
              placeholder="PRTI/ACK/26/XXXXXXXXX"
              autoComplete="off"
            />
            <button type="button" onClick={() => void openByReference()} disabled={busy}>
              {busy ? "Looking up…" : "Open"}
            </button>
          </div>
          <label htmlFor="recovery-token">Recovery token</label>
          <input
            id="recovery-token"
            value={token}
            onChange={(event) => setToken(event.target.value.toUpperCase())}
            placeholder="Printed with the Praja acknowledgement"
            autoComplete="off"
          />
          {error && <p className="application-access-error" role="alert">{error}</p>}
          <p>
            <Link className="text-link" href="/cases">Open the full case list</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
