import { createHash } from "crypto";
import { normalizeMistIdUpdate } from "../utils/basicProfile";

export const GLOBAL_FORM_FIELD_TYPES = [
  "text",
  "long_text",
  "number",
  "date",
  "select",
  "checkbox",
] as const;

export const GLOBAL_FORM_PROFILE_FIELDS = [
  "mist_id",
  "full_name",
  "cf_id",
  "vjudge_id",
  "phone",
  "batch_name",
  "tshirt_size",
  "codechef_id",
  "atcoder_id",
] as const;

export type GlobalFormProfileField = (typeof GLOBAL_FORM_PROFILE_FIELDS)[number];

export interface GlobalFormField {
  id: string;
  label: string;
  type: (typeof GLOBAL_FORM_FIELD_TYPES)[number];
  required: boolean;
  mapUserField: GlobalFormProfileField | null;
  options: string[];
  helpText: string;
}

export interface GlobalFormDefinition {
  title: string;
  description: string;
  kind: "tfc" | "general";
  fields: GlobalFormField[];
  agreement_text: string;
}

const FIELD_ID_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
const MAX_FIELDS = 100;

function normalizedText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function normalizeMistId(value: unknown): string | null {
  return normalizeMistIdUpdate(value);
}

export function validateFormDefinition(value: unknown):
  | { ok: true; value: GlobalFormDefinition }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object") return { ok: false, error: "Invalid form definition" };
  const input = value as Record<string, unknown>;
  const title = normalizedText(input.title, 160);
  const description = normalizedText(input.description, 2000);
  const agreementText = normalizedText(input.agreement_text, 4000);
  const kind = input.kind === "tfc" ? "tfc" : input.kind === "general" ? "general" : null;
  if (!title) return { ok: false, error: "Title is required" };
  if (!kind) return { ok: false, error: "Invalid form kind" };
  if (!Array.isArray(input.fields) || input.fields.length > MAX_FIELDS) {
    return { ok: false, error: `Fields must contain at most ${MAX_FIELDS} items` };
  }

  const ids = new Set<string>();
  const mappings = new Set<string>();
  const allowedTypes = new Set<string>(GLOBAL_FORM_FIELD_TYPES);
  const allowedMappings = new Set<string>(GLOBAL_FORM_PROFILE_FIELDS);
  const fields: GlobalFormField[] = [];

  for (const raw of input.fields) {
    if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid field" };
    const field = raw as Record<string, unknown>;
    const id = normalizedText(field.id, 64);
    const label = normalizedText(field.label, 240);
    const type = normalizedText(field.type, 32);
    const mapping = field.mapUserField == null || field.mapUserField === ""
      ? null
      : normalizedText(field.mapUserField, 64);
    if (!FIELD_ID_PATTERN.test(id) || ids.has(id)) return { ok: false, error: "Field IDs must be unique stable identifiers" };
    if (!label) return { ok: false, error: `Field ${id} requires a label` };
    if (!allowedTypes.has(type)) return { ok: false, error: `Field ${id} has an invalid type` };
    if (mapping && (!allowedMappings.has(mapping) || mappings.has(mapping))) {
      return { ok: false, error: `Field ${id} has an invalid or duplicate profile mapping` };
    }
    if (mapping === 'mist_id' && type !== 'text') {
      return { ok: false, error: 'Student ID fields must use short text to preserve identifier validation' };
    }
    const options = Array.isArray(field.options)
      ? field.options.map((option) => normalizedText(option, 240)).filter(Boolean).slice(0, 100)
      : [];
    if (type === "select" && options.length === 0) return { ok: false, error: `Field ${id} requires options` };
    if (new Set(options).size !== options.length) return { ok: false, error: `Field ${id} options must be unique` };
    ids.add(id);
    if (mapping) mappings.add(mapping);
    fields.push({
      id,
      label,
      type: type as GlobalFormField["type"],
      required: field.required === true,
      mapUserField: mapping as GlobalFormProfileField | null,
      options,
      helpText: normalizedText(field.helpText, 1000),
    });
  }
  return { ok: true, value: { title, description, kind, fields, agreement_text: agreementText } };
}

