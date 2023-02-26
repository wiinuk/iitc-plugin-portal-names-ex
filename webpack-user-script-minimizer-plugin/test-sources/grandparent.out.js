// @ts-check
(() => {
    function used1() {
        console.log();
    }
    function used2() {
        used1();
    }
    used2();
})();
