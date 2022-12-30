// spell-checker: ignore
// @ts-check
const schemaUtils = require("schema-utils");
const modularize = require("./modularize");
const { renderFieldName } = require("./js-syntax");
const SourceFileBuilder = require("./source-file-builder");

const loaderName = "Typed css module plugin loader";

/** @type {import("schema-utils/declarations/validate").Schema} */
const schema = {
    type: "object",
};

/** @type {import("webpack").LoaderDefinition<{}, {}>} */
module.exports = async function (cssContents, sourceMap, data) {
    const options = this.getOptions();
    schemaUtils.validate(schema, options, {
        name: loaderName,
        baseDataPath: "options",
    });

    const { newCssText, classNameToSymbol } = modularize(cssContents);
    const f = new SourceFileBuilder();
    f.write(`export const cssText = `)
        .write(JSON.stringify(newCssText))
        .writeLine(`;`);
    f.write(`export default `);

    if (classNameToSymbol.size === 0) {
        f.write(`{}`);
    } else {
        f.writeLine(`{`);
        for (const [className, { uniqueId }] of classNameToSymbol) {
            f.write(`    `)
                .write(renderFieldName(className))
                .write(": ")
                .write(JSON.stringify(uniqueId))
                .writeLine(",");
        }
        f.write(`}`);
    }
    f.writeLine(`;`);
    return f.toString();
};
