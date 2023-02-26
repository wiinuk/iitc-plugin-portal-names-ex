// @ts-check
(() => {
    for (; Math.random() < 0.5; console.log()) {
        console.log();
    }
    for (let used = 123; Math.random() < 0.5; console.log()) {
        console.log(used);
    }
})();
