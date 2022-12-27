// spell-checker: ignore cacheable
// @ts-check
const schemaUtils = require("schema-utils");
const fs = require("fs/promises");
const { createHash } = require("crypto");
const { SourceMapGenerator } = require("source-map");
const css = require("css");
const cssSelector = require("css-selector-parser");

const loaderName = "Dynamic css loader";

const none = Symbol("none");
/**
 * @template T
 * @typedef {T | typeof none} Optional
 */
/**
 * @template T
 * @param {T} defaultValue
 * @param {Optional<T>} optionalValue
 */
const noneOr = (defaultValue, optionalValue) =>
    optionalValue === none ? defaultValue : optionalValue;

/**
 * @typedef {Object} TypeToNodeMap
 * @property {css.Stylesheet} stylesheet
 * @property {css.Rule} rule
 * @property {css.Declaration} declaration
 * @property {css.Comment} comment
 * @property {css.Charset} charset
 * @property {css.CustomMedia} custom-media
 * @property {css.Document} document
 * @property {css.FontFace} font-face
 * @property {css.Host} host
 * @property {css.Import} import
 * @property {css.KeyFrames} keyframes
 * @property {css.KeyFrame} keyframe
 * @property {css.Media} media
 * @property {css.Namespace} namespace
 * @property {css.Page} page
 * @property {css.Supports} supports
 */

/**
 * @typedef {css.Rule | css.Comment | css.AtRule} RuleSet
 */

/**
 * @template {keyof TypeToNodeMap} K
 * @param {K} type
 * @param {css.Node} node
 * @returns {node is TypeToNodeMap[K] & { type: K }}
 */
const is = (type, node) => node.type === type;

/**
 * @typedef {Object} ClassNameSymbol
 * @property {string} uniqueId
 * @property {Set<css.Node>} declarations
 */

/**
 * @typedef {Object} ReplacerContext
 * @property {Map<string, ClassNameSymbol>} classNameToSymbol
 * @property {string} cssTextHash
 * @property {css.Node | null} currentRule
 */

/**
 * @template {unknown} T
 * @typedef {(oldValue: T, context: ReplacerContext) => Optional<T>} Replacer
 */

/** @type {never[][]} */
const newItemsPool = [];
/**
 * @template T
 * @param {Replacer<T>} itemReplacer
 * @param {T[]} items
 * @param {ReplacerContext} context
 */
const replaceArray = (itemReplacer, items, context) => {
    // 配列をキャッシュしてアロケーションを抑制する
    let hasNewItem = false;
    /** @type {T[]} */
    const tempNewItems = newItemsPool.pop() || [];
    try {
        for (const item of items) {
            const newItem = itemReplacer(item, context);
            tempNewItems.push(
                newItem !== none ? ((hasNewItem = true), newItem) : item
            );
        }
        if (hasNewItem) {
            return tempNewItems.slice();
        }
        return none;
    } finally {
        // プールに返す
        tempNewItems.length = 0;
        newItemsPool.push(/** @type {never[]} */ (tempNewItems));
    }
};
/**
 * @template R
 * @template {keyof R} K1
 * @param {R} record
 * @param {K1} key1
 * @param {Replacer<NonNullable<R[K1]>>} field1Replacer
 * @param {ReplacerContext} context
 * @returns {Optional<R>}
 */
const replaceField1 = (record, key1, field1Replacer, context) => {
    const field = record?.[key1];
    if (field == null) {
        return none;
    }
    const newRecord = field1Replacer(field, context);
    if (newRecord == null) return none;

    return {
        ...record,
        [key1]: newRecord,
    };
};
/**
 * @template TRecord
 * @template {keyof TRecord} TKey1
 * @template {keyof TRecord} TKey2
 * @template {keyof TRecord} TKey3
 * @param {TRecord} record
 * @param {TKey1} key1
 * @param {Replacer<NonNullable<TRecord[TKey1]>>} field1Replacer
 * @param {TKey2} key2
 * @param {Replacer<NonNullable<TRecord[TKey2]>>} field2Replacer
 * @param {TKey3} key3
 * @param {Replacer<NonNullable<TRecord[TKey3]>>} field3Replacer
 * @param {ReplacerContext} context
 * @returns {Optional<TRecord>}
 */
const replaceField3 = (
    record,
    key1,
    field1Replacer,
    key2,
    field2Replacer,
    key3,
    field3Replacer,
    context
) => {
    const field1 = record[key1];
    const field2 = record[key2];
    const field3 = record[key3];
    const newField1 = field1 != null ? field1Replacer(field1, context) : none;
    const newField2 = field2 != null ? field2Replacer(field2, context) : none;
    const newField3 = field3 != null ? field3Replacer(field3, context) : none;

    if (newField1 === none && newField2 === none && newField3 === none) {
        return none;
    }
    return {
        ...record,
        [key1]: noneOr(field1, newField1),
        [key2]: noneOr(field2, newField2),
        [key3]: noneOr(field3, newField3),
    };
};

