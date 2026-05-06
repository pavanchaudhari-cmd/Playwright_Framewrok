/**
 * Generates context.md from a Swagger/OpenAPI URL.
 *
 * Usage:
 *   npx ts-node scripts/generate-context.ts <swagger-url> [output-path]
 *
 * Examples:
 *   npx ts-node scripts/generate-context.ts https://petstore.swagger.io/v2/swagger.json
 *   npx ts-node scripts/generate-context.ts https://petstore3.swagger.io/api/v3/openapi.json ./context.md
 */

import * as https from "https";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { URL } from "url";
import * as yaml from "js-yaml";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OpenAPIInfo {
  title: string;
  description?: string;
  version: string;
  contact?: { name?: string; email?: string; url?: string };
  license?: { name: string; url?: string };
  termsOfService?: string;
}

interface OpenAPIServer {
  url: string;
  description?: string;
}

interface OpenAPIParameter {
  name: string;
  in: "query" | "path" | "header" | "cookie" | "body" | "formData";
  description?: string;
  required?: boolean;
  schema?: OpenAPISchema;
  type?: string;
  enum?: unknown[];
  default?: unknown;
  example?: unknown;
  format?: string;
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
  additionalProperties?: boolean | OpenAPISchema;
}

interface OpenAPIResponse {
  description: string;
  content?: Record<string, { schema?: OpenAPISchema }>;
  schema?: OpenAPISchema;
  examples?: Record<string, unknown>;
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
  security?: Record<string, string[]>[];
  deprecated?: boolean;
  consumes?: string[];
  produces?: string[];
  // Swagger 2 body parameter lives in parameters, handled generically
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
  summary?: string;
  description?: string;
}

interface SecurityScheme {
  type: string;
  description?: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: unknown;
  openIdConnectUrl?: string;
}

interface OpenAPISpec {
  // Common
  info: OpenAPIInfo;
  paths?: Record<string, OpenAPIPathItem>;
  components?: {
    schemas?: Record<string, OpenAPISchema>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
  tags?: Array<{ name: string; description?: string }>;
  externalDocs?: { description?: string; url: string };
  // OpenAPI 3.x
  openapi?: string;
  servers?: OpenAPIServer[];
  // Swagger 2.x
  swagger?: string;
  host?: string;
  basePath?: string;
  schemes?: string[];
  definitions?: Record<string, OpenAPISchema>;
  securityDefinitions?: Record<string, SecurityScheme>;
  consumes?: string[];
  produces?: string[];
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

/** Extract a balanced JSON object/array starting at `startIndex` in `text`. */
function extractBalancedJson(text: string, startIndex: number): string | null {
  const open = text[startIndex];
  const close = open === "{" ? "}" : open === "[" ? "]" : null;
  if (!close) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(startIndex, i + 1);
    }
  }
  return null;
}

