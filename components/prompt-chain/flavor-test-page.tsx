"use client";

import { useEffect, useMemo, useState } from "react";
import { getGeneratedLines, relativeDate } from "@/components/prompt-chain/shared";
import { PromptChainShell, usePromptChainWorkspace } from "@/components/prompt-chain/workspace-shell";
import {
  type ImageOption,
  extractImageUrl,
  generateCaptions,
  listImageOptions,
} from "@/lib/supabase-rest";

function FlavorTestContent() {
  const { token, selectedFlavor } = usePromptChainWorkspace();

  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [generatedCaptions, setGeneratedCaptions] = useState<string[]>([]);
  const [imageOptions, setImageOptions] = useState<ImageOption[]>([]);
  const [imageQuery, setImageQuery] = useState("");
  const [selectedImageId, setSelectedImageId] = useState("");

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const images = await listImageOptions(token, 1, 60);
        setImageOptions(images);
        setSelectedImageId((current) => current || images[0]?.id || "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load public images.");
      }
    };

    void load();
  }, [token]);

  const filteredImages = useMemo(() => {
    const query = imageQuery.trim().toLowerCase();
    if (!query) return imageOptions;
    return imageOptions.filter((image) => {
      return (
        image.id.toLowerCase().includes(query) ||
        (image.image_description ?? "").toLowerCase().includes(query)
      );
    });
  }, [imageOptions, imageQuery]);

  const selectedImage = useMemo(
    () => imageOptions.find((image) => image.id === selectedImageId) ?? null,
    [imageOptions, selectedImageId],
  );

  if (!selectedFlavor) {
    return (
      <section className="panel">
        <h2>Flavor not found</h2>
        <p className="muted">Pick a flavor from the sidebar or create a new one.</p>
      </section>
    );
  }

  const handleGenerate = async () => {
    if (!selectedImageId) return;

    setTesting(true);
    setError(null);
    setTestMessage("Generating captions...");
    try {
      const rows = await generateCaptions(token, selectedImageId, selectedFlavor.id);
      setGeneratedCaptions(getGeneratedLines(rows));
      setTestMessage(`Generated ${rows.length} rows for flavor ${selectedFlavor.slug}.`);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Unable to generate captions for this flavor.",
      );
      setTestMessage(null);
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      {error && <p className="errorBanner">{error}</p>}
      <div className="gridTwo gridTwoTop">
        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Test setup</h2>
              <p className="muted sectionNote">Choose a public image visually before running the flavor.</p>
            </div>
            <span className="panelTag">{filteredImages.length} images</span>
          </div>
          <input
            className="searchInput"
            placeholder="Search by image description or ID..."
            value={imageQuery}
            onChange={(event) => setImageQuery(event.target.value)}
          />
          <div className="imagePickerScroller">
            <div className="imagePickerGrid">
              {filteredImages.map((image) => {
                const imageUrl = extractImageUrl(image);
                if (!imageUrl) return null;

                return (
                  <button
                    key={image.id}
                    type="button"
                    className={image.id === selectedImageId ? "imageTile imageTileActive" : "imageTile"}
                    onClick={() => setSelectedImageId(image.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt={image.image_description || image.id} />
                    <span>{image.image_description || image.id}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Image preview</h2>
              <p className="muted sectionNote">Review the selected image and run the live generation flow.</p>
            </div>
            <span className="panelTag">Flavor #{selectedFlavor.id}</span>
          </div>
          {selectedImage ? (
            <>
              <div className="testPreviewCard">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={extractImageUrl(selectedImage) ?? ""}
                  alt={selectedImage.image_description || selectedImage.id}
                />
                <div className="testPreviewMeta">
                  <h3>{selectedImage.image_description || "Selected test image"}</h3>
                  <p className="muted">{selectedImage.id}</p>
                  <p className="muted">
                    {selectedImage.is_common_use ? "Common-use image" : "Public image"} · added{" "}
                    {relativeDate(selectedImage.created_datetime_utc)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="primaryButton"
                onClick={handleGenerate}
                disabled={testing}
              >
                {testing ? "Generating..." : `Generate captions for ${selectedFlavor.slug}`}
              </button>
            </>
          ) : (
            <p className="muted emptyNotice">Select an image from the left to preview it here.</p>
          )}
          {testMessage && <p className="successBanner">{testMessage}</p>}
        </section>
      </div>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Generated captions</h2>
            <p className="muted sectionNote">This page only shows the latest generation result.</p>
          </div>
          <span className="panelTag">{generatedCaptions.length} captions</span>
        </div>
        <div className="generatedList">
          {generatedCaptions.map((caption, index) => (
            <article key={`${caption}-${index}`} className="generatedCard">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{caption}</p>
            </article>
          ))}
          {generatedCaptions.length === 0 && (
            <p className="muted emptyNotice">Run a test to preview the API output for this flavor.</p>
          )}
        </div>
      </section>
    </>
  );
}

export function FlavorTestPage({ flavorId }: { flavorId: number }) {
  return (
    <PromptChainShell selectedFlavorId={flavorId}>
      <FlavorTestContent />
    </PromptChainShell>
  );
}
