type Condition = {
  label: string;
  operator: "=" | "!=";
  value: string;
};

type Query = {
  operator: "and" | "or";
  scopes: Scope[];
};

type Scope = {
  condition?: Condition;
  query?: Query;
};

export type Filter = {
  scope: Scope;
};

const tokenize = (input: string): string[] => {
  const regex = /\(|\)|\bAND\b|\band\b|\bOR\b|\bor\b|!=|=|\s+|[^()\s=!]+/gi;
  return (
    input
      .match(regex)
      ?.map(token => token.trim())
      .filter(token => token) || []
  );
};

const parseCondition = (tokens: string[]): [Condition, string[]] => {
  if (tokens.length < 3) {
    throw new Error("Invalid condition format, expected 'label=|!=value'");
  }

  const [label, operator, value, ...rest] = tokens;

  if (operator !== "=" && operator !== "!=") {
    throw new Error(`Unsupported operator: ${operator}`);
  }

  return [
    { label, operator: operator as "=" | "!=", value },
    rest
  ];
};

// Parse a query (logical grouping of scopes)
const parseQuery = (tokens: string[]): [Query, string[]] => {
  const scopes: Scope[] = [];
  let operator: "and" | "or" | undefined;
  let remainingTokens = tokens;

  while (remainingTokens.length > 0) {
    const token = remainingTokens[0];
    const isConditional = token === "AND" || token === "and" || token === "OR" || token === "or"
    const lowerUpperSnake = /^[a-zA-Z0-9_]+$/.test(token)

    if (token === "(") {
      // Parse a nested query
      const [nestedScope, rest] = parseTopLevel(remainingTokens.slice(1));
      scopes.push(nestedScope);
      remainingTokens = rest;

      if (remainingTokens[0] !== ")") {
        throw new Error("Expected closing parenthesis")
      }

      remainingTokens = remainingTokens.slice(1);
    } else if (isConditional) {
      const currentOperator = token.toLowerCase() as "and" | "or";

      if (operator && operator !== currentOperator) {
        throw new Error(`Mixed logical operators without grouping: '${operator}' and '${currentOperator}'`);
      }

      operator = currentOperator;
      remainingTokens = remainingTokens.slice(1);
    } else if (lowerUpperSnake) {
      const [condition, rest] = parseCondition(remainingTokens);
      scopes.push({ condition });
      remainingTokens = rest;
    } else {
      break;
    }
  }

  if (!operator) {
    operator = "and";
  }

  return [
    { operator, scopes },
    remainingTokens
  ];
};

const parseTopLevel = (tokens: string[]): [Scope, string[]] => {
  if (tokens.length === 0) {
    return [{}, tokens];
  }

  if (tokens.length === 3) {
    const [condition, rest] = parseCondition(tokens);
    return [{ condition }, rest];
  }

  const [query, rest] = parseQuery(tokens);
  return [{ query }, rest];
};

export const parseFilter = (input: string): Filter => {
  const tokens = tokenize(input);
  const [scope, remainingTokens] = parseTopLevel(tokens);

  if (remainingTokens.length > 0) {
    throw new Error(`Unexpected tokens remaining: ${remainingTokens.join(" ")}`);
  }

  return { scope };
};
