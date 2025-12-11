/**
 * Tool: standards_create
 * Creates a new standard with metadata
 */

import { CreateStandardInput } from '../schemas/metadata.js';
import { ToolResponse } from '../types.js';
import { createStandard } from '../services/storage.js';
import { refreshIndex } from '../services/indexer.js';

/**
 * Creates a new standard
 */
export async function createStandardTool(params: CreateStandardInput, _extra?: unknown): Promise<ToolResponse> {
  try {
    const { metadata, content, filename } = params;

    // Create the standard
    const standard = await createStandard(metadata, content, filename);

    // Refresh the index to include the new standard
    await refreshIndex();

    const outputText = `Successfully created standard at: ${standard.path}

Metadata:
- Type: ${standard.metadata.type}
- Tier: ${standard.metadata.tier}
- Process: ${standard.metadata.process}
- Tags: ${standard.metadata.tags.join(', ')}
- Version: ${standard.metadata.version}
- Status: ${standard.metadata.status}
- Author: ${standard.metadata.author}
- Created: ${standard.metadata.created}`;

    return {
      content: [
        {
          type: 'text',
          text: outputText,
        },
      ],
      structuredContent: {
        success: true,
        path: standard.path,
        metadata: standard.metadata,
      },
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error creating standard: ${(error as Error).message}`,
        },
      ],
      isError: true,
    };
  }
}
