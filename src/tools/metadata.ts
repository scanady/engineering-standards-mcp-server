/**
 * Tool: standards_get_metadata
 * Gets metadata for standards without loading full content
 */

import { GetMetadataInput } from '../schemas/metadata.js';
import { ToolResponse } from '../types.js';
import { getMetadataList } from '../services/indexer.js';
import { formatMetadataList } from '../services/parser.js';

/**
 * Gets metadata for standards matching filter criteria
 */
export async function getMetadata(params: GetMetadataInput, _extra?: unknown): Promise<ToolResponse> {
  try {
    const { filterType, filterTier, filterProcess, filterTags, filterStatus, responseFormat } =
      params;

    // Get filtered metadata list
    const metadataList = getMetadataList({
      type: filterType,
      tier: filterTier,
      process: filterProcess,
      tags: filterTags,
      status: filterStatus,
    });

    if (metadataList.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No standards found matching the specified criteria.',
          },
        ],
        structuredContent: {
          count: 0,
          standards: [],
        },
      };
    }

    // Format output
    const outputText = formatMetadataList(metadataList, responseFormat);
    const structuredOutput = {
      count: metadataList.length,
      standards: metadataList,
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
          text: `Error retrieving metadata: ${(error as Error).message}`,
        },
      ],
      isError: true,
    };
  }
}
