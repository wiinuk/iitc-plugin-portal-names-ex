//@ts-check
const UserScriptPlugin = require("./webpack-user-script-plugin");
const { name: packageName } = require("./package.json");
const webpack = require("webpack");
const path = require("path");

const entry = `./source/${packageName}.user.ts`;

/** @type {import("webpack").Configuration} */
const config = {
    mode: "production",
    entry,
    plugins: [
        new webpack.DefinePlugin({
            "process.browser": true,
        }),
        UserScriptPlugin,
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: path.resolve("./webpack-dynamic-css-loader.js"),
                        options: {},
                    },
                ],
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
    optimization: {
        minimize: false,
    },
    output: {
        path: __dirname,
        filename: `${packageName}.user.js`,
    },
};
module.exports = config;
