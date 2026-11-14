import type { Command } from '../core/command/command-types'
import type { ToolPlugin } from '../core/plugin/plugin-types'
import type { ResolvedLocale } from './locale-state'

export interface LocalizedTextPair {
  title: string
  description: string
}

export const PLUGIN_EN: Record<string, { name: string; description: string }> = {
  'official.json-tool': {
    name: 'JSON Formatter',
    description: 'Format, minify, and validate JSON content',
  },
  'official.timestamp-tool': {
    name: 'Timestamp Converter',
    description: 'Convert between Unix timestamps and ISO dates',
  },
  'official.base64-tool': {
    name: 'Base64 Codec',
    description: 'Encode and decode UTF-8 text as Base64',
  },
  'official.uuid-tool': {
    name: 'UUID Generator',
    description: 'Generate random v4 UUIDs in bulk',
  },
  'official.hash-tool': {
    name: 'Hash Digest',
    description: 'Compute SHA-1, SHA-256, SHA-384, and SHA-512 hashes',
  },
  'official.port-killer-tool': {
    name: 'Port Inspector',
    description: 'Find and terminate processes listening on local ports',
  },
  'official.command-cheatsheet-tool': {
    name: 'Linux Command Reference',
    description: 'Search 621 offline Linux manuals and tldr examples',
  },
  'official.chmod-calculator-tool': {
    name: 'Chmod Calculator',
    description: 'Calculate Unix octal permissions and chmod commands',
  },
  'official.url-tool': {
    name: 'URL Codec',
    description: 'Encode, decode, and inspect URL query strings',
  },
  'official.regex-tool': {
    name: 'Regex Tester',
    description: 'Test regular expressions and inspect capture groups',
  },
  'official.jwt-key-tool': {
    name: 'JWT Key Generator',
    description: 'Generate HMAC secrets and RSA/ECDSA PEM key pairs',
  },
  'official.yaml-properties-tool': {
    name: 'YAML & Properties Converter',
    description: 'Convert between Spring Boot YAML and .properties files',
  },
  'official.cidr-tool': {
    name: 'CIDR Subnet Calculator',
    description: 'Calculate IPv4 network ranges, netmasks, and host counts',
  },
  'official.cookie-tool': {
    name: 'Cookie Parser',
    description: 'Parse HTTP Cookie and Set-Cookie headers',
  },
  'official.json-schema-tool': {
    name: 'JSON Schema Generator',
    description: 'Infer Draft 2020-12 JSON Schema from sample JSON',
  },
  'official.library-tool': {
    name: 'Commands & Files',
    description: 'Save multi-line commands, tags, and local file copies',
  },
  'official.snippet-tool': {
    name: 'Local Snippets',
    description: 'Store and search reusable code snippets locally',
  },
  'official.task-tool': {
    name: 'Task Manager',
    description: 'Organize todos, schedules, lists, tags, and reminders',
  },
  'official.utility-tools': {
    name: 'Utility Toolkit',
    description: 'Lightweight built-in developer and design utilities',
  },
  'official.advanced-tools': {
    name: 'Advanced Toolkit',
    description: 'In-depth formatting, security, CSS, and file utilities',
  },
  'official.workflow-tools': {
    name: 'Workflow Toolkit',
    description: 'Data conversion, codegen, HTTP, and text workflow tools',
  },
}

