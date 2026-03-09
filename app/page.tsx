"use client";

import { useEffect, useCallback, useState, useRef } from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [shareTooltip, setShareTooltip] = useState(false);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const samplesRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (samplesRef.current && !samplesRef.current.contains(e.target as Node)) {
        setSamplesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        loadSample(0);
      }
    } else {
      loadSample(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSample = useCallback(
    (index: number) => {
      const sample = sampleSchemas[index];
      setSQL(sample.sql);
      setSamplesOpen(false);
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
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#3E3636" strokeWidth="2" fill="none" />
              <circle cx="12" cy="8" r="2" fill="#D72323" />
              <circle cx="8" cy="14" r="2" fill="#F5EDED" />
              <circle cx="16" cy="14" r="2" fill="#F5EDED" />
              <line x1="12" y1="10" x2="8" y2="12" stroke="#3E3636" strokeWidth="1.5" />
              <line x1="12" y1="10" x2="16" y2="12" stroke="#3E3636" strokeWidth="1.5" />
            </svg>
            <span className="logo-text">SchemaLens</span>
          </div>
        </div>

        <div className="header-center">
          <div className="dropdown" ref={samplesRef}>
            <button
              className="action-btn"
              onClick={() => setSamplesOpen(!samplesOpen)}
            >
              Samples
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
            {samplesOpen && (
              <div className="dropdown-menu">
                {sampleSchemas.map((sample, i) => (
                  <button
                    key={sample.name}
                    className="dropdown-item"
                    onClick={() => loadSample(i)}
                  >
                    {sample.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="header-actions">
          <button
            className={`action-btn${editorOpen ? " active" : ""}`}
            onClick={() => setEditorOpen(!editorOpen)}
            title={editorOpen ? "Hide editor" : "Show editor"}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h8v2H2v-2z" fill="currentColor" />
            </svg>
            Editor
          </button>

          <button
            className={`action-btn${sidebarOpen ? " active" : ""}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none"/>
              <line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            Analysis
          </button>

          <button
            className="action-btn share-btn"
            onClick={handleShare}
            disabled={tables.length === 0}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
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
        {sidebarOpen && (
          <div className="panel-sidebar">
            <Sidebar />
          </div>
        )}
      </main>
    </div>
  );
}
