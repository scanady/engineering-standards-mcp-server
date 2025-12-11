/**
 * Storage service for file system operations
 */

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import { Standard, StandardMetadata } from '../types.js';
import { STANDARDS_DIR, MARKDOWN_EXTENSION, ERROR_MESSAGES } from '../constants.js';
import { parseStandard, serializeStandard } from './parser.js';
import { generateISODate, generateInitialVersion, validateMetadata } from './validator.js';

/**
 * Normalize incoming file paths so they are relative to the standards directory.
 * Accepts paths like 'spring-boot.md', 'standards/spring-boot.md', or absolute
 * paths. Returns a normalized relative path (e.g., 'spring-boot.md').
 */
function normalizeTargetPath(p: string): string {
  if (!p) return p;
  // If absolute and inside STANDARDS_DIR, make relative; otherwise keep absolute
  if (path.isAbsolute(p)) {
    return path.relative(STANDARDS_DIR, p);
  }

  // Remove any leading 'standards/' prefix that may be provided by callers
  return p.replace(/^[/\\]?standards[/\\]/i, '');
}

/**
 * Ensures the standards directory structure exists
 */
export async function ensureDirectoryStructure(): Promise<void> {
  // Only ensure the main standards directory exists. Standards will be stored in the
  // root of this folder (no nested type/tier/process subdirectories).
  await fs.mkdir(STANDARDS_DIR, { recursive: true });
}

/**
 * Generates a file path from metadata
 */
export function generateFilePath(
  metadata: StandardMetadata,
  filename?: string
): string {
  const sanitizedFilename = filename
    ? sanitizeFilename(filename)
    : generateDefaultFilename(metadata);

  // Build final filename with prefix: <type>-<tier>-<process>-<status>-<sanitizedTitle>.md
  const prefixParts = [metadata.type, metadata.tier, metadata.process]
    .filter(Boolean)
    .map((p) => p.toLowerCase());

  // sanitizedFilename includes .md; strip extension for joining
  let titleBase = sanitizedFilename;
  if (titleBase.endsWith(MARKDOWN_EXTENSION)) {
    titleBase = titleBase.slice(0, -MARKDOWN_EXTENSION.length);
  }

  const prefix = prefixParts.join('-') + '-';
  const suffix = `-${metadata.status.toLowerCase()}`;

  // If the sanitized title already has prefix/suffix included, don't duplicate
  let finalBase = titleBase.toLowerCase();
  if (finalBase.startsWith(prefix)) {
    finalBase = finalBase.slice(prefix.length);
  }
  if (finalBase.endsWith(suffix)) {
    finalBase = finalBase.slice(0, -suffix.length);
  }

  const finalName = `${prefix}${finalBase}${suffix}${MARKDOWN_EXTENSION}`;
  return finalName;
}

/**
 * Sanitizes a filename to be safe for the file system
 */
function sanitizeFilename(filename: string): string {
  // Strip a leading 'standards/' if present and take basename
  let base = filename.replace(/^[/\\]?standards[/\\]/i, '');
  base = path.basename(base);

  // Remove .md if provided so we don't double append
  if (base.toLowerCase().endsWith(MARKDOWN_EXTENSION)) {
    base = base.slice(0, -MARKDOWN_EXTENSION.length);
  }

  // Convert to kebab-case: lowercase and replace non-alphanum with hyphens
  let sanitized = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Ensure it has the markdown extension
  sanitized += MARKDOWN_EXTENSION;

  return sanitized;
}

/**
 * Generates a default filename from metadata
 */
function generateDefaultFilename(metadata: StandardMetadata): string {
  // Prefer the first tag as a concise filename; otherwise use tier or type.
  if (metadata.tags && metadata.tags.length > 0) {
    return sanitizeFilename(metadata.tags[0]);
  }
  if (metadata.tier) {
    return sanitizeFilename(metadata.tier);
  }
  return sanitizeFilename(metadata.type);
}

/**
 * Reads a standard from the file system
 */
export async function readStandard(filePath: string): Promise<Standard> {
  try {
    const normalized = normalizeTargetPath(filePath);
    const fullPath = path.isAbsolute(normalized)
      ? normalized
      : path.join(STANDARDS_DIR, normalized);

    const content = await fs.readFile(fullPath, 'utf-8');
    
    // Get relative path for the standard
    const relativePath = path.relative(STANDARDS_DIR, fullPath);
    
    return parseStandard(content, relativePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`${ERROR_MESSAGES.STANDARD_NOT_FOUND}: ${filePath}`);
    }
    throw new Error(`${ERROR_MESSAGES.FILE_READ_ERROR}: ${error}`);
  }
}

/**
 * Writes a standard to the file system
 */
