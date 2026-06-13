/**
 * @sprint T-W1C9fix-Theme-HTML-Class
 * Guard: index.html must NOT hardcode class="dark" on the <html> tag.
 * The hardcoded class defeats ThemeProvider.toggleTheme() — saved pref + system
 * prefers-color-scheme already drive the initial theme via getInitialTheme().
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('T-W1C9fix · theme HTML no forced dark class', () => {
  const html = readFileSync('index.html', 'utf8');
  const provider = readFileSync('src/components/theme/ThemeProvider.tsx', 'utf8');

  it('index.html <html> tag has no hardcoded class="dark"', () => {
    const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? '';
    expect(htmlTag).not.toMatch(/class\s*=\s*"[^"]*\bdark\b[^"]*"/);
    expect(htmlTag).not.toMatch(/class\s*=\s*'[^']*\bdark\b[^']*'/);
  });

  it('ThemeProvider still manages the dark class both ways (toggle round-trip intact)', () => {
    expect(provider).toContain('classList.add("dark")');
    expect(provider).toContain('classList.remove("dark")');
  });
});
