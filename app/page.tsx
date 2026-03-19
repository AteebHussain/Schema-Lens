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
  const [shareOpen, setShareOpen] = useState(false);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const samplesRef = useRef<HTMLDivElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (samplesRef.current && !samplesRef.current.contains(e.target as Node)) {
        setSamplesOpen(false);
      }
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
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

  const handleCopyLink = useCallback(() => {
    if (!rawSQL) return;
    const encoded = compressToURL(rawSQL);
    const url = `${window.location.origin}?s=${encoded}`;
    navigator.clipboard.writeText(url);
    setShareTooltip(true);
    setShareOpen(false);
    setTimeout(() => setShareTooltip(false), 2000);
  }, [rawSQL]);

  const handleExportPNG = useCallback(() => {
    window.dispatchEvent(new CustomEvent("export-diagram-png"));
    setShareOpen(false);
  }, []);

  const handleExportSQL = useCallback(() => {
    if (!rawSQL) return;
    const blob = new Blob([rawSQL], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schema.sql";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShareOpen(false);
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

          <div className="dropdown" ref={shareRef}>
            <button
              className={`action-btn share-btn ${shareOpen ? "active" : ""}`}
              onClick={() => setShareOpen(!shareOpen)}
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
            {shareOpen && (
              <div className="dropdown-menu dropdown-menu-right">
                <button className="dropdown-item" onClick={handleCopyLink}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  Copy Link
                </button>
                <button className="dropdown-item" onClick={handleExportPNG}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                  Export as PNG
                </button>
                <button className="dropdown-item" onClick={handleExportSQL}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export as SQL
                </button>
              </div>
            )}
          </div>
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
