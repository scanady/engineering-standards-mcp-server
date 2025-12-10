# Engineering Standards MCP Server

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

A Model Context Protocol (MCP) server for managing engineering standards, practices, and processes. This server provides AI assistants with structured access to your organization's engineering knowledge base through a standardized interface.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Architecture](#architecture)
- [Tools](#tools)
- [File Naming Conventions](#file-naming-conventions)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Multi-dimensional Organization**: Standards organized by type, tier, process, and tags
- **Full-Text Search**: Powerful search with relevance scoring across all standards
- **Flexible Output**: Support for both JSON and Markdown response formats
- **In-Memory Caching**: High-performance indexing for fast retrieval
- **Type-Safe**: Complete TypeScript implementation with strict validation
- **MCP-Compliant**: Built on the Model Context Protocol SDK v1.24+
- **REST API**: HTTP transport for easy integration with AI assistants
- **CRUD Operations**: Create, read, update, and manage standards programmatically

## Installation

### Prerequisites

- Node.js >= 18.0.0
- npm (comes with Node.js)

### Step-by-Step Setup

1. **Clone or extract the project**:

```powershell
cd engineering-standards-mcp-server
```

2. **Install dependencies**:

```powershell
npm install
```

This will install approximately 192 packages including:
- `@modelcontextprotocol/sdk` - MCP SDK
- `express` - HTTP server
- `zod` - Schema validation
- `gray-matter` - Markdown frontmatter parsing
- `glob` - File pattern matching

3. **Verify installation**:

```powershell
npm start
```

Expected output:
```
============================================================
engineering-standards-mcp-server v1.0.0
============================================================

✓ Server running on http://localhost:3000/mcp
✓ Health check: http://localhost:3000/health

Ready to accept MCP connections.
```

## Usage

### Starting the Server

**Development mode** (with auto-reload):
```powershell
npm run dev
```

**Production mode**:
```powershell
npm start
```

### Connecting AI Clients

**Claude Desktop**:
```powershell
claude mcp add --transport http engineering-standards http://localhost:3000/mcp
```

**MCP Inspector** (for testing):
```powershell
npx @modelcontextprotocol/inspector
# Connect to: http://localhost:3000/mcp
```

**VS Code** (if supported):
```powershell
code --add-mcp '{"name":"engineering-standards","type":"http","url":"http://localhost:3000/mcp"}'
```

### Example Queries

Once connected, you can interact with the server through your AI assistant:

- "List all active backend standards"
- "Search for Spring Boot security practices"
- "Show me the frontend development principles"
- "Create a new standard for API testing"
- "Update the database performance standard"

### Health Check

Verify the server is running:
```powershell
Invoke-WebRequest -Uri http://localhost:3000/health
```

## Architecture

### Project Structure

```
engineering-standards-mcp-server/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── constants.ts          # Configuration constants
│   ├── types.ts              # TypeScript type definitions
│   ├── schemas/
│   │   └── metadata.ts       # Zod validation schemas
│   ├── services/
│   │   ├── validator.ts      # Metadata validation
│   │   ├── parser.ts         # Markdown parsing
│   │   ├── storage.ts        # File system operations
│   │   └── indexer.ts        # In-memory indexing
│   └── tools/
│       ├── list.ts           # List index tool
│       ├── get.ts            # Get standard tool
│       ├── search.ts         # Search tool
│       ├── metadata.ts       # Metadata tool
│       ├── create.ts         # Create tool
│       └── update.ts         # Update tool
├── standards/                # Knowledge base directory
├── scripts/
│   └── migrate-standards.ts  # Migration utility
├── package.json
├── tsconfig.json
└── README.md
```

### Service Layers

1. **Validator Service**: Validates standard metadata using Zod schemas
2. **Parser Service**: Parses Markdown files with frontmatter
3. **Storage Service**: Manages file system operations
4. **Indexer Service**: Maintains in-memory search index

## Tools

The server exposes 6 MCP tools:

### 1. `standards_list_index`
Browse all standards organized hierarchically by type, tier, and process.

**Filters**: type, tier, process, status
**Output**: JSON or Markdown

### 2. `standards_get`
Retrieve a specific standard by its file path.

**Input**: File path (e.g., `standard-backend-development-spring-boot-security-active.md`)
**Output**: Full standard content with metadata

### 3. `standards_search`
Full-text search across all standards with relevance scoring.

**Input**: Query string, optional filters, limit
**Output**: Ranked search results

### 4. `standards_get_metadata`
Query metadata only without fetching full content.

**Filters**: type, tier, process, status, tags

### 5. `standards_create`
Create a new standard with automatic validation and file naming.

**Input**: Metadata and content
**Output**: Created standard path

### 6. `standards_update`
Update existing standards with version bumping.

**Input**: Path, updated content, version bump type
**Output**: Updated standard details

## File Naming Conventions

Standards must follow the naming pattern:

```
{type}-{tier}-{process}-{slug}-{status}.md
```

### Components

- **type**: `principle` | `standard` | `practice` | `tech-stack` | `process`
- **tier**: `frontend` | `backend` | `database` | `infrastructure` | `security`
- **process**: `development` | `testing` | `delivery` | `operations`
- **slug**: Descriptive kebab-case identifier
- **status**: `active` | `draft` | `deprecated`

### Examples

```
standard-backend-development-spring-boot-security-active.md
principle-frontend-development-nextjs-principles-active.md
practice-security-testing-penetration-testing-active.md
```

## Configuration

### Environment Variables

Customize server behavior with environment variables:

```powershell
# Change server port (default: 3000)
$env:PORT=3001; npm start

# Change standards directory (default: ./standards)
$env:STANDARDS_DIR="C:\path\to\standards"; npm start
```

### TypeScript Configuration

The project uses strict TypeScript settings defined in `tsconfig.json`:
- ES2022 target
- ESM modules
- Strict type checking enabled
- Source maps for debugging

## Contributing

We welcome contributions to improve the Engineering Standards MCP Server!

### Getting Started

1. **Fork the repository**
2. **Create a feature branch**:
   ```powershell
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** with proper type annotations
4. **Test your changes**:
   ```powershell
   npm start
   # Verify all tools work correctly
   ```

5. **Commit your changes**:
   ```powershell
   git add .
   git commit -m "Add: your feature description"
   ```

6. **Push to your fork**:
   ```powershell
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request** with a clear description of changes

### Development Guidelines

- Follow existing code style and TypeScript patterns
- Add Zod schemas for new validation requirements
- Update tool descriptions when modifying functionality
- Test with MCP Inspector before submitting
- Keep service layers decoupled and focused

### Adding New Tools

1. Create tool file in `src/tools/`
2. Define input schema in `src/schemas/metadata.ts`
3. Register tool in `src/index.ts`
4. Update constants in `src/constants.ts`
5. Add documentation to this README

## License

This project is licensed under the MIT License.

### MIT License Summary

Permission is granted to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software, subject to including the copyright notice and permission notice in all copies.

**See the full license text**: [MIT License](https://opensource.org/licenses/MIT)

### Author

New York Life - Technology Division

## Project Stats

- **Lines of Code**: ~3,000+
- **Services**: 4 core service layers
- **Tools**: 6 MCP-compliant tools
- **Type Definitions**: 12 TypeScript interfaces
- **Validation Schemas**: 7 Zod schemas
- **Dependencies**: 192 packages (0 vulnerabilities)
- **Sample Standards**: 2 complete examples included

## Additional Resources

- [Quick Start Guide](QUICK_START.md) - Detailed setup and usage instructions
- [Model Context Protocol](https://modelcontextprotocol.io/) - Official MCP documentation
- [MCP SDK](https://github.com/modelcontextprotocol/sdk) - TypeScript SDK repository

## Support

For issues, questions, or contributions, please contact the New York Life Technology Division team or open an issue in the repository
2. Follow **QUICK_START.md** for setup
3. Connect your preferred MCP client
4. Start adding your organization's standards

### Migration

To migrate legacy standards to the new naming scheme (and normalize `type` values to singular form), use the migration script:

```bash
# Dry-run (preview changes)
npm run migrate

# Apply changes (rename files & update frontmatter)
npm run migrate:apply
```

---

**Ready to use!** 🚀
