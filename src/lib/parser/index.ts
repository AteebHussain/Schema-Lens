import { Parser } from "node-sql-parser";

// ── Types ──────────────────────────────────────────────────────────────────
export interface Column {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
  defaultValue: string | null;
}

export interface ForeignKey {
  columns: string[];
  refTable: string;
  refColumns: string[];
  constraintName?: string;
}

export interface IndexDef {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface Table {
  name: string;
  columns: Column[];
  primaryKey: string[];
  foreignKeys: ForeignKey[];
  indexes: IndexDef[];
}

export interface Relationship {
  id: string;
  sourceTable: string;
  sourceColumns: string[];
  targetTable: string;
  targetColumns: string[];
  cardinality: "1:1" | "1:N" | "M:N";
}

export interface ParseResult {
  tables: Table[];
  relationships: Relationship[];
  errors: ParseError[];
}

export interface ParseError {
  line: number | null;
  message: string;
  sql: string;
}

// ── Parser ────────────────────────────────────────────────────────────────
const parser = new Parser();

/**
 * Pre-process raw SQL to strip lines/statements that node-sql-parser
 * cannot handle (SET, USE, comments, ENUMs outside CREATE TABLE, etc.)
 */
function preprocessSQL(raw: string): string {
  return raw
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim().toUpperCase();
      if (trimmed.startsWith("--")) return false;
      if (trimmed.startsWith("SET ")) return false;
      if (trimmed.startsWith("USE ")) return false;
      if (trimmed.startsWith("DROP ")) return false;
      if (trimmed.startsWith("/*")) return false;
      return true;
    })
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, ""); // strip block comments
}

/**
 * Split raw SQL into individual statements and try to parse each one,
 * collecting successes and failures separately. This means a single bad
 * statement won't break parsing of the whole schema.
 */
function splitStatements(sql: string): string[] {
  const result: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of sql) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === ";" && depth === 0) {
      const stmt = current.trim();
      if (stmt) result.push(stmt);
      current = "";
    } else {
      current += char;
    }
  }
  const last = current.trim();
  if (last) result.push(last);
  return result;
}

/**
 * Master parse function. Takes raw SQL, returns tables, relationships,
 * and per-statement errors with line numbers.
 */
export function parseSQL(raw: string): ParseResult {
  const cleaned = preprocessSQL(raw);
  const statements = splitStatements(cleaned);

  const tables: Table[] = [];
  const errors: ParseError[] = [];

  for (const stmt of statements) {
    // Only attempt to parse CREATE TABLE statements
    if (!/^\s*CREATE\s+TABLE/i.test(stmt)) continue;

    try {
      const ast = parser.astify(stmt, { database: "MySQL" });
      const nodes = Array.isArray(ast) ? ast : [ast];

      for (const node of nodes) {
        if (node.type !== "create" || node.keyword !== "table") continue;
        const table = extractTable(node);
        if (table) tables.push(table);
      }
    } catch (err: unknown) {
      const lineMatch =
        err instanceof Error ? err.message.match(/line (\d+)/i) : null;
      errors.push({
        line: lineMatch ? parseInt(lineMatch[1], 10) : findLineNumber(raw, stmt),
        message:
          err instanceof Error
            ? err.message
            : "Unknown parse error",
        sql: stmt.slice(0, 120),
      });
    }
  }

  const relationships = deriveRelationships(tables);

  return { tables, relationships, errors };
}

