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
    "_iitc-plugin-portal-names-ex-0c44f84f-9750-47b9-b95d-3ac6f5557291"?: typeof import("./iitc-plugin-portal-names-ex");
}