export const COMMAND_EN: Record<string, LocalizedTextPair> = {
  'official.json-tool.open': {
    title: 'JSON Formatter',
    description: 'Format, minify, and validate JSON',
  },
  'official.timestamp-tool.open': {
    title: 'Timestamp Converter',
    description: 'Convert Unix timestamps and date strings',
  },
  'official.base64-tool.open': {
    title: 'Base64 Codec',
    description: 'Encode or decode Base64 text',
  },
  'official.uuid-tool.open': {
    title: 'UUID Generator',
    description: 'Generate v4 UUIDs with copy options',
  },
  'official.hash-tool.open': {
    title: 'Hash Digest',
    description: 'Compute SHA family hashes locally',
  },
  'official.port-killer-tool.open': {
    title: 'Port Inspector',
    description: 'Inspect local listening ports and terminate processes',
  },
  'official.command-cheatsheet-tool.open': {
    title: 'Linux Command Reference',
    description: 'Browse 621 Linux manuals and tldr examples offline',
  },
  'official.chmod-calculator-tool.open': {
    title: 'Chmod Calculator',
    description: 'Convert rwx checkboxes, octal values, and chmod commands',
  },
  'official.url-tool.open': {
    title: 'URL Codec',
    description: 'Encode/decode URLs and parse query parameters',
  },
  'official.regex-tool.open': {
    title: 'Regex Tester',
    description: 'Match regular expressions with live highlights',
  },
  'official.jwt-key-tool.open': {
    title: 'JWT Key Generator',
    description: 'Generate HS256/384/512 secrets and RS/ES PEM keys',
  },
  'official.yaml-properties-tool.open': {
    title: 'YAML ↔ Properties',
    description: 'Convert between YAML and Java Properties config',
  },
  'official.cidr-tool.open': {
    title: 'CIDR Subnet Calculator',
    description: 'Inspect IPv4 CIDR block bounds and usable hosts',
  },
  'official.cookie-tool.open': {
    title: 'Cookie Parser',
    description: 'Parse Cookie / Set-Cookie headers into fields',
  },
  'official.json-schema-tool.open': {
    title: 'JSON Schema Generator',
    description: 'Generate JSON Schema from JSON payloads',
  },
  'official.library-tool.open': {
    title: 'Commands & Files',
    description: 'Save multi-line commands and local file copies',
  },
  'official.snippet-tool.open': {
    title: 'Local Snippets',
    description: 'Save, tag, and copy code snippets locally',
  },
  'official.task-tool.open': {
    title: 'Task Manager',
    description: 'Manage todos, natural dates, reminders, and subtasks',
  },

  // Utility tools
  'official.utility-tools.unicode': {
    title: 'Unicode Codec',
    description: 'Encode and decode Unicode escape sequences',
  },
  'official.utility-tools.html-entity': {
    title: 'HTML Entity Codec',
    description: 'Encode and decode HTML character entities',
  },
  'official.utility-tools.text-case': {
    title: 'Text Case Converter',
    description: 'Convert between camelCase, PascalCase, snake_case, and kebab-case',
  },
  'official.utility-tools.text-diff': {
    title: 'Text & Code Diff',
    description: 'Compare two snippets or JSON blocks side by side',
  },
  'official.utility-tools.regex-library': {
    title: 'Regex Library',
    description: 'Common regex presets with one-click jump to Regex Tester',
  },
  'official.utility-tools.date-diff': {
    title: 'Date Diff Calculator',
    description: 'Calculate duration between two dates and times',
  },
  'official.utility-tools.timezone-converter': {
    title: 'Timezone Converter',
    description: 'Convert ISO or Unix times across major timezones',
  },
  'official.utility-tools.random-string': {
    title: 'Random String Generator',
    description: 'Generate random strings with custom character sets',
  },
  'official.utility-tools.query-builder': {
    title: 'Query String Builder',
    description: 'Build URL query strings from key-value lines',
  },
  'official.utility-tools.json-to-typescript': {
    title: 'JSON to TypeScript',
    description: 'Infer TypeScript interfaces and types from JSON',
  },
  'official.utility-tools.jwt-decoder': {
    title: 'JWT Decoder',
    description: 'Decode JWT header and payload locally',
  },
  'official.utility-tools.jwt-generator': {
    title: 'JWT Generator',
    description: 'Sign HS256 JWT tokens from JSON payload and secret',
  },
  'official.utility-tools.redis-ttl': {
    title: 'Redis TTL Calculator',
    description: 'Convert seconds to human-readable TTL durations',
  },
  'official.utility-tools.http-status': {
    title: 'HTTP Status Codes',
    description: 'Look up standard HTTP status codes and meanings',
  },
  'official.utility-tools.radix-converter': {
    title: 'Radix Base Converter',
    description: 'Convert between binary, octal, decimal, and hex',
  },
  'official.utility-tools.markdown-table': {
    title: 'Markdown Table Converter',
    description: 'Convert Excel, TSV, or CSV data to Markdown tables',
  },
  'official.utility-tools.markdown-preview': {
    title: 'Markdown Live Preview',
    description: 'Write Markdown and preview formatted output live',
  },
  'official.utility-tools.file-hash': {
    title: 'File Hash Checker',
    description: 'Compute MD5, SHA-1, SHA-256, and SHA-512 of local files',
  },
  'official.utility-tools.color-converter': {
    title: 'Color Converter',
    description: 'Convert between HEX, RGB, and HSL colors',
  },
  'official.utility-tools.screen-color-picker': {
    title: 'Screen Color Picker',
    description: 'Sample pixel colors directly from your screen',
  },
  'official.utility-tools.qr-code-studio': {
    title: 'QR Code Studio',
    description: 'Generate QR codes and decode QR images locally',
  },
  'official.utility-tools.git-commit-formatter': {
    title: 'Git Commit Formatter',
    description: 'Build Conventional Commits messages',
  },
  'official.utility-tools.clipboard-history': {
    title: 'Clipboard Text History',
    description: 'Monitor and store up to 100 plain-text clipboard items',
  },
  'official.utility-tools.lorem-ipsum': {
    title: 'Lorem Ipsum Generator',
    description: 'Generate Latin or Chinese placeholder copy',
  },
  'official.utility-tools.mongo-object-id': {
    title: 'Mongo ObjectId Parser',
    description: 'Decode timestamp, random bytes, and counter in ObjectIds',
  },
  'official.utility-tools.svg-cleaner': {
    title: 'SVG Cleaner',
    description: 'Strip scripts, event handlers, and redundant SVG metadata',
  },
  'official.utility-tools.unit-converter': {
    title: 'Unit Converter',
    description: 'Convert length, weight, data size, and temperature units',
  },

  // Advanced tools
  'official.advanced-tools.yaml': {
    title: 'YAML Formatter & Validator',
    description: 'Format YAML indentation and check syntax structure',
  },
  'official.advanced-tools.xml': {
    title: 'XML Formatter & Validator',
    description: 'Parse and pretty-print XML documents',
  },
  'official.advanced-tools.sql-formatter': {
    title: 'SQL Formatter',
    description: 'Format or minify common SQL queries',
  },
  'official.advanced-tools.hmac': {
    title: 'HMAC Generator',
    description: 'Generate HMAC digests for API signature debugging',
  },
  'official.advanced-tools.cron': {
    title: 'Cron Expression Parser',
    description: 'Translate 5-field Cron expressions into readable schedules',
  },
  'official.advanced-tools.password-strength': {
    title: 'Password Strength Checker',
    description: 'Evaluate password entropy, character classes, and patterns',
  },
  'official.advanced-tools.password-hash': {
    title: 'Password Hash & Verify',
    description: 'Generate and verify PBKDF2 password hashes locally',
  },
  'official.advanced-tools.sensitive-mask': {
    title: 'Sensitive Data Masker',
    description: 'Detect and mask emails, phones, cards, and token fields',
  },
  'official.advanced-tools.css-clamp': {
    title: 'CSS Clamp Calculator',
    description: 'Generate fluid responsive CSS clamp() values',
  },
  'official.advanced-tools.css-visual': {
    title: 'CSS Shadow & Gradient Studio',
    description: 'Visually tune box-shadow and gradients with live preview',
  },
  'official.advanced-tools.ast-visualizer': {
    title: 'AST Visualizer',
    description: 'Tokenize code snippets into a lightweight syntax tree',
  },
  'official.advanced-tools.batch-rename': {
    title: 'Batch File Rename',
    description: 'Preview and rename files using regex, counters, and dates',
  },
  'official.advanced-tools.file-content-search': {
    title: 'File Content Search',
    description: 'Recursively search text files in a folder with line numbers',
  },

  // Workflow tools
  'official.workflow-tools.json-string': {
    title: 'JSON String Escape',
    description: 'Escape or unescape JSON string literals',
  },
  'official.workflow-tools.text-cleaner': {
    title: 'Whitespace & Line Cleaner',
    description: 'Trim trailing spaces, blank lines, and extra whitespace',
  },
  'official.workflow-tools.text-deduplicate': {
    title: 'Text Deduplicate & Sort',
    description: 'Deduplicate, sort lines, and summarize counts',
  },
  'official.workflow-tools.regex-replace': {
    title: 'Regex Replace',
    description: 'Batch find and replace text using regular expressions',
  },
  'official.workflow-tools.csv-to-json': {
    title: 'CSV to JSON',
    description: 'Convert CSV spreadsheets into JSON arrays',
  },
  'official.workflow-tools.json-to-csv': {
    title: 'JSON to CSV',
    description: 'Convert JSON object arrays into CSV text',
  },
  'official.workflow-tools.json-to-rust': {
    title: 'JSON to Rust Struct',
    description: 'Generate serde Rust structs from sample JSON',
  },
  'official.workflow-tools.java-bean-json': {
    title: 'Java Bean ↔ JSON',
    description: 'Convert between Java DTO classes and JSON templates',
  },
  'official.workflow-tools.sql-mock': {
    title: 'SQL Mock Generator',
    description: 'Generate bulk INSERT INTO test rows by column rules',
  },
  'official.workflow-tools.json-path': {
    title: 'JSONPath Tester',
    description: 'Query JSON documents with JSONPath expressions',
  },
  'official.workflow-tools.aes-gcm': {
    title: 'AES-GCM Encrypt & Decrypt',
    description: 'Encrypt or decrypt text locally with Web Crypto',
  },
  'official.workflow-tools.curl-fetch': {
    title: 'cURL ↔ fetch Converter',
    description: 'Convert between cURL commands and fetch() calls',
  },
  'official.workflow-tools.env-parser': {
    title: '.env Parser',
    description: 'Parse .env files into JSON, key-value lists, and stats',
  },
  'official.workflow-tools.gitignore-generator': {
    title: 'Gitignore Generator',
    description: 'Generate .gitignore presets by project stack',
  },
  'official.workflow-tools.semver-helper': {
    title: 'SemVer Helper',
    description: 'Parse semantic versions and bump major, minor, or patch',
  },
}

const VIEW_EN: Record<string, string> = Object.fromEntries(
  Object.entries(COMMAND_EN).map(([commandId, meta]) => [
    commandId.endsWith('.open')
      ? commandId.replace(/\.open$/, '.view')
      : `${commandId}.view`,
    meta.title,
  ]),
)

export function localizePlugin(plugin: ToolPlugin, locale: ResolvedLocale) {
  if (locale === 'en-US') {
    const entry = PLUGIN_EN[plugin.id]
    if (entry) return entry
  }
  return { name: plugin.name, description: plugin.description ?? '' }
}

export function localizeCommand(command: Command, locale: ResolvedLocale) {
  if (locale === 'en-US') {
    const entry = COMMAND_EN[command.id]
    if (entry) return entry
  }
  return { title: command.title, description: command.description ?? '' }
}

export function localizeViewTitle(viewId: string, fallback: string, locale: ResolvedLocale) {
  if (locale === 'en-US') {
    return VIEW_EN[viewId] ?? fallback
  }
  return fallback
}

export function getCommandEnglishTerms(command: Command): string[] {
  const entry = COMMAND_EN[command.id]
  return entry ? [entry.title, entry.description] : []
}
