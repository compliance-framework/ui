type Condition = {
  label: string;
  operator: "=" | "!=";
  value: string;
};

type Query = {
  operator: "and" | "or" | "AND" | "OR";
  scopes: Scope[];
};

type Scope = {
  condition?: Condition;
  query?: Query;
};

export type Filter = {
  scope: Scope;
};

export class FilterParser {
  private tokens: string[];
  private position: number = 0;

  constructor(input: string) {
    this.tokens = this.tokenize(input);
  }

  private tokenize(input: string): string[] {
    // Tokenize the input string (preserve parentheses and logical operators)
    const regex = /\(|\)|\bAND\b|\band\b|\bOR\b|\bor\b|!=|=|\s+|[^()\s=!]+/gi;
    return input.match(regex)?.map(token => token.trim()).filter(token => token) || [];
  }

  private peek(): string | undefined {
    return this.tokens[this.position];
  }

  private consume(): string | undefined {
    return this.tokens[this.position++];
  }

  private expect(expected: string): void {
    const token = this.consume();
    if (token !== expected) {
      throw new Error(`Expected '${expected}', but found '${token}'`);
    }
  }

  public parse(): Filter {
    const scope = this.parseTopLevel();
    return { scope };
  }

  private parseTopLevel(): Scope {
    if (this.tokens.length === 0) {
      return {};
    }

    if (this.tokens.length === 3) {
      // Single condition case: `foo=bar`
      return { condition: this.parseCondition() };
    }

    return this.parseQuery();
  }

  private parseQuery(): Scope {
    const scopes: Scope[] = [];
    let operator: "AND" | "and" | "OR" | "or" | undefined;

    while (this.position < this.tokens.length) {
      const token = this.peek();

      if (token === "(") {
        // Handle nested query
        this.consume(); // Consume '('
        scopes.push(this.parseQuery());
        this.expect(")"); // Consume ')'
      } else if (token === "AND" || token === "and" || token === "OR" || token === "or") {
        // Set the operator for this query
        if (operator && operator !== token) {
          throw new Error(`Mixed logical operators without grouping: '${operator}' and '${token}'`);
        }
        operator = token.toLowerCase() as "AND" | "and" | "OR" | "or";
        this.consume(); // Consume 'AND' or 'OR'
      } else if (token && /[a-zA-Z0-9_]+/.test(token)) {
        // Parse a condition
        scopes.push({ condition: this.parseCondition() });
      } else {
        break;
      }
    }

    // Default to "AND" if no operator is explicitly specified
    if (!operator) {
      operator = "and";
    }

    return { query: { operator, scopes } };
  }

  private parseCondition(): Condition {
    const label = this.consume();
    const operator = this.consume();
    const value = this.consume();

    if (!label || !operator || !value) {
      throw new Error("Invalid condition format, expected 'label=|!=value'");
    }

    if (operator !== "=" && operator !== "!=") {
      throw new Error(`Unsupported operator: ${operator}`);
    }

    return { label, operator: operator as "=" | "!=", value };
  }
}
