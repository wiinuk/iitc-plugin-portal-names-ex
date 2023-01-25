// @ts-check
const webpack = require("webpack");
const { RawSource } = webpack.sources;
const ts = require("typescript");
const tsutils = require("tsutils");

const pluginName = "WebpackUserScriptMinimizerPlugin";
const pluginVersion = "0.1.0";
const compilationCacheKey = pluginName;

/**
 * @typedef {Object} MinimizedResult
 * @property {string} code
 * @property {webpack.WebpackError[]} [errors]
 * @property {webpack.WebpackError[]} [warnings]
 */

/**
 * @typedef {Object} CachedMinimizedResult
 * @property {webpack.sources.Source} source
 * @property {Array<webpack.WebpackError>} [errors]
 * @property {Array<webpack.WebpackError>} [warnings]
 */
/**
 * @typedef {Object} MinifyOptions
 * @property {string} name
 * @property {string} input
 * @property {boolean | undefined} module
 * @property {5 | 2015 | 2020} ecma
 */

/**
 * @param {TemplateStringsArray} template
 * @param {unknown[]} substitutions
 * @returns {never}
 */
function error(template, ...substitutions) {
    throw new Error(String.raw(template, ...substitutions));
}
/**
 * @template T
 * @param {T} value
 */
function assertNonNull(value) {
    if (value == null) {
        return error`value is null`;
    }
    return value;
}

/**
 * @param {NonNullable<webpack.WebpackOptionsNormalized["output"]["environment"]>} environment
 */
function getEcmaVersion(environment) {
    // ES 6th
    if (
        environment.arrowFunction ||
        environment.const ||
        environment.destructuring ||
        environment.forOf ||
        environment.module
    ) {
        return 2015;
    }

    // ES 11th
    if (environment.bigIntLiteral || environment.dynamicImport) {
        return 2020;
    }

    return 5;
}
/**
 * @param {webpack.WebpackError | string} warning
 * @param {string} file
 */
function buildWarning(warning, file) {
    const result = new webpack.WebpackError(warning.toString());
    result.name = "Warning";
    result.hideStack = true;
    result.file = file;
    return result;
}
/**
 * @param {Error} error
 * @param {string} file
 */
function buildError(error, file) {
    const result = new webpack.WebpackError(
        `${file} from ${pluginName}\n${error.message ?? ""}${
            error.stack ? "\n" + error.stack : ""
        }`
    );
    result.file = file;
    return result;
}

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
 * `--`, `+=`, `||=` など
 * @param {ts.Node} node
 */
function isVariableUpdateExpression(node) {
    return (
        ts.isPostfixUnaryExpression(node) ||
        ts.isPrefixUnaryExpression(node) ||
        (ts.isBinaryExpression(node) &&
            isBinaryAssignmentOperator(node.operatorToken.kind))
    );
}
/**
 * @param {ts.Identifier} declaration
 * @param {ReadonlyMap<ts.Identifier, tsutils.VariableInfo>} usages
 */
function isNoAssign(declaration, usages) {
    // `const …` なら代入できない
    if (
        ts.isVariableDeclaration(declaration.parent) &&
        ts.isVariableDeclarationList(declaration.parent.parent) &&
        tsutils.getVariableDeclarationKind(declaration.parent.parent) ===
            tsutils.VariableDeclarationKind.Const
    ) {
        return true;
    }

    // 変数のすべての使用箇所が更新式かチェック
    const usage = usages.get(declaration);
    if (!usage) {
        return false;
    }
    for (const { location } of usage.uses) {
        const { parent } = location;
        if (isVariableUpdateExpression(parent)) {
            return false;
        }
    }

    return true;
}

/**
 * @param {ts.Node} node
 * @returns {ts.Node | undefined}
 */
function findImpureExpression(node) {
    if (
        ts.isLiteralExpression(node) ||
        ts.isIdentifier(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node)
    ) {
        return;
    }
    if (
        ts.isObjectLiteralExpression(node) ||
        ts.isArrayLiteralExpression(node) ||
        ts.isVoidExpression(node) ||
        ts.isClassExpression(node) ||
        ts.isPrefixUnaryExpression(node) ||
        ts.isPostfixUnaryExpression(node) ||
        (ts.isBinaryExpression(node) &&
            !isBinaryAssignmentOperator(node.operatorToken.kind)) ||
        ts.isTypeOfExpression(node) ||
        ts.isTemplateExpression(node) ||
        ts.isCommaListExpression(node) ||
        ts.isConditionalExpression(node) ||
        ts.isParenthesizedExpression(node)
    ) {
        return ts.forEachChild(node, findImpureExpression);
    }
    return node;
}

