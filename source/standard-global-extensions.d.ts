/* eslint-disable @typescript-eslint/ban-types */
interface JSON {
    stringify(value: undefined | Function | symbol): undefined;
    stringify(
        value:
            | null
            | boolean
            | number
            | string
            | readonly unknown[]
            | Readonly<Record<string, unknown>>
    ): string;
    stringify(
        value: unknown,
        replacer?: (this: unknown, key: string, value: unknown) => unknown,
        space?: string | number
    ): string | undefined;
    stringify(
        value: unknown,
        replacer?: (number | string)[] | null,
        space?: string | number
    ): string | undefined;
}
