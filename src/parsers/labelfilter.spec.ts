import { describe, it, expect } from 'vitest'

import { parseFilter } from './labelfilter.ts'

describe('FilterParser', () => {
  it('parses empty search', () => {
    expect(parseFilter('')).toEqual(
      expect.objectContaining({}),
    )
  })

  it('accepts lowercase operators', () => {
    expect(parseFilter('foo=bar and foo=bar')).toEqual(
      expect.objectContaining({
        scope: {
          query: {
            operator: 'and',
            scopes: [
              {
                condition: {
                  label: 'foo',
                  operator: '=',
                  value: 'bar',
                },
              },
              {
                condition: {
                  label: 'foo',
                  operator: '=',
                  value: 'bar',
                },
              },
            ],
          },
        },
      }),
    )
  })

  it('parses simple condition', () => {
    expect(parseFilter('foo=bar')).toEqual(
      expect.objectContaining({
        scope: {
          condition: {
            label: 'foo',
            operator: '=',
            value: 'bar',
          },
        },
      }),
    )
  })

  it('parses simple negated query', () => {
    expect(parseFilter('foo!=bar')).toEqual(
      expect.objectContaining({
        scope: {
          condition: {
            label: 'foo',
            operator: '!=',
            value: 'bar',
          },
        },
      }),
    )
  })

  it('parses multi conditions', () => {
    expect(parseFilter('foo=bar AND bat!=baz')).toEqual(
      expect.objectContaining({
        scope: {
          query: {
            operator: 'and',
            scopes: [
              {
                condition: {
                  label: 'foo',
                  operator: '=',
                  value: 'bar',
                },
              },
              {
                condition: {
                  label: 'bat',
                  operator: '!=',
                  value: 'baz',
                },
              },
            ],
          },
        },
      }),
    )
  })

  it('parses single depth subquery', () => {
    expect(parseFilter('foo=bar AND (bat=baz OR bat=bay)')).toEqual(
      expect.objectContaining({
        scope: {
          query: {
            operator: 'and',
            scopes: [
              {
                condition: {
                  label: 'foo',
                  operator: '=',
                  value: 'bar',
                },
              },
              {
                query: {
                  operator: 'or',
                  scopes: [
                    {
                      condition: {
                        label: 'bat',
                        operator: '=',
                        value: 'baz',
                      },
                    },
                    {
                      condition: {
                        label: 'bat',
                        operator: '=',
                        value: 'bay',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      }),
    )
  })

  it('parses double depth subquery', () => {
    expect(parseFilter('foo=bar AND (bat=baz OR (bat=bay AND baz!=ray))')).toEqual(
      expect.objectContaining({
        scope: {
          query: {
            operator: 'and',
            scopes: [
              {
                condition: {
                  label: 'foo',
                  operator: '=',
                  value: 'bar',
                },
              },
              {
                query: {
                  operator: 'or',
                  scopes: [
                    {
                      condition: {
                        label: 'bat',
                        operator: '=',
                        value: 'baz',
                      },
                    },
                    {
                      query: {
                        operator: 'and',
                        scopes: [
                          {
                            condition: {
                              label: 'bat',
                              operator: '=',
                              value: 'bay',
                            },
                          },
                          {
                            condition: {
                              label: 'baz',
                              operator: '!=',
                              value: 'ray',
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      }),
    )
  })

  it('parses two subqueries', () => {
    expect(parseFilter('(foo=bar AND bat=bay) OR (foo=bar OR baz!=bay)')).toEqual(
      expect.objectContaining({
        scope: {
          query: {
            operator: 'or',
            scopes: [
              {
                query: {
                  operator: 'and',
                  scopes: [
                    {
                      condition: {
                        label: 'foo',
                        operator: '=',
                        value: 'bar',
                      },
                    },
                    {
                      condition: {
                        label: 'bat',
                        operator: '=',
                        value: 'bay',
                      },
                    },
                  ],
                },
              },
              {
                query: {
                  operator: 'or',
                  scopes: [
                    {
                      condition: {
                        label: 'foo',
                        operator: '=',
                        value: 'bar',
                      },
                    },
                    {
                      condition: {
                        label: 'baz',
                        operator: '!=',
                        value: 'bay',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      }),
    )
  })
})