/**
 * @param {ts.Expression} expression
 */
function isPure(expression) {
    return findImpureExpression(expression) === undefined;
}

/**
 * 実行される可能性のあるノードをたどっていく。途中で変数宣言に出会ったら収集する。
 * @param {ts.Node} node
 * @param {ReadonlyMap<ts.Identifier, tsutils.VariableInfo>} usages 宣言から変数へのマッピングと変数から宣言へのマッピングの両方を含む必要がある。
 * @param {Set<ts.Identifier>} seen 実行される可能性がある変数宣言が格納される変数
 */
function propagateUsages(node, usages, seen) {
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
        isNoAssign(node.name, usages) &&
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
                propagateUsagesInDeclarationBody(declaration, usages, seen);
            }
        }
        return;
    }

    // 子要素をたどる
    ts.forEachChild(node, (child) => propagateUsages(child, usages, seen));
}
/**
 * @param {ts.Identifier} declaration
 * @param {ReadonlyMap<ts.Identifier, tsutils.VariableInfo>} usages
 * @param {Set<ts.Identifier>} seen
 */
function propagateUsagesInDeclarationBody(declaration, usages, seen) {
    if (seen.has(declaration)) return;
    seen.add(declaration);

    const { parent } = declaration;

    if (ts.isFunctionDeclaration(parent) || ts.isVariableDeclaration(parent)) {
        ts.forEachChild(parent, (child) =>
            propagateUsages(child, usages, seen)
        );
    }
}
/**
 * @param {ts.SourceFile} sourceFile
 */
function getUsedDeclarations(sourceFile) {
    // 宣言から変数へのマッピングのみを含むので
    const variableUsages = tsutils.collectVariableUsage(sourceFile);

    // 変数から宣言へのマッピングを追加する
    for (const [, usage] of variableUsages) {
        for (const use of usage.uses) {
            variableUsages.set(use.location, usage);
        }
    }

    /** @type {Set<ts.Identifier>} */
    const usedDeclarations = new Set();
    propagateUsages(sourceFile, variableUsages, usedDeclarations);

    return usedDeclarations;
}

/** @type {ts.TransformerFactory<ts.SourceFile>} */
function createUnusedDeclarationRemover(context) {
    return (sourceFile) => {
        const usedDeclarations = getUsedDeclarations(sourceFile);

        /**
         * @param {ts.Node} node
         */
        function visitor(node) {
            node = ts.visitEachChild(node, visitor, context);

            // 使われていない関数宣言を取り除く
            if (
                ts.isFunctionDeclaration(node) &&
                node.name !== undefined &&
                !usedDeclarations.has(node.name)
            ) {
                return undefined;
            }
            // 使われていない単純な変数宣言を取り除く
            // 不正な構文である `var;` や `for (var;…;…) …` になってしまうので
            if (
                ts.isVariableDeclaration(node) &&
                // TODO: `let {…} …` などを対象とする
                ts.isIdentifier(node.name) &&
                (ts.isVariableStatement(node.parent.parent) ||
                    ts.isForStatement(node.parent.parent)) &&
                !usedDeclarations.has(node.name)
            ) {
                return undefined;
            }
            // ここで `var;` を削除する
            if (
                ts.isVariableStatement(node) &&
                node.declarationList.declarations.length === 0
            ) {
                return undefined;
            }
            // ここで `for(var;…;…) …` を `for(;…;…) …` にする
            if (
                ts.isForStatement(node) &&
                node.initializer !== undefined &&
                ts.isVariableDeclarationList(node.initializer) &&
                node.initializer.declarations.length === 0
            ) {
                return context.factory.updateForStatement(
                    node,
                    undefined,
                    node.condition,
                    node.incrementor,
                    node.statement
                );
            }
            return node;
        }
        return ts.visitNode(sourceFile, visitor);
    };
}

/**
 * @param {MinifyOptions} options
 * @returns {Promise<MinimizedResult>}
 */
