"use client";

import { useEffect, useState, useRef } from "react";
import type { AssessmentResult, ChatMessage, ChatResponse } from "@/lib/cage/schemas";

interface IntakeChatbotProps {
  transcript: string;
  lang: string;
  onUpdateTranscript: (newText: string) => void;
  onAssessmentChange?: (assessment: AssessmentResult | null) => void;
  disabled?: boolean;
}

export default function IntakeChatbot({
  transcript,
  lang,
  onUpdateTranscript,
  onAssessmentChange,
  disabled = false,
}: IntakeChatbotProps) {
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your RTI Intake & Assessment Assistant. I review your concern under the RTI Act, 2005, identify missing financial or administrative specifics, and help strengthen your application.",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const lastAssessedRef = useRef<string>("");

  // Debounced auto-assessment when transcript changes
  useEffect(() => {
    const text = transcript.trim();
    if (!text || text.length < 5) {
      setAssessment(null);
      onAssessmentChange?.(null);
      return;
    }

    if (text === lastAssessedRef.current) return;

    const timer = setTimeout(() => {
      void runAssessment(text);
    }, 700);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  async function runAssessment(text: string) {
    if (!text || text.length < 5) return;
    lastAssessedRef.current = text;
    setAssessing(true);
    try {
      const res = await fetch("/api/agent/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, lang }),
      });
      if (res.ok) {
        const json = (await res.json()) as { data: AssessmentResult };
        if (json.data) {
          setAssessment(json.data);
          onAssessmentChange?.(json.data);

          // If invalid, add a system message in chat
          if (!json.data.is_valid_rti) {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `🛑 **Cannot be filed under RTI Act, 2005**\n\n${json.data.refusal_reason}\n\n*Please change the information in your description to a genuine government or public authority matter.*`,
              },
            ]);
          }
        }
      }
    } catch {
      // Fallback is handled deterministically on client/server
    } finally {
      setAssessing(false);
    }
  }

  async function sendMessage(textToSend?: string) {
    const msg = (textToSend || inputMessage).trim();
    if (!msg || chatBusy || disabled) return;

    setInputMessage("");
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setChatBusy(true);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          transcript,
          lang,
        }),
      });

      if (res.ok) {
        const json = (await res.json()) as { data: ChatResponse };
        if (json.data) {
          setMessages((prev) => [...prev, { role: "assistant", content: json.data.reply }]);

          if (!json.data.is_valid_rti) {
            // Cutoff: update assessment to invalid
            setAssessment((prev) =>
              prev
                ? { ...prev, is_valid_rti: false, can_proceed: false, refusal_reason: json.data.refusal_reason }
                : null
            );
            onAssessmentChange?.(
              assessment
                ? { ...assessment, is_valid_rti: false, can_proceed: false, refusal_reason: json.data.refusal_reason }
                : null
            );
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "The assistant is temporarily resting. Your description above will still be processed directly.",
        },
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  function appendToTranscript(addition: string) {
    const cleanAddition = addition.trim();
    if (!cleanAddition) return;

    const base = transcript.trim();
    const updated = base ? `${base}\n\n[Added specific record request]: ${cleanAddition}` : cleanAddition;
    onUpdateTranscript(updated);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `✓ Added to your RTI description:\n*"${cleanAddition}"*`,
      },
    ]);
  }

  return (
    <section className="intake-chatbot-container" aria-label="RTI Assessment and Assistant">
      {/* Assessment Status Bar */}
      {assessment && (
        <div
          className={`assessment-banner ${assessment.is_valid_rti ? "is-valid" : "is-invalid"}`}
          role="region"
          aria-live="polite"
        >
          <div className="assessment-header">
            <div className="assessment-badge-group">
              <span className={`assessment-badge ${assessment.is_valid_rti ? "badge-valid" : "badge-invalid"}`}>
                {assessment.is_valid_rti ? "✓ RTI Eligible" : "✕ Cannot be filed under RTI"}
              </span>
              {assessment.is_valid_rti && (
                <span className="assessment-category">{assessment.category}</span>
              )}
            </div>
            {assessing && <span className="assessing-indicator">Assessing…</span>}
          </div>

          {!assessment.is_valid_rti && (
            <div className="assessment-refusal-box">
              <p className="refusal-title">
                <strong>Notice of Inadmissibility</strong>
              </p>
              <p className="refusal-text">{assessment.refusal_reason}</p>
              <p className="refusal-action">
                👉 <strong>Action Required:</strong> Change the text in the description box above to a matter concerning official government records, public works, tenders, or public authorities.
              </p>
            </div>
          )}

          {assessment.is_valid_rti && assessment.financial.detected && (
            <div className="assessment-financial-box">
              <div className="financial-header">
                <strong>💰 Financial & Expenditure Details Detected</strong>
              </div>
              {assessment.financial.questions.length > 0 && (
                <ul className="financial-questions-list">
                  {assessment.financial.questions.map((q, idx) => (
                    <li key={idx}>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              )}
              {assessment.financial.suggested_records.length > 0 && (
                <div className="suggested-records-chips">
                  <span className="chips-label">Suggested records to include:</span>
                  <div className="chips-row">
                    {assessment.financial.suggested_records.map((rec, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="suggestion-chip"
                        onClick={() => appendToTranscript(rec)}
                        title="Click to add to your RTI request"
                      >
                        + {rec}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Interactive Chatbot Drawer */}
      <div className="chatbot-panel">
        <button
          type="button"
          className="chatbot-toggle-header"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
        >
          <span className="chatbot-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            RTI Assistant & Follow-up Chat
          </span>
          <span className="chatbot-toggle-indicator">{isOpen ? "Hide ▲" : "Show Assistant ▼"}</span>
        </button>

        {isOpen && (
          <div className="chatbot-body">
            <div className="chatbot-messages">
              {messages.map((m, index) => (
                <div
                  key={index}
                  className={`chat-message ${m.role === "user" ? "chat-user" : "chat-assistant"}`}
                >
                  <div className="message-content">
                    {m.content.split("\n").map((line, lIdx) => (
                      <p key={lIdx}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}
              {chatBusy && (
                <div className="chat-message chat-assistant">
                  <div className="message-content message-thinking">
                    <span>Assistant is analyzing…</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick response chips if available */}
            {assessment && assessment.is_valid_rti && assessment.follow_up_questions.length > 0 && (
              <div className="quick-suggestions-bar">
                <span className="quick-label">Ask / Refine:</span>
                {assessment.follow_up_questions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="quick-chip"
                    onClick={() => void sendMessage(`Regarding "${q}": `)}
                  >
                    {q.slice(0, 48)}…
                  </button>
                ))}
              </div>
            )}

            <form
              className="chatbot-input-row"
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage();
              }}
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask the RTI assistant or answer follow-up questions…"
                disabled={chatBusy || disabled}
                className="chatbot-input"
              />
              <button
                type="submit"
                disabled={chatBusy || !inputMessage.trim() || disabled}
                className="chatbot-send-btn"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
