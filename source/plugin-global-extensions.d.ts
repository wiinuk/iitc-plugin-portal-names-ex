/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-unused-vars */

/** IITC の拡張 */
interface WindowForContentScope extends Window {
    plugin?(): void;
    bootPlugins?: SetupHook[];
    iitcLoaded?: boolean;
    L?: typeof L;
    map?: L.Map;
}

function plugin(): void;
var bootPlugins: SetupHook[];
var iitcLoaded: boolean;
var L: typeof import("leaflet");
var map: L.Map;

// IITC の拡張
function addLayerGroup<Layer extends L.ILayer>(
    name: string,
    layerGroup: L.LayerGroup<Layer>,
    defaultDisplay?: boolean
): unknown;

type IITCHookEventNameDataMap = {
    portalSelected: unknown;
    portalDetailsUpdated: unknown;
    artifactsUpdated: unknown;
    mapDataRefreshStart: unknown;
    mapDataEntityInject: unknown;
    mapDataRefreshEnd: unknown;
    portalAdded: unknown;
    linkAdded: unknown;
    fieldAdded: unknown;
    portalRemoved: unknown;
    linkRemoved: unknown;
    fieldRemoved: unknown;
    publicChatDataAvailable: unknown;
    factionChatDataAvailable: unknown;
    requestFinished: unknown;
    nicknameClicked: unknown;
    geoSearch: unknown;
    search: unknown;
    iitcLoaded: unknown;
    portalDetailLoaded: unknown;
    paneChanged: unknown;
};

function addHook<K extends keyof IITCHookEventNameDataMap>(
    event: K,
    callback: (data: IITCHookEventNameDataMap[K]) => false | void
): void;
function addHook(
    event: string,
    callback: (data: unknown) => false | void
): void;

interface IITCPortalInfo {
    _map?: unknown;
    options: IITCPortalOptions;
    getLatLng(): L.LatLng;
}
interface IITCPortalOptions {
    data: IITCPortalData;
}
interface IITCPortalData {
    title?: string;
}
var portals: Record<string, IITCPortalInfo>;

/** このプラグインの拡張 */
interface WindowForContentScope {
    "_iitc-plugin-portal-names-ex-4ca476d5-60f5-44f5-a05d-987aab44d3a9"?: typeof import("./iitc-plugin-portal-names-ex");
}
