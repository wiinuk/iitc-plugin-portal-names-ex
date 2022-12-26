import packageJson from "../package.json";
import { error } from "./standard-extensions";
export function waitElementLoaded() {
    if (document.readyState !== "loading") {
        return Promise.resolve();
    }
    return new Promise<void>((resolve) =>
        document.addEventListener("DOMContentLoaded", () => resolve())
    );
}

type CssSourceParts = string | number;
let styleElement: HTMLStyleElement | null = null;
export function addStyle(css: string): void;
export function addStyle(
    template: TemplateStringsArray,
    ...substitutions: CssSourceParts[]
): void;
export function addStyle(
    cssOrTemplate: TemplateStringsArray | string,
    ...substitutions: CssSourceParts[]
) {
    const css =
        typeof cssOrTemplate === "string"
            ? cssOrTemplate
            : String.raw(cssOrTemplate, ...substitutions);

    if (styleElement == null) {
        styleElement = document.createElement("style");
        document.head.appendChild(styleElement);
    }
    styleElement.textContent += css + "\n";
    document.head.appendChild(styleElement);
}
function addScript(url: string) {
    return new Promise<Event>((onSuccess, onError) => {
        const script = document.createElement("script");
        script.onload = onSuccess;
        script.onerror = onError;
        document.head.appendChild(script);
        script.src = url;
    });
}
export async function loadPackageScript<
    TName extends keyof typeof packageJson.dependencies
>(name: TName, path: string) {
    function getVersion(dependency: string) {
        if (dependency === "" || dependency === "*") {
            return "latest";
        }
        for (const range of dependency.split("||")) {
            // `2.2 - 3.5` = `>=2.2 <=3.5`
            const version2 = /^([^\s]+)\s+-\s+([^\s]+)$/.exec(range)?.[1];
            if (version2 != null) {
                return version2;
            }
            const singleVersion = /^\s*((~|^|>=|<=)?[^\s]+)\s*$/.exec(
                dependency
            )?.[0];
            // `5.x`, `^5.2`, `~5.2`, `<=5.2`, `>5.2` などは cdn で処理されるので変換不要
            if (singleVersion != null) {
                return singleVersion;
            }

            // `>=2.2 <=3.5` など複雑な指定子は非対応
            return error`非対応のバージョン指定子 ( ${dependency} ) です。`;
        }
        return error`ここには来ない`;
    }
    function getPackageBaseUrl(name: string, dependency: string) {
        // url
        if (/^(https?:\/\/|file:)/.test(dependency)) {
            return dependency;
        }
        // ローカルパス
        if (/^(\.\.\/|~\/|\.\/|\/)/.test(dependency)) {
            return `file:${dependency}`;
        }
        // git
        if (/^git(\+(ssh|https))?:\/\//.test(dependency)) {
            return error`git URL 依存関係は対応していません。`;
        }
        // github
        if (/^[^\\]+\/.+$/.test(dependency)) {
            return error`github URL 依存関係は対応していません。`;
        }

        // 普通のバージョン指定
        const version = getVersion(dependency);
        return `https://cdn.jsdelivr.net/npm/${name}@${version}`;
    }
    const dependency = packageJson.dependencies[name];
    const baseUrl = getPackageBaseUrl(name, dependency);
    const url = `${baseUrl}/${path}`;
    await addScript(url);
    console.debug(`${url} からスクリプトを読み込みました`);
    return;
}

let parseCssColorTemp: HTMLElement | null = null;
let parseCssColorRegex: RegExp | null = null;
export function parseCssColor(
    cssColor: string,
    result = { r: 0, g: 0, b: 0, a: 0 }
) {
    const d = (parseCssColorTemp ??= document.createElement("div"));
    d.style.color = cssColor;
    const m = d.style
        .getPropertyValue("color")
        .match(
            (parseCssColorRegex ??=
                /^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)$/i)
        );

    if (!m) {
        return error`color "${cssColor}" is could not be parsed.`;
    }
    const [, r, g, b, a] = m;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    result.r = parseInt(r!);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    result.g = parseInt(g!);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    result.b = parseInt(b!);
    result.a = a === undefined ? 1 : parseFloat(a);
    return result;
}
