/**
 * Engineering Standards MCP Server
 * Main entry point
 */

import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  SERVER_NAME,
  SERVER_VERSION,
  DEFAULT_PORT,
  TOOL_NAMES,
  MAX_SEARCH_LIMIT,
} from './constants.js';
import {
  ListIndexInputSchema,
  GetStandardInputSchema,
  SearchStandardsInputSchema,
  GetMetadataInputSchema,
  CreateStandardInputSchema,
  UpdateStandardInputSchema,
} from './schemas/metadata.js';
import { listIndex } from './tools/list.js';
import { getStandard } from './tools/get.js';
import { searchStandardsTool } from './tools/search.js';
import { getMetadata } from './tools/metadata.js';
import { createStandardTool } from './tools/create.js';
import { updateStandardTool } from './tools/update.js';
import { ensureDirectoryStructure } from './services/storage.js';
import { initializeIndex } from './services/indexer.js';

/**
 * Creates and configures the MCP server
 */
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // Tool 1: list_standards (READ-ONLY)
  server.registerTool<any, ZodRawShapeCompat>(
    TOOL_NAMES.LIST_STANDARDS,
    {
      title: 'List Standards',
      description: `Browse all engineering standards organized by type, tier, and process.

Use this tool to discover what standards are available and explore them by category. Returns a hierarchical index of all standards in the knowledge base.

Parameters:
  - filterType (optional): Filter by standard type ('principle' | 'standard' | 'practice' | 'tech-stack' | 'process')
  - filterTier (optional): Filter by tier ('frontend' | 'backend' | 'database' | 'infrastructure' | 'security')
  - filterProcess (optional): Filter by process ('development' | 'testing' | 'delivery' | 'operations')
  - filterStatus (optional): Filter by status ('active' | 'draft' | 'deprecated')
  - responseFormat (optional): Output format ('json' | 'markdown'), default 'markdown'

Examples:
  - List all standards: {}
  - List backend standards: { filterTier: "backend" }
  - List active principles: { filterType: "principle", filterStatus: "active" }`,
      inputSchema: (ListIndexInputSchema as any).shape as any,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    listIndex as any
  );

  // Tool 2: get_standard (READ-ONLY)
  server.registerTool<any, ZodRawShapeCompat>(
    TOOL_NAMES.GET_STANDARD,
    {
      title: 'Get Standard',
      description: `Retrieve a specific standard by path or metadata.

Use this tool to read the complete content and metadata of one or more standards. Retrieve by exact file path or by specifying type, tier, and process.

Parameters:
  - path (optional): Exact file path relative to the data directory (e.g., 'standard-backend-development-spring-boot-security-active.md')
  - type (optional): Standard type to search for
  - tier (optional): Tier to search for
  - process (optional): Process to search for
  - tags (optional): Array of tags to filter by (must match all)
  - responseFormat (optional): Output format ('json' | 'markdown'), default 'markdown'

Note: Must provide either 'path' OR combination of 'type', 'tier', and 'process'.

Examples:
  - Get by path: { path: "standard-backend-development-spring-boot-security-active.md" }
  - Get by metadata: { type: "standard", tier: "backend", process: "development" }`,
      inputSchema: (GetStandardInputSchema as any).shape as any,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    getStandard as any
  );

  // Tool 3: search_standards (READ-ONLY)
  server.registerTool<any, ZodRawShapeCompat>(
    TOOL_NAMES.SEARCH_STANDARDS,
    {
      title: 'Search Standards',
      description: `Search standards by keyword with optional filters.

Performs full-text search across both content and metadata of all standards. Returns results ranked by relevance with context snippets showing where matches were found.

Parameters:
  - query (required): Search query string (minimum 2 characters)
  - filterType (optional): Filter results by type
  - filterTier (optional): Filter results by tier
  - filterProcess (optional): Filter results by process
  - filterTags (optional): Filter results by tags
  - limit (optional): Max results to return (1-${MAX_SEARCH_LIMIT}), default 10
  - responseFormat (optional): Output format ('json' | 'markdown'), default 'markdown'

Examples:
  - Search all: { query: "authentication" }
  - Search backend: { query: "security", filterTier: "backend" }
  - Limited results: { query: "testing", limit: 5 }`,
      inputSchema: (SearchStandardsInputSchema as any).shape as any,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    searchStandardsTool as any
  );

  // Tool 4: get_standards_metadata (READ-ONLY)
  server.registerTool<any, ZodRawShapeCompat>(
    TOOL_NAMES.GET_STANDARDS_METADATA,
    {
      title: 'Get Standards Metadata',
      description: `Retrieve metadata for standards without loading content.

Use this tool for efficient browsing and discovery when you only need to see what standards exist and their metadata. More efficient than get_standard when full content is not needed.

Parameters:
  - filterType (optional): Filter by type
  - filterTier (optional): Filter by tier
  - filterProcess (optional): Filter by process
  - filterTags (optional): Filter by tags array
  - filterStatus (optional): Filter by status
  - responseFormat (optional): Output format ('json' | 'markdown'), default 'markdown'

Examples:
  - Get all metadata: {}
  - Get backend metadata: { filterTier: "backend" }
  - Get active frontend practices: { filterType: "practice", filterTier: "frontend", filterStatus: "active" }`,
      inputSchema: (GetMetadataInputSchema as any).shape as any,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    getMetadata as any
  );

  // Tool 5: create_standard (DESTRUCTIVE)
  server.registerTool<any, ZodRawShapeCompat>(
    TOOL_NAMES.CREATE_STANDARD,
    {
      title: 'Create Standard',
      description: `Create a new standard with metadata and content.

Adds a new standard to the knowledge base. The system automatically generates version 1.0.0, sets timestamps, and creates the file path from metadata.

Parameters:
  - metadata (required): Object with required fields:
    - type: 'principle' | 'standard' | 'practice' | 'tech-stack' | 'process'
    - tier: 'frontend' | 'backend' | 'database' | 'infrastructure' | 'security'
    - process: 'development' | 'testing' | 'delivery' | 'operations'
    - tags: Array of strings for categorization
    - author: Author or team name
    - status: 'active' | 'draft' | 'deprecated'
  - content (required): Markdown content of the standard
  - filename (optional): Custom filename (auto-generated if not provided)

Example:
  { metadata: { type: "standard", tier: "backend", process: "development", tags: ["api"], author: "Tech Team", status: "active" }, content: "# API Standards\\n..." }`,
      inputSchema: (CreateStandardInputSchema as any).shape as any,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    createStandardTool as any
  );

  // Tool 6: update_standard (DESTRUCTIVE)
  server.registerTool<any, ZodRawShapeCompat>(
    TOOL_NAMES.UPDATE_STANDARD,
    {
      title: 'Update Standard',
      description: `Update an existing standard's content or metadata.

Modify an existing standard. The system automatically bumps the version number and updates timestamps. If metadata fields affecting the filename are changed, the file will be renamed.

Parameters:
  - path (required): Path to the standard to update
  - content (optional): New markdown content
  - metadata (optional): Partial metadata object with fields to update
  - versionBump (optional): Version increment type ('major' | 'minor' | 'patch'), default 'patch'

Note: Must provide either 'content' or 'metadata' (or both).

Examples:
  - Update content: { path: "standard-backend-development-api-active.md", content: "# Updated API Standards\\n..." }
  - Update metadata: { path: "...", metadata: { status: "deprecated" } }
  - Major update: { path: "...", content: "...", versionBump: "major" }`,
      inputSchema: (UpdateStandardInputSchema as any).shape as any,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    updateStandardTool as any
  );

  return server;
}

/**
 * Starts the HTTP server
 */
async function startServer(): Promise<void> {
  // Initialize storage and index
  console.error('Initializing standards directory...');
  await ensureDirectoryStructure();

  console.error('Loading standards index...');
  await initializeIndex();

  console.error('Creating MCP server...');
  const mcpServer = createMcpServer();

  // Set up Express
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', server: SERVER_NAME, version: SERVER_VERSION });
  });

  // MCP endpoint
  app.post('/mcp', async (req, res) => {
    try {
      // Create new transport for each request (stateless)
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      res.on('close', () => {
        transport.close();
      });

      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  // Start listening
  const port = parseInt(process.env.PORT || String(DEFAULT_PORT));
  app.listen(port, () => {
    console.error(`\n${'='.repeat(60)}`);
    console.error(`${SERVER_NAME} v${SERVER_VERSION}`);
    console.error(`${'='.repeat(60)}`);
    console.error(`\n✓ Server running on http://localhost:${port}/mcp`);
    console.error(`✓ Health check: http://localhost:${port}/health`);
    console.error('\nReady to accept MCP connections.\n');
  });
}

// Start the server
startServer().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
