const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { UserService } = require("../src/user.js");

describe("Authentication & User Service", () => {
  it("retrieves user email successfully", () => {
    const service = new UserService();
    assert.equal(service.getUserEmail(), "developer@buildtwin.io");
  });

  it("validates user identity invariants", () => {
    const service = new UserService();
    assert.equal(service.user.id, "usr_101");
  });

  it("generates user profile with valid credentials", () => {
    const service = new UserService();
    const profile = service.getUserProfile();
    assert.equal(profile.email, "developer@buildtwin.io");
  });
});
