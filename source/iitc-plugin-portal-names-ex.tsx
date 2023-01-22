// spell-checker: ignore zoomend overlayadd overlayremove guids
import { addStyle, waitElementLoaded } from "./document-extensions";
import {
    AsyncOptions,
    createAsyncCancelScope,
    error,
    microYield as doOtherTasks,
    Progress,
    sleep,
} from "./standard-extensions";
import classNames, { cssText } from "./styles.module.css";

function handleAsyncError(promise: Promise<void>) {
    promise.catch((error) => console.error(error));
}

export function main() {
    handleAsyncError(asyncMain());
}

const NAME_WIDTH = 80;
const NAME_HEIGHT = 23;

type seconds = number;
type ComparablePoint = string;
type PortalId = string;
const labelLayers = new Map<PortalId, L.Marker>();
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
    window.addLayerGroup("Portal Names Ex", labelLayerGroup, true);

    window.addHook(
        "requestFinished",
        () => void setTimeout(() => delayedUpdatePortalLabels(3.0), 1)
    );
    window.addHook("mapDataRefreshEnd", () => delayedUpdatePortalLabels(0.5));
    map.on("overlayadd overlayremove", () =>
        setTimeout(() => delayedUpdatePortalLabels(1.0), 1)
    );
    map.on("zoomend", clearAllPortalLabels);
}

function removeLabel(guid: PortalId) {
    const previousLayer = labelLayers.get(guid);
    if (previousLayer) {
        labelLayerGroup.removeLayer(previousLayer);
        labelLayers.delete(guid);
    }
}

function addLabel(guid: PortalId, portal: IITCPortalInfo) {
    const previousLayer = labelLayers.get(guid);
    if (!previousLayer) {
        const portalName = portal.options.data.title;
        const label = L.marker(portal.getLatLng(), {
            icon: L.divIcon({
                className: classNames["name-icon"],
                iconAnchor: [NAME_WIDTH / 2, 0],
                iconSize: [NAME_WIDTH, NAME_HEIGHT],
                html: portalName,
            }),
        });
        labelLayers.set(guid, label);
        labelLayerGroup.addLayer(label);
    }
}

function clearAllPortalLabels() {
    for (const guid of labelLayers.keys()) {
        removeLabel(guid);
    }
}

function setPortalPoints(
    portalPoints: ReadonlyMap<PortalId, PortalWithPoint>,
    progress?: Progress<UpdateProgress>
) {
    progress?.("update layers", "start");
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
    progress?.("update layers", "end");
}

interface PortalWithPoint {
    point: L.Point;
    portal: IITCPortalInfo;
}
type UpdateProgress =
    | ["update layers" | "collect portals" | "filter portals", "start" | "end"]
    | ["portal count", number];

type UpdatePortalLabelsOptions = AsyncOptions<UpdateProgress>;

async function updatePortalLabels(options?: UpdatePortalLabelsOptions) {
    const signal = options?.signal;
    const progress = options?.progress;

    // レイヤーを切り替えるたびに呼び出されるので、レイヤーがオフのときにやっても意味がない
    if (!map.hasLayer(labelLayerGroup)) {
        return;
    }

    progress?.("collect portals", "start");
    const portalPoints = new Map<PortalId, PortalWithPoint>();
    for (const guid in window.portals) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const portal = window.portals[guid]!;
        if (portal._map && portal.options.data.title) {
            // 地図に追加されたポータルで、タイトルがあるもののみを対象とする
            const point = map.project(portal.getLatLng());
            portalPoints.set(guid, { point, portal });
        }
    }
    progress?.("collect portals", "end");
    progress?.("portal count", portalPoints.size);

    signal?.throwIfAborted();

    progress?.("filter portals", "start");
    // 交差点のテストを効率的に行うために、ラベルサイズに基づいてポータルをバケットにグループ化する。
    const buckets = new Map<ComparablePoint, Map<PortalId, PortalWithPoint>>();
    for (const [guid, portal] of portalPoints) {
        await doOtherTasks();
        signal?.throwIfAborted();

        const bucketId = L.point(
            Math.floor(portal.point.x / (NAME_WIDTH * 2)),
            Math.floor(portal.point.y / NAME_HEIGHT)
        );
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

    const coveredPortals = new Set<PortalId>();
    for (const bucketGuids of buckets.values()) {
        await doOtherTasks();
        signal?.throwIfAborted();

        for (const [guid, { point }] of bucketGuids) {
            // テストに使用した境界は、ポータル名マーカの2倍の幅です。これは、2つの異なるポータルテキスト間で左右の重なりがないようにするためです。
            const largeBounds = L.bounds(
                point.subtract(L.point(NAME_WIDTH, 0)),
                point.add(L.point(NAME_WIDTH, NAME_HEIGHT))
            );

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
    progress?.("filter portals", "end");
    progress?.("portal count", portalPoints.size);

    await doOtherTasks();
    signal?.throwIfAborted();
    setPortalPoints(portalPoints);
}

const updateReporter: (...args: UpdateProgress) => void = (
    arg0,
    arg1,
    ...args
) => {
    if (arg1 === "start") {
        console.time(arg0);
    } else if (args[1] === "end") {
        console.timeEnd(arg0);
    } else {
        console.log(arg0, arg1, ...args);
    }
};

const portalLabelsUpdateScope = createAsyncCancelScope(handleAsyncError);
// ポータルマーカーがたくさん表示されている場合、その計算には時間がかかるので、短いタイマーで計算するようにしました。
function delayedUpdatePortalLabels(wait: seconds) {
    portalLabelsUpdateScope(async (signal) => {
        await sleep(wait * 1000, { signal });
        await updatePortalLabels({ signal, progress: updateReporter });
    });
}
