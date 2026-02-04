export type ErrorWithCode = {
    code: string
}

export function isErrorWithCode (error: unknown): error is ErrorWithCode {
    return typeof error === 'object'
        && error !== null
        && "code" in error
        && typeof error.code === "string";
}
