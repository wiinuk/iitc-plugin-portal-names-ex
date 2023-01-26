// @ts-check
const webpack = require("webpack");
const { RawSource } = webpack.sources;
const ts = require("typescript");
const {
    createUnusedDeclarationRemover,
} = require("./unused-declaration-remover");

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