/** Try to pull an inline spec out of a JS file (e.g. swagger-ui-init.js). */
function extractSpecFromJs(js: string): OpenAPISpec | null {
  // "swaggerDoc": { ... }  or  swaggerDoc: { ... }
  const match = js.match(/["']?swaggerDoc["']?\s*:\s*(\{)/);
  if (!match || match.index === undefined) return null;
  const start = js.indexOf("{", match.index + match[0].length - 1);
  const raw = extractBalancedJson(js, start);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OpenAPISpec;
  } catch {
    return null;
  }
}

function resolveUrl(href: string, base: string): string {
  return href.startsWith("http") ? href : new URL(href, base).toString();
}

async function fetchSpec(inputUrl: string): Promise<OpenAPISpec> {
  console.log(`  GET ${inputUrl}`);
  const text = await fetchRaw(inputUrl);
  const trimmed = text.trimStart();

  // JS file — look for inline swaggerDoc
  if (inputUrl.endsWith(".js") || inputUrl.includes(".js?")) {
    const spec = extractSpecFromJs(text);
    if (spec) return spec;
    throw new Error(`Could not extract swaggerDoc from JS file: ${inputUrl}`);
  }

  // HTML page — try multiple strategies
  if (trimmed.startsWith("<")) {
    // Strategy 1: SwaggerUIBundle({ url: "..." })
    const urlPatterns = [
      /SwaggerUIBundle\s*\([^)]*?url\s*:\s*["']([^"']+)["']/s,
      /url\s*:\s*["']([^"']*(?:swagger|openapi|api-docs)[^"']*)["']/i,
    ];
    for (const re of urlPatterns) {
      const m = text.match(re);
      if (m?.[1]) {
        const specUrl = resolveUrl(m[1], inputUrl);
        console.log(`  Found spec URL in page: ${specUrl}`);
        return fetchSpec(specUrl);
      }
    }

    // Strategy 2: look for swagger-ui-init.js (spec may be embedded there)
    const initMatch = text.match(/src=["']([^"']*swagger-ui-init\.js[^"']*)["']/i);
    if (initMatch?.[1]) {
      const initUrl = resolveUrl(initMatch[1], inputUrl);
      console.log(`  Found swagger-ui-init.js: ${initUrl}`);
      const js = await fetchRaw(initUrl);
      const spec = extractSpecFromJs(js);
      if (spec) return spec;
    }

    // Strategy 3: probe common spec paths
    const base = inputUrl.replace(/\/+$/, "");
    const candidates = [
      `${base}/swagger.json`, `${base}/openapi.json`,
      `${base}/swagger.yaml`, `${base}/openapi.yaml`,
      `${base}/api-docs`,    `${base}/v2/api-docs`, `${base}/v3/api-docs`,
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
        "Pass the direct spec URL instead (e.g. .../swagger.json or .../openapi.yaml)."
    );
  }

  return parseSpec(text);
}

// ---------------------------------------------------------------------------
// Parsing helper
// ---------------------------------------------------------------------------

function parseSpec(raw: string): OpenAPISpec {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(raw) as OpenAPISpec;
  }
  return yaml.load(raw) as OpenAPISpec;
}

function resolveRef(ref: string, spec: OpenAPISpec): OpenAPISchema | null {
  // Only handles local $ref like #/components/schemas/Foo or #/definitions/Foo
  const parts = ref.replace(/^#\//, "").split("/");
  let node: unknown = spec;
  for (const p of parts) {
    if (node && typeof node === "object") {
      node = (node as Record<string, unknown>)[p];
    } else {
      return null;
    }
  }
  return (node as OpenAPISchema) ?? null;
}

function schemaToString(
  schema: OpenAPISchema | undefined,
  spec: OpenAPISpec,
  depth = 0
): string {
  if (!schema) return "_none_";
  if (schema.$ref) {
    const name = schema.$ref.split("/").pop() ?? schema.$ref;
    return `[\`${name}\`](#schema-${name.toLowerCase()})`;
  }

  const indent = "  ".repeat(depth);

  if (schema.allOf || schema.oneOf || schema.anyOf) {
    const key = schema.allOf ? "allOf" : schema.oneOf ? "oneOf" : "anyOf";
    const arr = (schema.allOf ?? schema.oneOf ?? schema.anyOf) as OpenAPISchema[];
    return `${key}:\n${arr.map((s) => `${indent}- ${schemaToString(s, spec, depth + 1)}`).join("\n")}`;
  }

  if (schema.type === "array" && schema.items) {
    return `array of ${schemaToString(schema.items, spec, depth)}`;
  }

  if (schema.type === "object" || schema.properties) {
    if (!schema.properties) return "object";
    const props = Object.entries(schema.properties)
      .map(([k, v]) => {
        const req = schema.required?.includes(k) ? " *(required)*" : "";
        const fmt = v.format ? ` \`${v.format}\`` : "";
        const desc = v.description ? ` — ${v.description}` : "";
        return `${indent}  - \`${k}\`${req}: ${v.type ?? schemaToString(v, spec, depth + 1)}${fmt}${desc}`;
      })
      .join("\n");
    return `object\n${props}`;
  }

  const base = schema.type ?? "any";
  const fmt = schema.format ? ` (${schema.format})` : "";
  const enums = schema.enum ? ` — one of: ${schema.enum.map((e) => `\`${e}\``).join(", ")}` : "";
  return `${base}${fmt}${enums}`;
}

// ---------------------------------------------------------------------------
// Markdown generators
// ---------------------------------------------------------------------------

const HTTP_METHODS = ["get", "post", "put", "delete", "patch", "head", "options"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

function buildServersSection(spec: OpenAPISpec): string {
  const lines: string[] = ["## Base URLs\n"];

  if (spec.servers?.length) {
    for (const s of spec.servers) {
      lines.push(`- \`${s.url}\`${s.description ? ` — ${s.description}` : ""}`);
    }
  } else if (spec.host) {
    const schemes = spec.schemes ?? ["https"];
    for (const scheme of schemes) {
      lines.push(`- \`${scheme}://${spec.host}${spec.basePath ?? ""}\``);
    }
  } else {
    lines.push("_No server information available._");
  }

  return lines.join("\n") + "\n";
}

