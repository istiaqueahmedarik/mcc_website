"use client";
import React from "react";

function parseAlumniBio(rawBio) {
  if (!rawBio) return { about: "", career_path: [] };
  if (typeof rawBio === "object") {
    return {
      ...rawBio,
      about: rawBio.about || rawBio.bio_summary || "",
      career_path: Array.isArray(rawBio.career_path)
        ? rawBio.career_path
        : typeof rawBio.career_path === "string"
          ? rawBio.career_path
              .split(/->|→|\|/)
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
    };
  }

  const text = String(rawBio).trim();
  if (!text) return { about: "", career_path: [] };

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      return {
        ...parsed,
        about: parsed.about || parsed.bio_summary || "",
        career_path: Array.isArray(parsed.career_path)
          ? parsed.career_path
          : typeof parsed.career_path === "string"
            ? parsed.career_path
                .split(/->|→|\|/)
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
      };
    }
  } catch {
    return { about: text, career_path: [] };
  }

  return { about: "", career_path: [] };
}

function enrichAlumniMember(member) {
  const meta = parseAlumniBio(member.bio);
  const careerPath = (meta.career_path || []).join(" -> ");
  return {
    ...member,
    current_company: meta.current_company || meta.company || "",
    location: meta.location || "",
    email: meta.email || "",
    phone: meta.phone || "",
    facebook_url: meta.facebook_url || meta.facebook || "",
    bio_summary: meta.about || "",
    career_path: careerPath,
  };
}

