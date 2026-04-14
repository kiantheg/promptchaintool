"use client";

import { useEffect, useState } from "react";
import { formatDate, relativeDate } from "@/components/prompt-chain/shared";
import { PromptChainShell, usePromptChainWorkspace } from "@/components/prompt-chain/workspace-shell";
import {
  type CaptionHistoryRow,
  type LlmResponseRow,
  listFlavorCaptions,
  listFlavorResponses,
} from "@/lib/supabase-rest";

function FlavorHistoryContent() {
  const { token, selectedFlavor, showToast } = usePromptChainWorkspace();

  const [captionHistory, setCaptionHistory] = useState<CaptionHistoryRow[]>([]);
  const [responseHistory, setResponseHistory] = useState<LlmResponseRow[]>([]);

  useEffect(() => {
    if (!selectedFlavor) return;

    const load = async () => {
      try {
        const [captionRows, responseRows] = await Promise.all([
          listFlavorCaptions(token, selectedFlavor.id),
          listFlavorResponses(token, selectedFlavor.id),
        ]);
        setCaptionHistory(captionRows);
        setResponseHistory(responseRows);
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Unable to load flavor history.",
          "error",
        );
      }
    };

    void load();
  }, [selectedFlavor, token, showToast]);

  if (!selectedFlavor) {
    return (
      <section className="panel">
        <h2>Flavor not found</h2>
        <p className="muted">Pick a flavor from the sidebar or create a new one.</p>
      </section>
    );
  }

  return (
    <>
      {/* Stats */}
      <div className="statsStrip statsStripCompact">
        <article className="statCard">
          <span>Saved captions</span>
          <strong>{captionHistory.length}</strong>
        </article>
        <article className="statCard">
          <span>Model responses</span>
          <strong>{responseHistory.length}</strong>
        </article>
        <article className="statCard">
          <span>Flavor</span>
          <strong className="statText">{selectedFlavor.slug}</strong>
        </article>
      </div>

      <div className="gridTwo">
        {/* Caption history */}
        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Caption history</h2>
              <p className="muted sectionNote">
                Most recent saved captions generated with this flavor.
              </p>
            </div>
            <span className="panelTag">{captionHistory.length} rows</span>
          </div>
          <div className="historyList">
            {captionHistory.map((caption) => (
              <article key={caption.id} className="historyCard">
                <div className="historyTop">
                  <span>{relativeDate(caption.created_datetime_utc)}</span>
                  <span>request #{caption.caption_request_id ?? "?"}</span>
                </div>
                <p style={{ marginTop: 10, lineHeight: 1.55 }}>
                  {caption.content || <em style={{ color: "var(--muted)" }}>Empty caption row.</em>}
                </p>
                <div className="historyFooter">
                  <span>{caption.image_id.slice(0, 8)}</span>
                  <span>{formatDate(caption.created_datetime_utc)}</span>
                </div>
              </article>
            ))}
            {captionHistory.length === 0 && (
              <p className="emptyNotice">No saved captions yet for this flavor.</p>
            )}
          </div>
        </section>

        {/* Model response log */}
        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Model response log</h2>
              <p className="muted sectionNote">
                Raw step outputs from the caption generation pipeline.
              </p>
            </div>
            <span className="panelTag">{responseHistory.length} rows</span>
          </div>
          <div className="historyList">
            {responseHistory.map((response) => (
              <article key={response.id} className="historyCard">
                <div className="historyTop">
                  <span>step #{response.humor_flavor_step_id ?? "?"}</span>
                  <span>
                    {response.processing_time_seconds !== null
                      ? `${response.processing_time_seconds}s`
                      : "?s"}
                  </span>
                </div>
                <pre style={{ marginTop: 10 }}>
                  {response.llm_model_response || "No response body."}
                </pre>
                <div className="historyFooter">
                  <span>request #{response.caption_request_id}</span>
                  <span>{formatDate(response.created_datetime_utc)}</span>
                </div>
              </article>
            ))}
            {responseHistory.length === 0 && (
              <p className="emptyNotice">No LLM response rows yet for this flavor.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

export function FlavorHistoryPage({ flavorId }: { flavorId: number }) {
  return (
    <PromptChainShell selectedFlavorId={flavorId}>
      <FlavorHistoryContent />
    </PromptChainShell>
  );
}
