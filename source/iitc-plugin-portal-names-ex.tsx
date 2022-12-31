// spell-checker: ignore zoomend overlayadd overlayremove guids
import { addStyle, waitElementLoaded } from "./document-extensions";
import { error } from "./standard-extensions";
import classNames, { cssText } from "./styles.module.css";

function handleAsyncError(promise: Promise<void>) {
    promise.catch((error) => console.error(error));
}

export function main() {
    handleAsyncError(asyncMain());
}

const NAME_WIDTH = 80;
const NAME_HEIGHT = 23;

type Guid = string;
const labelLayers: Record<Guid, L.Marker> = {};
let labelLayerGroup: L.LayerGroup<L.Marker>;

let window: Window & typeof globalThis;
async function asyncMain() {
    const {
        L = error`leaflet を先に読み込んでください`,
        map = error`デフォルトマップがありません`,
    } = unsafeWindow as WindowForContentScope;
    window = unsafeWindow as typeof window;

    await waitElementLoaded();

    L.Icon.Default.imagePath = `https://unpkg.com/leaflet@${L.version}/dist/images/`;
    addStyle(cssText);

    labelLayerGroup = new L.LayerGroup();
    window.addLayerGroup("Portal Names", labelLayerGroup, true);

    window.addHook("requestFinished", () => {
        setTimeout(() => {
            delayedUpdatePortalLabels(3.0);
        }, 1);
    });
    window.addHook("mapDataRefreshEnd", () => {
        delayedUpdatePortalLabels(0.5);
    });
    map.on("overlayadd overlayremove", () => {
        setTimeout(() => {
            delayedUpdatePortalLabels(1.0);
        }, 1);
    });
    map.on("zoomend", clearAllPortalLabels);
}

function removeLabel(guid: string) {
    const previousLayer = labelLayers[guid];
    if (previousLayer) {
        labelLayerGroup.removeLayer(previousLayer);
        delete labelLayers[guid];
    }
}

function addLabel(guid: string, latLng: L.LatLngExpression) {
    const previousLayer = labelLayers[guid];
    if (!previousLayer) {
        const d = window.portals[guid]!.options.data;
        const portalName = d.title;

        const label = L.marker(latLng, {
            icon: L.divIcon({
                className: classNames["name-icon"],
                iconAnchor: [NAME_WIDTH / 2, 0],
                iconSize: [NAME_WIDTH, NAME_HEIGHT],
                html: portalName,
            }),
        });
        labelLayers[guid] = label;
        labelLayerGroup.addLayer(label);
    }
}

function clearAllPortalLabels() {
    for (const guid in labelLayers) {
        removeLabel(guid);
    }
}

function updatePortalLabels() {
    // レイヤーを切り替えるたびに呼び出されるので、レイヤーがオフのときにやっても意味がない
    if (!map.hasLayer(labelLayerGroup)) {
        return;
    }

    const portalPoints: Record<string, L.Point> = {};

    for (const guid in window.portals) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const p = window.portals[guid]!;
        if (p._map && p.options.data.title) {
            // 地図に追加されたポータルで、タイトルがあるもののみを対象とする
            const point = map.project(p.getLatLng());
            portalPoints[guid] = point;
        }
    }

    // 交差点のテストを効率的に行うために、ラベルサイズに基づいてポータルをバケットにグループ化する。
    const buckets: Record<string, Record<string, unknown>> = {};
    for (const guid in portalPoints) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const point = portalPoints[guid]!;

        const bucketId = L.point(
            Math.floor(point.x / (NAME_WIDTH * 2)),
            Math.floor(point.y / NAME_HEIGHT)
        );
        // この方法では、重複をテストするときに、特定のポータルを囲む8つのバケットすべてをテストする必要はなく、そのポータルが入っているバケットそのものだけをテストします。
        const bucketIds = [
            bucketId,
            bucketId.add(L.point(1, 0)),
            bucketId.add(L.point(0, 1)),
            bucketId.add(L.point(1, 1)),
        ];
        for (const i in bucketIds) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const b = bucketIds[i]!.toString();
            if (!buckets[b]) buckets[b] = {};
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            buckets[b]![guid] = true;
        }
    }

    const coveredPortals: Record<string, boolean> = {};

    for (const bucket in buckets) {
        const bucketGuids = buckets[bucket];
        for (const guid in bucketGuids) {
            const point = portalPoints[guid]!;
            // テストに使用した境界は、ポータル名マーカの2倍の幅です。これは、2つの異なるポータルテキスト間で左右の重なりがないようにするためです。
            const largeBounds = L.bounds(
                point.subtract(L.point(NAME_WIDTH, 0)),
                point.add(L.point(NAME_WIDTH, NAME_HEIGHT))
            );

            for (const otherGuid in bucketGuids) {
                if (guid != otherGuid) {
                    const otherPoint = portalPoints[otherGuid]!;

                    if (largeBounds.contains(otherPoint)) {
                        // 別のポータルは、このポータルの名前の矩形内にある - だから、このポータルの名前はない
                        coveredPortals[guid] = true;
                        break;
                    }
                }
            }
        }
    }

    for (const guid in coveredPortals) {
        delete portalPoints[guid];
    }

    // 不要なものを削除し
    for (const guid in labelLayers) {
        if (!(guid in portalPoints)) {
            removeLabel(guid);
        }
    }

    // 必要なものを追加する
    for (const guid in portalPoints) {
        addLabel(guid, window.portals[guid]!.getLatLng());
    }
}

let timer: ReturnType<typeof setTimeout> | undefined;
// ポータルマーカーがたくさん表示されている場合、その計算には時間がかかるので、短いタイマーで計算するようにしました。
function delayedUpdatePortalLabels(wait: number) {
    if (timer === undefined) {
        timer = setTimeout(function () {
            timer = undefined;
            updatePortalLabels();
        }, wait * 1000);
    }
}
