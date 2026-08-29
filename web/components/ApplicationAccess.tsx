"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCaseByReference } from "@/lib/storage/cases.client";
import { casePath } from "@/lib/storage/paths";

export default function ApplicationAccess() {
  const router = useRouter();
  const [ack, setAck] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openByReference() {
    const normalized = ack.trim().toUpperCase();
    if (!normalized) {
      setError("Enter your Praja Acknowledgement Number.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const record = await fetchCaseByReference(normalized);
      if (!record) {
        setError("No saved case matched that acknowledgement number. Check every character and try again.");
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
          <label htmlFor="reference-number">Praja Acknowledgement Number</label>
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
          {error && <p className="application-access-error" role="alert">{error}</p>}
        </div>
      </div>
    </section>
  );
}
