import { describe, expect, test } from "bun:test";
import { normalizeMistId, profileVersion, validateFormDefinition, validateSubmission } from "./globalFormService";

describe("global form validation", () => {
  test("student IDs require exactly nine ASCII digits", () => {
    expect(normalizeMistId(" 123456789 ")).toBe("123456789");
    expect(normalizeMistId("12345678")).toBeNull();
    expect(normalizeMistId("１２３４５６７８９")).toBeNull();
    expect(normalizeMistId("12345678a")).toBeNull();
  });

  test("rejects duplicate and privileged profile mappings", () => {
    const duplicate = validateFormDefinition({
      title: "Test", kind: "general", agreement_text: "Agree",
      fields: [
        { id: "name", label: "Name", type: "text", required: true, mapUserField: "full_name" },
        { id: "name2", label: "Name again", type: "text", required: true, mapUserField: "full_name" },
      ],
    });
    expect(duplicate.ok).toBe(false);
    const privileged = validateFormDefinition({
      title: "Test", kind: "general", fields: [
        { id: "role", label: "Role", type: "text", required: false, mapUserField: "admin" },
      ],
    });
    expect(privileged.ok).toBe(false);
  });

  test("validates required checkboxes, real calendar dates, and select options", () => {
    const fields: any[] = [
      { id: "confirm", label: "Confirm", type: "checkbox", required: true, mapUserField: null, options: [], helpText: "" },
      { id: "day", label: "Day", type: "date", required: true, mapUserField: null, options: [], helpText: "" },
      { id: "track", label: "Track", type: "select", required: true, mapUserField: null, options: ["A", "B"], helpText: "" },
    ];
    expect(validateSubmission(fields, { confirm: false, day: "2026-02-28", track: "A" }, {}, {}).ok).toBe(false);
    expect(validateSubmission(fields, { confirm: true, day: "2026-02-30", track: "A" }, {}, {}).ok).toBe(false);
    expect(validateSubmission(fields, { confirm: true, day: "2026-02-28", track: "C" }, {}, {}).ok).toBe(false);
    expect(validateSubmission(fields, { confirm: true, day: "2026-02-28", track: "B" }, {}, {}).ok).toBe(true);
  });

  test("existing values are authoritative while invalid IDs can be corrected", () => {
    const fields: any[] = [
      { id: "mist", label: "Student ID", type: "text", required: true, mapUserField: "mist_id", options: [], helpText: "" },
      { id: "name", label: "Name", type: "text", required: true, mapUserField: "full_name", options: [], helpText: "" },
    ];
    const result = validateSubmission(fields, {}, { mist_id: "123456789", full_name: "Attacker" }, { mist_id: 123, full_name: "Current Name" });
    expect(result).toEqual({ ok: true, answers: {}, profileValues: { mist_id: "123456789" } });
  });

  test("profile versions change with profile data", () => {
    expect(profileVersion({ full_name: "A" })).toBe(profileVersion({ full_name: "A" }));
    expect(profileVersion({ full_name: "A" })).not.toBe(profileVersion({ full_name: "B" }));
  });
});
