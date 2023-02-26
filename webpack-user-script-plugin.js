//@ts-check
const Path = require("node:path");
const webpack = require("webpack");

const PluginName = "WebpackUserScriptPlugin";
const headerPattern =
    /(?=(^|\n))\s*\/\/\s*==UserScript==[^\n]\n((.|\r\n)*?)\r\n\s*\/\/\s*==\/UserScript==[^\n]*(\n|$)/i;
const indentedSingleLineCommentStartPattern = /(?<=(^|\n))\s+\/\//g;

/** @type {import("webpack").WebpackPluginFunction} */
module.exports = (compiler) =>
    compiler.hooks.emit.tapPromise(PluginName, async (compilation) => {
        for (const chunk of compilation.chunks) {
            if (!chunk.canBeInitial()) {
                continue;
            }

            for (const fileName of chunk.files) {
                if (Path.extname(fileName) !== ".js") {
                    continue;
                }

                const contents = compilation.assets[fileName]
                    .source()
                    .toString();
                const headerMatch = contents.match(headerPattern);
                if (headerMatch == null) {
                    continue;
                }

                let headerContents = headerMatch[0];
                const contentsWithoutHeader = contents.replace(
                    headerPattern,
                    ""
                );
                headerContents = headerContents.replace(
                    indentedSingleLineCommentStartPattern,
                    "//"
                );
                compilation.updateAsset(
                    fileName,
                    new webpack.sources.ConcatSource(
                        headerContents,
                        "\n",
                        contentsWithoutHeader
                    )
                );
            }
        }
    });
