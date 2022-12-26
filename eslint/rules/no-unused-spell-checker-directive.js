// spell-checker: ignore TSESLint TSESTree
//@ts-check

/**
 * @param {RegExp} pattern
 * @param {string} target
 * @param {number} startIndex
 */
function test(pattern, target, startIndex = 0) {
    pattern.lastIndex = startIndex;
    if (pattern.test(target)) {
        const nextIndex = pattern.lastIndex;
        pattern.lastIndex = startIndex;
        return nextIndex;
    } else {
        pattern.lastIndex = startIndex;
        return false;
    }
}
/**
 * @param {RegExp} pattern
 * @param {string} target
 * @param {number=} startIndex
 */
function next(pattern, target, startIndex) {
    let indexOrFalse = test(pattern, target, startIndex);
    return indexOrFalse === false ? pattern.lastIndex : indexOrFalse;
}
/**
 * @param {string} target
 */
function escapeRegExp(target) {
    return target.replace(/[.*+?^=!:${}()|[\]\/\\]/g, "\\$&");
}

/**
 * @param {readonly import("@typescript-eslint/experimental-utils").TSESTree.Comment[]} comments
 */
function collectDirectives(comments) {
    const space = `[^\\S\\n\\r]`;
    const spaces0 = `${space}*`;
    const directiveStartPattern = new RegExp(
        `spell-checker${spaces0}:${spaces0}ignore`,
        "gi"
    );
    const triviaPattern = new RegExp(spaces0, "yi");
    const wordPattern = /\S+/iy;

    /** @type {{ start: number, end: number, triviaStart: number }[]} */
    const ignoreDirectiveWords = [];
    for (const { value, range } of comments) {
        const commentStart = range[0] + 2;

        /** @type {false | number} */
        let index = 0;
        for (
            let directiveStartIndex = index;
            (index = test(directiveStartPattern, value, index)) !== false;
            directiveStartIndex = index
        ) {
            let triviaStartIndex = index;
            index = next(triviaPattern, value, index);

            for (
                let wordStartIndex = index;
                (index = test(wordPattern, value, index)) !== false;
                wordStartIndex = index
            ) {
                const wordEndIndex = index;

                ignoreDirectiveWords.push({
                    triviaStart: commentStart + triviaStartIndex,
                    start: commentStart + wordStartIndex,
                    end: commentStart + wordEndIndex,
                });

                triviaStartIndex = index;
                index = next(triviaPattern, value, index);
            }
            index = wordPattern.lastIndex;
        }
    }
    return { ignoreDirectiveWords };
}

/**
 * @typedef {"this_ignore_word_is_unused"} MessageIds
 */

/** @type {import("@typescript-eslint/experimental-utils").TSESLint.RuleModule<MessageIds>} */
const rule = {
    meta: {
        docs: {
            description: "Remove unused spell checker directives.",
            recommended: "warn",
            suggestion: true,
        },
        fixable: "code",
        hasSuggestions: true,
        messages: {
            this_ignore_word_is_unused: "Ignore word '{{ name }}' is unused.",
        },
        schema: null,
        type: "suggestion",
    },
    create(context) {
        const sourceCode = context.getSourceCode();
        const comments = sourceCode.getAllComments();
        const sourceText = sourceCode.text;
        return {
            Program() {
                const { ignoreDirectiveWords } = collectDirectives(comments);

                const ignoreDirectiveWordEnds = new Set(
                    ignoreDirectiveWords.map((r) => r.end)
                );

                for (const {
                    triviaStart,
                    start,
                    end,
                } of ignoreDirectiveWords) {
                    const ignoreWord = sourceCode.text.slice(start, end);
                    const ignoreWordPattern = new RegExp(
                        escapeRegExp(ignoreWord),
                        "gi"
                    );

                    /** @type {number | false} */
                    let index = 0;
                    while (
                        (index = test(ignoreWordPattern, sourceText, index)) !==
                            false &&
                        ignoreDirectiveWordEnds.has(index)
                    ) {}
                    if (index !== false) continue;

                    context.report({
                        loc: {
                            start: sourceCode.getLocFromIndex(start),
                            end: sourceCode.getLocFromIndex(end),
                        },
                        messageId: "this_ignore_word_is_unused",
                        data: {
                            name: ignoreWord,
                        },
                        fix(fixer) {
                            return fixer.removeRange([triviaStart, end]);
                        },
                    });
                }
            },
        };
    },
};
module.exports = rule;
