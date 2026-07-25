"use client";

import { useEffect, useMemo, useState } from "react";
import { get_with_token, post_with_token } from "@/lib/action";
import ProgressLink from "@/components/ProgressLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileJson,
  FileText,
  Loader2,
  Plus,
  Send,
  Settings2,
  Share2,
  Trash2,
  UserRoundSearch,
} from "lucide-react";

const FORM_TYPES = [
  {
    value: "classroom_invitation",
    label: "Classroom Invitation",
    description: "Matched students join linked classroom after submit.",
  },
  {
    value: "attendance",
    label: "Attendance",
    description: "Track present students against classroom roster.",
  },
  {
    value: "general",
    label: "General",
    description: "Collect JSON responses with visualization and explore.",
  },
];

const FALLBACK_USER_FIELDS = [
  { value: "mist_id", label: "Student ID" },
  { value: "full_name", label: "Full Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "batch_name", label: "Batch" },
  { value: "vjudge_id", label: "VJudge ID" },
  { value: "cf_id", label: "Codeforces ID" },
  { value: "codechef_id", label: "CodeChef ID" },
  { value: "atcoder_id", label: "AtCoder ID" },
];

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "checkbox", label: "Checkbox" },
];

const CUSTOM_CELL_PRESETS = [
  {
    label: "Short Answer",
    description: "One-line text answer.",
    field: {
      label: "Short Answer",
      type: "text",
      required: true,
      placeholder: "Type answer",
    },
  },
  {
    label: "Paragraph",
    description: "Long written answer.",
    field: {
      label: "Details",
      type: "textarea",
      required: false,
      placeholder: "Write details",
    },
  },
  {
    label: "Number",
    description: "Numeric value.",
    field: {
      label: "Number",
      type: "number",
      required: false,
      placeholder: "0",
    },
  },
  {
    label: "Date",
    description: "Date picker.",
    field: {
      label: "Date",
      type: "date",
      required: false,
    },
  },
  {
    label: "Dropdown",
    description: "Fixed options.",
    field: {
      label: "Choice",
      type: "select",
      required: true,
      options: ["Option one", "Option two"],
    },
  },
  {
    label: "Checkbox",
    description: "Yes/no confirmation.",
    field: {
      label: "I confirm",
      type: "checkbox",
      required: false,
    },
  },
];

function createField(overrides = {}) {
  return {
    id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label: "New Field",
    type: "text",
    required: false,
    placeholder: "",
    helpText: "",
    options: [],
    mapUserField: null,
    ...overrides,
  };
}

function emptyForm() {
  return {
    title: "",
    description: "",
    type: "general",
    status: "published",
    primary_key_field: "mist_id",
    primary_key_label: "Student ID",
    classroom_id: "",
    class_id: "",
    fields: [
      createField({
        label: "Name",
        required: true,
        mapUserField: "full_name",
      }),
      createField({
        label: "Batch",
        mapUserField: "batch_name",
      }),
    ],
  };
}

