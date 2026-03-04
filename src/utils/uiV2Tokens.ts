export type UiV2Theme = 'light' | 'dark';

export type UiV2TokenMap = Record<string, string>;

export interface UiV2TokenThemes {
  light: UiV2TokenMap;
  dark: UiV2TokenMap;
}

type RGB = {
  r: number;
  g: number;
  b: number;
};

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getBlock(cssText: string, selector: string): string {
  const blockPattern = new RegExp(
    `${escapeForRegExp(selector)}\\s*\\{([\\s\\S]*?)\\}`,
    'm',
  );
  const match = cssText.match(blockPattern);
  if (!match) {
    throw new Error(`Missing CSS block for selector: ${selector}`);
  }
  return match[1];
}

function parseVariables(block: string): UiV2TokenMap {
  const variablePattern = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  const result: UiV2TokenMap = {};
  let match: RegExpExecArray | null = variablePattern.exec(block);

  while (match) {
    result[match[1]] = match[2].trim();
    match = variablePattern.exec(block);
  }

  return result;
}

export function parseUiV2TokenThemes(cssText: string): UiV2TokenThemes {
  const lightBlock = getBlock(cssText, ':root');
  const darkBlock = getBlock(cssText, ':root.dark');

  return {
    light: parseVariables(lightBlock),
    dark: parseVariables(darkBlock),
  };
}

export function resolveUiV2ThemeTokens(
  themes: UiV2TokenThemes,
): UiV2TokenThemes {
  return {
    light: { ...themes.light },
    dark: {
      ...themes.light,
      ...themes.dark,
    },
  };
}

export function getThemeToken(
  themes: UiV2TokenThemes,
  theme: UiV2Theme,
  token: string,
): string {
  const resolved = resolveUiV2ThemeTokens(themes);
  const value = resolved[theme][token];
  if (!value) {
    throw new Error(`Missing token ${token} for theme ${theme}`);
  }
  return value;
}

function normalizeHexColor(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized.startsWith('#')) {
    throw new Error(`Only hex colors are supported. Received: ${value}`);
  }

  const raw = normalized.slice(1);

  if (raw.length === 3 || raw.length === 4) {
    const expanded = raw
      .slice(0, 3)
      .split('')
      .map((char) => `${char}${char}`)
      .join('');
    return `#${expanded}`;
  }

  if (raw.length === 6 || raw.length === 8) {
    return `#${raw.slice(0, 6)}`;
  }

  throw new Error(`Invalid hex color: ${value}`);
}

function toRgb(hex: string): RGB {
  const normalized = normalizeHexColor(hex).slice(1);
  const numeric = Number.parseInt(normalized, 16);

  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
}

function toLinear(channel: number): number {
  const normalized = channel / 255;
  if (normalized <= 0.03928) {
    return normalized / 12.92;
  }
  return ((normalized + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const rgb = toRgb(hex);
  return (
    0.2126 * toLinear(rgb.r) +
    0.7152 * toLinear(rgb.g) +
    0.0722 * toLinear(rgb.b)
  );
}

export function contrastRatio(
  foregroundHex: string,
  backgroundHex: string,
): number {
  const foreground = relativeLuminance(foregroundHex);
  const background = relativeLuminance(backgroundHex);

  const lighter = Math.max(foreground, background);
  const darker = Math.min(foreground, background);

  return (lighter + 0.05) / (darker + 0.05);
}
