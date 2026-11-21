import { describe, expect, test } from "bun:test";
import { normalizeMistId, profileVersion, validateFormDefinition, validateSubmission } from "./globalFormService";

describe("global form validation", () => {
  test("student IDs require exactly nine ASCII digits", () => {
    expect(normalizeMistId(" 123456789 ")).toBe("123456789");
    expect(normalizeMistId("12345678")).toBeNull();
    expect(normalizeMistId("１２３４５６７８９")).toBeNull();
    expect(normalizeMistId("12345678a")).toBeNull();
    expect(normalizeMistId("012345678")).toBeNull();
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

  test('number answers reject compound values and booleans', () => {
    const fields: any[] = [{ id:'hours',label:'Hours',type:'number',required:false,mapUserField:null,options:[],helpText:'' }];
    for (const value of [[], {}, true]) expect(validateSubmission(fields,{hours:value},{},{}).ok).toBe(false);
    expect(validateSubmission(fields,{hours:'2.5'},{},{}).ok).toBe(true);
  });
});

describe("radio questions", () => {
  const definition = (field: Record<string, unknown>) => validateFormDefinition({
    title: "Radio", kind: "general", agreement_text: "",
    fields: [{ id: "slot", label: "Slot", type: "radio", required: true, mapUserField: null, helpText: "", ...field }],
  });

  test("accepts a radio question and preserves label, option order, and requiredness", () => {
    const result = definition({ options: ["Morning", "Evening"] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fields[0]).toMatchObject({ label: "Slot", type: "radio", required: true, options: ["Morning", "Evening"] });
  });

  test("rejects unusable option configurations with a question-specific error", () => {
    const cases: unknown[] = [
      undefined,
      [],
      ["Morning"],
      ["Morning", "   "],
      ["Morning", 42],
      ["Morning", " morning "],
      ["Morning", "MORNING"],
      ["Night shift", "night  shift"],
    ];
    for (const options of cases) {
      const result = definition({ options });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("slot");
    }
  });

  test("cannot be mapped to a profile field", () => {
    const result = definition({ options: ["S", "M", "L"], mapUserField: "tshirt_size" });
    expect(result.ok).toBe(false);
  });

  test("leaves the existing select option rules unchanged", () => {
    const select = validateFormDefinition({
      title: "Select", kind: "general", fields: [
        { id: "track", label: "Track", type: "select", required: false, mapUserField: null, options: ["Only", " "] },
      ],
    });
    expect(select.ok).toBe(true);
    if (select.ok) expect(select.value.fields[0].options).toEqual(["Only"]);
  });

  const fields: any[] = [
    { id: "slot", label: "Slot", type: "radio", required: true, mapUserField: null, options: ["Morning", "Evening"], helpText: "" },
    { id: "meal", label: "Meal", type: "radio", required: false, mapUserField: null, options: ["Veg", "Non-veg"], helpText: "" },
  ];

  test("accepts exactly one allowed option and stores it as a string", () => {
    const result = validateSubmission(fields, { slot: " Evening " }, {}, {});
    expect(result).toEqual({ ok: true, answers: { slot: "Evening" }, profileValues: {} });
  });

  test("rejects unlisted, multi-value, object, number, and boolean answers", () => {
    for (const value of ["Afternoon", "morning", ["Morning"], ["Morning", "Evening"], {}, { value: "Morning" }, 1, true]) {
      const result = validateSubmission(fields, { slot: value }, {}, {});
      expect(result.ok).toBe(false);
    }
  });

  test("enforces requiredness and permits an unanswered optional question", () => {
    for (const value of [undefined, null, "", "   "]) {
      const result = validateSubmission(fields, { slot: value }, {}, {});
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe("Slot is required");
    }
    expect(validateSubmission(fields, { slot: "Morning" }, {}, {}).ok).toBe(true);
    expect(validateSubmission(fields, { slot: "Morning", meal: "" }, {}, {}).ok).toBe(true);
  });

  test("validates against the options frozen on the campaign", () => {
    const frozen: any[] = [{ ...fields[0], options: ["Morning", "Evening"] }];
    const laterTemplate: any[] = [{ ...fields[0], options: ["Morning", "Night"] }];
    expect(validateSubmission(frozen, { slot: "Night" }, {}, {}).ok).toBe(false);
    expect(validateSubmission(laterTemplate, { slot: "Night" }, {}, {}).ok).toBe(true);
    expect(validateSubmission(frozen, { slot: "Evening" }, {}, {}).ok).toBe(true);
  });
});
