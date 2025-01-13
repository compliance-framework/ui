import { describe, it, expect } from 'vitest'

import { FilterParser } from './labelfilter.ts'

describe('FilterParser', () => {
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
            operator: 'AND',
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
            operator: 'AND',
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
                  operator: 'OR',
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
            operator: 'AND',
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
                  operator: 'OR',
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
                        operator: 'AND',
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
            operator: 'OR',
            scopes: [
              {
                query: {
                  operator: 'AND',
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
                  operator: 'OR',
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