export default function TrainerFormsClient() {
  const [forms, setForms] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [userFields, setUserFields] = useState(FALLBACK_USER_FIELDS);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [origin, setOrigin] = useState("");

  const selectedType = useMemo(
    () => FORM_TYPES.find((item) => item.value === form.type) || FORM_TYPES[2],
    [form.type],
  );
  const mappedCellPresets = useMemo(
    () =>
      userFields.filter((field) =>
        ["full_name", "email", "mist_id", "phone", "batch_name", "vjudge_id", "cf_id"].includes(
          field.value,
        ),
      ),
    [userFields],
  );

  const mappedFieldCount = form.fields.filter((field) => field.mapUserField).length;
  const customFieldCount = form.fields.length - mappedFieldCount;
  const needsClassroomTarget = form.type === "classroom_invitation" || form.type === "attendance";

  const fetchData = async () => {
    setLoading(true);
    const [formsRes, fieldsRes, classroomRes] = await Promise.all([
      get_with_token("trainer-forms/manage/forms"),
      get_with_token("trainer-forms/manage/user-fields"),
      get_with_token("classroom/list"),
    ]);

    if (formsRes?.result) setForms(formsRes.result);
    if (fieldsRes?.result) setUserFields(fieldsRes.result);
    if (classroomRes?.result) setClassrooms(classroomRes.result);
    setLoading(false);
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    fetchData();
  }, []);

  useEffect(() => {
    async function loadClasses() {
      if (!form.classroom_id) {
        setClasses([]);
        setForm((current) => ({ ...current, class_id: "" }));
        return;
      }
      const res = await get_with_token(`classroom/${form.classroom_id}`);
      setClasses(res?.classes || []);
    }
    loadClasses();
  }, [form.classroom_id]);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateField = (fieldId, key, value) => {
    setForm((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === fieldId ? { ...field, [key]: value } : field,
      ),
    }));
  };

  const addField = (overrides = {}) => {
    setForm((current) => ({
      ...current,
      fields: [...current.fields, createField(overrides)],
    }));
  };

  const addFields = (fields) => {
    setForm((current) => ({
      ...current,
      fields: [...current.fields, ...fields.map((field) => createField(field))],
    }));
  };

  const addMappedField = (userField) => {
    addField({
      label: userField.label,
      type: "text",
      required: ["full_name", "mist_id"].includes(userField.value),
      mapUserField: userField.value,
    });
  };

  const addAttendanceSet = () => {
    addFields([
      { label: "Name", required: true, mapUserField: "full_name" },
      { label: "Student ID", required: true, mapUserField: "mist_id" },
      { label: "Batch", mapUserField: "batch_name" },
      {
        label: "Present",
        type: "checkbox",
        required: true,
        helpText: "Responder must confirm attendance.",
      },
    ]);
  };

  const addInvitationSet = () => {
    addFields([
      { label: "Name", required: true, mapUserField: "full_name" },
      { label: "Student ID", required: true, mapUserField: "mist_id" },
      { label: "Email", mapUserField: "email" },
      {
        label: "Why do you want to join?",
        type: "textarea",
        placeholder: "Short answer",
      },
    ]);
  };

  const removeField = (fieldId) => {
    setForm((current) => ({
      ...current,
      fields: current.fields.filter((field) => field.id !== fieldId),
    }));
  };

  const duplicateField = (fieldId) => {
    setForm((current) => {
      const field = current.fields.find((item) => item.id === fieldId);
      if (!field) return current;
      const fieldCopy = { ...field };
      delete fieldCopy.id;
      return {
        ...current,
        fields: [
          ...current.fields,
          createField({
            ...fieldCopy,
            label: `${field.label} Copy`,
          }),
        ],
      };
    });
  };

  const moveField = (fieldId, direction) => {
    setForm((current) => {
      const index = current.fields.findIndex((field) => field.id === fieldId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.fields.length) return current;
      const fields = [...current.fields];
      [fields[index], fields[nextIndex]] = [fields[nextIndex], fields[index]];
      return { ...current, fields };
    });
  };

  const copyShareLink = async (shareSlug) => {
    const url = `${origin}/forms/${shareSlug}`;
    await navigator.clipboard.writeText(url);
    setNotice("Share link copied.");
    setTimeout(() => setNotice(""), 1800);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.title.trim()) {
      setError("Form title is required.");
      return;
    }
    if (form.fields.length === 0) {
      setError("Add at least one field.");
      return;
    }
    if ((form.type === "classroom_invitation" || form.type === "attendance") && !form.classroom_id) {
      setError("Invitation and attendance forms need a classroom.");
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      fields: form.fields.map((field) => ({
        ...field,
        options: Array.isArray(field.options)
          ? field.options
          : String(field.options || "")
              .split("\n")
              .map((option) => option.trim())
              .filter(Boolean),
      })),
    };
    const res = await post_with_token("trainer-forms/manage/forms", payload);
    setSaving(false);

    if (res?.success && res.form?.id) {
      window.location.href = `/trainer/forms/${res.form.id}`;
      return;
    }

    setError(res?.error || "Failed to create form.");
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="border-b pb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <ProgressLink
                href="/trainer/dashboard"
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                Trainer dashboard
                <ArrowRight className="h-4 w-4" />
              </ProgressLink>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Form operations
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Build invitation, attendance, and general forms without changing the trainer workflow.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
              <HeaderMetric label="Forms" value={forms.length} />
              <HeaderMetric label="Fields" value={form.fields.length} />
              <HeaderMetric label="Mode" value={selectedType.label.split(" ")[0]} />
            </div>
          </div>
        </section>

        {notice && (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            {notice}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <form onSubmit={handleCreate} className="space-y-6">
            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <SectionTitle
                icon={Settings2}
                label="Setup"
                title="Form profile"
                detail={selectedType.description}
              />

              <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Title</label>
                  <Input
                    value={form.title}
                    onChange={(event) => updateForm("title", event.target.value)}
                    placeholder="Week 4 Attendance"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Status</label>
                  <select
                    value={form.status}
                    onChange={(event) => updateForm("status", event.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold">Description</label>
                  <Textarea
                    value={form.description}
                    onChange={(event) => updateForm("description", event.target.value)}
                    placeholder="Short context shown on the shared form."
                    className="min-h-24"
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {FORM_TYPES.map((type) => (
                  <button
                    type="button"
                    key={type.value}
                    onClick={() => updateForm("type", type.value)}
                    className={`rounded-lg border p-4 text-left transition ${
                      form.type === type.value
                        ? "border-foreground bg-foreground text-background shadow-sm"
                        : "bg-background hover:border-foreground/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {type.value === "attendance" ? (
                        <ClipboardList className="h-4 w-4" />
                      ) : type.value === "classroom_invitation" ? (
                        <Send className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      <span className="text-sm font-bold">{type.label}</span>
                    </div>
                    <p
                      className={`mt-2 text-xs ${
                        form.type === type.value ? "text-background/75" : "text-muted-foreground"
                      }`}
                    >
                      {type.description}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-lg border bg-card p-5 shadow-sm">
                <SectionTitle
                  icon={UserRoundSearch}
                  label="Identity"
                  title="Primary key"
                  detail="Responder lookup and mapped alias source."
                />

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Primary key field</label>
                    <select
                      value={form.primary_key_field}
                      onChange={(event) => updateForm("primary_key_field", event.target.value)}
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      {userFields.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Label on form</label>
                    <Input
                      value={form.primary_key_label}
                      onChange={(event) => updateForm("primary_key_label", event.target.value)}
                      placeholder="Student ID"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-lg border bg-card p-5 shadow-sm">
                <SectionTitle
                  icon={BarChart3}
                  label="Target"
                  title={needsClassroomTarget ? "Dynamic tracking" : "General response set"}
                  detail={selectedType.description}
                />

                {needsClassroomTarget ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Classroom</label>
                      <select
                        value={form.classroom_id}
                        onChange={(event) => updateForm("classroom_id", event.target.value)}
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="">Select classroom</option>
                        {classrooms.map((classroom) => (
                          <option key={classroom.id} value={classroom.id}>
                            {classroom.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Class session</label>
                      <select
                        value={form.class_id}
                        onChange={(event) => updateForm("class_id", event.target.value)}
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        disabled={!form.classroom_id || classes.length === 0}
                      >
                        <option value="">Optional session</option>
                        {classes.map((classItem) => (
                          <option key={classItem.id} value={classItem.id}>
                            {classItem.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
                    General forms skip classroom targeting and store response JSON.
                  </div>
                )}
              </section>
            </div>

            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <SectionEyebrow icon={FileText} label="Cells" />
                  <h2 className="mt-1 text-xl font-bold tracking-tight">Response structure</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Mapped aliases plus custom answer cells.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{mappedFieldCount} mapped</Badge>
                  <Badge variant="outline">{customFieldCount} custom</Badge>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold">Mapped user cells</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Aliases from the users table.</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={addInvitationSet}>
                      Profile Set
                    </Button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {mappedCellPresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => addMappedField(preset)}
                        className="min-h-10 rounded-md border bg-background px-3 py-2 text-left text-xs font-semibold transition hover:border-foreground/30"
                      >
                        <Plus className="mr-1 inline h-3.5 w-3.5" />
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold">Custom question cells</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Fields saved in response JSON.</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={addAttendanceSet}>
                      Attendance Set
                    </Button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {CUSTOM_CELL_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => addField(preset.field)}
                        className="min-h-[64px] rounded-md border bg-background px-3 py-2 text-left transition hover:border-foreground/30"
                      >
                        <span className="block text-xs font-bold">{preset.label}</span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {preset.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Field queue</h2>
                  <p className="text-sm text-muted-foreground">
                    {form.fields.length} total fields in submit order.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {form.fields.map((field, index) => (
                  <div key={field.id} className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <Badge className={field.mapUserField ? "bg-sky-600" : "bg-emerald-600"}>
                          {field.mapUserField ? "Mapped" : "Custom"}
                        </Badge>
                        <span className="min-w-0 truncate text-sm font-semibold">
                          {field.label || "Untitled cell"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <IconButton
                          disabled={index === 0}
                          onClick={() => moveField(field.id, -1)}
                          title="Move up"
                          icon={ArrowUp}
                        />
                        <IconButton
                          disabled={index === form.fields.length - 1}
                          onClick={() => moveField(field.id, 1)}
                          title="Move down"
                          icon={ArrowDown}
                        />
                        <IconButton
                          onClick={() => duplicateField(field.id)}
                          title="Duplicate"
                          icon={Copy}
                        />
                        <IconButton
                          onClick={() => removeField(field.id)}
                          title="Remove"
                          icon={Trash2}
                          danger
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Alias label</label>
                        <Input
                          value={field.label}
                          onChange={(event) => updateField(field.id, "label", event.target.value)}
                          placeholder="Student Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Cell source</label>
                        <select
                          value={field.mapUserField || ""}
                          onChange={(event) =>
                            updateField(field.id, "mapUserField", event.target.value || null)
                          }
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="">Custom answer cell</option>
                          {userFields.map((userField) => (
                            <option key={userField.value} value={userField.value}>
                              User table: {userField.label}
                            </option>
                          ))}
                        </select>
                        {field.mapUserField && (
                          <p className="text-xs text-muted-foreground">
                            Filled from users.{field.mapUserField}.
                          </p>
                        )}
                      </div>
                      {!field.mapUserField && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold">Input type</label>
                            <select
                              value={field.type}
                              onChange={(event) => updateField(field.id, "type", event.target.value)}
                              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                            >
                              {FIELD_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold">Placeholder</label>
                            <Input
                              value={field.placeholder}
                              onChange={(event) =>
                                updateField(field.id, "placeholder", event.target.value)
                              }
                              placeholder="Shown to responder"
                            />
                          </div>
                          {field.type === "select" && (
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-sm font-semibold">Options</label>
                              <Textarea
                                value={(field.options || []).join("\n")}
                                onChange={(event) =>
                                  updateField(
                                    field.id,
                                    "options",
                                    event.target.value
                                      .split("\n")
                                      .map((option) => option.trim())
                                      .filter(Boolean),
                                  )
                                }
                                placeholder={"Option one\nOption two"}
                              />
                            </div>
                          )}
                        </>
                      )}
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-semibold">Help text</label>
                        <Input
                          value={field.helpText}
                          onChange={(event) => updateField(field.id, "helpText", event.target.value)}
                          placeholder="Optional hint under the field"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox
                          checked={field.required}
                          onCheckedChange={(checked) =>
                            updateField(field.id, "required", Boolean(checked))
                          }
                        />
                        Required
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {mappedFieldCount} mapped, {customFieldCount} custom, JSON response saved.
                </div>
                <Button type="submit" disabled={saving} className="gap-2 font-semibold">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                  Create Shareable Form
                </Button>
              </div>
            </section>
          </form>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <SectionTitle
                icon={ClipboardList}
                label="Library"
                title="Existing forms"
                detail="Share links, analytics, and saved JSON."
              />

              <div className="mt-5 space-y-3">
                {loading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading forms
                  </div>
                ) : forms.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No trainer forms yet.
                  </div>
                ) : (
                  forms.map((item) => (
                    <div key={item.id} className="rounded-lg border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold">{item.title}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {FORM_TYPES.find((type) => type.value === item.type)?.label || "General"} - {item.response_count || 0} responses
                          </p>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {item.status}
                        </Badge>
                      </div>
                      {item.classroom_name && (
                        <p className="mt-2 truncate text-xs text-muted-foreground">
                          {item.classroom_name}
                          {item.class_name ? ` / ${item.class_name}` : ""}
                        </p>
                      )}
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => copyShareLink(item.share_slug)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </Button>
                        <ProgressLink href={`/forms/${item.share_slug}`}>
                          <Button type="button" size="sm" variant="outline" className="w-full gap-1.5">
                            <Share2 className="h-3.5 w-3.5" />
                            Open
                          </Button>
                        </ProgressLink>
                        <ProgressLink href={`/trainer/forms/${item.id}`}>
                          <Button type="button" size="sm" className="w-full gap-1.5">
                            Manage
                          </Button>
                        </ProgressLink>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <SectionTitle
                icon={FileJson}
                label="Current draft"
                title="Payload profile"
                detail="Summary of the form being assembled."
              />
              <div className="mt-5 grid gap-2 text-sm">
                <DraftRow label="Type" value={selectedType.label} />
                <DraftRow label="Status" value={form.status} />
                <DraftRow label="Primary key" value={form.primary_key_label || form.primary_key_field} />
                <DraftRow label="Mapped" value={mappedFieldCount} />
                <DraftRow label="Custom" value={customFieldCount} />
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function SectionEyebrow({ icon: Icon, label }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}

function SectionTitle({ icon: Icon, label, title, detail }) {
  return (
    <div>
      <SectionEyebrow icon={Icon} label={label} />
      <h2 className="mt-1 text-lg font-bold tracking-tight">{title}</h2>
      {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
    </div>
  );
}

function HeaderMetric({ label, value }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-center">
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold">{value}</p>
    </div>
  );
}

function IconButton({ icon: Icon, title, onClick, disabled = false, danger = false }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 ${danger ? "text-red-600 hover:text-red-700" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

function DraftRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-semibold capitalize">{value || "-"}</span>
    </div>
  );
}
