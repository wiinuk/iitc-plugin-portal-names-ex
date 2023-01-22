
// ==UserScript==
// @id           iitc-plugin-portal-names-ex@wiinuk
// @name         IITC plugin: Portal Names Ex
// @category     Controls
// @namespace    https://github.com/IITC-CE/ingress-intel-total-conversion
// @downloadURL  https://github.com/wiinuk/iitc-plugin-portal-names-ex/raw/master/iitc-plugin-portal-names-ex.user.js
// @updateURL    https://github.com/wiinuk/iitc-plugin-portal-names-ex/raw/master/iitc-plugin-portal-names-ex.user.js
// @homepageURL  https://github.com/wiinuk/iitc-plugin-portal-names-ex
// @version      0.3.0
// @description  Display the name of the portal on the map
// @author       Wiinuk
// @include      https://*.ingress.com/intel*
// @include      http://*.ingress.com/intel*
// @match        https://*.ingress.com/intel*
// @match        http://*.ingress.com/intel*
// @include      https://*.ingress.com/mission/*
// @include      http://*.ingress.com/mission/*
// @match        https://*.ingress.com/mission/*
// @match        http://*.ingress.com/mission/*
// @icon         https://www.google.com/s2/favicons?domain=iitc.me
// @grant        GM_info
// ==/UserScript==

/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

// NAMESPACE OBJECT: ./source/iitc-plugin-portal-names-ex.tsx
var iitc_plugin_portal_names_ex_namespaceObject = {};
__webpack_require__.r(iitc_plugin_portal_names_ex_namespaceObject);
__webpack_require__.d(iitc_plugin_portal_names_ex_namespaceObject, {
  "main": () => (main)
});

;// CONCATENATED MODULE: ./package.json
const package_namespaceObject = {};
;// CONCATENATED MODULE: ./source/standard-extensions.ts
function standard_extensions_error(template, ...substitutions) {
    const message = String.raw(template, ...substitutions.map((x) => typeof x === "string" ? x : JSON.stringify(x)));
    throw new Error(message);
}
function exhaustive(value) {
    return standard_extensions_error `unexpected value: ${value}`;
}
function id(x) {
    return x;
}
function ignore(..._args) {
    /* 引数を無視する関数 */
}
let ignoreReporterCache;
function createProgressReporter(progress, total) {
    class MessagedProgressEvent extends ProgressEvent {
        constructor(message, options) {
            super("message", options);
            this.message = message;
        }
    }
    if (progress === undefined) {
        return (ignoreReporterCache !== null && ignoreReporterCache !== void 0 ? ignoreReporterCache : (ignoreReporterCache = {
            next: ignore,
            done: ignore,
        }));
    }
    let loaded = 0;
    return {
        next(message) {
            loaded = Math.max(loaded + 1, total);
            progress(new MessagedProgressEvent(message, {
                lengthComputable: true,
                loaded,
                total,
            }));
        },
        done(message) {
            progress(new MessagedProgressEvent(message, {
                lengthComputable: true,
                loaded: total,
                total,
            }));
        },
    };
}
class AbortError extends Error {
    constructor(message) {
        super(message);
        this.name = "AbortError";
    }
}
function newAbortError(message = "The operation was aborted.") {
    if (typeof DOMException === "function") {
        return new DOMException(message, "AbortError");
    }
    else {
        return new AbortError(message);
    }
}
function throwIfAborted(signal) {
    if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
        throw newAbortError();
    }
}
function sleep(milliseconds, option) {
    return new Promise((resolve, reject) => {
        const signal = option === null || option === void 0 ? void 0 : option.signal;
        if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
            reject(newAbortError());
            return;
        }
        const onAbort = signal
            ? () => {
                clearTimeout(id);
                reject(newAbortError());
            }
            : ignore;
        const id = setTimeout(() => {
            signal === null || signal === void 0 ? void 0 : signal.removeEventListener("abort", onAbort);
            resolve();
        }, milliseconds);
        signal === null || signal === void 0 ? void 0 : signal.addEventListener("abort", onAbort);
    });
}
function microYield() {
    return Promise.resolve();
}
function cancelToReject(promise, onCancel = ignore) {
    return promise.catch((e) => {
        if (e instanceof Error && e.name === "AbortError") {
            return onCancel();
        }
        throw e;
    });
}
function createAsyncCancelScope(handleAsyncError) {
    let lastCancel = new AbortController();
    return (process) => {
        // 前の操作をキャンセル
        lastCancel.abort();
        lastCancel = new AbortController();
        handleAsyncError(
        // キャンセル例外を無視する
        cancelToReject(process(lastCancel.signal)));
    };
}
function assertTrue() {
    // 型レベルアサーション関数
}

;// CONCATENATED MODULE: ./source/document-extensions.ts
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};


