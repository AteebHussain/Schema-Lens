"use client";

import { useCallback } from "react";
import { useSchemaStore } from "@/src/store/schemaStore";

export default function Sidebar() {
  const activeRelationshipId = useSchemaStore((s) => s.activeRelationshipId);
  const relationships = useSchemaStore((s) => s.relationships);
  const tables = useSchemaStore((s) => s.tables);
  const healthIssues = useSchemaStore((s) => s.healthIssues);
  const indexSuggestions = useSchemaStore((s) => s.indexSuggestions);
  const joinQueries = useSchemaStore((s) => s.joinQueries);
  const activeTab = useSchemaStore((s) => s.activeTab);
  const setActiveTab = useSchemaStore((s) => s.setActiveTab);
  const aiExplanation = useSchemaStore((s) => s.aiExplanation);
  const aiLoading = useSchemaStore((s) => s.aiLoading);
  const setAiExplanation = useSchemaStore((s) => s.setAiExplanation);
  const setAiLoading = useSchemaStore((s) => s.setAiLoading);
  const setActiveRelationship = useSchemaStore((s) => s.setActiveRelationship);

  const activeRel = relationships.find((r) => r.id === activeRelationshipId);
  const activeQuery = joinQueries.find((q) => q.relationshipId === activeRelationshipId);

  const fetchAiExplanation = useCallback(async () => {
    if (!activeRel || !activeQuery) return;
    setAiLoading(true);
    setAiExplanation(null);

    try {
      const sourceTable = tables.find((t) => t.name === activeRel.sourceTable);
      const targetTable = tables.find((t) => t.name === activeRel.targetTable);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relationship: activeRel,
          sourceColumns: sourceTable?.columns ?? [],
          targetColumns: targetTable?.columns ?? [],
          joinQuery: activeQuery.sql,
          cardinality: activeRel.cardinality,
        }),
      });

      if (!res.ok) throw new Error("API request failed");

      const data = await res.json();
      setAiExplanation(data.explanation ?? "No explanation available.");
    } catch {
      setAiExplanation("⚠ AI analysis unavailable. The rule-based analysis above covers the essentials.");
    } finally {
      setAiLoading(false);
    }
  }, [activeRel, activeQuery, tables, setAiExplanation, setAiLoading]);

  if (tables.length === 0) {
    return (
      <div className="sidebar">
        <div className="sidebar-empty">
          <p>Load a schema to see analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar">
      {/* Tab bar */}
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === "health" ? "active" : ""}`}
          onClick={() => setActiveTab("health")}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Health
          {healthIssues.length > 0 && (
            <span className="tab-badge">{healthIssues.length}</span>
          )}
        </button>
        <button
          className={`sidebar-tab ${activeTab === "query" ? "active" : ""}`}
          onClick={() => setActiveTab("query")}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 3h12M2 7h8M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Query
        </button>
        <button
          className={`sidebar-tab ${activeTab === "ai" ? "active" : ""}`}
          onClick={() => setActiveTab("ai")}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          AI
        </button>
      </div>

      {/* Health Tab */}
      {activeTab === "health" && (
        <div className="sidebar-content">
          <div className="health-summary">
            <div className="summary-stat">
              <span className="stat-number">{tables.length}</span>
              <span className="stat-label">Tables</span>
            </div>
            <div className="summary-stat">
              <span className="stat-number">{relationships.length}</span>
              <span className="stat-label">Relations</span>
            </div>
            <div className="summary-stat">
              <span className={`stat-number ${healthIssues.length > 0 ? "has-issues" : "no-issues"}`}>
                {healthIssues.length}
              </span>
              <span className="stat-label">Issues</span>
            </div>
          </div>

          {healthIssues.length === 0 ? (
            <div className="health-ok">
              <span className="health-ok-icon">✓</span>
              <p>Schema looks healthy! No issues detected.</p>
            </div>
          ) : (
            <div className="health-issues">
              {healthIssues.map((issue, i) => (
                <div key={i} className={`health-issue severity-${issue.severity}`}>
                  <div className="issue-badge">
                    {issue.severity === "error" ? "ERROR" : issue.severity === "warning" ? "WARN" : "INFO"}
                  </div>
                  <p className="issue-message">{issue.message}</p>
                </div>
              ))}
            </div>
          )}

          {indexSuggestions.length > 0 && (
            <div className="index-suggestions">
              <h3 className="section-title">Index Suggestions</h3>
              {indexSuggestions.map((suggestion, i) => (
                <div key={i} className="suggestion-item">
                  <p className="suggestion-reason">{suggestion.reason}</p>
                  <code className="suggestion-sql">{suggestion.createStatement}</code>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Query Tab */}
      {activeTab === "query" && (
        <div className="sidebar-content">
          {activeRel && activeQuery ? (
            <div className="query-detail">
              <div className="query-header">
                <h3 className="rel-title">
                  <span className="rel-table">{activeRel.sourceTable}</span>
                  <span className="rel-arrow">→</span>
                  <span className="rel-table">{activeRel.targetTable}</span>
                </h3>
                <span className={`cardinality-badge card-${activeRel.cardinality.replace(":", "")}`}>
                  {activeRel.cardinality}
                </span>
              </div>

              <p className="query-explanation">{activeQuery.explanation}</p>

              <div className="query-block">
                <div className="query-block-header">
                  <span>Optimized JOIN</span>
                  <button
                    className="copy-btn"
                    onClick={() => navigator.clipboard.writeText(activeQuery.sql)}
                  >
                    Copy
                  </button>
                </div>
                <pre className="query-sql"><code>{activeQuery.sql}</code></pre>
              </div>

              {activeQuery.indexWarning && (
                <div className="query-warning">
                  <span>{activeQuery.indexWarning}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="query-empty">
              <p>Click a relationship line in the diagram to see the JOIN query</p>
              {relationships.length > 0 && (
                <div className="rel-list">
                  <h4>Available Relationships</h4>
                  {relationships.map((rel) => (
                    <button
                      key={rel.id}
                      className="rel-list-item"
                      onClick={() => setActiveRelationship(rel.id)}
                    >
                      <span className="rel-table">{rel.sourceTable}</span>
                      <span className="rel-arrow">→</span>
                      <span className="rel-table">{rel.targetTable}</span>
                      <span className={`cardinality-badge card-${rel.cardinality.replace(":", "")}`}>
                        {rel.cardinality}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI Tab */}
      {activeTab === "ai" && (
        <div className="sidebar-content">
          {activeRel ? (
            <div className="ai-panel">
              <div className="query-header">
                <h3 className="rel-title">
                  <span className="rel-table">{activeRel.sourceTable}</span>
                  <span className="rel-arrow">→</span>
                  <span className="rel-table">{activeRel.targetTable}</span>
                </h3>
              </div>

              {!aiExplanation && !aiLoading && (
                <button className="ai-btn" onClick={fetchAiExplanation}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M6 8l1.5 1.5L10 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Analyze with AI
                </button>
              )}

              {aiLoading && (
                <div className="ai-skeleton">
                  <div className="skeleton" style={{ height: 16, width: '80%' }} />
                  <div className="skeleton" style={{ height: 16, width: '100%' }} />
                  <div className="skeleton" style={{ height: 16, width: '60%' }} />
                  <div className="skeleton" style={{ height: 16, width: '90%' }} />
                </div>
              )}

              {aiExplanation && (
                <div className="ai-result">
                  <p>{aiExplanation}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="query-empty">
              <p>Select a relationship to analyze with AI</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
