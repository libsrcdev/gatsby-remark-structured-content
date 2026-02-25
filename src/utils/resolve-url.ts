import isRelativeUrl from 'is-relative-url';

/**
 * Resolves a potentially incomplete URL to a full URL with protocol
 * @param url - The URL to resolve (can be protocol-relative or full)
 * @returns The full URL with protocol, or null if invalid or relative
 */
export function resolveFullUrl(url: string): string | undefined {
  // Handle empty or whitespace-only URLs
  const trimmed = url.trim();
  if (!trimmed) {
    return;
  }

  // Check if it's a relative URL - early return null
  if (isRelativeUrl(trimmed)) {
    return;
  }

  // Handle protocol-relative URLs (//domain.com/path)
  let resolvedUrl = trimmed;
  if (trimmed.startsWith('//')) {
    resolvedUrl = `https:${trimmed}`;
  }

  // Try to parse as URL - if it fails, return null
  try {
    new URL(resolvedUrl);
    return resolvedUrl;
  } catch {
    // Invalid URL
    return;
  }
}

/**
 * Resolves a relative URL by validating and returning it if it's relative
 * @param url - The URL to check and resolve
 * @returns The relative URL if valid, or undefined if not relative or invalid
 */
export function resolveRelativeUrl(url: string): string | undefined {
  const trimmed = url.trim();
  if (!trimmed) {
    return undefined;
  }

  // Only handle relative URLs
  if (!isRelativeUrl(trimmed)) {
    return undefined;
  }

  return trimmed;
}
