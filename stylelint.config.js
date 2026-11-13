/**
 * Style discipline for the redesign design system (src/ds) and its screens (src/screens), run by
 * `npm run lint:css`. Outside src/ds/tokens/, every colour, length, type, radius, shadow, layer and
 * motion value must come from a token: no hex, rgb()/hsl(), named colours, px/rem/em or ms/s.
 * Media queries may use px (custom properties don't work there; see tokens/breakpoints.ts).
 * Legacy Tailwind code is not checked.
 */
export default {
  customSyntax: 'postcss-html',
  plugins: ['stylelint-declaration-strict-value'],
  rules: {
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla', 'oklch', 'lab'],
    'unit-disallowed-list': [
      ['px', 'rem', 'em', 'ms', 's', 'pt'],
      { ignoreMediaFeatureNames: { px: ['min-width', 'max-width', 'width'] } },
    ],
    'scale-unlimited/declaration-strict-value': [
      [
        'font-family',
        'font-size',
        'font-weight',
        'letter-spacing',
        'line-height',
        'z-index',
        'box-shadow',
        'border-radius',
      ],
      {
        ignoreValues: ['inherit', 'none', '0', 'initial', 'normal'],
        ignoreFunctions: false,
      },
    ],
  },
  overrides: [
    {
      files: ['src/ds/tokens/**/*.css'],
      rules: {
        'color-no-hex': null,
        'function-disallowed-list': null,
        'unit-disallowed-list': null,
        'scale-unlimited/declaration-strict-value': null,
        'color-named': null,
      },
    },
  ],
};
