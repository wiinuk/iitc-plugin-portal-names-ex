// @ts-check
(() => {
    for (let unused = 123; Math.random() < 0.5; console.log()) {
        console.log();
    }
    for (let used = 123, unused = 456; Math.random() < 0.5; console.log()) {
        console.log(used);
    }
})();
