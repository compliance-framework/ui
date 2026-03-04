import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  getThemeToken,
  parseUiV2TokenThemes,
  resolveUiV2ThemeTokens,
  type UiV2Theme,
} from '@/utils/uiV2Tokens';

const cssFilePath = resolve(process.cwd(), 'src/assets/main.css');
const cssText = readFileSync(cssFilePath, 'utf8');
const tokenThemes = parseUiV2TokenThemes(cssText);
const resolvedTokenThemes = resolveUiV2ThemeTokens(tokenThemes);

const baselineTokens = [
  '--ui-v2-type-title',
  '--ui-v2-type-section',
  '--ui-v2-type-card-title',
  '--ui-v2-type-metric',
  '--ui-v2-type-logo',
  '--ui-v2-type-body',
  '--ui-v2-type-nav',
  '--ui-v2-type-label',
  '--ui-v2-type-meta',
  '--ui-v2-radius-none',
  '--ui-v2-border-width',
  '--ui-v2-background',
  '--ui-v2-surface',
  '--ui-v2-card',
  '--ui-v2-border',
  '--ui-v2-foreground',
  '--ui-v2-muted-foreground',
  '--ui-v2-secondary-foreground',
  '--ui-v2-tertiary-foreground',
  '--ui-v2-primary',
  '--ui-v2-primary-foreground',
  '--ui-v2-success',
  '--ui-v2-warning',
  '--ui-v2-error',
  '--ui-v2-info',
];

function pickBaseline(theme: UiV2Theme): Record<string, string> {
  const source = resolvedTokenThemes[theme];
  return baselineTokens.reduce<Record<string, string>>((accumulator, token) => {
    const value = source[token];
    if (!value) {
      throw new Error(`Expected token ${token} to exist for ${theme} theme`);
    }
    accumulator[token] = value;
    return accumulator;
  }, {});
}

