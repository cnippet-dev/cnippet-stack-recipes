/**
 * Hand-rolled evaluator for manifest `when`/`condition` expressions.
 * Deliberately not `eval`/`Function` — the input is untrusted recipe data
 * (and in the API, ultimately recipe-author-controlled), so the grammar is
 * restricted to a tiny read-only subset: member access, whitelisted method
 * calls, comparisons, and boolean logic over `answers` / `detection`.
 */

const ALLOWED_ROOTS = new Set(["answers", "detection"]);
const ALLOWED_METHODS = new Set([
  "includes",
  "startsWith",
  "endsWith",
  "some",
  "every",
]);

type Token =
  | { type: "string"; value: string }
  | { type: "number"; value: number }
  | { type: "ident"; value: string }
  | { type: "op"; value: string }
  | { type: "eof" };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const multiCharOps = ["===", "!==", "==", "!=", ">=", "<=", "&&", "||"];
  while (i < input.length) {
    const ch = input[i];
    if (ch === undefined) break;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      let j = i + 1;
      let value = "";
      while (j < input.length && input[j] !== quote) {
        value += input[j];
        j++;
      }
      if (input[j] !== quote) {
        throw new Error(`Unterminated string literal in expression: ${input}`);
      }
      tokens.push({ type: "string", value });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i;
      let value = "";
      while (j < input.length && /[0-9.]/.test(input[j] ?? "")) {
        value += input[j];
        j++;
      }
      tokens.push({ type: "number", value: Number(value) });
      i = j;
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      let value = "";
      while (j < input.length && /[A-Za-z0-9_$]/.test(input[j] ?? "")) {
        value += input[j];
        j++;
      }
      tokens.push({ type: "ident", value });
      i = j;
      continue;
    }
    const three = input.slice(i, i + 3);
    const two = input.slice(i, i + 2);
    if (multiCharOps.includes(three)) {
      tokens.push({ type: "op", value: three });
      i += 3;
      continue;
    }
    if (multiCharOps.includes(two)) {
      tokens.push({ type: "op", value: two });
      i += 2;
      continue;
    }
    if ("().!<>,".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }
    throw new Error(`Unexpected character '${ch}' in expression: ${input}`);
  }
  tokens.push({ type: "eof" });
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(
    private readonly tokens: Token[],
    private readonly scope: WhenScope,
    private readonly source: string,
  ) {}

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: "eof" };
  }

  private next(): Token {
    const token = this.peek();
    this.pos++;
    return token;
  }

  private expectOp(value: string): void {
    const token = this.next();
    if (token.type !== "op" || token.value !== value) {
      throw new Error(
        `Expected '${value}' in expression: ${this.source} (got ${JSON.stringify(token)})`,
      );
    }
  }

  parse(): unknown {
    const result = this.parseOr();
    if (this.peek().type !== "eof") {
      throw new Error(
        `Unexpected trailing input in expression: ${this.source}`,
      );
    }
    return result;
  }

  private parseOr(): unknown {
    let left = this.parseAnd();
    for (
      let token = this.peek();
      token.type === "op" && token.value === "||";
      token = this.peek()
    ) {
      this.next();
      const right = this.parseAnd();
      left = Boolean(left) || Boolean(right);
    }
    return left;
  }

  private parseAnd(): unknown {
    let left = this.parseEquality();
    for (
      let token = this.peek();
      token.type === "op" && token.value === "&&";
      token = this.peek()
    ) {
      this.next();
      const right = this.parseEquality();
      left = Boolean(left) && Boolean(right);
    }
    return left;
  }

  private parseEquality(): unknown {
    let left = this.parseRelational();
    for (;;) {
      const token = this.peek();
      if (
        token.type === "op" &&
        (token.value === "===" ||
          token.value === "!==" ||
          token.value === "==" ||
          token.value === "!=")
      ) {
        this.next();
        const right = this.parseRelational();
        switch (token.value) {
          case "===":
            left = left === right;
            break;
          case "!==":
            left = left !== right;
            break;
          case "==":
            left = left === right;
            break;
          case "!=":
            left = left !== right;
            break;
        }
      } else {
        break;
      }
    }
    return left;
  }

  private parseRelational(): unknown {
    let left = this.parseUnary();
    for (;;) {
      const token = this.peek();
      if (
        token.type === "op" &&
        (token.value === ">" ||
          token.value === ">=" ||
          token.value === "<" ||
          token.value === "<=")
      ) {
        this.next();
        const right = this.parseUnary();
        switch (token.value) {
          case ">":
            left = (left as never) > (right as never);
            break;
          case ">=":
            left = (left as never) >= (right as never);
            break;
          case "<":
            left = (left as never) < (right as never);
            break;
          case "<=":
            left = (left as never) <= (right as never);
            break;
        }
      } else {
        break;
      }
    }
    return left;
  }

  private parseUnary(): unknown {
    const token = this.peek();
    if (token.type === "op" && token.value === "!") {
      this.next();
      return !this.parseUnary();
    }
    return this.parsePostfix();
  }

  private parsePostfix(): unknown {
    let value = this.parsePrimary();
    for (;;) {
      const token = this.peek();
      if (token.type === "op" && token.value === ".") {
        this.next();
        const prop = this.next();
        if (prop.type !== "ident") {
          throw new Error(
            `Expected property name in expression: ${this.source}`,
          );
        }
        const maybeParen = this.peek();
        if (maybeParen.type === "op" && maybeParen.value === "(") {
          // Syntactically a call regardless of the receiver's runtime type —
          // an undefined/null receiver (e.g. an answer that wasn't supplied
          // yet, such as when resolving a manifest before prompts run) must
          // still consume the parenthesized args, or the trailing tokens
          // make the whole expression fail to parse.
          if (!ALLOWED_METHODS.has(prop.value)) {
            throw new Error(
              `Method '${prop.value}' is not allowed in expression: ${this.source}`,
            );
          }
          this.next(); // consume "("
          const args: unknown[] = [];
          const maybeCloseParen = this.peek();
          if (
            !(maybeCloseParen.type === "op" && maybeCloseParen.value === ")")
          ) {
            args.push(this.parseOr());
            for (
              let comma = this.peek();
              comma.type === "op" && comma.value === ",";
              comma = this.peek()
            ) {
              this.next();
              args.push(this.parseOr());
            }
          }
          this.expectOp(")");
          if (value === null || value === undefined) {
            value = undefined;
            continue;
          }
          const fn = (value as Record<string, unknown>)[prop.value];
          if (typeof fn !== "function") {
            value = undefined;
            continue;
          }
          value = (fn as (...a: unknown[]) => unknown).apply(value, args);
          continue;
        }
        value =
          value === null || value === undefined
            ? undefined
            : (value as Record<string, unknown>)[prop.value];
        continue;
      }
      break;
    }
    return value;
  }

  private parsePrimary(): unknown {
    const token = this.next();
    if (token.type === "string") return token.value;
    if (token.type === "number") return token.value;
    if (token.type === "op" && token.value === "(") {
      const value = this.parseOr();
      this.expectOp(")");
      return value;
    }
    if (token.type === "ident") {
      if (token.value === "true") return true;
      if (token.value === "false") return false;
      if (token.value === "null") return null;
      if (!ALLOWED_ROOTS.has(token.value)) {
        throw new Error(
          `Unknown identifier '${token.value}' in expression: ${this.source} (only "answers" and "detection" are allowed)`,
        );
      }
      return this.scope[token.value as "answers" | "detection"];
    }
    throw new Error(`Unexpected token in expression: ${this.source}`);
  }
}

export interface WhenScope {
  answers: Record<string, unknown>;
  detection: Record<string, unknown>;
}

/** Evaluates a manifest `when`/`condition` string. Undefined/empty expressions are always true. */
export function evaluateWhen(
  expression: string | undefined,
  scope: WhenScope,
): boolean {
  if (expression === undefined || expression.trim() === "") return true;
  const tokens = tokenize(expression);
  const parser = new Parser(tokens, scope, expression);
  return Boolean(parser.parse());
}
