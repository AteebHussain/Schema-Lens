"use client";

import { useCallback, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { useSchemaStore } from "@/src/store/schemaStore";

/* ── Custom theme matching the SchemaLens palette ──────────────────── */
const schemaLensEditorTheme = EditorView.theme(
  {
    "&": {
      color: "#F5EDED",
      backgroundColor: "#0d0b0b",
      fontSize: "13px",
    },
    ".cm-content": {
      caretColor: "#D72323",
      fontFamily: "'JetBrains Mono', 'Geist Mono', monospace",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#D72323",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "rgba(215, 35, 35, 0.15)",
      },
    ".cm-panels": {
      backgroundColor: "#120f0f",
      color: "#F5EDED",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(62, 54, 54, 0.15)",
    },
    ".cm-gutters": {
      backgroundColor: "#0d0b0b",
      color: "#6e5c5c",
      border: "none",
      borderRight: "1px solid rgba(62, 54, 54, 0.3)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(62, 54, 54, 0.15)",
      color: "#b8a9a9",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "rgba(215, 35, 35, 0.1)",
      color: "#D72323",
      border: "none",
    },
    ".cm-tooltip": {
      backgroundColor: "#1a1515",
      border: "1px solid rgba(62, 54, 54, 0.5)",
      color: "#F5EDED",
    },
    ".cm-placeholder": {
      color: "#6e5c5c",
      fontStyle: "italic",
    },
  },
  { dark: true }
);

const schemaLensHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#D72323", fontWeight: "600" },
  { tag: tags.typeName, color: "#F5EDED" },
  { tag: tags.string, color: "#4ade80" },
  { tag: tags.number, color: "#fbbf24" },
  { tag: tags.comment, color: "#6e5c5c", fontStyle: "italic" },
  { tag: tags.punctuation, color: "#6e5c5c" },
  { tag: tags.operator, color: "#b8a9a9" },
  { tag: tags.variableName, color: "#F5EDED" },
  { tag: tags.propertyName, color: "#b8a9a9" },
  { tag: tags.bracket, color: "#564b4b" },
  { tag: tags.definition(tags.variableName), color: "#F5EDED" },
]);

export default function SqlEditor() {
  const rawSQL = useSchemaStore((s) => s.rawSQL);
  const setSQL = useSchemaStore((s) => s.setSQL);
  const parseErrors = useSchemaStore((s) => s.parseErrors);

  const extensions = useMemo(
    () => [sql(), syntaxHighlighting(schemaLensHighlightStyle)],
    []
  );

  const onChange = useCallback(
    (value: string) => {
      setSQL(value);
    },
    [setSQL]
  );

  return (
    <div className="sql-editor">
      <div className="editor-header">
        <div className="editor-title">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h8v2H2v-2z" fill="currentColor" opacity="0.7"/>
          </svg>
          <span>SQL Schema</span>
        </div>
        <span className="editor-badge">MySQL</span>
      </div>

      <CodeMirror
        value={rawSQL}
        height="100%"
        theme={schemaLensEditorTheme}
        extensions={extensions}
        onChange={onChange}
        className="cm-wrapper"
        placeholder="Paste your CREATE TABLE statements here..."
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          foldGutter: true,
          autocompletion: false,
        }}
      />

      {parseErrors.length > 0 && (
        <div className="parse-errors">
          <div className="error-header">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L1 15h14L8 1z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M8 6v4M8 12v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>{parseErrors.length} parse {parseErrors.length === 1 ? "error" : "errors"}</span>
          </div>
          {parseErrors.map((err, i) => (
            <div key={i} className="error-item">
              {err.line !== null && <span className="error-line">Line {err.line}</span>}
              <span className="error-msg">{err.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
