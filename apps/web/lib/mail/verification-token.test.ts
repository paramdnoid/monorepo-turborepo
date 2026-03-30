import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

import {
  signEmailVerificationToken,
  verifyEmailVerificationToken,
} from "./verification-token";

describe("verification-token", () => {
  const prev = process.env.AUTH_PASSWORD_RESET_SECRET;

  before(() => {
    process.env.AUTH_PASSWORD_RESET_SECRET = "test-secret-at-least-32-chars-long!!";
  });

  after(() => {
    if (prev === undefined) {
      delete process.env.AUTH_PASSWORD_RESET_SECRET;
    } else {
      process.env.AUTH_PASSWORD_RESET_SECRET = prev;
    }
  });

  it("round-trips a valid token", () => {
    const token = signEmailVerificationToken("user-id-1", "a@b.de");
    assert.ok(token);
    const payload = verifyEmailVerificationToken(token!);
    assert.ok(payload);
    assert.equal(payload!.sub, "user-id-1");
    assert.equal(payload!.email, "a@b.de");
  });

  it("rejects tampered token", () => {
    const token = signEmailVerificationToken("user-id-1", "a@b.de");
    assert.ok(token);
    const broken = `${token!}x`;
    assert.equal(verifyEmailVerificationToken(broken), null);
  });
});
