"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api-client";
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
  HelpCircle,
  Loader2,
  Plus,
  Send,
  Settings2,
  Share2,
  Trash2,
  UserRoundSearch,
} from "lucide-react";
import { useTour } from "@/hooks/useTour";

const trainerFormSteps = [
  {
    popover: {
      title: "📋 Welcome to Form Creator!",
      description: "This is where you build and manage forms for your classrooms — attendance sheets, invitation flows, or general surveys. Let's walk through each section.",
      side: "center",
      align: "center",
    },
  },
  {
    element: "#forms-tour-header",
    popover: {
      title: "📊 Page Overview",
      description: "The header shows how many forms you've created, how many fields are in the current draft, and the current form mode (Attendance, Invitation, or General).",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#forms-tour-setup",
    popover: {
      title: "⚙️ Form Profile — Step 1",
      description: "Start by giving your form a title and a short description. Students will see this when they open the shared link. Set status to 'Published' to accept responses, or 'Draft' to hide it.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#forms-tour-type-selector",
    popover: {
      title: "🗂️ Form Type — Step 2",
      description: "Pick a type: 'Classroom Invitation' auto-enrolls submitters, 'Attendance' tracks who showed up for a session, and 'General' collects free-form responses with JSON export.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#forms-tour-primary-key",
    popover: {
      title: "🔑 Primary Key — Step 3",
      description: "This is the student identifier field used to match responses to your user database. 'Student ID' is the default. The label is what students see on the form.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "#forms-tour-target",
    popover: {
      title: "🎯 Target — Step 4",
      description: "For Invitation and Attendance forms, link to a classroom and optionally a specific session. General forms skip this and just store responses.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "#forms-tour-mapped-cells",
    popover: {
      title: "👤 Mapped User Fields — Step 5",
      description: "These fields pull data from the student's profile (Name, Student ID, Batch, etc.). Click a field to add it to your form — no manual entry needed from students.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#forms-tour-custom-cells",
    popover: {
      title: "✏️ Custom Answer Fields — Step 6",
      description: "Add your own questions here: short text, long answer, number, date, dropdown, or checkbox. Use the preset buttons for quick inserts, or configure each field manually.",
      side: "left",
      align: "start",
    },
  },
  {
    element: "#forms-tour-submit-bar",
    popover: {
      title: "🚀 Create Shareable Form — Step 7",
      description: "When your form is ready, click here to publish it. A unique share link is generated that you can paste into chat, your classroom, or any announcement.",
      side: "top",
      align: "end",
    },
  },
  {
    element: "#forms-tour-library",
    popover: {
      title: "📚 Existing Forms Library",
      description: "All your published forms live here. Each card shows the form title, type, number of responses, and status. Click 'Manage' to view responses and analytics, or 'Copy' to grab the share link.",
      side: "left",
      align: "start",
    },
  },
  {
    element: "#forms-tour-draft-payload",
    popover: {
      title: "🔍 Draft Payload Summary",
      description: "A live summary of your current form draft — type, status, primary key, and field counts. Use this to double-check before publishing.",
      side: "left",
      align: "start",
    },
  },
  {
    element: "#forms-tour-take-tour-btn",
    popover: {
      title: "❓ Take Tour Button",
      description: "Click this anytime to re-launch this tour. You'll never be stuck wondering what a section does!",
      side: "top",
      align: "end",
    },
  },
  {
    popover: {
      title: "🎉 Ready to Build Forms!",
      description: "Start with 'Form Profile', pick a type, add your fields, then publish. Share the link with students and watch the responses roll in!",
      side: "center",
      align: "center",
    },
  },
];

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

const SELECT_CLASS_NAME = "trainer-select";

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

const formQueryKeys = {
  forms: ["trainer", "forms"],
  userFields: ["trainer", "forms", "user-fields"],
  classrooms: ["trainer", "classrooms"],
  classroomClasses: (classroomId) => ["trainer", "classrooms", classroomId, "classes"],
};

async function fetchTrainerForms() {
  const res = await apiGet("trainer-forms/manage/forms");
  return res?.result || [];
}

async function fetchUserFields() {
  const res = await apiGet("trainer-forms/manage/user-fields");
  return res?.result || FALLBACK_USER_FIELDS;
}

async function fetchClassrooms() {
  const res = await apiGet("classroom/list");
  return res?.result || [];
}

async function fetchClassroomClasses(classroomId) {
  const res = await apiGet(`classroom/${classroomId}`);
  return res?.classes || [];
}

export default function TrainerFormsClient() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [origin, setOrigin] = useState("");

  const formsQuery = useQuery({
    queryKey: formQueryKeys.forms,
    queryFn: fetchTrainerForms,
  });
  const userFieldsQuery = useQuery({
    queryKey: formQueryKeys.userFields,
    queryFn: fetchUserFields,
  });
  const classroomsQuery = useQuery({
    queryKey: formQueryKeys.classrooms,
    queryFn: fetchClassrooms,
  });
  const classesQuery = useQuery({
    queryKey: formQueryKeys.classroomClasses(form.classroom_id),
    queryFn: () => fetchClassroomClasses(form.classroom_id),
    enabled: Boolean(form.classroom_id),
  });
  const createFormMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await apiPost("trainer-forms/manage/forms", payload);
      if (!res?.success || !res?.form?.id) {
        throw new Error(res?.error || "Failed to create form.");
      }
      return res;
    },
  });

  const forms = formsQuery.data || [];
  const classrooms = classroomsQuery.data || [];
  const userFields = userFieldsQuery.data || FALLBACK_USER_FIELDS;
  const classes = form.classroom_id ? classesQuery.data || [] : [];
  const loading = formsQuery.isLoading || userFieldsQuery.isLoading || classroomsQuery.isLoading;
  const saving = createFormMutation.isPending;

  const { startTour } = useTour({
    storageKey: "mcc_trainer_forms_toured",
    steps: trainerFormSteps,
    autoStart: !loading,
  });

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

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const updateForm = (key, value) => {
    setForm((current) =>
      key === "classroom_id"
        ? { ...current, classroom_id: value, class_id: "" }
        : { ...current, [key]: value },
    );
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

    try {
      const res = await createFormMutation.mutateAsync(payload);
      window.location.href = `/trainer/forms/${res.form.id}`;
      return;
    } catch (mutationError) {
      setError(mutationError?.message || "Failed to create form.");
    }
  };

  return (
    <div className="trainer-page relative">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section id="forms-tour-header" className="pb-1">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="max-w-3xl">
              <ProgressLink
                href="/trainer/dashboard"
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                Trainer dashboard
                <ArrowRight className="h-4 w-4" />
              </ProgressLink>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                Form operations
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Build, publish, and inspect classroom forms from one compact workbench.
              </p>
            </div>

            <div className="trainer-panel grid grid-cols-3 overflow-hidden sm:min-w-[360px]">
              <HeaderMetric label="Forms" value={forms.length} />
              <HeaderMetric label="Fields" value={form.fields.length} />
              <HeaderMetric label="Mode" value={selectedType.label.split(" ")[0]} />
            </div>
          </div>
        </section>

        {notice && (
          <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            {notice}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <form onSubmit={handleCreate} className="space-y-5">
            <section id="forms-tour-setup" className="trainer-panel p-4">
              <SectionTitle
                icon={Settings2}
                label="Setup"
                title="Form profile"
                detail={selectedType.description}
              />

              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
                <div className="space-y-2">
                  <label htmlFor="form-title-input" className="text-sm font-semibold">Title</label>
                  <Input
                    id="form-title-input"
                    value={form.title}
                    onChange={(event) => updateForm("title", event.target.value)}
                    placeholder="Week 4 Attendance"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="form-status-select" className="text-sm font-semibold">Status</label>
                  <select
                    id="form-status-select"
                    value={form.status}
                    onChange={(event) => updateForm("status", event.target.value)}
                    className={SELECT_CLASS_NAME}
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="form-description-input" className="text-sm font-semibold">Description</label>
                  <Textarea
                    id="form-description-input"
                    value={form.description}
                    onChange={(event) => updateForm("description", event.target.value)}
                    placeholder="Short context shown on the shared form."
                    className="min-h-20 text-base md:text-sm"
                  />
                </div>
              </div>

              <div id="forms-tour-type-selector" className="mt-4 grid gap-2 md:grid-cols-3">
                {FORM_TYPES.map((type) => (
                  <button
                    type="button"
                    key={type.value}
                    onClick={() => updateForm("type", type.value)}
                    className={`min-h-24 rounded-md border px-3 py-3 text-left ${
                      form.type === type.value
                        ? "border-foreground bg-foreground text-background"
                        : "bg-background/70 hover:border-foreground/30"
                    }`}
                    aria-pressed={form.type === type.value}
                  >
                    <div className="flex items-center gap-2">
                      {type.value === "attendance" ? (
                        <ClipboardList className="h-4 w-4" />
                      ) : type.value === "classroom_invitation" ? (
                        <Send className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      <span className="truncate text-sm font-semibold">{type.label}</span>
                    </div>
                    <p
                      className={`mt-1 line-clamp-2 text-xs ${
                        form.type === type.value ? "text-background/80" : "text-muted-foreground"
                      }`}
                    >
                      {type.description}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
                <section id="forms-tour-primary-key" className="trainer-panel p-4">
                <SectionTitle
                  icon={UserRoundSearch}
                  label="Identity"
                  title="Primary key"
                  detail="Responder lookup and mapped alias source."
                />

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="primary-key-field-select" className="text-sm font-semibold">Primary key field</label>
                    <select
                      id="primary-key-field-select"
                      value={form.primary_key_field}
                      onChange={(event) => updateForm("primary_key_field", event.target.value)}
                      className={SELECT_CLASS_NAME}
                    >
                      {userFields.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="primary-key-label-input" className="text-sm font-semibold">Label on form</label>
                    <Input
                      id="primary-key-label-input"
                      value={form.primary_key_label}
                      onChange={(event) => updateForm("primary_key_label", event.target.value)}
                      placeholder="Student ID"
                    />
                  </div>
                </div>
              </section>

              <section id="forms-tour-target" className="trainer-panel p-4">
                <SectionTitle
                  icon={BarChart3}
                  label="Target"
                  title={needsClassroomTarget ? "Dynamic tracking" : "General response set"}
                  detail={selectedType.description}
                />

                {needsClassroomTarget ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="form-classroom-select" className="text-sm font-semibold">Classroom</label>
                      <select
                        id="form-classroom-select"
                        value={form.classroom_id}
                        onChange={(event) => updateForm("classroom_id", event.target.value)}
                        className={SELECT_CLASS_NAME}
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
                      <label htmlFor="form-class-select" className="text-sm font-semibold">Class session</label>
                      <select
                        id="form-class-select"
                        value={form.class_id}
                        onChange={(event) => updateForm("class_id", event.target.value)}
                        className={SELECT_CLASS_NAME}
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
                  <div className="trainer-empty mt-4 px-3 py-3 text-sm">
                    General forms skip classroom targeting and store response JSON.
                  </div>
                )}
              </section>
            </div>

            <section className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <SectionEyebrow icon={FileText} label="Cells" />
                  <h2 className="mt-1 text-lg font-semibold">Response structure</h2>
                  <p className="text-sm text-muted-foreground">
                    Mapped aliases plus custom answer cells.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{mappedFieldCount} mapped</Badge>
                  <Badge variant="outline">{customFieldCount} custom</Badge>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="trainer-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Mapped user cells</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Aliases from the users table.</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={addInvitationSet}>
                      Profile Set
                    </Button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                    {mappedCellPresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => addMappedField(preset)}
                        className="trainer-panel-soft min-h-9 px-3 py-2 text-left text-xs font-semibold hover:border-foreground/30"
                      >
                        <Plus className="mr-1 inline h-3.5 w-3.5" />
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="trainer-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Custom question cells</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Fields saved in response JSON.</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={addAttendanceSet}>
                      Attendance Set
                    </Button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                    {CUSTOM_CELL_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => addField(preset.field)}
                        className="trainer-panel-soft min-h-[58px] px-3 py-2 text-left hover:border-foreground/30"
                      >
                        <span className="block text-xs font-semibold">{preset.label}</span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {preset.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Field queue</h2>
                  <p className="text-sm text-muted-foreground">
                    {form.fields.length} total fields in submit order.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {form.fields.map((field, index) => (
                  <div key={field.id} className="trainer-panel p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge variant="outline" className="tabular-nums">#{index + 1}</Badge>
                        <Badge
                          variant="outline"
                          className={field.mapUserField ? "trainer-status-success" : "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"}
                        >
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

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor={`field-${field.id}-label`} className="text-xs font-semibold text-muted-foreground">Alias label</label>
                        <Input
                          id={`field-${field.id}-label`}
                          value={field.label}
                          onChange={(event) => updateField(field.id, "label", event.target.value)}
                          placeholder="Student Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor={`field-${field.id}-source`} className="text-xs font-semibold text-muted-foreground">Cell source</label>
                        <select
                          id={`field-${field.id}-source`}
                          value={field.mapUserField || ""}
                          onChange={(event) =>
                            updateField(field.id, "mapUserField", event.target.value || null)
                          }
                          className={SELECT_CLASS_NAME}
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
                            <label htmlFor={`field-${field.id}-type`} className="text-xs font-semibold text-muted-foreground">Input type</label>
                            <select
                              id={`field-${field.id}-type`}
                              value={field.type}
                              onChange={(event) => updateField(field.id, "type", event.target.value)}
                              className={SELECT_CLASS_NAME}
                            >
                              {FIELD_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor={`field-${field.id}-placeholder`} className="text-xs font-semibold text-muted-foreground">Placeholder</label>
                            <Input
                              id={`field-${field.id}-placeholder`}
                              value={field.placeholder}
                              onChange={(event) =>
                                updateField(field.id, "placeholder", event.target.value)
                              }
                              placeholder="Shown to responder"
                            />
                          </div>
                          {field.type === "select" && (
                            <div className="space-y-2 md:col-span-2">
                              <label htmlFor={`field-${field.id}-options`} className="text-sm font-semibold">Options</label>
                              <Textarea
                                id={`field-${field.id}-options`}
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
                                className="text-base md:text-sm"
                              />
                            </div>
                          )}
                        </>
                      )}
                      <div className="space-y-2 md:col-span-2">
                        <label htmlFor={`field-${field.id}-help`} className="text-xs font-semibold text-muted-foreground">Help text</label>
                        <Input
                          id={`field-${field.id}-help`}
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

              <div id="forms-tour-submit-bar" className="trainer-command-bar sticky bottom-4 z-20 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
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

          <aside className="space-y-3 xl:sticky xl:top-5 xl:self-start">
            <section id="forms-tour-library" className="trainer-panel p-4">
              <SectionTitle
                icon={ClipboardList}
                label="Library"
                title="Existing forms"
                detail="Share links, analytics, and saved JSON."
              />

              <div className="mt-4 max-h-[440px] space-y-2 overflow-y-auto pr-1">
                {loading ? (
                  <div className="trainer-empty flex items-center justify-center gap-2 p-4 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading forms
                  </div>
                ) : forms.length === 0 ? (
                  <div className="trainer-empty p-5 text-sm">
                    No trainer forms yet.
                  </div>
                ) : (
                  forms.map((item) => (
                    <div key={item.id} className="trainer-panel-soft p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold">{item.title}</h3>
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
                      <div className="mt-3 grid grid-cols-3 gap-2">
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

            <section id="forms-tour-draft-payload" className="trainer-panel p-4">
              <SectionTitle
                icon={FileJson}
                label="Current draft"
                title="Payload profile"
                detail="Summary of the form being assembled."
              />
              <div className="mt-4 grid gap-2 text-sm">
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

      <button
        id="forms-tour-take-tour-btn"
        onClick={startTour}
        className="trainer-floating-help fixed bottom-5 right-5 z-50 grid h-11 w-11 place-items-center rounded-full text-foreground hover:bg-muted"
        title="Re-launch Forms tour"
        aria-label="Re-launch Forms tour"
      >
        <HelpCircle className="h-4 w-4 text-primary" />
      </button>
    </div>
  );
}

function SectionEyebrow({ icon: Icon, label }) {
  return (
    <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}

function SectionTitle({ icon: Icon, label, title, detail }) {
  return (
    <div>
      <SectionEyebrow icon={Icon} label={label} />
      <h2 className="mt-0.5 text-base font-semibold">{title}</h2>
      {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
    </div>
  );
}

function HeaderMetric({ label, value }) {
  return (
    <div className="min-w-0 border-r px-3 py-2 text-center last:border-r-0">
      <p className="truncate text-[11px] font-semibold text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function IconButton({ icon: Icon, title, onClick, disabled = false, danger = false }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`h-9 w-9 p-0 ${danger ? "text-red-600 hover:text-red-700" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

function DraftRow({ label, value }) {
  return (
    <div className="trainer-panel-soft flex items-center justify-between gap-3 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-semibold capitalize">{value || "-"}</span>
    </div>
  );
}
