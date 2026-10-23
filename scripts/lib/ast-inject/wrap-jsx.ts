// Verbatim copy of cnippet-stack/packages/cli/src/installer/strategies/ast-inject/wrap-jsx.ts — keep identical to upstream.
// TODO: import from cnippet-stack once this repo depends on it (it already shares @cnippet/recipe-kit).

import type { Expression, FunctionDeclaration, SourceFile } from "ts-morph";
import { Node, SyntaxKind } from "ts-morph";

export interface WrapJsxResult {
  status: "injected" | "skipped";
}

function unwrapParens(node: Node): Node {
  let current = node;
  while (Node.isParenthesizedExpression(current)) {
    current = current.getExpression();
  }
  return current;
}

function findAnchorFunction(
  sourceFile: SourceFile,
  anchor: string,
): FunctionDeclaration | Node {
  const fn = sourceFile.getFunction(anchor);
  if (fn) return fn;

  const variable = sourceFile.getVariableDeclaration(anchor);
  const initializer = variable?.getInitializer();
  if (
    initializer &&
    (Node.isArrowFunction(initializer) ||
      Node.isFunctionExpression(initializer))
  ) {
    return initializer;
  }

  throw new Error(
    `ast-inject "wrap-jsx": couldn't find a function or arrow function named "${anchor}" in ${sourceFile.getFilePath()}.`,
  );
}

function getReturnExpression(fn: Node): Expression {
  const body = (fn as FunctionDeclaration).getBody?.();
  if (!body) {
    throw new Error('ast-inject "wrap-jsx": target function has no body.');
  }

  if (Node.isBlock(body)) {
    const returnStatement = body.getDescendantsOfKind(
      SyntaxKind.ReturnStatement,
    )[0];
    const expression = returnStatement?.getExpression();
    if (!expression) {
      throw new Error(
        'ast-inject "wrap-jsx": target function has no `return <JSX/>` statement.',
      );
    }
    return unwrapParens(expression) as Expression;
  }

  // Arrow function with a concise (non-block) body: `() => <JSX/>`.
  return unwrapParens(body as unknown as Node) as Expression;
}

function isAlreadyWrappedBy(
  expression: Expression,
  wrapperName: string,
): boolean {
  if (!Node.isJsxElement(expression)) return false;
  return (
    expression.getOpeningElement().getTagNameNode().getText() === wrapperName
  );
}

/**
 * `injection.anchor` names the function/export whose returned JSX root
 * should be wrapped; `contents` is the wrapping component's name (e.g.
 * "AuthProvider"). Idempotent: skips if already wrapped by that component.
 */
export function applyWrapJsx(
  sourceFile: SourceFile,
  anchor: string,
  contents: string,
): WrapJsxResult {
  const wrapperName = contents.trim();
  const fn = findAnchorFunction(sourceFile, anchor);
  const expression = getReturnExpression(fn);

  if (isAlreadyWrappedBy(expression, wrapperName)) {
    return { status: "skipped" };
  }

  expression.replaceWithText(
    `<${wrapperName}>${expression.getText()}</${wrapperName}>`,
  );
  return { status: "injected" };
}
