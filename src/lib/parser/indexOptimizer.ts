import type { Table, Relationship } from "./index";

// ── Types ──────────────────────────────────────────────────────────────────
export interface IndexSuggestion {
  table: string;
  column: string;
  reason: string;
  createStatement: string;
}

export interface JoinQuery {
  relationshipId: string;
  sql: string;
  joinType: string;
  explanation: string;
  cardinality: string;
  indexWarning: string | null;
}

// ── Index Optimizer ───────────────────────────────────────────────────────
export function suggestIndexes(tables: Table[]): IndexSuggestion[] {
  const suggestions: IndexSuggestion[] = [];

  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      const fkCol = fk.columns[0];
      const hasIndex =
        table.indexes.some((idx) => idx.columns[0] === fkCol) ||
        table.primaryKey.includes(fkCol);

      if (!hasIndex) {
        suggestions.push({
          table: table.name,
          column: fkCol,
          reason: `Foreign key to \`${fk.refTable}.${fk.refColumns[0]}\` — JOINs on this column do a full table scan without an index.`,
          createStatement: `CREATE INDEX idx_${table.name}_${fkCol} ON ${table.name}(${fkCol});`,
        });
      }
    }
  }

  return suggestions;
}

// ── JOIN Query Builder ──────────────────────────────────────────────────
export function buildJoinQuery(
  relationship: Relationship,
  tables: Table[]
): JoinQuery {
  const sourceTable = tables.find((t) => t.name === relationship.sourceTable);
  const targetTable = tables.find((t) => t.name === relationship.targetTable);

  // Determine best JOIN type
  let joinType = "INNER JOIN";
  const sourceCol = sourceTable?.columns.find(
    (c) => c.name === relationship.sourceColumns[0]
  );
  if (sourceCol?.nullable) {
    joinType = "LEFT JOIN";
  }

  // Build ON clause
  const onClauses = relationship.sourceColumns
    .map(
      (col, i) =>
        `${relationship.sourceTable}.${col} = ${relationship.targetTable}.${relationship.targetColumns[i]}`
    )
    .join(" AND ");

  // Build a useful SELECT
  const srcAlias = relationship.sourceTable.charAt(0).toLowerCase();
  const tgtAlias = relationship.targetTable.charAt(0).toLowerCase();

  const srcCols = (sourceTable?.columns ?? [])
    .slice(0, 4)
    .map((c) => `${srcAlias}.${c.name}`)
    .join(", ");
  const tgtCols = (targetTable?.columns ?? [])
    .slice(0, 4)
    .map((c) => `${tgtAlias}.${c.name}`)
    .join(", ");

  const sql = [
    `SELECT ${srcCols}, ${tgtCols}`,
    `FROM ${relationship.sourceTable} ${srcAlias}`,
    `${joinType} ${relationship.targetTable} ${tgtAlias}`,
    `  ON ${onClauses.replace(new RegExp(relationship.sourceTable, "g"), srcAlias).replace(new RegExp(relationship.targetTable, "g"), tgtAlias)};`,
  ].join("\n");

  // Index warning
  let indexWarning: string | null = null;
  const hasFKIndex =
    sourceTable?.indexes.some(
      (idx) => idx.columns[0] === relationship.sourceColumns[0]
    ) || sourceTable?.primaryKey.includes(relationship.sourceColumns[0]);
  if (!hasFKIndex) {
    indexWarning = `⚠ FK column \`${relationship.sourceTable}.${relationship.sourceColumns[0]}\` has no index. This JOIN will do a full scan of \`${relationship.sourceTable}\`.`;
  }

  // Semantic explanation (rule-based)
  const explanation = buildExplanation(relationship);

  return {
    relationshipId: relationship.id,
    sql,
    joinType,
    explanation,
    cardinality: relationship.cardinality,
    indexWarning,
  };
}

function buildExplanation(rel: Relationship): string {
  const src = rel.sourceTable;
  const tgt = rel.targetTable;

  switch (rel.cardinality) {
    case "1:1":
      return `Each \`${src}\` row maps to exactly one \`${tgt}\` row. This is a one-to-one relationship, often used for profile/settings data.`;
    case "1:N":
      return `Each \`${tgt}\` can have many \`${src}\` rows. This is a one-to-many relationship — the most common pattern in relational schemas.`;
    case "M:N":
      return `\`${src}\` is a junction table linking multiple entities. This represents a many-to-many relationship.`;
    default:
      return `\`${src}\` references \`${tgt}\` via a foreign key.`;
  }
}

// ── Build all JOIN queries for the schema ────────────────────────────────
export function buildAllJoinQueries(
  relationships: Relationship[],
  tables: Table[]
): JoinQuery[] {
  return relationships.map((rel) => buildJoinQuery(rel, tables));
}
