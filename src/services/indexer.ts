/**
 * Indexer service for building and managing the standards index
 */

import {
  Standard,
  StandardMetadata,
  HierarchicalIndex,
  FilterOptions,
  SearchResult,
  SearchMatch,
} from '../types.js';
import { readAllStandards } from './storage.js';
import { SEARCH_CONTEXT_LENGTH } from '../constants.js';
import { extractContext } from './parser.js';

/**
 * Normalize incoming path comparisons so callers can provide paths like
 * 'standards/spring-boot.md' or just 'spring-boot.md'. We compare against the
 * path stored in the index (which is relative to STANDARDS_DIR).
 */
function normalizeIndexPath(p: string | undefined): string | undefined {
  if (!p) return p;
  return p.replace(/^[/\\]?standards[/\\]/i, '');
}

/**
 * Normalize type names for comparisons: accept either plural or singular values
 * and map them to singular for consistent comparison.
 */
function normalizeTypeName(t?: string): string | undefined {
  if (!t) return t;
  const lower = t.toLowerCase();
  switch (lower) {
    case 'standards':
      return 'standard';
    case 'principles':
      return 'principle';
    case 'practices':
      return 'practice';
    case 'technical-stack':
      return 'tech-stack';
    default:
      return lower;
  }
}

/**
 * In-memory index of all standards
 */
class StandardsIndex {
  private standards: Standard[] = [];
  private lastRefresh: Date | null = null;

  /**
   * Refreshes the index by reading all standards from disk
   */
  async refresh(): Promise<void> {
    this.standards = await readAllStandards();
    this.lastRefresh = new Date();
  }

  /**
   * Gets all standards in the index
   */
  getAll(): Standard[] {
    return this.standards;
  }

  /**
   * Gets the time of the last refresh
   */
  getLastRefresh(): Date | null {
    return this.lastRefresh;
  }

  /**
   * Gets the number of standards in the index
   */
  getCount(): number {
    return this.standards.length;
  }