export function validateSubmission(
  fields: GlobalFormField[],
  answersValue: unknown,
  profileValuesValue: unknown,
  currentProfile: Record<string, unknown>,
): { ok: true; answers: Record<string, unknown>; profileValues: Record<string, string> } | { ok: false; error: string } {
  const answers = answersValue && typeof answersValue === "object" && !Array.isArray(answersValue)
    ? answersValue as Record<string, unknown>
    : {};
  const profileValues = profileValuesValue && typeof profileValuesValue === "object" && !Array.isArray(profileValuesValue)
    ? profileValuesValue as Record<string, unknown>
    : {};
  const cleanAnswers: Record<string, unknown> = {};
  const cleanProfileValues: Record<string, string> = {};

  for (const field of fields) {
    let existing = field.mapUserField ? currentProfile[field.mapUserField] : undefined;
    if (field.mapUserField === "mist_id" && !normalizeMistId(existing)) existing = undefined;
    const needsProfileUpdate = Boolean(field.mapUserField) && (existing === null || existing === undefined || String(existing).trim() === "");
    const supplied = field.mapUserField ? profileValues[field.mapUserField] : answers[field.id];
    const value = existing === null || existing === undefined || String(existing).trim() === "" ? supplied : existing;
    const missing = value === null || value === undefined || (typeof value === "string" && value.trim() === "");
    if (field.required && (missing || (field.type === "checkbox" && value !== true))) {
      return { ok: false, error: `${field.label} is required` };
    }
    if (missing) continue;
    let normalized: unknown = value;
    if (field.type === "checkbox") {
      if (typeof value !== "boolean") return { ok: false, error: `${field.label} must be true or false` };
    } else if (field.type === "number") {
      if (typeof value !== 'number' && typeof value !== 'string') return { ok: false, error: `${field.label} must be a number` };
      const numberValue = typeof value === "number" ? value : Number(String(value).trim());
      if (!Number.isFinite(numberValue)) return { ok: false, error: `${field.label} must be a number` };
      normalized = numberValue;
    } else {
      const textValue = field.mapUserField === "mist_id" && typeof value === "number" ? String(value) : value;
      if (typeof textValue !== "string") return { ok: false, error: `${field.label} must be text` };
      if (textValue.length > 4000) return { ok: false, error: `${field.label} is too long` };
      normalized = textValue.trim();
      if (field.type === "date") {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized as string);
        const date = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
        if (!match || !date || date.getUTCFullYear() !== Number(match[1]) || date.getUTCMonth() !== Number(match[2]) - 1 || date.getUTCDate() !== Number(match[3])) {
          return { ok: false, error: `${field.label} must be a valid date` };
        }
      }
      if (field.type === "select" && !field.options.includes(normalized as string)) {
        return { ok: false, error: `${field.label} must use an available option` };
      }
    }
    if (field.mapUserField === "mist_id") {
      const mistId = normalizeMistId(normalized);
      if (!mistId) return { ok: false, error: "MIST Student ID must be exactly nine digits" };
      normalized = mistId;
    }
    const profileMax = field.mapUserField === "full_name" ? 160 : field.mapUserField ? 240 : 4000;
    if (field.mapUserField && String(normalized).length > profileMax) return { ok: false, error: `${field.label} is too long` };
    if (field.mapUserField) {
      if (needsProfileUpdate) cleanProfileValues[field.mapUserField] = String(normalized);
    } else {
      cleanAnswers[field.id] = normalized;
    }
  }
  return { ok: true, answers: cleanAnswers, profileValues: cleanProfileValues };
}

export function profileVersion(profile: Record<string, unknown>): string {
  const snapshot = GLOBAL_FORM_PROFILE_FIELDS.map((key) => [key, profile[key] ?? null]);
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export function normalizeSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 100 ? slug : null;
}

export interface CampaignDependencyCounts {
  responses: number;
  eligibility: number;
  snapshots: number;
  publicReports: number;
}

export function evaluateCampaignDeletion(counts: CampaignDependencyCounts):
  | { allowed: true }
  | { allowed: false; reason: string; counts: CampaignDependencyCounts } {
  if (counts.responses > 0) {
    return {
      allowed: false,
      reason: `Cannot delete campaign because it contains ${counts.responses} submitted registration(s). End the campaign instead to preserve student records.`,
      counts,
    };
  }
  if (counts.eligibility > 0) {
    return {
      allowed: false,
      reason: `Cannot delete campaign because it is linked as an eligibility filter in ${counts.eligibility} contest room(s).`,
      counts,
    };
  }
  const reportCount = (counts.snapshots || 0) + (counts.publicReports || 0);
  if (reportCount > 0) {
    return {
      allowed: false,
      reason: `Cannot delete campaign because it is referenced by ${reportCount} contest report snapshot(s) or published report(s).`,
      counts,
    };
  }
  return { allowed: true };
}
