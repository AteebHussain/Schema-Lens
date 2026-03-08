"use client";

import { useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { useSchemaStore } from "@/src/store/schemaStore";

export default function SqlEditor() {
  const rawSQL = useSchemaStore((s) => s.rawSQL);
  const setSQL = useSchemaStore((s) => s.setSQL);
  const parseErrors = useSchemaStore((s) => s.parseErrors);

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
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h8v2H2v-2z" fill="currentColor" opacity="0.7"/>
          </svg>
          <span>SQL Schema</span>
        </div>
        <span className="editor-badge">MySQL</span>
      </div>

      <CodeMirror
        value={rawSQL}
        height="100%"
        theme="dark"
        extensions={[sql()]}
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
