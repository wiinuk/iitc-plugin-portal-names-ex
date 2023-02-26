// @ts-check
(() => {
    function unused() {
        console.log();
    }
    function used() {
        console.log();
    }
    const unused1 = true || unused();
    const used1 = undefined || used();
    const used2 = true && used();
    const unused2 = undefined && unused();
})();