// ── Extract table info from a CREATE TABLE AST node ──────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
function extractTable(node: any): Table | null {
  const tableName: string =
    typeof node.table === "string"
      ? node.table
      : node.table?.[0]?.table ?? node.table?.table ?? "unknown";

  const columns: Column[] = [];
  const primaryKey: string[] = [];
  const foreignKeys: ForeignKey[] = [];
  const indexes: IndexDef[] = [];

  const defs: any[] = node.create_definitions ?? [];

  for (const def of defs) {
    // Column definition
    if (def.resource === "column") {
      const col: Column = {
        name: def.column?.column ?? def.column ?? "unknown",
        dataType: extractDataType(def),
        nullable: !def.nullable?.value || def.nullable.value !== "not null",
        isPrimaryKey: false,
        isUnique: false,
        defaultValue: def.default_val?.value?.value ?? null,
      };

      // Inline constraint
      if (def.unique_or_primary === "primary key") {
        col.isPrimaryKey = true;
        primaryKey.push(col.name);
      }
      if (def.unique_or_primary === "unique") {
        col.isUnique = true;
      }

      // Inline FK reference
      if (def.reference_definition) {
        foreignKeys.push({
          columns: [col.name],
          refTable:
            def.reference_definition.table?.[0]?.table ??
            def.reference_definition.table?.table ??
            "unknown",
          refColumns: (def.reference_definition.definition ?? []).map(
            (d: any) => d.column ?? d
          ),
        });
      }

      columns.push(col);
    }

    // Constraint definitions (PKs, FKs, UNIQUE, INDEX)
    if (def.resource === "constraint") {
      if (def.constraint_type === "primary key") {
        const pkCols = (def.definition ?? []).map(
          (d: any) => d.column ?? d
        );
        primaryKey.push(...pkCols);
        pkCols.forEach((pk: string) => {
          const col = columns.find((c) => c.name === pk);
          if (col) col.isPrimaryKey = true;
        });
      }

      if (
        def.constraint_type === "FOREIGN KEY" ||
        def.constraint_type === "foreign key"
      ) {
        foreignKeys.push({
          columns: (def.definition ?? []).map(
            (d: any) => d.column ?? d
          ),
          refTable:
            def.reference_definition?.table?.[0]?.table ??
            def.reference_definition?.table?.table ??
            "unknown",
          refColumns: (
            def.reference_definition?.definition ?? []
          ).map((d: any) => d.column ?? d),
          constraintName: def.constraint ?? undefined,
        });
      }

      if (def.constraint_type === "unique") {
        const uCols = (def.definition ?? []).map(
          (d: any) => d.column ?? d
        );
        uCols.forEach((u: string) => {
          const col = columns.find((c) => c.name === u);
          if (col) col.isUnique = true;
        });
        indexes.push({
          name: def.constraint ?? `unique_${uCols.join("_")}`,
          columns: uCols,
          unique: true,
        });
      }
    }

    // Index definitions
    if (def.resource === "index") {
      indexes.push({
        name: def.index ?? `idx_${tableName}`,
        columns: (def.definition ?? []).map(
          (d: any) => d.column ?? d
        ),
        unique: def.index_type === "unique",
      });
    }
  }

  return { name: tableName, columns, primaryKey, foreignKeys, indexes };
}

function extractDataType(def: any): string {
  if (typeof def.definition?.dataType === "string") {
    let dt = def.definition.dataType;
    if (def.definition.length) dt += `(${def.definition.length})`;
    return dt;
  }
  return "UNKNOWN";
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Derive relationships from FK definitions ─────────────────────────────
function deriveRelationships(tables: Table[]): Relationship[] {
  const rels: Relationship[] = [];
  const tableMap = new Map(tables.map((t) => [t.name.toLowerCase(), t]));

  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      const targetTable = tableMap.get(fk.refTable.toLowerCase());
      if (!targetTable) continue;

      // Determine cardinality
      const sourceCol = table.columns.find((c) => c.name === fk.columns[0]);
      const isSourceUnique = sourceCol?.isUnique || sourceCol?.isPrimaryKey;
      const targetCol = targetTable.columns.find(
        (c) => c.name === fk.refColumns[0]
      );
      const isTargetUnique =
        targetCol?.isUnique || targetCol?.isPrimaryKey;

      let cardinality: "1:1" | "1:N" | "M:N" = "1:N";
      if (isSourceUnique && isTargetUnique) cardinality = "1:1";
      // M:N is detected structurally: if the table has 2+ FKs and only PK columns
      if (
        table.foreignKeys.length >= 2 &&
        table.columns.every(
          (c) =>
            c.isPrimaryKey ||
            table.foreignKeys.some((f) => f.columns.includes(c.name))
        )
      ) {
        cardinality = "M:N";
      }

      rels.push({
        id: `${table.name}.${fk.columns.join(",")}->${fk.refTable}.${fk.refColumns.join(",")}`,
        sourceTable: table.name,
        sourceColumns: fk.columns,
        targetTable: fk.refTable,
        targetColumns: fk.refColumns,
        cardinality,
      });
    }
  }

  return rels;
}

// ── Utilities ─────────────────────────────────────────────────────────────
function findLineNumber(raw: string, stmt: string): number | null {
  const idx = raw.indexOf(stmt.slice(0, 40));
  if (idx === -1) return null;
  return raw.slice(0, idx).split("\n").length;
}
