// spell-checker: ignore cacheable csstools
// @ts-check
const schemaUtils = require("schema-utils");
const fs = require("fs/promises");
const { createHash } = require("crypto");
const { SourceMapGenerator } = require("source-map");
const tokenizer = require("@csstools/tokenizer");

const loaderName = "Dynamic css loader";

/**
 * @typedef {Object} LineAndCharacter
 * @property {number} line
 * @property {number} character
 *
 * @typedef {Object} TokenLocation
 * @property {LineAndCharacter} start
 * @property {LineAndCharacter} end
 *
 * @typedef {Object} ClassNameSymbol
 * @property {string} uniqueId
 * @property {TokenLocation[]} declarations
 */

/**
 * @param {string} source
 */
const hash = (source) => {
    const sha1 = createHash("sha1");
    sha1.update(source);
    return sha1.digest("hex");
};

/**
 * @param {Map<string, ClassNameSymbol>} classNameToSymbol
 * @param {string} className
 * @param {TokenLocation} declaration
 * @param {string} cssTextHash
 */
const addDeclaration = (
    classNameToSymbol,
    className,
    declaration,
    cssTextHash
) => {
    let symbol = classNameToSymbol.get(className);
    if (symbol == null) {
        /** @type {ClassNameSymbol["declarations"]} */
        const declarations = [];
        if (declaration != null) {
            declarations.push(declaration);
        }
        symbol = {
            uniqueId: `${className}-${hash(`${cssTextHash}-${className}`)}`,
            declarations,
        };
        classNameToSymbol.set(className, symbol);
    } else {
        if (declaration != null) {
            symbol.declarations.push(declaration);
        }
    }
    return symbol;
};

// from tsc
const carriageReturn = 0x0d;
const lineFeed = 0x0a;
const maxAsciiCharacter = 0x7f;
const lineSeparator = 0x2028;
const paragraphSeparator = 0x2029;
/**
 * @param {number} ch
 */
const isLineBreak = (ch) =>
    ch === lineFeed ||
    ch === carriageReturn ||
    ch === lineSeparator ||
    ch === paragraphSeparator;
/**
 * @param {string} text
 */
const computeLineStarts = (text) => {
    /** @type {number[]} */
    const result = [];
    let pos = 0;
    let lineStart = 0;
    while (pos < text.length) {
        const ch = text.charCodeAt(pos);
        pos++;
        switch (ch) {
            case carriageReturn:
                if (text.charCodeAt(pos) === lineFeed) {
                    pos++;
                }
            // falls through
            case lineFeed:
                result.push(lineStart);
                lineStart = pos;
                break;
            default:
                if (ch > maxAsciiCharacter && isLineBreak(ch)) {
                    result.push(lineStart);
                    lineStart = pos;
                }
                break;
        }
    }
    result.push(lineStart);
    return result;
};
/**
 * @template {boolean | number | string | bigint} T
 * @param {readonly T[]} array
 * @param {T} key
 * @param {number} [offset]
 */
const binarySearch = (array, key, offset) => {
    if (array.length <= 0) {
        return -1;
    }

    let low = offset || 0;
    let high = array.length - 1;
    while (low <= high) {
        const middle = low + ((high - low) >> 1);
        const midKey = array[middle];
        if (midKey < key) {
            low = middle + 1;
        } else if (midKey === key) {
            return middle;
        } else {
            high = middle - 1;
        }
    }
    return ~low;
};
/**
 * @param {readonly number[]} lineStarts
 * @param {number} position
 * @param {number} [lowerBound]
 */
const computeLineOfPosition = (lineStarts, position, lowerBound) => {
    let lineNumber = binarySearch(lineStarts, position, lowerBound);
    if (lineNumber < 0) {
        lineNumber = ~lineNumber - 1;
    }
    return lineNumber;
};
/**
 * @param {readonly number[]} lineStarts
 * @param {number} position
 */
const computeLineAndCharacterOfPosition = (lineStarts, position) => {
    const lineNumber = computeLineOfPosition(lineStarts, position);
    return {
        line: lineNumber,
        character: position - lineStarts[lineNumber],
    };
};

/**
 * @typedef {Object} CssReplaceResult
 * @property {string} newCssText
 * @property {Map<string, ClassNameSymbol>} classNameToSymbol
 */

const TokenType = Object.freeze({
    Symbol: 1,
    Word: 4,
});

/**
 * @param {string} source
 * @param {string} sourcePath
 * @param {ReturnType<import("webpack").Compilation["getLogger"]>} console
 * @returns {CssReplaceResult}
 */
const replicateCssClassNames = (source, sourcePath, console) => {
    const cssTextHash = hash(source);
    /** @type {number[] | null} */
    let lineStarts = null;
    /**
     * @param {number} position
     */
    const positionToLineAndCharacter = (position) =>
        computeLineAndCharacterOfPosition(
            (lineStarts ??= computeLineStarts(source)),
            position
        );

    /** @type {Map<string, ClassNameSymbol>} */
    const classNameToSymbol = new Map();
    let newCssText = "";
    let sliceStart = 0;
    let sliceEnd = 0;
    /**
     *
     * @param {tokenizer.CSSToken | null} prevToken
     * @param {tokenizer.CSSToken} token
     * @param {tokenizer.CSSToken | null} nextToken
     */
    const copyToken = (prevToken, token, nextToken) => {
        const tokenStart = token.tick;
        const tokenEnd = nextToken?.tick ?? source.length;
        if (
            prevToken?.type === TokenType.Symbol &&
            prevToken?.data === "." &&
            token.type === TokenType.Word
        ) {
            // class: '.' IDENT
            const declaration = {
                start: positionToLineAndCharacter(tokenStart),
                end: positionToLineAndCharacter(tokenEnd),
            };
            const symbol = addDeclaration(
                classNameToSymbol,
                token.data,
                declaration,
                cssTextHash
            );
            newCssText += source.slice(sliceStart, sliceEnd);
            newCssText += symbol.uniqueId;
            sliceStart = sliceEnd = tokenEnd;
        } else {
            sliceEnd = tokenEnd;
        }
    };
    /** @type {tokenizer.CSSToken | null} */
    let prevToken = null;
    /** @type {tokenizer.CSSToken | null} */
    let token = null;
    for (const nextToken of tokenizer.tokenize(source)) {
        if (token !== null) {
            copyToken(prevToken, token, nextToken);
        }
        prevToken = token;
        token = nextToken;
    }
    if (token != null) {
        copyToken(prevToken, token, null);
    }
    if (sliceStart !== sliceEnd) {
        newCssText += source.slice(sliceStart, sliceEnd);
    }
    return {
        newCssText,
        classNameToSymbol,
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
                    const column = f.column;
                    f.write(stringifyTsFieldName(className));
                    f.write(`: string; }`);

                    // *.d.ts ファイルの型のフィールド名から *.css ファイルの該当セレクタを含むルールへのマッピングを記録し *.d.ts.map ファイルに書き込む
                    const cssStart = declaration.start;
                    const cssLine = cssStart.line;
                    const cssCharacter = cssStart.character;
                    declarationMap.addMapping({
                        generated: {
                            line,
                            column,
                        },
                        source: cssPath,
                        original: {
                            line: cssLine + 1,
                            column: cssCharacter,
                        },
                        name: className,
                    });
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