const selectorParser = new cssSelector.CssSelectorParser()
    .registerSelectorPseudos("has")
    .registerNestingOperators(">", "+", "~")
    .registerAttrEqualityMods("^", "$", "*", "~")
    .enableSubstitutes();

/**
 * @param {string} source
 */
const hash = (source) => {
    const sha1 = createHash("sha1");
    sha1.update(source);
    return sha1.digest("hex");
};

/** @type {Replacer<string>} */
const replaceSelectorClassName = (
    className,
    { classNameToSymbol, cssTextHash, currentRule }
) => {
    let symbol = classNameToSymbol.get(className);
    if (symbol == null) {
        /** @type {ClassNameSymbol["declarations"]} */
        const declarations = new Set();
        if (currentRule != null) {
            declarations.add(currentRule);
        }
        symbol = {
            uniqueId: `${className}-${hash(`${cssTextHash}-${className}`)}`,
            declarations,
        };
        classNameToSymbol.set(className, symbol);
    } else {
        if (currentRule != null) {
            symbol.declarations.add(currentRule);
        }
    }
    return symbol.uniqueId;
};

/** @type {Replacer<cssSelector.Selector>} */
const replaceSelectorSelector = (selector, context) =>
    selector.type === "selectors"
        ? replaceSelectorSelectors(selector, context)
        : replaceSelectorRuleSet(selector, context);

/** @type {Replacer<cssSelector.RulePseudo>} */
const replaceSelectorPseudo = (pseudo, context) => {
    if (pseudo.valueType === "selector") {
        const value = replaceSelectorSelector(pseudo.value, context);
        if (value === none) {
            return none;
        }
        return {
            ...pseudo,
            value,
        };
    }
    return none;
};

/** @type {Replacer<string[]>} */
const replaceSelectorClassNames = (classNames, context) =>
    replaceArray(replaceSelectorClassName, classNames, context);

/** @type {Replacer<cssSelector.RulePseudo[]>} */
const replaceSelectorPseudos = (pseudos, context) =>
    replaceArray(replaceSelectorPseudo, pseudos, context);

/** @type {Replacer<cssSelector.Rule>} */
const replaceSelectorRule = (rule, context) =>
    replaceField3(
        rule,
        "classNames",
        replaceSelectorClassNames,
        "pseudos",
        replaceSelectorPseudos,
        "rule",
        replaceSelectorRule,
        context
    );

/** @type {Replacer<cssSelector.Selectors>} */
const replaceSelectorSelectors = (selectors, context) =>
    replaceField1(selectors, "selectors", replaceSelectorRuleSets, context);

/** @type {Replacer<cssSelector.RuleSet>} */
const replaceSelectorRuleSet = (ruleSet, context) =>
    replaceField1(ruleSet, "rule", replaceSelectorRule, context);

/** @type {Replacer<cssSelector.RuleSet[]>} */
const replaceSelectorRuleSets = (ruleSets, context) =>
    replaceArray(replaceSelectorRuleSet, ruleSets, context);

/** @type {Replacer<string>} */
const replaceSelector = (source, context) => {
    const selector = selectorParser.parse(source);
    /** @type {Optional<typeof selector>} */
    let newSelector = none;
    if (selector.type === "selectors") {
        newSelector = replaceSelectorSelectors(selector, context);
    }
    if (selector.type === "ruleSet") {
        newSelector = replaceSelectorRuleSet(selector, context);
    }

    if (newSelector != none) {
        return selectorParser.render(newSelector);
    }
    return none;
};

/** @type {Replacer<string[]>} */
const replaceSelectors = (selectors, context) =>
    replaceArray(replaceSelector, selectors, context);

/** @type {Replacer<css.Rule>} */
const replaceRule = (rule, context) => {
    const parentRule = context.currentRule;
    try {
        context.currentRule = rule;
        return replaceField1(rule, "selectors", replaceSelectors, context);
    } finally {
        context.currentRule = parentRule;
    }
};

/** @type {Replacer<css.Media>} */
const replaceMedia = (media, context) =>
    replaceField1(media, "rules", replaceRules, context);

/** @type {Replacer<RuleSet>} */
const replaceRuleSet = (rule, context) => {
    if (is("rule", rule)) {
        return replaceRule(rule, context);
    }
    if (is("media", rule)) {
        return replaceMedia(rule, context);
    }
    return none;
};

/** @type {Replacer<RuleSet[]>} */
const replaceRules = (rules, context) =>
    replaceArray(replaceRuleSet, rules, context);

/**
 * @typedef {Object} CssReplaceResult
 * @property {string} newCssText
 * @property {ReplacerContext["classNameToSymbol"]} classNameToSymbol
 */

/**
 * @param {string} source
 * @param {string} sourcePath
 * @param {ReturnType<import("webpack").Compilation["getLogger"]>} console
 * @returns {CssReplaceResult}
 */