async function optimizeFile({ name, input, module, ecma }) {
    const sourceFile = ts.createSourceFile(
        name,
        input,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.JS
    );
    let transformResult;
    let transformedSourceFile;
    try {
        transformResult = ts.transform(sourceFile, [
            createUnusedDeclarationRemover,
        ]);
        transformedSourceFile = transformResult.transformed[0];
    } finally {
        transformResult?.dispose();
    }

    const printer = ts.createPrinter({
        removeComments: false,
    });
    return {
        code: printer.printFile(transformedSourceFile),
    };
}

/**
 * @param {{}} options
 * @param {webpack.Compiler} compiler
 * @param {webpack.Compilation} compilation
 * @param {Parameters<Parameters<webpack.Compilation["hooks"]["processAssets"]["tapPromise"]>[1]>[0]} assets
 */
async function optimizeAssets(options, compiler, compilation, assets) {
    const cache = compilation.getCache(compilationCacheKey);
    const assetsForMinify = await Promise.all(
        Object.keys(assets)
            .filter((name) => {
                const { info } = assertNonNull(compilation.getAsset(name));

                if (info.minimized || info.extractedComments) {
                    return false;
                }

                if (
                    !compiler.webpack.ModuleFilenameHelpers.matchObject.bind(
                        undefined,
                        options
                    )(name)
                ) {
                    return false;
                }

                return true;
            })
            .map(async (name) => {
                const { info, source } = assertNonNull(
                    compilation.getAsset(name)
                );

                const eTag = cache.getLazyHashedEtag(source);
                const cacheItem = cache.getItemCache(name, eTag);
                return {
                    name,
                    info,
                    inputSource: source,
                    /** @type {CachedMinimizedResult | undefined} */
                    cache: await cacheItem.getPromise(),
                    cacheItem,
                };
            })
    );

    if (assetsForMinify.length === 0) {
        return;
    }

    await Promise.all(
        assetsForMinify.map(async (asset) => {
            const { name, inputSource, info, cacheItem } = asset;
            let { cache: outputCache } = asset;

            if (!outputCache) {
                let { source: input } = inputSource.sourceAndMap();
                if (Buffer.isBuffer(input)) {
                    input = input.toString();
                }

                let module;
                if (info.javascriptModule !== undefined) {
                    module = info.javascriptModule;
                } else if (/\.mjs(\?.*)?$/i.test(name)) {
                    module = true;
                } else if (/\.cjs(\?.*)?$/i.test(name)) {
                    module = false;
                }

                const ecma = getEcmaVersion(
                    compiler.options.output.environment || {}
                );

                let output;
                try {
                    output = await optimizeFile({
                        name,
                        input,
                        module,
                        ecma,
                    });
                } catch (error) {
                    compilation.errors.push(buildError(error, name));
                    return;
                }
                outputCache = {
                    source: new RawSource(output.code),
                    warnings: output.warnings,
                    errors: output.errors,
                };
                await cacheItem.storePromise(outputCache);
            }

            if (outputCache.warnings && outputCache.warnings.length > 0) {
                for (const warning of outputCache.warnings) {
                    compilation.warnings.push(warning);
                }
            }

            if (outputCache.errors && outputCache.errors.length > 0) {
                for (const error of outputCache.errors) {
                    compilation.errors.push(error);
                }
            }
            compilation.updateAsset(name, outputCache.source, {
                minimized: true,
            });
        })
    );
}
module.exports = class {
    static optimizeFile = optimizeFile;

    /** @readonly @type {{}} */
    options;

    /**
     * @param {{}} [options]
     */
    constructor(options = {}) {
        this.options = options;
    }
    /**
     * @param {webpack.Compiler} compiler
     */
    apply(compiler) {
        compiler.hooks.compilation.tap(pluginName, (compilation) => {
            const hooks =
                compiler.webpack.javascript.JavascriptModulesPlugin.getCompilationHooks(
                    compilation
                );
            const data = JSON.stringify({
                minimizer: pluginVersion,
                options: this.options,
            });

            hooks.chunkHash.tap(pluginName, (chunk, hash) => {
                hash.update(pluginName);
                hash.update(data);
            });

            compilation.hooks.processAssets.tapPromise(
                {
                    name: pluginName,
                    stage: compiler.webpack.Compilation
                        .PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
                    additionalAssets: true,
                },
                (assets) =>
                    optimizeAssets(this.options, compiler, compilation, assets)
            );
        });
    }
};
