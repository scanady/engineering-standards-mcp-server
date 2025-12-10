/**
 * Tool: standards_list_index
 * Returns a hierarchical index of all standards grouped by type, tier, and process
 */

import { ListIndexInput } from '../schemas/metadata.js';
import { ToolResponse } from '../types.js';
import { buildHierarchicalIndex, formatHierarchicalIndexAsMarkdown } from '../services/indexer.js';

/**
 * Lists all standards in a hierarchical index structure
 */
export async function listIndex(params: ListIndexInput, _extra?: unknown): Promise<ToolResponse> {
  try {
    const { filterType, filterTier, filterProcess, filterStatus, responseFormat } = params;

    // Build filtered hierarchical index
    const hierarchicalIndex = buildHierarchicalIndex({
      type: filterType,
      tier: filterTier,
      process: filterProcess,
      status: filterStatus,
    });

    // Count total standards
    let totalCount = 0;
    for (const tiers of Object.values(hierarchicalIndex)) {
      for (const processes of Object.values(tiers)) {
        for (const entries of Object.values(processes)) {
          totalCount += entries.length;
        }
      }
    }

    // Format output
    let outputText: string;
    let structuredOutput: unknown;

    if (responseFormat === 'json') {
      structuredOutput = {
        totalCount,
        index: hierarchicalIndex,
      };
      outputText = JSON.stringify(structuredOutput, null, 2);
    } else {
      // Markdown format
      outputText = formatHierarchicalIndexAsMarkdown(hierarchicalIndex);
      outputText += `\n**Total Standards**: ${totalCount}`;
      structuredOutput = {
        totalCount,
        index: hierarchicalIndex,
      };
    }

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
          text: `Error listing standards index: ${(error as Error).message}`,
        },
      ],
      isError: true,
    };
  }
}
