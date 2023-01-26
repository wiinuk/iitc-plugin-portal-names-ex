// @ts-check
const ts = require("typescript");
const tsutils = require("tsutils");

/**
 * @param {ts.SyntaxKind} kind
 */
function isBinaryAssignmentOperator(kind) {
    return (
        ts.SyntaxKind.FirstAssignment <= kind &&
        kind <= ts.SyntaxKind.LastAssignment
    );
}

/**
 * @param {ts.Node} node
 */
function isLiteralExpression(node) {
    function _typeTest() {
        () => {
            /** @type {ts.LiteralExpression} */
            //@ts-expect-error
            let t = ts.factory.createTrue();
            //@ts-expect-error
            t = ts.factory.createNull();
        };
    }
    return (
        ts.isLiteralExpression(node) ||
        tsutils.isNullLiteral(node) ||
        tsutils.isBooleanLiteral(node)
    );
}
/**
 * @param {ts.SourceFile} sourceFile
 */
function collectVariableUsages(sourceFile) {
    // 宣言から変数へのマッピングのみを含むので
    const variableUsages = tsutils.collectVariableUsage(sourceFile);

    // 変数から宣言へのマッピングを追加する
    for (const [, usage] of variableUsages) {
        for (const use of usage.uses) {
            variableUsages.set(use.location, usage);
        }
    }
    return variableUsages;
}

/**
 * @param {ts.SourceFile} sourceFile
 */
function getUsedDeclarations(sourceFile) {
    const usages = collectVariableUsages(sourceFile);

    const evaluateFailure = Symbol("evaluationFailure");
    /**
     * @param {ts.Expression} node
     */
    function simpleEvaluate(node) {
        if (
            ts.isIdentifier(node) &&
            node.text === "undefined" &&
            !usages.has(node)
        ) {
            return undefined;
        }
        if (tsutils.isNullLiteral(node)) {
            return null;
        }
        if (tsutils.isBooleanLiteral(node)) {
            return node.kind === ts.SyntaxKind.TrueKeyword;
        }
        if (ts.isNumericLiteral(node)) {
            return parseFloat(node.text);
        }
        if (ts.isBigIntLiteral(node)) {
            return BigInt(node.text);
        }
        return evaluateFailure;
    }

    /**
     * @param {ts.Node} node
     * @returns {ts.Expression | undefined}
     */
    function findImpureExpressionInExpressionParts(node) {
        // 無条件で純粋な式
        if (
            isLiteralExpression(node) ||
            tsutils.isBooleanLiteral(node) ||
            ts.isIdentifier(node) ||
            // TODO: ts.isFunctionLike でまとめて判定できそうだけど誤判定が怖い
            ts.isFunctionExpression(node) ||
            ts.isArrowFunction(node)
        ) {
            return;
        }

        // `e1 && e2`, `e1 || e2`
        if (
            ts.isBinaryExpression(node) &&
            (node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
                node.operatorToken.kind ===
                    ts.SyntaxKind.AmpersandAmpersandToken)
        ) {
            return findImpureExpressionInLogicalBinaryExpression(node);
        }

        // すべての子要素が純粋なら全体として純粋な式
        if (
            ts.isObjectLiteralExpression(node) ||
            ts.isArrayLiteralExpression(node) ||
            ts.isVoidExpression(node) ||
            // TODO: heritageClauses と static メンバーのみチェックする
            ts.isClassExpression(node) ||
            (ts.isPrefixUnaryExpression(node) &&
                (node.operator === ts.SyntaxKind.PlusToken ||
                    node.operator === ts.SyntaxKind.MinusToken)) ||
            (ts.isBinaryExpression(node) &&
                !isBinaryAssignmentOperator(node.operatorToken.kind)) ||
            ts.isTypeOfExpression(node) ||
            ts.isTemplateExpression(node) ||
            ts.isCommaListExpression(node) ||
            ts.isConditionalExpression(node) ||
            ts.isParenthesizedExpression(node) ||
            // `a + b` 内の `+` や、`{ f: … }` の `f: …` など
            !tsutils.isExpression(node)
        ) {
            return ts.forEachChild(node, findImpureExpressionInExpressionParts);
        }

        // 純粋でない式
        return node;
    }
    /**
     * @param {ts.BinaryExpression} node
     */
    function findImpureExpressionInLogicalBinaryExpression(node) {
        const e = findImpureExpressionInExpressionParts(node.left);
        if (e !== undefined) {
            return e;
        }

        const l = simpleEvaluate(node.left);
        if (l !== evaluateFailure) {
            // `l || …` は l が純粋で truthy なら全体として純粋
            // `l && …` は l が純粋で falsy なら全体として純粋
            if (
                node.operatorToken.kind === ts.SyntaxKind.BarBarToken ? !!l : !l
            ) {
                return;
            }
        }

        return findImpureExpressionInExpressionParts(node.right);
    }
    /**
     * @param {ts.Expression} expression
     */
    function isPure(expression) {
        return findImpureExpressionInExpressionParts(expression) === undefined;
    }

    /** @type {Set<ts.Identifier>} */
    const usedDeclarations = new Set();

    /**
     * 実行される可能性のあるノードをたどっていく。途中で宣言に出会ったら収集する。
     * @param {ts.Node} node
     */
    function propagateRootUsages(node) {
        // 関数宣言は実行されない可能性があるのでスキップする
        // `function …`
        if (ts.isFunctionDeclaration(node)) {
            return;
        }
        // catch 節を除く変数宣言は、右辺が純粋で変数が変更されないなら実行されない可能性があるのでスキップする
        // `var …`, `let …`, `const …`, `for (…;;) …`, `for (… of …) …`, `for (… in …) …`
        if (
            ts.isVariableDeclaration(node) &&
            !ts.isCatchClause(node.parent) &&
            // TODO: `let {…} …` などを最適化の対象とする
            ts.isIdentifier(node.name) &&
            (node.initializer === undefined || isPure(node.initializer))
        ) {
            return;
        }

        // 識別子が参照なら宣言をたどる
        // `f(); function f() {}`, `const x = {}; x` など
        if (ts.isIdentifier(node)) {
            const usage = usages.get(node);
            if (usage) {
                for (const declaration of usage.declarations) {
                    propagateRootUsagesInDeclarationBody(declaration);
                }
            }
            return;
        }

        // 子要素をたどる
        ts.forEachChild(node, propagateRootUsages);
    }
    /**
     * @param {ts.Identifier} declaration
     */
    function propagateRootUsagesInDeclarationBody(declaration) {
        if (usedDeclarations.has(declaration)) {
            return;
        }
        usedDeclarations.add(declaration);

        const { parent } = declaration;

        if (
            ts.isFunctionDeclaration(parent) ||
            ts.isVariableDeclaration(parent)
        ) {
            ts.forEachChild(parent, propagateRootUsages);
        }
    }

    propagateRootUsages(sourceFile);
    return usedDeclarations;
}

exports.getUsedDeclarations = getUsedDeclarations;
