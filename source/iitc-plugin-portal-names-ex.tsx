// spell-checker: ignore
import {
    addStyle,
    loadPackageScript,
    parseCssColor,
    waitElementLoaded,
} from "./document-extensions";
import type * as L from "leaflet";
import { error } from "./standard-extensions";

function handleAsyncError(promise: Promise<void>) {
    promise.catch((error) => console.error(error));
}

async function asyncMain() {
    const {
        L = error`leaflet を先に読み込んでください`,
        map = error`デフォルトマップがありません`,
    } = unsafeWindow as WindowForContentScope;

    const namespace = "iitc-plugin-portal-names-ex";
    const Names = Object.freeze({
        hidden: `${namespace}-hidden`,
    });
    const css = `
        `;

    await waitElementLoaded();

    L.Icon.Default.imagePath = `https://unpkg.com/leaflet@${L.version}/dist/images/`;
    addStyle(css);
}
export function main() {
    handleAsyncError(asyncMain());
}