describe('ui-v2 token regression', () => {
  it('keeps V2 token baselines stable for light and dark themes', () => {
    expect({
      light: pickBaseline('light'),
      dark: pickBaseline('dark'),
    }).toMatchInlineSnapshot(`
      {
        "dark": {
          "--ui-v2-background": "#1e1e2e",
          "--ui-v2-border": "#313244",
          "--ui-v2-border-width": "1px",
          "--ui-v2-card": "#11111b",
          "--ui-v2-error": "#f38ba8",
          "--ui-v2-foreground": "#cdd6f4",
          "--ui-v2-info": "#89b4fa",
          "--ui-v2-muted-foreground": "#bac2de",
          "--ui-v2-primary": "#f9e2af",
          "--ui-v2-primary-foreground": "#11111b",
          "--ui-v2-radius-none": "0px",
          "--ui-v2-secondary-foreground": "#6c7086",
          "--ui-v2-success": "#a6e3a1",
          "--ui-v2-surface": "#181825",
          "--ui-v2-tertiary-foreground": "#585b70",
          "--ui-v2-type-body": "0.875rem",
          "--ui-v2-type-card-title": "0.875rem",
          "--ui-v2-type-label": "0.75rem",
          "--ui-v2-type-logo": "0.875rem",
          "--ui-v2-type-meta": "0.6875rem",
          "--ui-v2-type-metric": "2rem",
          "--ui-v2-type-nav": "0.75rem",
          "--ui-v2-type-section": "1.125rem",
          "--ui-v2-type-title": "2.5rem",
          "--ui-v2-warning": "#f9e2af",
        },
        "light": {
          "--ui-v2-background": "#eff1f5",
          "--ui-v2-border": "#ccd0da",
          "--ui-v2-border-width": "1px",
          "--ui-v2-card": "#dce0e8",
          "--ui-v2-error": "#d20f39",
          "--ui-v2-foreground": "#4c4f69",
          "--ui-v2-info": "#1e66f5",
          "--ui-v2-muted-foreground": "#5c5f77",
          "--ui-v2-primary": "#df8e1d",
          "--ui-v2-primary-foreground": "#4c4f69",
          "--ui-v2-radius-none": "0px",
          "--ui-v2-secondary-foreground": "#6c6f85",
          "--ui-v2-success": "#40a02b",
          "--ui-v2-surface": "#e6e9ef",
          "--ui-v2-tertiary-foreground": "#8c8fa1",
          "--ui-v2-type-body": "0.875rem",
          "--ui-v2-type-card-title": "0.875rem",
          "--ui-v2-type-label": "0.75rem",
          "--ui-v2-type-logo": "0.875rem",
          "--ui-v2-type-meta": "0.6875rem",
          "--ui-v2-type-metric": "2rem",
          "--ui-v2-type-nav": "0.75rem",
          "--ui-v2-type-section": "1.125rem",
          "--ui-v2-type-title": "2.5rem",
          "--ui-v2-warning": "#df8e1d",
        },
      }
    `);
  });

  it('meets contrast expectations for key V2 token pairs', () => {
    const checks: Array<{
      theme: UiV2Theme;
      foreground: string;
      background: string;
      minRatio: number;
      context: string;
    }> = [
      {
        theme: 'light',
        foreground: '--ui-v2-foreground',
        background: '--ui-v2-background',
        minRatio: 4.5,
        context: 'primary body text on page background',
      },
      {
        theme: 'light',
        foreground: '--ui-v2-foreground',
        background: '--ui-v2-card',
        minRatio: 4.5,
        context: 'primary body text on card background',
      },
      {
        theme: 'light',
        foreground: '--ui-v2-muted-foreground',
        background: '--ui-v2-background',
        minRatio: 4.5,
        context: 'supporting body text on page background',
      },
      {
        theme: 'light',
        foreground: '--ui-v2-muted-foreground',
        background: '--ui-v2-card',
        minRatio: 4.5,
        context: 'supporting body text on card background',
      },
      {
        theme: 'light',
        foreground: '--ui-v2-secondary-foreground',
        background: '--ui-v2-background',
        minRatio: 3,
        context: 'label and nav text on page background',
      },
      {
        theme: 'light',
        foreground: '--ui-v2-secondary-foreground',
        background: '--ui-v2-card',
        minRatio: 2.9,
        context: 'label and nav text on card background',
      },
      {
        theme: 'light',
        foreground: '--ui-v2-tertiary-foreground',
        background: '--ui-v2-background',
        minRatio: 2.2,
        context: 'de-emphasized metadata on page background',
      },
      {
        theme: 'light',
        foreground: '--ui-v2-primary-foreground',
        background: '--ui-v2-primary',
        minRatio: 3,
        context: 'primary action text on primary button background',
      },
      {
        theme: 'dark',
        foreground: '--ui-v2-foreground',
        background: '--ui-v2-background',
        minRatio: 4.5,
        context: 'primary body text on page background',
      },
      {
        theme: 'dark',
        foreground: '--ui-v2-foreground',
        background: '--ui-v2-card',
        minRatio: 4.5,
        context: 'primary body text on card background',
      },
      {
        theme: 'dark',
        foreground: '--ui-v2-muted-foreground',
        background: '--ui-v2-background',
        minRatio: 4.5,
        context: 'supporting body text on page background',
      },
      {
        theme: 'dark',
        foreground: '--ui-v2-secondary-foreground',
        background: '--ui-v2-background',
        minRatio: 3,
        context: 'label and nav text on page background',
      },
      {
        theme: 'dark',
        foreground: '--ui-v2-tertiary-foreground',
        background: '--ui-v2-background',
        minRatio: 2.3,
        context: 'de-emphasized metadata on page background',
      },
      {
        theme: 'dark',
        foreground: '--ui-v2-primary-foreground',
        background: '--ui-v2-primary',
        minRatio: 4.5,
        context: 'primary action text on primary button background',
      },
    ];

    checks.forEach((check) => {
      const foreground = getThemeToken(
        tokenThemes,
        check.theme,
        check.foreground,
      );
      const background = getThemeToken(
        tokenThemes,
        check.theme,
        check.background,
      );
      const ratio = contrastRatio(foreground, background);

      expect(
        ratio,
        `${check.theme} ${check.foreground} on ${check.background} (${check.context})`,
      ).toBeGreaterThanOrEqual(check.minRatio);
    });
  });
});
