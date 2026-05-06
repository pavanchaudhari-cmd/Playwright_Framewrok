/**
 * Generates TypeScript types from a Swagger/OpenAPI URL.
 *
 * Usage:
 *   npx tsx scripts/generate-types.ts <swagger-url> [output-path]
 *
 * Examples:
 *   npx tsx scripts/generate-types.ts https://petstore.swagger.io/v2/swagger.json
 *   npx tsx scripts/generate-types.ts https://petstore3.swagger.io/api/v3/openapi.json ./src/types/api.ts
 */

import * as https from "https";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { URL } from "url";
import * as yaml from "js-yaml";

// ---------------------------------------------------------------------------
// OpenAPI types
// ---------------------------------------------------------------------------

interface OpenAPIInfo {
  title: string;
  description?: string;
  version: string;
}

interface OpenAPISchema {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  $ref?: string;
  enum?: unknown[];
  required?: string[];
  example?: unknown;
  allOf?: OpenAPISchema[];
  oneOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  not?: OpenAPISchema;
  additionalProperties?: boolean | OpenAPISchema;
  nullable?: boolean;
}

interface OpenAPIParameter {
  name: string;
  in: "query" | "path" | "header" | "cookie" | "body" | "formData";
  description?: string;
  required?: boolean;
  schema?: OpenAPISchema;
  type?: string;
  format?: string;
  enum?: unknown[];
}

interface OpenAPIResponse {
  description: string;
  content?: Record<string, { schema?: OpenAPISchema }>;
  schema?: OpenAPISchema;
}

interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: {
    description?: string;
    required?: boolean;
    content?: Record<string, { schema?: OpenAPISchema }>;
  };
  responses?: Record<string, OpenAPIResponse>;
  deprecated?: boolean;
}

interface OpenAPIPathItem {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  head?: OpenAPIOperation;
  options?: OpenAPIOperation;
  parameters?: OpenAPIParameter[];
}