export async function writeStandard(
  standard: Standard,
  targetPath?: string
): Promise<string> {
  try {
    const filePath = normalizeTargetPath(targetPath || standard.path);
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(STANDARDS_DIR, filePath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Serialize and write
    const content = serializeStandard(standard);
    await fs.writeFile(fullPath, content, 'utf-8');

    return path.relative(STANDARDS_DIR, fullPath);
  } catch (error) {
    throw new Error(`${ERROR_MESSAGES.FILE_WRITE_ERROR}: ${error}`);
  }
}

/**
 * Creates a new standard
 */
export async function createStandard(
  metadata: Omit<StandardMetadata, 'version' | 'created' | 'updated'>,
  content: string,
  filename?: string
): Promise<Standard> {
  // Complete metadata with auto-generated fields
  const completeMetadata: StandardMetadata = {
    ...metadata,
    version: generateInitialVersion(),
    created: generateISODate(),
    updated: generateISODate(),
  };

  // Validate metadata; normalize returns canonical metadata (e.g., singular type)
  const validatedMetadata = validateMetadata(completeMetadata);

  // Generate file path
  const filePath = normalizeTargetPath(generateFilePath(validatedMetadata, filename));

  // Check if file already exists
  const fullPath = path.join(STANDARDS_DIR, filePath);
  try {
    await fs.access(fullPath);
    throw new Error(`Standard already exists at: ${filePath}`);
  } catch (error) {
    // File doesn't exist, which is what we want
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const standard: Standard = {
    metadata: validatedMetadata,
    content,
    path: path.relative(STANDARDS_DIR, fullPath),
  };

  await writeStandard(standard);

  return standard;
}

/**
 * Updates an existing standard
 */
export async function updateStandard(
  filePath: string,
  updates: {
    content?: string;
    metadata?: Partial<StandardMetadata>;
  }
): Promise<Standard> {
  // Read existing standard
  const existing = await readStandard(filePath);

  // Update content if provided
  const newContent = updates.content !== undefined ? updates.content : existing.content;

  // Merge metadata if provided
  const newMetadata = updates.metadata
    ? { ...existing.metadata, ...updates.metadata, updated: generateISODate() }
    : existing.metadata;

  // Validate updated metadata and get normalized form
  const validatedNewMetadata = validateMetadata(newMetadata);

  // Determine if the file name should change based on metadata changes.
  // We support both old (prefix-status-title) and new (prefix-title-status) filename patterns.
  const existingBasename = path.basename(existing.path).replace(/\.[^.]+$/, ''); // remove extension

  function extractTitleBaseFromFilename(basename: string, metadata: StandardMetadata): string {
    const parts = basename.split('-');
    // If we have at least 5 parts, try to match old or new patterns
    if (parts.length >= 5) {
      const possibleStatus = parts[3];
      const lastPart = parts[parts.length - 1];

      // New pattern: type-tier-process-title-status (status at end)
      if (lastPart === metadata.status) {
        return parts.slice(3, parts.length - 1).join('-');
      }

      // Old pattern: type-tier-process-status-title (status at position 3)
      if (possibleStatus === metadata.status) {
        return parts.slice(4).join('-');
      }
    }
    // Fallback: everything after first 3 parts
    if (parts.length > 3) return parts.slice(3).join('-');
    return basename;
  }

  const titleBase = extractTitleBaseFromFilename(existingBasename, existing.metadata);

  const newFilename = generateFilePath(validatedNewMetadata, titleBase);
  const newRelativePath = normalizeTargetPath(newFilename);
  const oldRelativePath = normalizeTargetPath(existing.path);
  const oldFullPath = path.join(STANDARDS_DIR, oldRelativePath);
  const newFullPath = path.join(STANDARDS_DIR, newRelativePath);

  const updated: Standard = {
    metadata: validatedNewMetadata,
    content: newContent,
    path: path.relative(STANDARDS_DIR, newFullPath),
  };

  // If the new full path differs from the old, rename on disk; otherwise rewrite the same file
  if (oldFullPath !== newFullPath) {
    // Ensure target doesn't exist
    try {
      await fs.access(newFullPath);
      throw new Error(`Target file already exists: ${newRelativePath}`);
    } catch (e) {
      // If access threw because file doesn't exist, proceed
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw e;
      }
    }

    // Ensure directory exists (we only have root, but keep logic for future)
    await fs.mkdir(path.dirname(newFullPath), { recursive: true });
    // Rename on disk
    await fs.rename(oldFullPath, newFullPath);

    // Rewrite with updated content to ensure metadata updated
    const contentToWrite = serializeStandard(updated);
    await fs.writeFile(newFullPath, contentToWrite, 'utf-8');
  } else {
    await writeStandard(updated);
  }

  return updated;
}

/**
 * Deletes a standard from the file system
 */
export async function deleteStandard(filePath: string): Promise<void> {
  try {
    const normalized = normalizeTargetPath(filePath);
    const fullPath = path.isAbsolute(normalized)
      ? normalized
      : path.join(STANDARDS_DIR, normalized);

    await fs.unlink(fullPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`${ERROR_MESSAGES.STANDARD_NOT_FOUND}: ${filePath}`);
    }
    throw new Error(`Error deleting standard: ${error}`);
  }
}

/**
 * Lists all markdown files in the standards directory
 */
export async function listAllStandardFiles(): Promise<string[]> {
  // Use glob pattern relative to the standards directory to avoid OS-specific
  // path separator issues. This will only list markdown files at the root level
  // of the standards folder (no nested directories).
  const pattern = `*${MARKDOWN_EXTENSION}`;
  const files = await glob(pattern, { cwd: STANDARDS_DIR, nodir: true });

  // glob returns paths relative to the cwd when 'cwd' is provided. Convert to
  // absolute paths so downstream code expects a full absolute path.
  const absoluteFiles = files.map((file) => path.join(STANDARDS_DIR, file));
  
  // Return relative paths
  return absoluteFiles.map((file) => path.relative(STANDARDS_DIR, file));
}

/**
 * Checks if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const normalized = normalizeTargetPath(filePath);
    const fullPath = path.isAbsolute(normalized)
      ? normalized
      : path.join(STANDARDS_DIR, normalized);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads all standards from the file system
 */
export async function readAllStandards(): Promise<Standard[]> {
  const files = await listAllStandardFiles();
  const standards: Standard[] = [];

  for (const file of files) {
    try {
      const standard = await readStandard(file);
      standards.push(standard);
    } catch (error) {
      console.error(`Error reading standard ${file}:`, error);
      // Continue with other files
    }
  }

  return standards;
}
