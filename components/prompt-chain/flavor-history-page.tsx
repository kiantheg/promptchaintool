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
  const { token, selectedFlavor } = usePromptChainWorkspace();

  const [error, setError] = useState<string | null>(null);
  const [captionHistory, setCaptionHistory] = useState<CaptionHistoryRow[]>([]);
  const [responseHistory, setResponseHistory] = useState<LlmResponseRow[]>([]);

  useEffect(() => {
    if (!selectedFlavor) return;

    const load = async () => {
      setError(null);
      try {
        const [captionRows, responseRows] = await Promise.all([
          listFlavorCaptions(token, selectedFlavor.id),
          listFlavorResponses(token, selectedFlavor.id),
        ]);
        setCaptionHistory(captionRows);
        setResponseHistory(responseRows);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load flavor history.");
      }
    };

    void load();
  }, [selectedFlavor, token]);

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
      {error && <p className="errorBanner">{error}</p>}
      <div className="statsStrip">
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
        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Caption history</h2>
              <p className="muted sectionNote">Most recent saved captions generated with this flavor.</p>
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
                <p>{caption.content || "Empty caption row."}</p>
                <div className="historyFooter">
                  <span>{caption.image_id.slice(0, 8)}</span>
                  <span>{formatDate(caption.created_datetime_utc)}</span>
                </div>
              </article>
            ))}
            {captionHistory.length === 0 && (
              <p className="muted emptyNotice">No saved captions yet for this flavor.</p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Model response log</h2>
              <p className="muted sectionNote">Raw step outputs from the caption generation pipeline.</p>
            </div>
            <span className="panelTag">{responseHistory.length} rows</span>
          </div>
          <div className="historyList">
            {responseHistory.map((response) => (
              <article key={response.id} className="historyCard">
                <div className="historyTop">
                  <span>step #{response.humor_flavor_step_id ?? "?"}</span>
                  <span>{response.processing_time_seconds ?? "?"}s</span>
                </div>
                <pre>{response.llm_model_response || "No response body."}</pre>
                <div className="historyFooter">
                  <span>request #{response.caption_request_id}</span>
                  <span>{formatDate(response.created_datetime_utc)}</span>
                </div>
              </article>
            ))}
            {responseHistory.length === 0 && (
              <p className="muted emptyNotice">No LLM response rows yet for this flavor.</p>
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
