/**
 * Tool: standards_update
 * Updates an existing standard's content and/or metadata
 */

import { UpdateStandardInput } from '../schemas/metadata.js';
import { ToolResponse } from '../types.js';
import { updateStandard } from '../services/storage.js';
import { refreshIndex } from '../services/indexer.js';
import { bumpVersion, validateMetadataUpdate } from '../services/validator.js';
import { readStandard } from '../services/storage.js';

/**
 * Updates an existing standard
 */
export async function updateStandardTool(params: UpdateStandardInput, _extra?: unknown): Promise<ToolResponse> {
  try {
    const { path, content, metadata, versionBump } = params;

    // Read existing standard to get current metadata
    const existing = await readStandard(path);

    // Prepare metadata updates
    let updatedMetadata = metadata ? { ...metadata } : {};

    // Validate metadata update if provided
    if (metadata) {
      validateMetadataUpdate(existing.metadata, metadata);
    }

    // Handle version bumping
    if (metadata?.version) {
      // User explicitly provided a version, use it
      updatedMetadata.version = metadata.version;
    } else {
      // Auto-bump the version
      updatedMetadata.version = bumpVersion(existing.metadata.version, versionBump);
    }

    // Update the standard
    const updated = await updateStandard(path, {
      content,
      metadata: updatedMetadata,
    });

    // Refresh the index
    await refreshIndex();

    const outputText = `Successfully updated standard: ${updated.path}

Updated Metadata:
- Version: ${existing.metadata.version} → ${updated.metadata.version}
- Updated: ${updated.metadata.updated}
${content !== undefined ? '- Content: Updated' : ''}
${metadata ? `- Metadata fields updated: ${Object.keys(metadata).join(', ')}` : ''}`;

    return {
      content: [
        {
          type: 'text',
          text: outputText,
        },
      ],
      structuredContent: {
        success: true,
        path: updated.path,
        previousVersion: existing.metadata.version,
        newVersion: updated.metadata.version,
        metadata: updated.metadata,
      },
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error updating standard: ${(error as Error).message}`,
        },
      ],
      isError: true,
    };
  }
}
