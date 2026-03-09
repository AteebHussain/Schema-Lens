"use client";

import { useEffect, useCallback, useState } from "react";
import { useSchemaStore } from "@/src/store/schemaStore";
import { sampleSchemas } from "@/src/lib/samples";
import { compressToURL, decompressFromURL } from "@/src/lib/urlState";
import SqlEditor from "@/src/components/SqlEditor";
import Diagram from "@/src/components/Diagram";
import Sidebar from "@/src/components/Sidebar";

export default function Home() {
  const rawSQL = useSchemaStore((s) => s.rawSQL);
  const setSQL = useSchemaStore((s) => s.setSQL);
  const tables = useSchemaStore((s) => s.tables);
  const setActiveRelationship = useSchemaStore((s) => s.setActiveRelationship);
  const [editorOpen, setEditorOpen] = useState(true);
  const [shareTooltip, setShareTooltip] = useState(false);

  // Load from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("s");
    if (encoded) {
      try {
        const sql = decompressFromURL(encoded);
        setSQL(sql);
        setEditorOpen(false);
      } catch {
        // Load default sample if URL is invalid
        loadSample(0);
      }
    } else {
      // Load e-commerce sample by default
      loadSample(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSample = useCallback(
    (index: number) => {
      const sample = sampleSchemas[index];
      setSQL(sample.sql);
      // Pre-select the demo relationship after a short delay for the diagram to render
      setTimeout(() => {
        setActiveRelationship(sample.demoRelationshipId);
      }, 500);
    },
    [setSQL, setActiveRelationship]
  );

  const handleShare = useCallback(() => {
    if (!rawSQL) return;
    const encoded = compressToURL(rawSQL);
    const url = `${window.location.origin}?s=${encoded}`;
    navigator.clipboard.writeText(url);
    setShareTooltip(true);
    setTimeout(() => setShareTooltip(false), 2000);
  }, [rawSQL]);

  return (
    <div className="app-shell">
      {/* Top Bar */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#3E3636" strokeWidth="2" fill="none" />
              <circle cx="12" cy="8" r="2" fill="#D72323" />
              <circle cx="8" cy="14" r="2" fill="#F5EDED" />
              <circle cx="16" cy="14" r="2" fill="#F5EDED" />
              <line x1="12" y1="10" x2="8" y2="12" stroke="#3E3636" strokeWidth="1.5" />
              <line x1="12" y1="10" x2="16" y2="12" stroke="#3E3636" strokeWidth="1.5" />
              <line x1="8" y1="14" x2="16" y2="14" stroke="#3E3636" strokeWidth="1" opacity="0.4" />
            </svg>
            <span className="logo-text">SchemaLens</span>
          </div>
          <span className="tagline">Paste your schema. See your database think.</span>
        </div>

        <div className="header-actions">
          {/* Sample schema buttons */}
          <div className="sample-buttons">
            {sampleSchemas.map((sample, i) => (
              <button
                key={sample.name}
                className="sample-btn"
                onClick={() => loadSample(i)}
                title={sample.description}
              >
                {sample.name}
              </button>
            ))}
          </div>

          <div className="header-divider" />

          <button
            className="action-btn toggle-editor-btn"
            onClick={() => setEditorOpen(!editorOpen)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h8v2H2v-2z" fill="currentColor" />
            </svg>
            {editorOpen ? "Hide Editor" : "Show Editor"}
          </button>

          <button
            className="action-btn share-btn"
            onClick={handleShare}
            disabled={tables.length === 0}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="12" cy="3" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="12" cy="13" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <line x1="6" y1="7" x2="10" y2="4" stroke="currentColor" strokeWidth="1.5" />
              <line x1="6" y1="9" x2="10" y2="12" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {shareTooltip ? "Copied!" : "Share"}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {editorOpen && (
          <div className="panel-editor">
            <SqlEditor />
          </div>
        )}
        <div className="panel-diagram">
          <Diagram />
        </div>
        <div className="panel-sidebar">
          <Sidebar />
        </div>
      </main>
    </div>
  );
}
