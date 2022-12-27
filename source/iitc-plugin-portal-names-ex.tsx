import { addStyle, waitElementLoaded } from "./document-extensions";
import { error } from "./standard-extensions";
import classNames, { cssText } from "./styles.module.css";

function handleAsyncError(promise: Promise<void>) {
    promise.catch((error) => console.error(error));
}

async function asyncMain() {
    const {
        L = error`leaflet を先に読み込んでください`,
        map = error`デフォルトマップがありません`,
    } = unsafeWindow as WindowForContentScope;

    await waitElementLoaded();

    L.Icon.Default.imagePath = `https://unpkg.com/leaflet@${L.version}/dist/images/`;
    addStyle(cssText);
}
export function main() {
    handleAsyncError(asyncMain());
}
