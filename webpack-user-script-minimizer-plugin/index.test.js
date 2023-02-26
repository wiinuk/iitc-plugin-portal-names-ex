//@ts-check
const path = require("node:path");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const glob = require("glob/sync");
const { optimizeFile } = require(".");
const { describe, it, expect } = require("@jest/globals");

describe("optimizeFile", () => {
    const testDirectoryPath = path.join(__dirname, "test-sources");
    /**
     * @param {RegExp} pattern
     * @param {string} input
     * @returns {string | undefined}
     */
    function split(pattern, input) {
        return input.split(pattern)[0];
    }
    for (const fileName of glob(testDirectoryPath + "/**/*.in.js")) {
        const basePath = split(/\.in\.js$/i, fileName) ?? "???";
        it(path.parse(basePath).name, async () => {
            const input = await fs.readFile(fileName, { encoding: "utf-8" });
            const actualOutput = await optimizeFile({
                name: fileName,
                input,
                module: undefined,
                ecma: 2020,
            });
            let expectedOutput = input;
            try {
                expectedOutput = await fs.readFile(basePath + ".out.js", {
                    encoding: "utf-8",
                });
            } catch {}

            expect(actualOutput.errors ?? []).toStrictEqual([]);
            expect(actualOutput.warnings ?? []).toStrictEqual([]);
            expect(actualOutput.code).toEqual(expectedOutput);
        });
    }
    it("孤立した .out.js が無い", async () => {
        for (const outFileName of glob(testDirectoryPath + "/**/*.out.js")) {
            const basePath = split(/\.out\.js$/i, outFileName) ?? "???";
            await fs.access(basePath + ".in.js", fsSync.constants.R_OK);
        }
    });
    it("不要なファイルがない", async () => {
        for (const fileName of glob(testDirectoryPath + "/**/*.*")) {
            expect(fileName).toMatch(/\.(in|out)\.js$/i);
        }
    });
});