const replicateCssClassNames = (source, sourcePath, console) => {
    const sheet = css.parse(source, { silent: true, source: sourcePath });
    const { stylesheet } = sheet;

    // エラーがあるなら表示して終了
    const errors = stylesheet?.parsingErrors ?? [];
    if (0 < errors.length) {
        for (const error of errors) {
            console.error(error.message);
        }
        return {
            newCssText: source,
            classNameToSymbol: new Map(),
        };
    }

    // 構文木の中の selector を置き換えていく
    /** @type {ReplacerContext} */
    const context = {
        classNameToSymbol: new Map(),
        cssTextHash: hash(source),
        currentRule: null,
    };
    const newRules = replaceRules(stylesheet?.rules ?? [], context);
    /** @type {css.Stylesheet} */
    const newSheet = {
        ...sheet,
        stylesheet: {
            ...stylesheet,
            rules: newRules !== none ? newRules : [],
        },
    };

    // 構文木を文字列化
    const newCssText = css.stringify(newSheet, { compress: false });
    return {
        newCssText,
        classNameToSymbol: context.classNameToSymbol,
    };
};

/** @type {import("schema-utils/declarations/validate").Schema} */
const schema = {
    type: "object",
};

const tsIdPattern = /^[\w_$][\w_$\d]*$/;
/**
 * @param {string} value
 */
const stringifyTsFieldName = (value) => {
    return tsIdPattern.test(value) ? value : JSON.stringify(value);
};

class SourceFileBuilder {
    /** @private @readonly */ _newLine;
    /** @private @readonly */ _columnOrigin;
    /** @private @readonly @type {string[]} */ _buffer = [];

    /** @private */ _position = 0;
    /** @private */ _line;
    /** @private */ _column;

    constructor({ newLine = "\r\n", columnOrigin = 1, lineOrigin = 1 } = {}) {
        this._newLine = newLine;
        this._column = this._columnOrigin = columnOrigin;
        this._line = lineOrigin;
    }
    get position() {
        return this._position;
    }
    get line() {
        return this._line;
    }
    get column() {
        return this._column;
    }

    /**
     * @param {string} [text]
     */
    writeLine(text) {
        return this.write(text)._writeNewLine();
    }
    /**
     * @param {string} [text]
     */
    write(text = "") {
        this._buffer.push(text);
        this._position += text.length;
        this._column += text.length;
        return this;
    }
    /** @private */ _writeNewLine() {
        this._buffer.push(this._newLine);
        this._position += this._newLine.length;
        this._column = this._columnOrigin;
        this._line++;
        return this;
    }
    getPosition() {
        return {
            position: this._position,
            line: this._line,
            column: this._column,
        };
    }
    toString() {
        return this._buffer.join("");
    }
}

/** @type {import("webpack").LoaderDefinition<{}, {}>} */
module.exports = async function (contents, sourceMap, data) {
    this.cacheable();
    const console = this.getLogger();
    const options = this.getOptions();
    schemaUtils.validate(schema, options, {
        name: loaderName,
        baseDataPath: "options",
    });

    const cssPath = this.resourcePath;
    const declarationPath = cssPath + ".d.ts";
    const declarationMapPath = declarationPath + ".map";

    const { newCssText, classNameToSymbol } = replicateCssClassNames(
        contents,
        cssPath,
        console
    );

    const declarationMap = new SourceMapGenerator({
        file: declarationPath,
    });
    declarationMap.addMapping({
        generated: {
            line: 1,
            column: 0,
        },
        source: cssPath,
        original: {
            line: 1,
            column: 0,
        },
    });
    const declarationFile = new SourceFileBuilder();
    /** @type {Record<string, string>} */
    const classNameToId = Object.create(null);
    {
        const f = declarationFile;
        f.writeLine(`export const cssText: string;`);
        f.write(`declare const styles:`);

        if (classNameToSymbol.size === 0) {
            f.write(` {}`);
        } else {
            for (const [
                className,
                { uniqueId, declarations },
            ] of classNameToSymbol) {
                // css から変換された *.js ファイルに書き込まれる、クラス名から ID へのマッピングオブジェクト
                classNameToId[className] = uniqueId;

                for (const declaration of declarations) {
                    // *.d.ts ファイルにマッピングオブジェクトの型定義を書き込む
                    f.writeLine().write(`    & { readonly `);
                    const line = f.line;
                    const column = f.column - 1;
                    f.write(stringifyTsFieldName(className));
                    f.write(`: string; }`);

                    // *.d.ts ファイルの型のフィールド名から *.css ファイルの該当セレクタを含むルールへのマッピングを記録し *.d.ts.map ファイルに書き込む
                    const cssStart = declaration.position?.start;
                    const cssLine = cssStart?.line;
                    const cssColumn = cssStart?.column;
                    if (cssLine != null && cssColumn != null) {
                        declarationMap.addMapping({
                            generated: {
                                line,
                                column,
                            },
                            source: cssPath,
                            original: {
                                line: cssLine,
                                column: cssColumn - 1,
                            },
                            name: className,
                        });
                    }
                }
            }
        }
        f.writeLine(";");
        f.writeLine("export = styles;");
    }
    await fs.writeFile(declarationPath, declarationFile.toString());
    await fs.writeFile(declarationMapPath, declarationMap.toString());

    return `export const cssText = ${JSON.stringify(newCssText)};
export default ${JSON.stringify(classNameToId)};`;
};