function waitElementLoaded() {
    if (document.readyState !== "loading") {
        return Promise.resolve();
    }
    return new Promise((resolve) => document.addEventListener("DOMContentLoaded", () => resolve()));
}
let styleElement = null;
function addStyle(cssOrTemplate, ...substitutions) {
    const css = typeof cssOrTemplate === "string"
        ? cssOrTemplate
        : String.raw(cssOrTemplate, ...substitutions);
    if (styleElement == null) {
        styleElement = document.createElement("style");
        document.head.appendChild(styleElement);
    }
    styleElement.textContent += css + "\n";
    document.head.appendChild(styleElement);
}
function addScript(url) {
    return new Promise((onSuccess, onError) => {
        const script = document.createElement("script");
        script.onload = onSuccess;
        script.onerror = onError;
        document.head.appendChild(script);
        script.src = url;
    });
}
function loadPackageScript(name, path) {
    return __awaiter(this, void 0, void 0, function* () {
        function getVersion(dependency) {
            var _a, _b;
            if (dependency === "" || dependency === "*") {
                return "latest";
            }
            for (const range of dependency.split("||")) {
                // `2.2 - 3.5` = `>=2.2 <=3.5`
                const version2 = (_a = /^([^\s]+)\s+-\s+([^\s]+)$/.exec(range)) === null || _a === void 0 ? void 0 : _a[1];
                if (version2 != null) {
                    return version2;
                }
                const singleVersion = (_b = /^\s*((~|^|>=|<=)?[^\s]+)\s*$/.exec(dependency)) === null || _b === void 0 ? void 0 : _b[0];
                // `5.x`, `^5.2`, `~5.2`, `<=5.2`, `>5.2` などは cdn で処理されるので変換不要
                if (singleVersion != null) {
                    return singleVersion;
                }
                // `>=2.2 <=3.5` など複雑な指定子は非対応
                return error `非対応のバージョン指定子 ( ${dependency} ) です。`;
            }
            return error `ここには来ない`;
        }
        function getPackageBaseUrl(name, dependency) {
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
                return error `git URL 依存関係は対応していません。`;
            }
            // github
            if (/^[^\\]+\/.+$/.test(dependency)) {
                return error `github URL 依存関係は対応していません。`;
            }
            // 普通のバージョン指定
            const version = getVersion(dependency);
            return `https://cdn.jsdelivr.net/npm/${name}@${version}`;
        }
        const dependency = packageJson.dependencies[name];
        const baseUrl = getPackageBaseUrl(name, dependency);
        const url = `${baseUrl}/${path}`;
        yield addScript(url);
        console.debug(`${url} からスクリプトを読み込みました`);
        return;
    });
}
let parseCssColorTemp = null;
let parseCssColorRegex = null;
function parseCssColor(cssColor, result = { r: 0, g: 0, b: 0, a: 0 }) {
    const d = (parseCssColorTemp !== null && parseCssColorTemp !== void 0 ? parseCssColorTemp : (parseCssColorTemp = document.createElement("div")));
    d.style.color = cssColor;
    const m = d.style
        .getPropertyValue("color")
        .match((parseCssColorRegex !== null && parseCssColorRegex !== void 0 ? parseCssColorRegex : (parseCssColorRegex = /^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)$/i)));
    if (!m) {
        return error `color "${cssColor}" is could not be parsed.`;
    }
    const [, r, g, b, a] = m;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    result.r = parseInt(r);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    result.g = parseInt(g);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    result.b = parseInt(b);
    result.a = a === undefined ? 1 : parseFloat(a);
    return result;
}

;// CONCATENATED MODULE: ./source/styles.module.css
const cssText = ".name-icon-92bfd34773a04de7e8a2380986cff971b2315310 {\r\n    color: #FFFFBB;\r\n    font-size: 11px;\r\n    line-height: 12px;\r\n    text-align: center;\r\n    padding: 2px;\r\n    overflow: hidden;\r\n    text-shadow: 1px 1px #000, 1px -1px #000, -1px 1px #000, -1px -1px #000, 0 0 5px #000;\r\n}\r\n";
/* harmony default export */ const styles_module = ({
    "name-icon": "name-icon-92bfd34773a04de7e8a2380986cff971b2315310",
});

;// CONCATENATED MODULE: ./source/iitc-plugin-portal-names-ex.tsx
var iitc_plugin_portal_names_ex_awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// spell-checker: ignore zoomend overlayadd overlayremove guids



