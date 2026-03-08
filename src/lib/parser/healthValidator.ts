import type { Table, Relationship } from "./index";

// ── Types ──────────────────────────────────────────────────────────────────
export type Severity = "error" | "warning" | "info";

export interface HealthIssue {
  severity: Severity;
  table: string;
  column?: string;
  code: string;
  message: string;
}

// ── Validator ─────────────────────────────────────────────────────────────
export function validateSchemaHealth(
  tables: Table[],
  relationships: Relationship[]
): HealthIssue[] {
  const issues: HealthIssue[] = [];

  checkMissingPrimaryKeys(tables, issues);
  checkOrphanedTables(tables, relationships, issues);
  checkCircularDependencies(tables, issues);
  checkNamingInconsistencies(tables, issues);
  checkMissingFKIndexes(tables, issues);

  return issues;
}

// ── Individual checks ─────────────────────────────────────────────────────

function checkMissingPrimaryKeys(tables: Table[], issues: HealthIssue[]) {
  for (const table of tables) {
    if (table.primaryKey.length === 0) {
      issues.push({
        severity: "error",
        table: table.name,
        code: "MISSING_PK",
        message: `Table \`${table.name}\` has no primary key. Every table should have an explicit PK for reliable JOINs and indexing.`,
      });
    }
  }
}

function checkOrphanedTables(
  tables: Table[],
  relationships: Relationship[],
  issues: HealthIssue[]
) {
  const connectedTables = new Set<string>();
  for (const rel of relationships) {
    connectedTables.add(rel.sourceTable.toLowerCase());
    connectedTables.add(rel.targetTable.toLowerCase());
  }

  for (const table of tables) {
    if (
      tables.length > 1 &&
      !connectedTables.has(table.name.toLowerCase())
    ) {
      issues.push({
        severity: "warning",
        table: table.name,
        code: "ORPHANED_TABLE",
        message: `Table \`${table.name}\` has no foreign key relationships. It may be orphaned or missing a FK constraint.`,
      });
    }
  }
}

function checkCircularDependencies(tables: Table[], issues: HealthIssue[]) {
  // Build adjacency list from FK definitions
  const graph = new Map<string, string[]>();
  for (const table of tables) {
    const key = table.name.toLowerCase();
    if (!graph.has(key)) graph.set(key, []);
    for (const fk of table.foreignKeys) {
      graph.get(key)!.push(fk.refTable.toLowerCase());
    }
  }

  // DFS cycle detection
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]) {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push(path.slice(cycleStart));
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const neighbor of graph.get(node) ?? []) {
      dfs(neighbor, [...path]);
    }

    inStack.delete(node);
  }

  for (const node of graph.keys()) {
    dfs(node, []);
  }

  for (const cycle of cycles) {
    issues.push({
      severity: "warning",
      table: cycle[0],
      code: "CIRCULAR_FK",
      message: `Circular FK dependency detected: ${cycle.join(" → ")} → ${cycle[0]}. This can cause insertion order issues and makes cascading deletes dangerous.`,
    });
  }
}

function checkNamingInconsistencies(tables: Table[], issues: HealthIssue[]) {
  // Check if table names mix snake_case and camelCase
  const hasSnake = tables.some((t) => t.name.includes("_"));
  const hasCamel = tables.some(
    (t) => !t.name.includes("_") && /[a-z][A-Z]/.test(t.name)
  );

  if (hasSnake && hasCamel) {
    issues.push({
      severity: "info",
      table: "*",
      code: "NAMING_MIX",
      message: `Mixed naming conventions detected: some tables use snake_case while others use camelCase. Consider standardizing.`,
    });
  }
}

function checkMissingFKIndexes(tables: Table[], issues: HealthIssue[]) {
  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      const fkCol = fk.columns[0];
      // Check if there's an index covering this FK column
      const hasIndex =
        table.indexes.some((idx) => idx.columns[0] === fkCol) ||
        table.primaryKey.includes(fkCol);

      if (!hasIndex) {
        issues.push({
          severity: "warning",
          table: table.name,
          column: fkCol,
          code: "MISSING_FK_INDEX",
          message: `FK column \`${table.name}.${fkCol}\` has no index. JOINs to \`${fk.refTable}\` will scan the full \`${table.name}\` table.`,
        });
      }
    }
  }
}