function buildAlumniMemberPayload(form, editId) {
  const clean = (v) => String(v ?? "").trim();
  const careerPathList = clean(form.career_path)
    ? clean(form.career_path)
        .split(/->|→|\|/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const currentCompany = clean(form.current_company);
  const computedCurrentPosition = [clean(form.role), currentCompany]
    .filter(Boolean)
    .join(" @ ");

  const bioMeta = {
    about: clean(form.bio_summary),
    current_company: currentCompany,
    location: clean(form.location),
    email: clean(form.email),
    phone: clean(form.phone),
    facebook_url: clean(form.facebook_url),
    career_path: careerPathList,
  };

  const payload = {
    batch_id: form.batch_id,
    full_name: clean(form.full_name),
    role: clean(form.role),
    current_position: computedCurrentPosition || clean(form.current_position),
    image_url: clean(form.image_url),
    linkedin_url: clean(form.linkedin_url),
    highlight: form.highlight === true || form.highlight === "true",
    sort_order: clean(form.sort_order) || "0",
    is_active: form.is_active === true || form.is_active === "true",
    bio: JSON.stringify(bioMeta),
  };

  if (editId) payload.id = editId;
  return payload;
}

export default function LandingAdminClient({ token }) {
  const [data, setData] = React.useState({
    features: [],
    stats: [],
    timeline: [],
    testimonials: [],
  });
  const [loading, setLoading] = React.useState(false);
  const base = process.env.NEXT_PUBLIC_SERVER_URL;

  async function load() {
    try {
      const headers = { Authorization: "Bearer " + token };
      const [f, s, t, ab, am] = await Promise.all([
        fetch(base + "/landing/admin/features", { headers }).then((r) =>
          r.json()
        ),
        fetch(base + "/landing/admin/stats", { headers }).then((r) => r.json()),
        fetch(base + "/landing/admin/timeline", { headers }).then((r) =>
          r.json()
        ),
        fetch(base + "/landing/admin/alumni/batch", { headers }).then((r) =>
          r.json()
        ),
        fetch(base + "/landing/admin/alumni/member", { headers }).then((r) =>
          r.json()
        ),
      ]);

      const batches = ab.result || [];
      const batchMap = new Map(batches.map((b) => [String(b.id), b]));
      const members = (am.result || []).map((m) => {
        const batch = batchMap.get(String(m.batch_id));
        return {
          ...enrichAlumniMember(m),
          batch_label: batch ? `${batch.label} (${batch.year})` : String(m.batch_id),
        };
      });

      setData({
        features: f.result || [],
        stats: s.result || [],
        timeline: t.result || [],
        testimonials: [],
        alumni_batches: batches,
        alumni_members: members,
      });
    } catch (e) {
      console.error(e);
    }
  }
  React.useEffect(() => {
    load();
  }, []);

  async function adminFetch(path, body) {
    setLoading(true);
    try {
      const res = await fetch(base + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.error) alert(json.error);
      else await load();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }


  return (
    <div className="min-h-screen w-full p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Landing CMS</h1>
      <p className="text-sm mb-8 text-muted-foreground">
        Manage dynamic landing page content. Changes reflect immediately for new
        visitors.
      </p>
      <Section
        kind="features"
        title="Features"
        items={data.features}
        fields={[
          ["title", "Title"],
          ["description", "Description"],
          ["position", "Position"],
          ["active", "Active"],
        ]}
        onCreate={(b) => adminFetch("/landing/admin/features/create", b)}
        onUpdate={(b) => adminFetch("/landing/admin/features/update", b)}
        onDelete={(b) => adminFetch("/landing/admin/features/delete", b)}
      />
      <Section
        kind="stats"
        title="Stats"
        items={data.stats}
        fields={[
          ["title", "Title"],
          ["value", "Value"],
          ["suffix", "Suffix"],
          ["position", "Position"],
          ["active", "Active"],
        ]}
        onCreate={(b) => adminFetch("/landing/admin/stats/create", b)}
        onUpdate={(b) => adminFetch("/landing/admin/stats/update", b)}
        onDelete={(b) => adminFetch("/landing/admin/stats/delete", b)}
      />
      <Section
        kind="timeline"
        title="Timeline"
        items={data.timeline}
        fields={[
          ["year", "Year"],
          ["title", "Title"],
          ["body", "Body"],
          ["position", "Position"],
          ["active", "Active"],
        ]}
        onCreate={(b) => adminFetch("/landing/admin/timeline/create", b)}
        onUpdate={(b) => adminFetch("/landing/admin/timeline/update", b)}
        onDelete={(b) => adminFetch("/landing/admin/timeline/delete", b)}
      />
      {/* Alumni Batches */}
      <Section
        kind="alumni_batch"
        title="Alumni Batches"
        items={data.alumni_batches || []}
        fields={[
          ["year", "Year"],
          ["label", "Label"],
          ["motto", "Motto"],
          ["sort_order", "Sort Order"],
          ["is_active", "Active"],
        ]}
        onCreate={(b) => adminFetch("/landing/admin/alumni/batch/create", b)}
        onUpdate={(b) => adminFetch("/landing/admin/alumni/batch/update", b)}
        onDelete={(b) => adminFetch("/landing/admin/alumni/batch/delete", b)}
      />
      {/* Alumni Members */}
      <Section
        kind="alumni_member"
        title="Alumni Directory Members"
        items={data.alumni_members || []}
        fields={[
          ["batch_id", "Batch"],
          ["full_name", "Full Name"],
          ["role", "Role"],
          ["current_company", "Current Company"],
          ["location", "Location"],
          ["image_url", "Image URL"],
          ["linkedin_url", "LinkedIn URL"],
          ["email", "Email"],
          ["facebook_url", "Facebook URL"],
          ["phone", "Phone"],
          ["career_path", "Career Path (use ->)"],
          ["bio_summary", "Bio Summary"],
          ["highlight", "Show on Landing"],
          ["sort_order", "Sort Order"],
          ["is_active", "Active"],
        ]}
        onCreate={(b) => adminFetch("/landing/admin/alumni/member/create", b)}
        onUpdate={(b) => adminFetch("/landing/admin/alumni/member/update", b)}
        onDelete={(b) => adminFetch("/landing/admin/alumni/member/delete", b)}
        batches={data.alumni_batches || []}
      />
      {loading && (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded bg-primary text-primary-foreground shadow">
          Saving...
        </div>
      )}
    </div>
  );
}

function Section({
  kind,
  title,
  items,
  fields,
  onCreate,
  onUpdate,
  onDelete,
  batches,
}) {
  const [form, setForm] = React.useState({ active: "true" });
  const [editId, setEditId] = React.useState(null);
  const [errors, setErrors] = React.useState({});

  function validate(next) {
    const e = {};
    const val = (k) => (next[k] ?? "").toString().trim();
    const intPattern = /^\d+$/;
    const yearPattern = /^(\d{4})(?:[–-]?\d{0,4})?$/;
    const urlOk = (u) => {
      try {
        new URL(u);
        return true;
      } catch {
        return false;
      }
    };
    function ensure(cond, key, msg) {
      if (!cond) e[key] = msg;
    }
    switch (kind) {
      case "features":
        ensure(val("title").length > 0, "title", "Required");
        ensure(val("description").length > 0, "description", "Required");
        ensure(
          intPattern.test(val("position")),
          "position",
          "Integer required"
        );
        break;
      case "stats":
        ensure(val("title").length > 0, "title", "Required");
        ensure(intPattern.test(val("value")), "value", "Integer required");
        ensure(val("suffix").length <= 5, "suffix", "Max 5 chars");
        ensure(
          intPattern.test(val("position")),
          "position",
          "Integer required"
        );
        break;
      case "timeline":
        ensure(yearPattern.test(val("year")), "year", "Year or range");
        ensure(val("title").length > 0, "title", "Required");
        ensure(val("body").length > 0, "body", "Required");
        ensure(
          intPattern.test(val("position")),
          "position",
          "Integer required"
        );
        break;
      case "alumni_batch":
        ensure(
          intPattern.test(val("year")) && val("year").length === 4,
          "year",
          "4-digit year"
        );
        ensure(val("label").length > 0, "label", "Required");
        if (val("motto"))
          ensure(val("motto").length <= 140, "motto", "Max 140 chars");
        ensure(intPattern.test(val("sort_order")), "sort_order", "Integer");
        break;
      case "alumni_member":
        ensure(val("batch_id").length > 0, "batch_id", "Required");
        if (val("batch_id") && Array.isArray(batches)) {
          const found = batches.some((b) => String(b.id) === val("batch_id"));
          ensure(found, "batch_id", "Select a valid batch");
        }
        ensure(val("full_name").length > 0, "full_name", "Required");
        ensure(val("role").length > 0, "role", "Required");
        ensure(val("current_company").length > 0, "current_company", "Required");
        if (val("email")) {
          ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("email")), "email", "Invalid email");
        }
        if (val("phone")) {
          ensure(/^[0-9+()\-\s]{6,20}$/.test(val("phone")), "phone", "Invalid phone");
        }
        if (val("image_url"))
          ensure(urlOk(val("image_url")), "image_url", "Invalid URL");
        if (val("linkedin_url"))
          ensure(urlOk(val("linkedin_url")), "linkedin_url", "Invalid URL");
        if (val("facebook_url"))
          ensure(urlOk(val("facebook_url")), "facebook_url", "Invalid URL");
        if (val("bio_summary"))
          ensure(val("bio_summary").length <= 800, "bio_summary", "Max 800 chars");
        ensure(intPattern.test(val("sort_order")), "sort_order", "Integer");
        break;
    }
    const boolFields = ["active", "is_active", "highlight"];
    boolFields.forEach((bf) => {
      if (bf in next) {
        if (!["true", "false", true, false].includes(next[bf]))
          e[bf] = "Invalid";
      }
    });
    setErrors(e);
    return e;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => {
      const nf = { ...f, [name]: value };
      validate(nf);
      return nf;
    });
  }
  function startEdit(item) {
    setEditId(item.id);
    const mapped = { ...item };
    ["active", "is_active", "highlight"].forEach((k) => {
      if (k in mapped) mapped[k] = String(mapped[k]);
    });
    setForm(mapped);
    validate(mapped);
  }
  function clear() {
    setEditId(null);
    const base = { active: "true", is_active: "true", highlight: "false" };
    setForm(base);
    setErrors({});
  }
  function submit() {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) return;
    let body = { ...form };
    ["active", "is_active", "highlight"].forEach((k) => {
      if (k in body) body[k] = body[k] === "true";
    });
    if (kind === "alumni_member") {
      body = buildAlumniMemberPayload(body, editId);
    } else if (editId) {
      body.id = editId;
    }
    (editId ? onUpdate(body) : onCreate(body)).then(() => clear());
  }
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="mb-14">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button onClick={clear} className="text-xs px-2 py-1 border rounded">
          New
        </button>
      </div>
      <div className="overflow-x-auto border rounded mb-4">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-2 text-left">ID</th>
              {fields.map(([k, l]) => (
                <th key={k} className="p-2 text-left">
                  {l}
                </th>
              ))}
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="p-2">{it.id}</td>
                {fields.map(([k]) => (
                  <td key={k} className="p-2 max-w-xs truncate">
                    {["active", "is_active", "highlight"].includes(k)
                      ? String(it[k])
                      : kind === "alumni_member" && k === "batch_id"
                        ? String(it.batch_label ?? it[k] ?? "")
                        : String(it[k] ?? "")}
                  </td>
                ))}
                <td className="p-2 flex gap-2">
                  <button
                    onClick={() => startEdit(it)}
                    className="px-2 py-1 text-xs border rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete({ id: it.id })}
                    className="px-2 py-1 text-xs border rounded text-red-500"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={fields.length + 2}
                  className="p-4 text-center text-muted-foreground"
                >
                  No items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border rounded p-4">
        <h3 className="font-medium mb-3 text-sm">
          {editId
            ? "Edit " + title.slice(0, -1)
            : "Create " + title.slice(0, -1)}
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {fields.map(([k, l]) => (
            <div key={k} className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-wide font-semibold flex justify-between">
                <span>{l}</span>
                {errors[k] && (
                  <span className="text-red-500 normal-case font-normal">
                    {errors[k]}
                  </span>
                )}
              </label>
              {kind === "alumni_member" && k === "batch_id" ? (
                <select
                  name={k}
                  value={form[k] || ""}
                  onChange={handleChange}
                  className={
                    "px-2 py-1 border rounded bg-background/50 " +
                    (errors[k] ? "border-red-500" : "")
                  }
                >
                  <option value="" disabled>
                    Select a batch...
                  </option>
                  {(batches || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label} ({b.year})
                    </option>
                  ))}
                </select>
              ) : ["active", "is_active", "highlight"].includes(k) ? (
                <select
                  name={k}
                  value={form[k] || "false"}
                  onChange={handleChange}
                  className={
                    "px-2 py-1 border rounded bg-background/50 " +
                    (errors[k] ? "border-red-500" : "")
                  }
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : ["bio", "bio_summary", "career_path"].includes(k) ? (
                <textarea
                  name={k}
                  value={form[k] || ""}
                  onChange={handleChange}
                  rows={3}
                  className={
                    "px-2 py-1 border rounded bg-background/50 resize-none " +
                    (errors[k] ? "border-red-500" : "")
                  }
                />
              ) : (
                <input
                  name={k}
                  value={form[k] || ""}
                  onChange={handleChange}
                  className={
                    "px-2 py-1 border rounded bg-background/50 " +
                    (errors[k] ? "border-red-500" : "")
                  }
                />
              )}
            </div>
          ))}
        </div>
        {editId && <div className="text-xs mt-2">Editing ID: {editId}</div>}
        <div className="mt-4 flex gap-3">
          <button
            onClick={submit}
            disabled={hasErrors}
            className={
              "px-4 py-2 rounded bg-primary text-primary-foreground text-sm " +
              (hasErrors ? "opacity-50 cursor-not-allowed" : "")
            }
          >
            {editId ? "Update" : "Create"}
          </button>
          {editId && (
            <button
              onClick={clear}
              className="px-4 py-2 rounded border text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
