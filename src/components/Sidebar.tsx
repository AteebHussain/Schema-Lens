"use client";
import React, { useCallback, useState } from "react";
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
  
  const [aiDetailsVisible, setAiDetailsVisible] = useState(false);

  const activeRel = relationships.find((r) => r.id === activeRelationshipId);
  const activeQuery = joinQueries.find((q) => q.relationshipId === activeRelationshipId);

  const fetchAiExplanation = useCallback(async () => {
    if (!activeRel || !activeQuery) return;
    setAiLoading(true);
    setAiExplanation(null);
    setAiDetailsVisible(false);

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
          title="Schema issues & warnings"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
          </svg>
          Health
          {healthIssues.length > 0 && (
            <span className="tab-badge">{healthIssues.length}</span>
          )}
        </button>
        <button
          className={`sidebar-tab ${activeTab === "query" ? "active" : ""}`}
          onClick={() => setActiveTab("query")}
          title="Generate & optimize SQL"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
          </svg>
          Query
        </button>
        <button
          className={`sidebar-tab ${activeTab === "ai" ? "active" : ""}`}
          onClick={() => setActiveTab("ai")}
          title="Natural language schema explanation"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            <path d="M5 3v4"/><path d="M3 5h4"/><path d="M21 17v4"/><path d="M19 19h4"/>
          </svg>
          AI
        </button>
      </div>

      <div className="sidebar-scroll-container">
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
                <span className={`stat-number-large ${healthIssues.length > 0 ? "has-issues" : "no-issues"}`}>
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
              <div className="health-list">
                {healthIssues.map((issue, i) => (
                  <div key={i} className={`health-issue-card severity-${issue.severity}`}>
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
          <div className="sidebar-content p-0">
            <div className="query-accordion">
              {relationships.length > 0 ? (
                relationships.map((rel) => {
                  const isActive = rel.id === activeRelationshipId;
                  const query = joinQueries.find(q => q.relationshipId === rel.id);
                  
                  return (
                    <div key={rel.id} className={`accordion-item ${isActive ? 'active' : ''}`}>
                      <button 
                        className="accordion-header"
                        onClick={() => setActiveRelationship(isActive ? null : rel.id)}
                      >
                        <div className="rel-info">
                          <span className="rel-table">{rel.sourceTable}</span>
                          <span className="rel-arrow">→</span>
                          <span className="rel-table">{rel.targetTable}</span>
                        </div>
                        <span className={`cardinality-badge card-${rel.cardinality.replace(":", "")}`}>
                          {rel.cardinality}
                        </span>
                      </button>
                      
                      {isActive && query && (
                        <div className="accordion-body">
                          <p className="query-explanation">{query.explanation}</p>
                          
                          <div className="code-block-container">
                            <div className="code-block-label">OPTIMIZED JOIN</div>
                            <button
                              className="copy-btn-overlay"
                              onClick={() => navigator.clipboard.writeText(query.sql)}
                            >
                              Copy
                            </button>
                            <pre className="query-sql"><code>{query.sql}</code></pre>
                          </div>
                          
                          {query.indexWarning && (
                            <div className="query-warning">
                              <span>{query.indexWarning}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="query-empty-state">
                  <p>No relationships detected in the schema.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Tab */}
        {activeTab === "ai" && (
          <div className="sidebar-content">
            {activeRel ? (
              <div className="ai-panel">
                <div className="ai-header">
                  <span className={`cardinality-badge card-${activeRel.cardinality.replace(":", "")}`}>
                    {activeRel.cardinality}
                  </span>
                  <h3 className="rel-title">
                    <span className="rel-table">{activeRel.sourceTable}</span>
                    <span className="rel-arrow">→</span>
                    <span className="rel-table">{activeRel.targetTable}</span>
                  </h3>
                </div>

                {!aiExplanation && !aiLoading && (
                  <button className="ai-btn" onClick={fetchAiExplanation}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                    </svg>
                    Analyze with AI
                  </button>
                )}

                {aiLoading && (
                  <div className="ai-skeleton">
                    <div className="skeleton" style={{ height: 16, width: '80%' }} />
                    <div className="skeleton" style={{ height: 16, width: '100%' }} />
                    <div className="skeleton" style={{ height: 16, width: '60%' }} />
                  </div>
                )}

                {aiExplanation && (
                  <div className="ai-result">
                    <div className="ai-summary">
                      {aiExplanation.split('.')[0]}.
                    </div>
                    
                    <button 
                      className="ai-details-toggle"
                      onClick={() => setAiDetailsVisible(!aiDetailsVisible)}
                    >
                      {aiDetailsVisible ? "Hide Details" : "Show Details"}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: aiDetailsVisible ? 'rotate(180deg)' : '' }}>
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </button>
                    
                    {aiDetailsVisible && (
                      <div className="ai-details">
                        <p>{aiExplanation.substring(aiExplanation.indexOf('.') + 1).trim()}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="query-empty">
                <p>Select a relationship line to analyze</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
