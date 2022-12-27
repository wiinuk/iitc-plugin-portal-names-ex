/** IITC の拡張 */
interface WindowForContentScope extends Window {
    plugin?(): void;
    bootPlugins?: SetupHook[];
    iitcLoaded?: boolean;
    L?: typeof L;
    map?: L.Map;
}
/** このプラグインの拡張 */
interface WindowForContentScope {
    "_iitc-plugin-portal-names-ex-4ca476d5-60f5-44f5-a05d-987aab44d3a9"?: typeof import("./iitc-plugin-portal-names-ex");
}