function buildSecuritySection(spec: OpenAPISpec): string {
  const schemes: Record<string, SecurityScheme> =
    spec.components?.securitySchemes ?? spec.securityDefinitions ?? {};

  if (!Object.keys(schemes).length) return "";

  const lines: string[] = ["## Authentication\n"];

  for (const [name, scheme] of Object.entries(schemes)) {
    lines.push(`### ${name}\n`);
    lines.push(`- **Type:** ${scheme.type}`);
    if (scheme.description) lines.push(`- **Description:** ${scheme.description}`);
    if (scheme.in) lines.push(`- **In:** ${scheme.in}`);
    if (scheme.name) lines.push(`- **Parameter name:** ${scheme.name}`);
    if (scheme.scheme) lines.push(`- **Scheme:** ${scheme.scheme}`);
    if (scheme.bearerFormat) lines.push(`- **Bearer format:** ${scheme.bearerFormat}`);
    lines.push("");
  }

  return lines.join("\n");
}

function buildOperationSection(
  method: string,
  pathStr: string,
  op: OpenAPIOperation,
  pathParams: OpenAPIParameter[],
  spec: OpenAPISpec
): string {
  const lines: string[] = [];
  const anchor = `${method}-${pathStr.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;
  const deprecated = op.deprecated ? " *(deprecated)*" : "";
  const title = op.summary ?? op.operationId ?? `${method.toUpperCase()} ${pathStr}`;

  lines.push(`### ${method.toUpperCase()} \`${pathStr}\`${deprecated}\n`);
  if (op.summary) lines.push(`**${op.summary}**\n`);
  if (op.description) lines.push(`${op.description}\n`);
  if (op.operationId) lines.push(`> Operation ID: \`${op.operationId}\``);

  // Merge path-level params (lower priority)
  const allParams: OpenAPIParameter[] = [
    ...pathParams,
    ...(op.parameters?.filter(
      (p) => !pathParams.find((pp) => pp.name === p.name && pp.in === p.in)
    ) ?? []),
  ];

  const pathP = allParams.filter((p) => p.in === "path");
  const queryP = allParams.filter((p) => p.in === "query");
  const headerP = allParams.filter((p) => p.in === "header");
  const bodyP = allParams.filter((p) => p.in === "body" || p.in === "formData");

  const renderParams = (label: string, params: OpenAPIParameter[]) => {
    if (!params.length) return;
    lines.push(`\n**${label} Parameters**\n`);
    lines.push("| Name | Required | Type | Description |");
    lines.push("|------|----------|------|-------------|");
    for (const p of params) {
      const req = p.required ? "Yes" : "No";
      const schema = p.schema ?? { type: p.type, format: p.format, enum: p.enum };
      const typeStr = schemaToString(schema, spec);
      const desc = p.description ?? "";
      const def = p.default !== undefined ? ` *(default: \`${p.default}\`)* ` : "";
      lines.push(`| \`${p.name}\` | ${req} | ${typeStr} | ${desc}${def} |`);
    }
  };

  renderParams("Path", pathP);
  renderParams("Query", queryP);
  renderParams("Header", headerP);

  // Request body (OpenAPI 3.x)
  if (op.requestBody) {
    lines.push(`\n**Request Body**${op.requestBody.required ? " *(required)*" : ""}\n`);
    if (op.requestBody.description) lines.push(op.requestBody.description + "\n");
    if (op.requestBody.content) {
      for (const [mediaType, mediaObj] of Object.entries(op.requestBody.content)) {
        lines.push(`_Content-Type: \`${mediaType}\`_\n`);
        if (mediaObj.schema) {
          lines.push("```");
          lines.push(schemaToString(mediaObj.schema, spec));
          lines.push("```");
        }
      }
    }
  }

  // Request body (Swagger 2.x — body/formData params)
  if (bodyP.length) {
    lines.push(`\n**Request Body**\n`);
    lines.push("| Name | Required | Type | Description |");
    lines.push("|------|----------|------|-------------|");
    for (const p of bodyP) {
      const req = p.required ? "Yes" : "No";
      const schema = p.schema ?? { type: p.type };
      const typeStr = schemaToString(schema, spec);
      lines.push(`| \`${p.name}\` | ${req} | ${typeStr} | ${p.description ?? ""} |`);
    }
  }

  // Responses
  if (op.responses && Object.keys(op.responses).length) {
    lines.push(`\n**Responses**\n`);
    lines.push("| Status | Description | Schema |");
    lines.push("|--------|-------------|--------|");
    for (const [status, resp] of Object.entries(op.responses)) {
      let schemaStr = "";
      if (resp.content) {
        const first = Object.values(resp.content)[0];
        if (first?.schema) schemaStr = schemaToString(first.schema, spec);
      } else if (resp.schema) {
        schemaStr = schemaToString(resp.schema, spec);
      }
      lines.push(`| \`${status}\` | ${resp.description} | ${schemaStr} |`);
    }
  }

  // Security
  if (op.security?.length) {
    const schemes = op.security.map((s) => Object.keys(s).join(", ")).join("; ");
    lines.push(`\n> **Security:** ${schemes}`);
  }

  lines.push("\n---\n");
  return lines.join("\n");
}

