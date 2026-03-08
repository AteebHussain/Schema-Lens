import { NextRequest, NextResponse } from "next/server";

// WARNING: The GEMINI_API_KEY must be stored as an environment variable in production.
// NEVER hardcode API keys in source code. See SECURITY.md.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { relationship, sourceColumns, targetColumns, joinQuery, cardinality } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Fallback: return a rule-based explanation when no API key is configured
      return NextResponse.json({
        explanation: buildFallbackExplanation(relationship, cardinality),
      });
    }

    const prompt = `You are a senior database architect. Analyze this database relationship and provide a concise, practical explanation.

Relationship: ${relationship.sourceTable}.${relationship.sourceColumns.join(",")} → ${relationship.targetTable}.${relationship.targetColumns.join(",")}
Cardinality: ${cardinality}

Source table columns: ${JSON.stringify(sourceColumns.map((c: { name: string; dataType: string }) => `${c.name} (${c.dataType})`).join(", "))}
Target table columns: ${JSON.stringify(targetColumns.map((c: { name: string; dataType: string }) => `${c.name} (${c.dataType})`).join(", "))}

JOIN Query: ${joinQuery}

Respond with a JSON object containing:
1. "explanation": A 2-3 sentence real-world explanation of what this relationship represents in plain English. Be specific to the table/column names.
2. "optimization": One specific optimization tip for queries using this relationship.
3. "warning": Any potential issue with this relationship design (or null if none).

Respond ONLY with the JSON object, no markdown.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API returned ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
      const combined = [
        parsed.explanation,
        parsed.optimization ? `💡 ${parsed.optimization}` : "",
        parsed.warning ? `⚠️ ${parsed.warning}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      return NextResponse.json({ explanation: combined });
    } catch {
      return NextResponse.json({ explanation: text });
    }
  } catch (error) {
    console.error("Analyze API error:", error);
    return NextResponse.json(
      { error: "Analysis failed", explanation: "AI analysis unavailable. Check your GEMINI_API_KEY configuration." },
      { status: 500 }
    );
  }
}

function buildFallbackExplanation(
  relationship: { sourceTable: string; targetTable: string; sourceColumns: string[]; targetColumns: string[] },
  cardinality: string
): string {
  const src = relationship.sourceTable;
  const tgt = relationship.targetTable;
  const srcCol = relationship.sourceColumns[0];
  const tgtCol = relationship.targetColumns[0];

  switch (cardinality) {
    case "1:1":
      return `Each ${src} record is linked to exactly one ${tgt} record via ${srcCol} → ${tgtCol}. This is a one-to-one relationship, commonly used for splitting rarely-accessed columns into a separate table for performance.`;
    case "1:N":
      return `Each ${tgt} can have multiple ${src} records, linked through ${srcCol} → ${tgtCol}. This is a standard one-to-many relationship — the backbone of most relational schemas. Consider adding an index on ${src}.${srcCol} if queries frequently join these tables.`;
    case "M:N":
      return `${src} acts as a junction table connecting multiple entities through ${srcCol} → ${tgtCol}. This represents a many-to-many relationship. Ensure both foreign key columns are indexed for optimal join performance.`;
    default:
      return `${src}.${srcCol} references ${tgt}.${tgtCol} via a foreign key constraint.`;
  }
}