  /**
   * Filters standards based on provided criteria
   */
  filter(options: FilterOptions): Standard[] {
    return this.standards.filter((standard) => {
      if (options.type && normalizeTypeName(standard.metadata.type) !== normalizeTypeName(options.type)) {
        return false;
      }
      if (options.tier && standard.metadata.tier !== options.tier) {
        return false;
      }
      if (options.process && standard.metadata.process !== options.process) {
        return false;
      }
      if (options.status && standard.metadata.status !== options.status) {
        return false;
      }
      if (options.tags && options.tags.length > 0) {
        // Must have all specified tags
        const hasAllTags = options.tags.every((tag) =>
          standard.metadata.tags.includes(tag)
        );
        if (!hasAllTags) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Searches standards by query string
   */
  search(query: string, options: FilterOptions = {}, limit: number = 10): SearchResult[] {
    const queryLower = query.toLowerCase();
    const filtered = this.filter(options);
    const results: SearchResult[] = [];

    for (const standard of filtered) {
      const matches: SearchMatch[] = [];
      let score = 0;

      // Search in content
      const contentLower = standard.content.toLowerCase();
      let index = contentLower.indexOf(queryLower);
      
      while (index !== -1) {
        matches.push({
          context: extractContext(standard.content, index, SEARCH_CONTEXT_LENGTH),
          startIndex: index,
          endIndex: index + query.length,
        });
        score += 1;
        index = contentLower.indexOf(queryLower, index + 1);
      }

      // Search in metadata
      const metadataText = [
        standard.metadata.type,
        standard.metadata.tier,
        standard.metadata.process,
        ...standard.metadata.tags,
        standard.metadata.author,
      ]
        .join(' ')
        .toLowerCase();

      if (metadataText.includes(queryLower)) {
        score += 2; // Weight metadata matches higher
      }

      // Search in path
      if (standard.path.toLowerCase().includes(queryLower)) {
        score += 1;
      }

      if (matches.length > 0 || score > 0) {
        results.push({
          standard,
          matches: matches.slice(0, 3), // Limit to 3 match contexts per result
          score,
        });
      }
    }

    // Sort by score (descending) and limit results
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Finds a standard by exact path
   */
  findByPath(path: string): Standard | undefined {
    const normalized = normalizeIndexPath(path);
    if (!normalized) return undefined;

    // Direct exact match
    let match = this.standards.find((s) => s.path === normalized);
    if (match) return match;

    // Compare by filename without directories and extensions
    const normalizedBase = normalized.replace(/^.*[/\\]/, '').replace(/\.md$/i, '').toLowerCase();

    match = this.standards.find((s) => {
      const sBase = s.path.replace(/^.*[/\\]/, '').replace(/\.md$/i, '').toLowerCase();
      // Exact filename match
      if (sBase === normalizedBase) return true;
      // Backwards-compatibility: user passed short name; check if the sBase contains the normalized base as a segment
      if (sBase.includes(normalizedBase)) return true;
      return false;
    });

    return match;
  }

  /**
   * Finds standards by metadata criteria
   */
  findByMetadata(options: FilterOptions): Standard[] {
    return this.filter(options);
  }

  /**
   * Builds a hierarchical index structure
   */
  buildHierarchicalIndex(options: FilterOptions = {}): HierarchicalIndex {
    const filtered = this.filter(options);
    const index: HierarchicalIndex = {};

    for (const standard of filtered) {
      const { type, tier, process } = standard.metadata;

      if (!index[type]) {
        index[type] = {};
      }
      if (!index[type][tier]) {
        index[type][tier] = {};
      }
      if (!index[type][tier][process]) {
        index[type][tier][process] = [];
      }

      index[type][tier][process].push({
        path: standard.path,
        metadata: standard.metadata,
      });
    }

    return index;
  }

  /**
   * Gets metadata for all standards (without content)
   */
  getMetadataList(options: FilterOptions = {}): Array<{
    path: string;
    metadata: StandardMetadata;
  }> {
    const filtered = this.filter(options);
    return filtered.map((s) => ({
      path: s.path,
      metadata: s.metadata,
    }));
  }
}

/**
 * Singleton instance of the standards index
 */
const index = new StandardsIndex();

/**
 * Initializes the index by loading all standards
 */
export async function initializeIndex(): Promise<void> {
  await index.refresh();
}

/**
 * Refreshes the index
 */
export async function refreshIndex(): Promise<void> {
  await index.refresh();
}

/**
 * Gets all standards from the index
 */
export function getAllStandards(): Standard[] {
  return index.getAll();
}

/**
 * Gets index statistics
 */
export function getIndexStats(): {
  count: number;
  lastRefresh: Date | null;
} {
  return {
    count: index.getCount(),
    lastRefresh: index.getLastRefresh(),
  };
}

/**
 * Filters standards based on criteria
 */
export function filterStandards(options: FilterOptions): Standard[] {
  return index.filter(options);
}

/**
 * Searches standards by query
 */
export function searchStandards(
  query: string,
  options: FilterOptions = {},
  limit: number = 10
): SearchResult[] {
  return index.search(query, options, limit);
}

/**
 * Finds a standard by path
 */
export function findStandardByPath(path: string): Standard | undefined {
  return index.findByPath(path);
}

/**
 * Finds standards by metadata
 */
export function findStandardsByMetadata(options: FilterOptions): Standard[] {
  return index.findByMetadata(options);
}

/**
 * Builds hierarchical index
 */
export function buildHierarchicalIndex(options: FilterOptions = {}): HierarchicalIndex {
  return index.buildHierarchicalIndex(options);
}

/**
 * Gets metadata list
 */
export function getMetadataList(
  options: FilterOptions = {}
): Array<{ path: string; metadata: StandardMetadata }> {
  return index.getMetadataList(options);
}

/**
 * Formats hierarchical index as markdown
 */
export function formatHierarchicalIndexAsMarkdown(hierarchicalIndex: HierarchicalIndex): string {
  let output = '# Standards Index\n\n';

  for (const [type, tiers] of Object.entries(hierarchicalIndex)) {
    output += `## ${type.charAt(0).toUpperCase() + type.slice(1)}\n\n`;

    for (const [tier, processes] of Object.entries(tiers)) {
      output += `### ${tier.charAt(0).toUpperCase() + tier.slice(1)}\n\n`;

      for (const [process, entries] of Object.entries(processes)) {
        output += `#### ${process.charAt(0).toUpperCase() + process.slice(1)}\n\n`;

        for (const entry of entries) {
          output += `- **${entry.path}**\n`;
          output += `  - Tags: ${entry.metadata.tags.join(', ')}\n`;
          output += `  - Version: ${entry.metadata.version}\n`;
          output += `  - Status: ${entry.metadata.status}\n`;
          output += `  - Updated: ${entry.metadata.updated}\n`;
        }
        output += '\n';
      }
    }
  }

  return output;
}
