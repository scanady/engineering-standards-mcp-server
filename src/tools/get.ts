/**
 * Tool: standards_get
 * Retrieves a specific standard by path or metadata combination
 */

import { GetStandardInput } from '../schemas/metadata.js';
import { ToolResponse } from '../types.js';
import { findStandardByPath, findStandardsByMetadata } from '../services/indexer.js';
import { formatStandard, formatStandards } from '../services/parser.js';

/**
 * Gets a standard by path or metadata criteria
 */
export async function getStandard(params: GetStandardInput, _extra?: unknown): Promise<ToolResponse> {
  try {
    const { path, type, tier, process, tags, responseFormat } = params;

    // Find by exact path if provided
    if (path) {
      const standard = findStandardByPath(path);

      if (!standard) {
        return {
          content: [
            {
              type: 'text',
              text: `Standard not found at path: ${path}`,
            },
          ],
          isError: true,
        };
      }

      const outputText = formatStandard(standard, responseFormat);

      return {
        content: [
          {
            type: 'text',
            text: outputText,
          },
        ],
        structuredContent: standard,
      };
    }

    // Find by metadata
    const standards = findStandardsByMetadata({
      type,
      tier,
      process,
      tags,
    });

    if (standards.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No standards found matching the specified criteria.',
          },
        ],
        structuredContent: { count: 0, standards: [] },
      };
    }

    // If multiple standards found, return all of them
    const outputText = formatStandards(standards, responseFormat);
    const structuredOutput = {
      count: standards.length,
      standards,
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
          text: `Error retrieving standard: ${(error as Error).message}`,
        },
      ],
      isError: true,
    };
  }
}
