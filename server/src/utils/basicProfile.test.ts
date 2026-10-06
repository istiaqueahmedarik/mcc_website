import { describe, expect, test } from "bun:test";
import {
  MAX_FULL_NAME_LENGTH,
  normalizeFullNameUpdate,
} from "./basicProfile";

describe("normalizeFullNameUpdate", () => {
  test("leaves the name unchanged when it is omitted", () => {
    expect(normalizeFullNameUpdate(undefined)).toEqual({
      shouldUpdate: false,
      name: null,
      error: null,
    });
  });

  test("trims a submitted full name", () => {
    expect(normalizeFullNameUpdate("  Ada Lovelace  ")).toEqual({
      shouldUpdate: true,
      name: "Ada Lovelace",
      error: null,
    });
  });

  test.each(["   ", null, 42])("rejects an invalid full name", (value) => {
    expect(normalizeFullNameUpdate(value).error).toBeTruthy();
  });

  test("rejects a full name beyond the storage limit", () => {
    expect(normalizeFullNameUpdate("a".repeat(MAX_FULL_NAME_LENGTH + 1))).toEqual({
      shouldUpdate: true,
      name: null,
      error: `Full name must be ${MAX_FULL_NAME_LENGTH} characters or fewer`,
    });
  });
});
