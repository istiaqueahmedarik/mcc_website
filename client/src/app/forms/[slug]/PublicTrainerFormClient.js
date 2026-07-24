"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Search,
  Send,
  UserCheck,
} from "lucide-react";

const TYPE_LABELS = {
  classroom_invitation: "Classroom Invitation",
  attendance: "Attendance",
  general: "General Form",
};

export default function PublicTrainerFormClient({ slug }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [primaryKeyValue, setPrimaryKeyValue] = useState("");
  const [mappedValues, setMappedValues] = useState({});
  const [matched, setMatched] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const mappedFields = useMemo(
    () => (form?.fields || []).filter((field) => field.mapUserField),
    [form],
  );
  const customFields = useMemo(
    () => (form?.fields || []).filter((field) => !field.mapUserField),
    [form],
  );
  const primaryLocked = Boolean(form?.authenticated_user);

  useEffect(() => {
    async function loadForm() {
      setLoading(true);
      try {
        const res = await fetch(`/api/trainer-forms/public/${slug}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setForm(json.form);
        if (json.form.authenticated_user) {
          const lockedPrimaryKey = json.form.authenticated_user.primary_key_value || "";
          setPrimaryKeyValue(lockedPrimaryKey);
          setMappedValues(json.form.authenticated_user.mapped_values || {});
          setMatched(Boolean(lockedPrimaryKey));
          if (!lockedPrimaryKey) {
            setError(
              `Your profile does not have ${json.form.primary_key_label || "the required identifier"}.`,
            );
          }
        }
      } catch (err) {
        setError(err.message || "Form not found.");
      } finally {
        setLoading(false);
      }
    }
    loadForm();
  }, [slug]);

  const updateAnswer = (fieldId, value) => {
    setAnswers((current) => ({ ...current, [fieldId]: value }));
  };

  const resolveUser = async () => {
    setError("");
    setMatched(false);
    setMappedValues({});

    if (!primaryLocked && !primaryKeyValue.trim()) {
      setError(`${form.primary_key_label} is required.`);
      return false;
    }

    setResolving(true);
    try {
      const res = await fetch(`/api/trainer-forms/public/${slug}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary_key_value: primaryLocked ? "" : primaryKeyValue }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (!json.matched) {
        setError("No MCC user found for this identifier.");
        return false;
      }
      if (json.primary_key_value) {
        setPrimaryKeyValue(json.primary_key_value);
      }
      setMappedValues(json.mapped_values || {});
      setMatched(true);
      return true;
    } catch (err) {
      setError(err.message || "Failed to verify student.");
      return false;
    } finally {
      setResolving(false);
    }
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!matched) {
      const ok = await resolveUser();
      if (!ok) return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/trainer-forms/public/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_key_value: primaryKeyValue,
          answers,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to submit form.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading form
        </div>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-lg rounded-lg border bg-card p-6 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold">Form unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="border-b p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1">
                {form.type === "attendance" ? (
                  <ClipboardList className="h-3.5 w-3.5" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                {TYPE_LABELS[form.type] || "Form"}
              </Badge>
              {form.classroom_name && (
                <Badge className="bg-primary">{form.classroom_name}</Badge>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">{form.title}</h1>
            {form.description && (
              <p className="mt-2 text-sm text-muted-foreground">{form.description}</p>
            )}
            {form.class_name && (
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                Session: {form.class_name}
              </p>
            )}
          </div>

          {success ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <h2 className="mt-4 text-xl font-bold">Response saved</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your form response was saved and linked to your MCC user record.
              </p>
            </div>
          ) : (
            <form onSubmit={submitForm} className="space-y-6 p-6">
              <section className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-bold">Verify Student</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {primaryLocked
                    ? `Logged-in profile locks ${form.primary_key_label}. Mapped cells fill from MCC profile data.`
                    : `Enter your ${form.primary_key_label}. Mapped cells fill from MCC profile data.`}
                </p>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={primaryKeyValue}
                    onChange={(event) => {
                      if (primaryLocked) return;
                      setPrimaryKeyValue(event.target.value);
                      setMatched(false);
                      setMappedValues({});
                    }}
                    placeholder={form.primary_key_label}
                    disabled={primaryLocked}
                  />
                  <Button type="button" onClick={resolveUser} disabled={resolving || primaryLocked} className="gap-2">
                    {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {primaryLocked ? "Locked" : "Verify"}
                  </Button>
                </div>

                {matched && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Student matched.
                  </div>
                )}
              </section>

              {mappedFields.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-bold uppercase text-muted-foreground">Mapped Cells</h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {mappedFields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <label className="text-sm font-semibold">
                          {field.label}
                          {field.required ? <span className="text-red-600"> *</span> : null}
                        </label>
                        <Input
                          value={matched ? mappedValues[field.id] ?? "" : ""}
                          placeholder={field.mapUserField}
                          disabled
                        />
                        {field.helpText && (
                          <p className="text-xs text-muted-foreground">{field.helpText}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {customFields.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-bold uppercase text-muted-foreground">Questions</h2>
                  <div className="space-y-4">
                    {customFields.map((field) => (
                      <CustomField
                        key={field.id}
                        field={field}
                        value={answers[field.id]}
                        onChange={(value) => updateAnswer(field.id, value)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="border-t pt-5">
                <Button type="submit" disabled={submitting} className="w-full gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit Response
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomField({ field, value, onChange }) {
  const label = (
    <label className="text-sm font-semibold">
      {field.label}
      {field.required ? <span className="text-red-600"> *</span> : null}
    </label>
  );

  return (
    <div className="space-y-2">
      {field.type !== "checkbox" && label}
      {field.type === "textarea" ? (
        <Textarea
          value={value ?? ""}
          required={field.required}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
        />
      ) : field.type === "select" ? (
        <select
          value={value ?? ""}
          required={field.required}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Select option</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.type === "checkbox" ? (
        <label className="flex items-center gap-2 text-sm font-semibold">
          <Checkbox checked={Boolean(value)} onCheckedChange={(checked) => onChange(Boolean(checked))} />
          {field.label}
          {field.required ? <span className="text-red-600">*</span> : null}
        </label>
      ) : (
        <Input
          value={value ?? ""}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          required={field.required}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
        />
      )}
      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
    </div>
  );
}
