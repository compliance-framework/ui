/**
 * Breakpoints in CSS px. Mirrored literally in media and container queries, which cannot read
 * custom properties.
 */
export const breakpoints = {
  sm: 640,
  /** Below this the nav is an off-canvas drawer. */
  lg: 1024,
  xl: 1280,
  /** At and above this the nav is expanded by default; between lg and this it is an icon rail. */
  xxl: 1440,
  /**
   * A content-area width, not a window width (a container query on `main`): from here a page body
   * has a main column beside a side column (Split, Record aside), whatever state the nav is in.
   */
  columns: 960,
} as const;
