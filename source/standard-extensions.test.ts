import { sleep } from "./standard-extensions";

describe(sleep.name, () => {
    it("正常終了", async () => {
        await sleep(100);
    });
    it("途中でキャンセル", async () => {
        const cancel = new AbortController();
        setTimeout(() => cancel.abort(), 500);

        await expect(sleep(1000, { signal: cancel.signal })).rejects.toThrow();
    });
    it("最初からキャンセル", async () => {
        const cancel = new AbortController();
        cancel.abort();
        await expect(sleep(100, { signal: cancel.signal })).rejects.toThrow();
    });
});
