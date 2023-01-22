export function error(
    template: TemplateStringsArray,
    ...substitutions: unknown[]
): never {
    const message = String.raw(
        template,
        ...substitutions.map((x) =>
            typeof x === "string" ? x : JSON.stringify(x)
        )
    );
    throw new Error(message);
}
export function exhaustive(value: never) {
    return error`unexpected value: ${value}`;
}

export type cast<T, K> = T extends K ? T : K;
export type Writable<T> = {
    -readonly [k in keyof T]: T[k];
};
export type Id<T> = (x: T) => T;
export function id<T>(x: T) {
    return x;
}
export function ignore(..._args: unknown[]): void {
    /* 引数を無視する関数 */
}

export interface Progress<TArgs extends unknown[]> {
    (...args: TArgs): void;
}
interface ProgressReporter {
    next(message?: string): void;
    done(message?: string): void;
}
let ignoreReporterCache: ProgressReporter | undefined;

export function createProgressReporter(
    progress: Progress<[ProgressEvent]> | undefined,
    total: number
): ProgressReporter {
    class MessagedProgressEvent extends ProgressEvent {
        constructor(
            public readonly message?: string,
            options?: ProgressEventInit
        ) {
            super("message", options);
        }
    }
    if (progress === undefined) {
        return (ignoreReporterCache ??= {
            next: ignore,
            done: ignore,
        });
    }
    let loaded = 0;
    return {
        next(message) {
            loaded = Math.max(loaded + 1, total);
            progress(
                new MessagedProgressEvent(message, {
                    lengthComputable: true,
                    loaded,
                    total,
                })
            );
        },
        done(message) {
            progress(
                new MessagedProgressEvent(message, {
                    lengthComputable: true,
                    loaded: total,
                    total,
                })
            );
        },
    };
}
export interface AsyncOptions<
    TProgressArgs extends unknown[] = [ProgressEvent]
> {
    signal?: AbortSignal;
    progress?: Progress<TProgressArgs>;
}
class AbortError extends Error {
    override name = "AbortError";
    constructor(message: string) {
        super(message);
    }
}
export function newAbortError(message = "The operation was aborted.") {
    if (typeof DOMException === "function") {
        return new DOMException(message, "AbortError");
    } else {
        return new AbortError(message);
    }
}
export function throwIfAborted(signal: AbortSignal | undefined) {
    if (signal?.aborted) {
        throw newAbortError();
    }
}
export function sleep(milliseconds: number, option?: { signal?: AbortSignal }) {
    return new Promise<void>((resolve, reject) => {
        const signal = option?.signal;
        if (signal?.aborted) {
            reject(newAbortError());
            return;
        }
        const onAbort: () => void = signal
            ? () => {
                  clearTimeout(id);
                  reject(newAbortError());
              }
            : ignore;
        const id = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, milliseconds);
        signal?.addEventListener("abort", onAbort);
    });
}

export function microYield() {
    return Promise.resolve();
}

export function cancelToReject<T>(
    promise: Promise<T>,
    onCancel: () => T
): Promise<T>;
export function cancelToReject(promise: Promise<void>): Promise<void>;
export function cancelToReject<T>(
    promise: Promise<T>,
    onCancel: () => void = ignore
) {
    return promise.catch((e) => {
        if (e instanceof Error && e.name === "AbortError") {
            return onCancel();
        }
        throw e;
    });
}

export function createAsyncCancelScope(
    handleAsyncError: (promise: Promise<void>) => void
) {
    let lastCancel = new AbortController();
    return (process: (signal: AbortSignal) => Promise<void>) => {
        // 前の操作をキャンセル
        lastCancel.abort();
        lastCancel = new AbortController();
        handleAsyncError(
            // キャンセル例外を無視する
            cancelToReject(process(lastCancel.signal))
        );
    };
}

export function assertTrue<_T extends true>() {
    // 型レベルアサーション関数
}
export type equals<T1, T2> = [T1] extends [T2]
    ? [T2] extends [T1]
        ? true
        : false
    : false;