function handleAsyncError(promise) {
    promise.catch((error) => console.error(error));
}
function main() {
    handleAsyncError(asyncMain());
}
const NAME_WIDTH = 80;
const NAME_HEIGHT = 23;
const labelLayers = new Map();
let labelLayerGroup;
let iitc_plugin_portal_names_ex_window;
function asyncMain() {
    return iitc_plugin_portal_names_ex_awaiter(this, void 0, void 0, function* () {
        const { L = standard_extensions_error `leaflet を先に読み込んでください`, map = standard_extensions_error `デフォルトマップがありません`, } = unsafeWindow;
        iitc_plugin_portal_names_ex_window = unsafeWindow;
        yield waitElementLoaded();
        L.Icon.Default.imagePath = `https://unpkg.com/leaflet@${L.version}/dist/images/`;
        addStyle(cssText);
        labelLayerGroup = new L.LayerGroup();
        iitc_plugin_portal_names_ex_window.addLayerGroup("Portal Names Ex", labelLayerGroup, true);
        iitc_plugin_portal_names_ex_window.addHook("requestFinished", () => void setTimeout(() => delayedUpdatePortalLabels(3.0), 1));
        iitc_plugin_portal_names_ex_window.addHook("mapDataRefreshEnd", () => delayedUpdatePortalLabels(0.5));
        map.on("overlayadd overlayremove", () => setTimeout(() => delayedUpdatePortalLabels(1.0), 1));
        map.on("zoomend", clearAllPortalLabels);
    });
}
function removeLabel(guid) {
    const previousLayer = labelLayers.get(guid);
    if (previousLayer) {
        labelLayerGroup.removeLayer(previousLayer);
        labelLayers.delete(guid);
    }
}
function addLabel(guid, portal) {
    const previousLayer = labelLayers.get(guid);
    if (!previousLayer) {
        const portalName = portal.options.data.title;
        const label = L.marker(portal.getLatLng(), {
            icon: L.divIcon({
                className: styles_module["name-icon"],
                iconAnchor: [NAME_WIDTH / 2, 0],
                iconSize: [NAME_WIDTH, NAME_HEIGHT],
                html: portalName,
            }),
        });
        labelLayers.set(guid, label);
        labelLayerGroup.addLayer(label);
        // label のプライベートフィールドを取得
        // TODO:
        if ("_icon" in label && label._icon instanceof HTMLElement) {
            // タイトルをクリックしたときポータルを選択する
            label._icon.addEventListener("click", () => { var _a; return (_a = iitc_plugin_portal_names_ex_window.portals[guid]) === null || _a === void 0 ? void 0 : _a.fireEvent("click"); });
        }
    }
}
function clearAllPortalLabels() {
    for (const guid of labelLayers.keys()) {
        removeLabel(guid);
    }
}
function setPortalPoints(portalPoints, progress) {
    progress === null || progress === void 0 ? void 0 : progress("update layers", "begin");
    // 不要なものを削除し
    for (const guid of labelLayers.keys()) {
        if (!portalPoints.has(guid)) {
            removeLabel(guid);
        }
    }
    // 必要なものを追加する
    portalPoints.forEach(({ portal }, guid) => {
        addLabel(guid, portal);
    });
    progress === null || progress === void 0 ? void 0 : progress("update layers", "end");
}
function updatePortalLabels(options) {
    return iitc_plugin_portal_names_ex_awaiter(this, void 0, void 0, function* () {
        const signal = options === null || options === void 0 ? void 0 : options.signal;
        const progress = options === null || options === void 0 ? void 0 : options.progress;
        // レイヤーを切り替えるたびに呼び出されるので、レイヤーがオフのときにやっても意味がない
        if (!map.hasLayer(labelLayerGroup)) {
            return;
        }
        progress === null || progress === void 0 ? void 0 : progress("collect portals", "begin");
        const portalPoints = new Map();
        for (const guid in iitc_plugin_portal_names_ex_window.portals) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const portal = iitc_plugin_portal_names_ex_window.portals[guid];
            if (portal._map && portal.options.data.title) {
                // 地図に追加されたポータルで、タイトルがあるもののみを対象とする
                const point = map.project(portal.getLatLng());
                portalPoints.set(guid, { point, portal });
            }
        }
        progress === null || progress === void 0 ? void 0 : progress("collect portals", "end");
        progress === null || progress === void 0 ? void 0 : progress("portal count", portalPoints.size);
        signal === null || signal === void 0 ? void 0 : signal.throwIfAborted();
        progress === null || progress === void 0 ? void 0 : progress("filter portals", "begin");
        // 交差点のテストを効率的に行うために、ラベルサイズに基づいてポータルをバケットにグループ化する。
        const buckets = new Map();
        for (const [guid, portal] of portalPoints) {
            yield microYield();
            signal === null || signal === void 0 ? void 0 : signal.throwIfAborted();
            const bucketId = L.point(Math.floor(portal.point.x / (NAME_WIDTH * 2)), Math.floor(portal.point.y / NAME_HEIGHT));
            // この方法では、重複をテストするときに、特定のポータルを囲む8つのバケットすべてをテストする必要はなく、そのポータルが入っているバケットそのものだけをテストします。
            const bucketIds = [
                bucketId,
                bucketId.add(L.point(1, 0)),
                bucketId.add(L.point(0, 1)),
                bucketId.add(L.point(1, 1)),
            ];
            for (const bucketId of bucketIds) {
                const b = bucketId.toString();
                let bucket = buckets.get(b);
                if (!bucket) {
                    buckets.set(b, (bucket = new Map()));
                }
                bucket.set(guid, portal);
            }
        }
        const coveredPortals = new Set();
        for (const bucketGuids of buckets.values()) {
            yield microYield();
            signal === null || signal === void 0 ? void 0 : signal.throwIfAborted();
            for (const [guid, { point }] of bucketGuids) {
                // テストに使用した境界は、ポータル名マーカの2倍の幅です。これは、2つの異なるポータルテキスト間で左右の重なりがないようにするためです。
                const largeBounds = L.bounds(point.subtract(L.point(NAME_WIDTH, 0)), point.add(L.point(NAME_WIDTH, NAME_HEIGHT)));
                for (const [otherGuid, { point: otherPoint }] of bucketGuids) {
                    if (guid !== otherGuid) {
                        if (largeBounds.contains(otherPoint)) {
                            // 別のポータルは、このポータルの名前の矩形内にある - だから、このポータルの名前はない
                            coveredPortals.add(guid);
                            break;
                        }
                    }
                }
            }
        }
        for (const guid of coveredPortals) {
            portalPoints.delete(guid);
        }
        progress === null || progress === void 0 ? void 0 : progress("filter portals", "end");
        progress === null || progress === void 0 ? void 0 : progress("portal count", portalPoints.size);
        yield microYield();
        signal === null || signal === void 0 ? void 0 : signal.throwIfAborted();
        setPortalPoints(portalPoints);
    });
}
const reportUpdateProgress = (arg0, arg1, ...argTail) => {
    if (arg1 === "begin") {
        console.time(arg0);
    }
    else if (arg1 === "end") {
        console.timeEnd(arg0);
    }
    else {
        console.log(arg0, arg1, ...argTail);
    }
};
const portalLabelsUpdateScope = createAsyncCancelScope(handleAsyncError);
// ポータルマーカーがたくさん表示されている場合、その計算には時間がかかるので、短いタイマーで計算するようにしました。
function delayedUpdatePortalLabels(wait) {
    portalLabelsUpdateScope((signal) => iitc_plugin_portal_names_ex_awaiter(this, void 0, void 0, function* () {
        yield sleep(wait * 1000, { signal });
        yield updatePortalLabels({ signal, progress: reportUpdateProgress });
    }));
}