interface OpenAPISpec {
  info: OpenAPIInfo;
  paths?: Record<string, OpenAPIPathItem>;
  components?: {
    schemas?: Record<string, OpenAPISchema>;
    securitySchemes?: Record<string, unknown>;
  };
  openapi?: string;
  servers?: Array<{ url: string; description?: string }>;
  swagger?: string;
  host?: string;
  basePath?: string;
  schemes?: string[];
  definitions?: Record<string, OpenAPISchema>;
  securityDefinitions?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

function fetchRaw(rawUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(rawUrl);
    const lib = parsed.protocol === "https:" ? https : http;

    const req = lib.get(rawUrl, { timeout: 15000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith("http")
          ? res.headers.location
          : new URL(res.headers.location, rawUrl).toString();
        fetchRaw(next).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} for ${rawUrl}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      res.on("error", reject);
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timed out for ${rawUrl}`));
    });
  });
}

function extractBalancedJson(text: string, startIndex: number): string | null {
  const open = text[startIndex];
  const close = open === "{" ? "}" : open === "[" ? "]" : null;
  if (!close) return null;
  let depth = 0, inString = false, escape = false;
  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === open) depth++;
    else if (ch === close) { depth--; if (depth === 0) return text.slice(startIndex, i + 1); }
  }
  return null;
}

function extractSpecFromJs(js: string): OpenAPISpec | null {
  const match = js.match(/["']?swaggerDoc["']?\s*:\s*(\{)/);
  if (!match || match.index === undefined) return null;
  const start = js.indexOf("{", match.index + match[0].length - 1);
  const raw = extractBalancedJson(js, start);
  if (!raw) return null;
  try { return JSON.parse(raw) as OpenAPISpec; } catch { return null; }
}

function resolveUrl(href: string, base: string): string {
  return href.startsWith("http") ? href : new URL(href, base).toString();
}

function parseSpec(raw: string): OpenAPISpec {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return JSON.parse(raw) as OpenAPISpec;
  return yaml.load(raw) as OpenAPISpec;
}

async function fetchSpec(inputUrl: string): Promise<OpenAPISpec> {
  console.log(`  GET ${inputUrl}`);
  const text = await fetchRaw(inputUrl);
  const trimmed = text.trimStart();

  if (inputUrl.endsWith(".js") || inputUrl.includes(".js?")) {
    const spec = extractSpecFromJs(text);
    if (spec) return spec;
    throw new Error(`Could not extract swaggerDoc from JS file: ${inputUrl}`);
  }

  if (trimmed.startsWith("<")) {
    const urlPatterns = [
      /SwaggerUIBundle\s*\([^)]*?url\s*:\s*["']([^"']+)["']/s,
      /url\s*:\s*["']([^"']*(?:swagger|openapi|api-docs)[^"']*)["']/i,
    ];
    for (const re of urlPatterns) {
      const m = text.match(re);
      if (m?.[1]) {
        console.log(`  Found spec URL in page: ${m[1]}`);
        return fetchSpec(resolveUrl(m[1], inputUrl));
      }
    }

    const initMatch = text.match(/src=["']([^"']*swagger-ui-init\.js[^"']*)["']/i);
    if (initMatch?.[1]) {
      const initUrl = resolveUrl(initMatch[1], inputUrl);
      console.log(`  Found swagger-ui-init.js: ${initUrl}`);
      const js = await fetchRaw(initUrl);
      const spec = extractSpecFromJs(js);
      if (spec) return spec;
    }

    const base = inputUrl.replace(/\/+$/, "");
    const candidates = [
      `${base}/swagger.json`, `${base}/openapi.json`,
      `${base}/swagger.yaml`, `${base}/openapi.yaml`,
      `${base}/api-docs`, `${base}/v2/api-docs`, `${base}/v3/api-docs`,
    ];
    for (const candidate of candidates) {
      try {
        console.log(`  Probing: ${candidate}`);
        const raw = await fetchRaw(candidate);
        if (!raw.trimStart().startsWith("<")) return parseSpec(raw);
      } catch { /* try next */ }
    }

    throw new Error(
      "URL returned an HTML page and no spec could be found.\n" +
      "Pass the direct spec URL (e.g. .../swagger.json or .../openapi.yaml)."
    );
  }

  return parseSpec(text);
}

// ---------------------------------------------------------------------------
// TypeScript generation
// ---------------------------------------------------------------------------

const HTTP_METHODS = ["get", "post", "put", "delete", "patch", "head", "options"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

function tsKey(key: string, optional: boolean): string {
  const needsQuote = /[^a-zA-Z0-9_$]/.test(key) || /^\d/.test(key);
  return `${needsQuote ? `"${key}"` : key}${optional ? "?" : ""}`;
}

function mapPrimitive(type?: string): string {
  switch (type) {
    case "string":  return "string";
    case "integer":
    case "number":  return "number";
    case "boolean": return "boolean";
    case "null":    return "null";
    default:        return "unknown";
  }
}

/** Convert an OpenAPI schema to an inline TypeScript type expression. */
function schemaToTs(schema: OpenAPISchema | undefined, spec: OpenAPISpec, depth = 0): string {
  if (!schema) return "unknown";

  if (schema.$ref) {
    const name = schema.$ref.split("/").pop()!;
    return schema.nullable ? `${name} | null` : name;
  }

  const nullable = schema.nullable ? " | null" : "";

  if (schema.allOf) {
    const parts = schema.allOf.map((s) => schemaToTs(s, spec, depth));
    const joined = parts.length === 1 ? parts[0] : parts.join(" & ");
    return joined + nullable;
  }

  if (schema.oneOf || schema.anyOf) {
    const arr = (schema.oneOf ?? schema.anyOf)!;
    return arr.map((s) => schemaToTs(s, spec, depth)).join(" | ") + nullable;
  }

  if (schema.not) {
    return `Exclude<unknown, ${schemaToTs(schema.not, spec, depth)}>` + nullable;
  }

  if (schema.enum) {
    const vals = schema.enum
      .map((v) => (v === null ? "null" : typeof v === "string" ? `"${v}"` : String(v)))
      .join(" | ");
    return vals + nullable;
  }

  if (schema.type === "array") {
    const item = schema.items ? schemaToTs(schema.items, spec, depth) : "unknown";
    const needsParen = item.includes("|") || item.includes("&");
    return `${needsParen ? `(${item})` : item}[]${nullable}`;
  }

  if (schema.type === "object" || schema.properties || schema.additionalProperties !== undefined) {
    const pad = "  ".repeat(depth + 1);
    const closePad = "  ".repeat(depth);
    const lines: string[] = ["{"];

    for (const [key, propSchema] of Object.entries(schema.properties ?? {})) {
      const isRequired = schema.required?.includes(key) ?? false;
      const propType = schemaToTs(propSchema, spec, depth + 1);
      if (propSchema.description) lines.push(`${pad}/** ${sanitizeComment(propSchema.description)} */`);
      lines.push(`${pad}${tsKey(key, !isRequired)}: ${propType};`);
    }

    if (schema.additionalProperties !== undefined && schema.additionalProperties !== false) {
      const valueType =
        schema.additionalProperties === true
          ? "unknown"
          : schemaToTs(schema.additionalProperties as OpenAPISchema, spec, depth + 1);
      lines.push(`${pad}[key: string]: ${valueType};`);
    }

    lines.push(`${closePad}}`);
    return lines.join("\n") + nullable;
  }

  return mapPrimitive(schema.type) + nullable;
}

function sanitizeComment(text: string): string {
  return text.replace(/\*\//g, "* /").replace(/\n/g, " ");
}

/** Generate a named export declaration (interface or type alias). */
function generateNamedDeclaration(name: string, schema: OpenAPISchema, spec: OpenAPISpec): string {
  const lines: string[] = [];

  if (schema.description) {
    lines.push(`/** ${sanitizeComment(schema.description)} */`);
  }

  const isObjectInterface =
    (schema.type === "object" || schema.properties || schema.additionalProperties !== undefined) &&
    !schema.allOf && !schema.oneOf && !schema.anyOf && !schema.enum && !schema.$ref;

  if (isObjectInterface) {
    lines.push(`export interface ${name} {`);

    for (const [key, propSchema] of Object.entries(schema.properties ?? {})) {
      const isRequired = schema.required?.includes(key) ?? false;
      const propType = schemaToTs(propSchema, spec, 1);
      if (propSchema.description) lines.push(`  /** ${sanitizeComment(propSchema.description)} */`);
      lines.push(`  ${tsKey(key, !isRequired)}: ${propType};`);
    }

    if (schema.additionalProperties !== undefined && schema.additionalProperties !== false) {
      const valueType =
        schema.additionalProperties === true
          ? "unknown"
          : schemaToTs(schema.additionalProperties as OpenAPISchema, spec, 1);
      lines.push(`  [key: string]: ${valueType};`);
    }

    lines.push("}");
  } else {
    lines.push(`export type ${name} = ${schemaToTs(schema, spec, 0)};`);
  }

  return lines.join("\n");
}

/** Generate per-operation types for path/query params and anonymous request/response bodies. */
function generateOperationTypes(
  op: OpenAPIOperation,
  pathLevelParams: OpenAPIParameter[],
  spec: OpenAPISpec
): string[] {
  if (!op.operationId) return [];

  const baseName = op.operationId.replace(/[^a-zA-Z0-9_$]/g, "_");
  const lines: string[] = [];

  const allParams: OpenAPIParameter[] = [
    ...pathLevelParams,
    ...(op.parameters?.filter(
      (p) => !pathLevelParams.find((pp) => pp.name === p.name && pp.in === p.in)
    ) ?? []),
  ];

  const pathParams  = allParams.filter((p) => p.in === "path");
  const queryParams = allParams.filter((p) => p.in === "query");

  const renderParams = (typeName: string, params: OpenAPIParameter[]) => {
    if (!params.length) return;
    lines.push(`export interface ${typeName} {`);
    for (const p of params) {
      const schema = p.schema ?? { type: p.type, format: p.format, enum: p.enum };
      const typeStr = schemaToTs(schema, spec, 1);
      if (p.description) lines.push(`  /** ${sanitizeComment(p.description)} */`);
      lines.push(`  ${tsKey(p.name, !(p.required ?? false))}: ${typeStr};`);
    }
    lines.push("}");
    lines.push("");
  };

  renderParams(`${baseName}PathParams`, pathParams);
  renderParams(`${baseName}QueryParams`, queryParams);

  // Anonymous request body (skip if it's just a $ref — the target schema is already exported)
  if (op.requestBody?.content) {
    const schema = Object.values(op.requestBody.content)[0]?.schema;
    if (schema && !schema.$ref) {
      lines.push(generateNamedDeclaration(`${baseName}Request`, schema, spec));
      lines.push("");
    }
  }

  // Anonymous successful response body
  const successResp = op.responses?.["200"] ?? op.responses?.["201"];
  if (successResp) {
    let schema: OpenAPISchema | undefined;
    if (successResp.content) schema = Object.values(successResp.content)[0]?.schema;
    else schema = successResp.schema;
    if (schema && !schema.$ref) {
      lines.push(generateNamedDeclaration(`${baseName}Response`, schema, spec));
      lines.push("");
    }
  }

  return lines;
}

function generateTypesFile(spec: OpenAPISpec, sourceUrl: string): string {
  const schemas: Record<string, OpenAPISchema> =
    spec.components?.schemas ?? spec.definitions ?? {};

  const out: string[] = [];

  out.push(`// Auto-generated TypeScript types`);
  out.push(`// Source:    ${sourceUrl}`);
  out.push(`// API:       ${spec.info.title} v${spec.info.version}`);
  out.push(`// Generated: ${new Date().toISOString()}`);
  out.push(`// DO NOT EDIT — re-run generate-types.ts to update`);
  out.push("");

  // Named schemas
  if (Object.keys(schemas).length) {
    out.push("// =============================================================================");
    out.push("// Schemas");
    out.push("// =============================================================================");
    out.push("");
    for (const [name, schema] of Object.entries(schemas)) {
      out.push(generateNamedDeclaration(name, schema, spec));
      out.push("");
    }
  }

  // Operation-level types (params + anonymous bodies)
  const opLines: string[] = [];
  for (const [, pathItem] of Object.entries(spec.paths ?? {})) {
    const pathLevelParams = pathItem.parameters ?? [];
    for (const method of HTTP_METHODS) {
      const op = pathItem[method as HttpMethod];
      if (!op) continue;
      const generated = generateOperationTypes(op, pathLevelParams, spec);
      if (generated.length) opLines.push(...generated);
    }
  }

  if (opLines.length) {
    out.push("// =============================================================================");
    out.push("// Operation types (params & anonymous request/response bodies)");
    out.push("// =============================================================================");
    out.push("");
    out.push(...opLines);
  }

  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error(
      "Usage: npx tsx scripts/generate-types.ts <swagger-url> [output-path]\n\n" +
      "Examples:\n" +
      "  npx tsx scripts/generate-types.ts https://petstore.swagger.io/v2/swagger.json\n" +
      "  npx tsx scripts/generate-types.ts https://petstore3.swagger.io/api/v3/openapi.json ./src/types/api.ts"
    );
    process.exit(1);
  }

  const swaggerUrl = args[0];
  const outputPath = args[1] ?? path.join(process.cwd(), "api-types.ts");

  console.log(`Fetching spec from: ${swaggerUrl}`);

  let spec: OpenAPISpec;
  try {
    spec = await fetchSpec(swaggerUrl);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }

  if (!spec.openapi && !spec.swagger) {
    console.warn("Warning: could not detect OpenAPI/Swagger version. Proceeding anyway.");
  }

  const content = generateTypesFile(spec, swaggerUrl);

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outputPath, content, "utf-8");

  const schemaCount = Object.keys(spec.components?.schemas ?? spec.definitions ?? {}).length;
  const endpointCount = Object.values(spec.paths ?? {}).reduce(
    (n, item) => n + HTTP_METHODS.filter((m) => item[m as HttpMethod]).length,
    0
  );

  console.log(`\nDone!`);
  console.log(`  Output:    ${outputPath}`);
  console.log(`  Schemas:   ${schemaCount}`);
  console.log(`  Endpoints: ${endpointCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
