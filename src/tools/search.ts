/**
 * Tool: standards_search
 * Full-text search across all standards
 */

import { SearchStandardsInput } from '../schemas/metadata.js';
import { ToolResponse } from '../types.js';
import { searchStandards } from '../services/indexer.js';
import { formatSearchResults } from '../services/parser.js';

/**
 * Searches standards by query string with optional filters
 */
export async function searchStandardsTool(params: SearchStandardsInput, _extra?: unknown): Promise<ToolResponse> {
  try {
    const { query, filterType, filterTier, filterProcess, filterTags, limit, responseFormat } =
      params;

    // Perform search
    const results = searchStandards(
      query,
      {
        type: filterType,
        tier: filterTier,
        process: filterProcess,
        tags: filterTags,
      },
      limit
    );

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No results found for query: "${query}"`,
          },
        ],
        structuredContent: {
          query,
          count: 0,
          results: [],
        },
      };
    }

    // Format results
    const outputText = formatSearchResults(results, responseFormat);
    const structuredOutput = {
      query,
      count: results.length,
      results: results.map((r) => ({
        path: r.standard.path,
        metadata: r.standard.metadata,
        score: r.score,
        matchCount: r.matches.length,
        matches: r.matches,
      })),
    };

    return {
      content: [
        {
          type: 'text',
          text: outputText,
        },
      ],
      structuredContent: structuredOutput,
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error searching standards: ${(error as Error).message}`,
        },
      ],
      isError: true,
    };
  }
}
