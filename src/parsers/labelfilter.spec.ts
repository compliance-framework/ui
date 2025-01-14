import { describe, it, expect } from 'vitest'

import { FilterParser } from './labelfilter.ts'

describe('FilterParser', () => {
  it('parses empty search', () => {
    expect(new FilterParser('').parse()).toEqual(
      expect.objectContaining({}),
    )
  })

  it('accepts lowercase operators', () => {
    expect(new FilterParser('foo=bar and foo=bar').parse()).toEqual(
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
    expect(new FilterParser('foo=bar').parse()).toEqual(
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
    expect(new FilterParser('foo!=bar').parse()).toEqual(
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
    expect(new FilterParser('foo=bar AND bat!=baz').parse()).toEqual(
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
    expect(new FilterParser('foo=bar AND (bat=baz OR bat=bay)').parse()).toEqual(
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
    expect(new FilterParser('foo=bar AND (bat=baz OR (bat=bay AND baz!=ray))').parse()).toEqual(
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
    expect(new FilterParser('(foo=bar AND bat=bay) OR (foo=bar OR baz!=bay)').parse()).toEqual(
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
