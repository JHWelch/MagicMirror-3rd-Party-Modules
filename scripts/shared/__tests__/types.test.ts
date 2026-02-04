import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isErrorWithCode } from "../types.ts";


describe('isErrorWithCode', () => {
    it('returns false for non objects', () => {
        assert.equal(isErrorWithCode(undefined), false)
        assert.equal(isErrorWithCode('string'), false)
        assert.equal(isErrorWithCode(123), false)
    });

    it('returns false for objects without code', () => {
        assert.equal(isErrorWithCode(null), false)
        assert.equal(isErrorWithCode({}), false)
        assert.equal(isErrorWithCode({foo: 'bar'}), false)
    });

    it('returns false if code is not a string', () => {
        assert.equal(isErrorWithCode({code: null}), false)
        assert.equal(isErrorWithCode({code: 123}), false)
        assert.equal(isErrorWithCode({code: {}}), false)
    });

    it('returns true for errors with string code', () => {
        assert.equal(isErrorWithCode({code: 'ENOENT'}), true)
        assert.equal(isErrorWithCode({code: 'other-string'}), true)
    });
});
