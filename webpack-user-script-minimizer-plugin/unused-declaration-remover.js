// @ts-check
const ts = require("typescript");
const { getUsedDeclarations } = require("./source-file");

/** @type {never[][]} */
const listCache = [];
function rentList() {
    return listCache.pop() ?? [];
}
/**
 * @template T
 * @param {T[]} list
 */
function returnList(list) {
    list.length = 0;
    listCache.push(/** @type {never[]} */ (list));
}

/** @type {ts.TransformerFactory<ts.SourceFile>} */
function createUnusedDeclarationRemover(context) {
    return (sourceFile) => {
        const usedDeclarations = getUsedDeclarations(sourceFile);

        /**
         * @param {ts.Node} node
         */
        function visitNode(node) {
            node = ts.visitEachChild(node, visitNode, context);

            // 使われていない関数宣言を取り除く
            if (
                ts.isFunctionDeclaration(node) &&
                node.name !== undefined &&
                !usedDeclarations.has(node.name)
            ) {
                return undefined;
            }
            // 使われていない変数宣言を取り除く
            if (ts.isVariableStatement(node)) {
                return visitVariableStatement(node);
            }
            if (ts.isForStatement(node)) {
                return visitForStatement(node);
            }
            return node;
        }
        /**
         * @param {ts.VariableStatement} node
         */
        function visitVariableStatement(node) {
            let newDeclarationList = visitVariableDeclarationList(
                node.declarationList
            );
            if (newDeclarationList === undefined) {
                return undefined;
            }
            return context.factory.updateVariableStatement(
                node,
                node.modifiers,
                newDeclarationList
            );
        }
        /**
         * @param {ts.ForStatement} node
         */
        function visitForStatement(node) {
            if (
                node.initializer !== undefined &&
                ts.isVariableDeclarationList(node.initializer)
            ) {
                const initializer = visitVariableDeclarationList(
                    node.initializer
                );
                return context.factory.updateForStatement(
                    node,
                    initializer,
                    node.condition,
                    node.incrementor,
                    node.statement
                );
            }
        }
        /**
         * @param {ts.VariableDeclarationList} node
         */
        function visitVariableDeclarationList(node) {
            let modified = false;
            /** @type {ts.VariableDeclaration[]} */
            let newDeclarations = rentList();
            try {
                for (let child of node.declarations) {
                    // TODO: `let {…} …` などを対象とする
                    if (
                        ts.isIdentifier(child.name) &&
                        !usedDeclarations.has(child.name)
                    ) {
                        modified = true;
                    } else {
                        (newDeclarations ??= []).push(child);
                    }
                }
                if (newDeclarations.length === 0) {
                    return undefined;
                }

                return context.factory.updateVariableDeclarationList(
                    node,
                    modified ? newDeclarations : node.declarations
                );
            } finally {
                returnList(newDeclarations);
            }
        }
        return ts.visitNode(sourceFile, visitNode);
    };
}

exports.createUnusedDeclarationRemover = createUnusedDeclarationRemover;
