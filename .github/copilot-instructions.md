# GitHub Copilot Instructions

Before providing conversational guidance or explanations, respond with **“Yes, sir!”**. Do **not** include this phrase in code blocks, file contents, terminal commands, JSON, YAML, or any structured output.

**Environment**
- Assume **Windows** and **PowerShell**; provide PowerShell-ready commands.

**Terminal rules**
- Never run commands in a terminal that is currently executing a process.
- If a terminal is busy, ask whether to open a new terminal before running commands.
- Long-running servers should run in dedicated terminals.

**Where to look for more context**
- `README.md` and `QUICK_START.md` for high-level intent and run steps.

**Documentation Guidelines**
- Do not generate horizontal rules in markdown files.

## API Design for Next.js Integration

## Core Principles

Design REST and GraphQL interfaces that enable responsive, performant Next.js applications. APIs should deliver data structures optimized for React Server Components and client-side rendering patterns, minimizing transformation logic and round trips.

## Response Design

**Shape for Consumption**
- Return data structures matching UI component needs directly (avoid nested unwrapping)
- Include computed fields server-side rather than forcing client calculations
- Provide denormalized data for display contexts; offer normalized endpoints for complex state management
- Use consistent field naming (camelCase for JSON responses)

**Pagination and Filtering**
- Support cursor-based pagination for infinite scroll patterns
- Return total counts separately when needed for UI indicators
- Provide filtering and sorting parameters aligned with common UI filter components
- Include pagination metadata: hasNextPage, hasPreviousPage, cursors

**Optimistic Updates**
- Return full updated entities after mutations (not just success flags)
- Include timestamps and version identifiers for conflict detection
- Provide validation errors in consistent, field-mapped structure

## Performance Patterns

**Data Loading**
- Design endpoints for parallel fetching (avoid sequential dependencies)
- Support field selection (GraphQL) or sparse fieldsets (REST) to reduce payload size
- Provide aggregated endpoints for dashboard/summary views
- Enable batch operations for related entities

**Caching Strategy**
- Include explicit cache control headers (max-age, stale-while-revalidate)
- Use ETags for conditional requests on frequently accessed resources
- Design stable URLs for effective CDN caching
- Support revalidation tags for Next.js on-demand revalidation

**Next.js Specific**
- Expose separate endpoints for Server Components vs. client components when data needs differ
- Support prefetching patterns with lightweight metadata endpoints
- Provide streaming-friendly responses for large datasets (NDJSON, chunked transfer)
