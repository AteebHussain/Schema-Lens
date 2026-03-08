import { create } from "zustand";
import { parseSQL, type Table, type Relationship, type ParseError } from "@/src/lib/parser";
import { validateSchemaHealth, type HealthIssue } from "@/src/lib/parser/healthValidator";
import {
  suggestIndexes,
  buildAllJoinQueries,
  type IndexSuggestion,
  type JoinQuery,
} from "@/src/lib/parser/indexOptimizer";

// ── State Types ───────────────────────────────────────────────────────────
interface SchemaState {
  // Input
  rawSQL: string;

  // Parsed data
  tables: Table[];
  relationships: Relationship[];
  parseErrors: ParseError[];

  // Analysis
  healthIssues: HealthIssue[];
  indexSuggestions: IndexSuggestion[];
  joinQueries: JoinQuery[];

  // UI
  activeRelationshipId: string | null;
  activeTab: "health" | "query" | "ai";
  aiExplanation: string | null;
  aiLoading: boolean;

  // Actions
  setSQL: (sql: string) => void;
  setActiveRelationship: (id: string | null) => void;
  setActiveTab: (tab: "health" | "query" | "ai") => void;
  setAiExplanation: (text: string | null) => void;
  setAiLoading: (loading: boolean) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────
export const useSchemaStore = create<SchemaState>((set) => ({
  rawSQL: "",
  tables: [],
  relationships: [],
  parseErrors: [],
  healthIssues: [],
  indexSuggestions: [],
  joinQueries: [],
  activeRelationshipId: null,
  activeTab: "health",
  aiExplanation: null,
  aiLoading: false,

  setSQL: (sql: string) => {
    const { tables, relationships, errors } = parseSQL(sql);
    const healthIssues = validateSchemaHealth(tables, relationships);
    const indexSuggestions = suggestIndexes(tables);
    const joinQueries = buildAllJoinQueries(relationships, tables);

    set({
      rawSQL: sql,
      tables,
      relationships,
      parseErrors: errors,
      healthIssues,
      indexSuggestions,
      joinQueries,
      activeRelationshipId: null,
      aiExplanation: null,
    });
  },

  setActiveRelationship: (id) => set({ activeRelationshipId: id, activeTab: "query", aiExplanation: null }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setAiExplanation: (text) => set({ aiExplanation: text }),
  setAiLoading: (loading) => set({ aiLoading: loading }),
}));
