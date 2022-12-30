// spell-checker: ignore csstools
// @ts-check
const { createHash } = require("node:crypto");
const tokenizer = require("@csstools/tokenizer");
const {
    computeLineAndCharacterOfPosition,
    computeLineStarts,
} = require("./line-map");

/**
 * @typedef {Object} LineAndCharacter
 * @property {number} line 0-based
 * @property {number} character 0-based
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

const TokenType = Object.freeze({
    Symbol: 1,
    Word: 4,
});

/**
 * @typedef {Object} CssReplaceResult
 * @property {string} newCssText
 * @property {Map<string, ClassNameSymbol>} classNameToSymbol
 */

/**
 * @param {string} source
 * @returns {CssReplaceResult}
 */
const modularize = (source) => {
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

module.exports = modularize;
