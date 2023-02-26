// @ts-check
(() => {
    function used() {
        console.log();
    }
    const used1 = undefined || used();
    const used2 = true && used();
})();