;// CONCATENATED MODULE: ./source/iitc-plugin-portal-names-ex.user.ts
unsafeWindow["_iitc-plugin-portal-names-ex-4ca476d5-60f5-44f5-a05d-987aab44d3a9"] = iitc_plugin_portal_names_ex_namespaceObject;
// 文字列化され、ドキュメントに注入されるラッパー関数
// このため、通常のクロージャーのルールはここでは適用されない
function wrapper(plugin_info) {
    var _a;
    const window = globalThis.window;
    // window.plugin が存在することを確認する
    if (typeof window.plugin !== "function") {
        window.plugin = function () {
            // マーカー関数
        };
    }
    // メタデータを追加する
    plugin_info.dateTimeVersion = "20221226000000";
    plugin_info.pluginId = "portal-names-ex";
    // setup 内で IITC はロード済みと仮定できる
    const setup = function setup() {
        const pluginModule = window["_iitc-plugin-portal-names-ex-4ca476d5-60f5-44f5-a05d-987aab44d3a9"];
        if (pluginModule == null) {
            console.error(`${plugin_info.pluginId}: メインモジュールが読み込まれていません。`);
            return;
        }
        pluginModule.main();
    };
    setup.info = plugin_info;
    // 起動用フックを追加
    ((_a = window.bootPlugins) !== null && _a !== void 0 ? _a : (window.bootPlugins = [])).push(setup);
    // IITC がすでに起動している場合 `setup` 関数を実行する
    if (window.iitcLoaded && typeof setup === "function")
        setup();
}
// UserScript のヘッダからプラグイン情報を取得する
const info = {};
if (typeof GM_info !== "undefined" && GM_info && GM_info.script) {
    info.script = {
        version: GM_info.script.version,
        name: GM_info.script.name,
        description: GM_info.script.description,
    };
}
// wrapper 関数を文字列化して DOM 内で実行する
const script = document.createElement("script");
script.append(`(${wrapper})(${JSON.stringify(info)})`);
(document.body || document.head || document.documentElement).appendChild(script);

/******/ })()
;