function buildEndpointsSection(spec: OpenAPISpec): string {
  if (!spec.paths || !Object.keys(spec.paths).length) {
    return "## Endpoints\n\n_No endpoints defined._\n";
  }

  // Collect tag metadata
  const tagDescriptions: Record<string, string> = {};
  for (const tag of spec.tags ?? []) {
    tagDescriptions[tag.name] = tag.description ?? "";
  }

  // Group operations by tag
  const byTag: Record<string, Array<{ method: string; path: string; op: OpenAPIOperation; pathParams: OpenAPIParameter[] }>> = {};
  const untagged: typeof byTag[""] = [];

  for (const [pathStr, pathItem] of Object.entries(spec.paths)) {
    const pathLevelParams = pathItem.parameters ?? [];

    for (const method of HTTP_METHODS) {
      const op = pathItem[method as HttpMethod];
      if (!op) continue;

      const tags = op.tags?.length ? op.tags : ["_untagged_"];
      for (const tag of tags) {
        if (!byTag[tag]) byTag[tag] = [];
        byTag[tag].push({ method, path: pathStr, op, pathParams: pathLevelParams });
      }
    }
  }

  const lines: string[] = ["## Endpoints\n"];

  const sortedTags = Object.keys(byTag).sort((a, b) =>
    a === "_untagged_" ? 1 : b === "_untagged_" ? -1 : a.localeCompare(b)
  );

  for (const tag of sortedTags) {
    const displayTag = tag === "_untagged_" ? "Other" : tag;
    lines.push(`## ${displayTag}\n`);
    if (tagDescriptions[tag]) lines.push(`${tagDescriptions[tag]}\n`);

    for (const { method, path: pathStr, op, pathParams } of byTag[tag]) {
      lines.push(buildOperationSection(method, pathStr, op, pathParams, spec));
    }
  }

  return lines.join("\n");
}

function buildSchemasSection(spec: OpenAPISpec): string {
  const schemas: Record<string, OpenAPISchema> =
    spec.components?.schemas ?? spec.definitions ?? {};

  if (!Object.keys(schemas).length) return "";

  const lines: string[] = ["## Schemas\n"];

  for (const [name, schema] of Object.entries(schemas)) {
    lines.push(`### ${name} {#schema-${name.toLowerCase()}}\n`);
    if (schema.description) lines.push(`${schema.description}\n`);

    if (schema.type === "object" || schema.properties) {
      const props = schema.properties ?? {};
      if (Object.keys(props).length) {
        lines.push("| Property | Type | Required | Description |");
        lines.push("|----------|------|----------|-------------|");
        for (const [propName, propSchema] of Object.entries(props)) {
          const req = schema.required?.includes(propName) ? "Yes" : "No";
          const typeStr = schemaToString(propSchema, spec);
          const desc = propSchema.description ?? "";
          lines.push(`| \`${propName}\` | ${typeStr} | ${req} | ${desc} |`);
        }
        lines.push("");
      }
    } else if (schema.enum) {
      lines.push(`**Enum values:** ${schema.enum.map((e) => `\`${e}\``).join(", ")}\n`);
    } else {
      lines.push(`**Type:** ${schema.type ?? "any"}\n`);
    }

    if (schema.example !== undefined) {
      lines.push(`**Example:**\n\`\`\`json\n${JSON.stringify(schema.example, null, 2)}\n\`\`\`\n`);
    }
  }

  return lines.join("\n");
}

function generateContextMd(spec: OpenAPISpec, sourceUrl: string): string {
  const { info } = spec;
  const version = spec.openapi ?? spec.swagger ?? "unknown";
  const specType = spec.openapi ? "OpenAPI" : "Swagger";

  const sections: string[] = [];

  // Header
  sections.push(`# ${info.title}\n`);
  sections.push(`> Generated from ${specType} spec: \`${sourceUrl}\`  \n> Spec version: \`${version}\`  \n> API version: \`${info.version}\`\n`);

  if (info.description) sections.push(`${info.description}\n`);

  // Meta
  const meta: string[] = [];
  if (info.contact) {
    const c = info.contact;
    const parts = [c.name, c.email, c.url].filter(Boolean).join(" | ");
    if (parts) meta.push(`**Contact:** ${parts}`);
  }
  if (info.license) {
    const l = info.license;
    meta.push(`**License:** ${l.url ? `[${l.name}](${l.url})` : l.name}`);
  }
  if (info.termsOfService) meta.push(`**Terms of Service:** ${info.termsOfService}`);
  if (meta.length) sections.push(meta.join("  \n") + "\n");

  // Table of contents
  sections.push("## Table of Contents\n");
  sections.push("- [Base URLs](#base-urls)");
  const schemas = spec.components?.schemas ?? spec.definitions ?? {};
  const hasSecurity =
    Object.keys(spec.components?.securitySchemes ?? spec.securityDefinitions ?? {}).length > 0;
  if (hasSecurity) sections.push("- [Authentication](#authentication)");
  sections.push("- [Endpoints](#endpoints)");
  if (Object.keys(schemas).length) sections.push("- [Schemas](#schemas)");
  sections.push("");

  // Sections
  sections.push(buildServersSection(spec));
  if (hasSecurity) sections.push(buildSecuritySection(spec));
  sections.push(buildEndpointsSection(spec));
  if (Object.keys(schemas).length) sections.push(buildSchemasSection(spec));

  // Footer
  sections.push(`\n---\n_Generated on ${new Date().toISOString()}_\n`);

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error(
      "Usage: npx ts-node scripts/generate-context.ts <swagger-url> [output-path]\n\n" +
        "Examples:\n" +
        "  npx ts-node scripts/generate-context.ts https://petstore.swagger.io/v2/swagger.json\n" +
        "  npx ts-node scripts/generate-context.ts https://petstore3.swagger.io/api/v3/openapi.json ./docs/context.md"
    );
    process.exit(1);
  }

  const swaggerUrl = args[0];
  const outputPath = args[1] ?? path.join(process.cwd(), "context.md");

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

  const markdown = generateContextMd(spec, swaggerUrl);

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, markdown, "utf-8");

  const endpointCount = Object.values(spec.paths ?? {}).reduce(
    (n, item) => n + HTTP_METHODS.filter((m) => item[m as HttpMethod]).length,
    0
  );
  const schemaCount = Object.keys(spec.components?.schemas ?? spec.definitions ?? {}).length;

  console.log(`\nDone!`);
  console.log(`  Output:    ${outputPath}`);
  console.log(`  Endpoints: ${endpointCount}`);
  console.log(`  Schemas:   ${schemaCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
