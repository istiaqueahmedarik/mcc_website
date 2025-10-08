"use client";
import React from "react";

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
      const [f, s, t, tt, ab, am] = await Promise.all([
        fetch(base + "/landing/admin/features", { headers }).then((r) =>
          r.json()
        ),
        fetch(base + "/landing/admin/stats", { headers }).then((r) => r.json()),
        fetch(base + "/landing/admin/timeline", { headers }).then((r) =>
          r.json()
        ),
        fetch(base + "/landing/admin/testimonials", { headers }).then((r) => {
          console.log("r", r);
          if (!r.ok) return { result: [] };
          return r.json();
        }),
        fetch(base + "/landing/admin/alumni/batch", { headers }).then((r) =>
          r.json()
        ),
        fetch(base + "/landing/admin/alumni/member", { headers }).then((r) =>
          r.json()
        ),
      ]);
      setData({
        features: f.result || [],
        stats: s.result || [],
        timeline: t.result || [],
        testimonials: tt.result || [],
        alumni_batches: ab.result || [],
        alumni_members: am.result || [],
      });
    } catch (e) {
      console.error(e);
    }
  }
  React.useEffect(() => {
    load();

    console.log(data);
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
        title="Alumni Members"
        items={data.alumni_members || []}
        fields={[
          ["batch_id", "Batch ID"],
          ["full_name", "Full Name"],
          ["role", "Role"],
          ["current_position", "Current Position"],
          ["bio", "Bio"],
          ["image_url", "Image URL"],
          ["linkedin_url", "LinkedIn URL"],
          ["github_url", "GitHub URL"],
          ["highlight", "Highlight"],
          ["sort_order", "Sort Order"],
          ["is_active", "Active"],
        ]}
        onCreate={(b) => adminFetch("/landing/admin/alumni/member/create", b)}
        onUpdate={(b) => adminFetch("/landing/admin/alumni/member/update", b)}
        onDelete={(b) => adminFetch("/landing/admin/alumni/member/delete", b)}
        batches={data.alumni_batches || []}
      />
      <Section
        kind="landing_alumni"
        title="Landing Alumni (Testimonials)"
        items={data.testimonials}
        fields={[
          ["name", "Name"],
          ["title", "Tagline"],
          ["quote", "Quote"],
          ["image_url", "Image URL"],
          ["position", "Position"],
          ["active", "Active"],
        ]}
        onCreate={(b) => adminFetch("/landing/admin/alumni/create", b)}
        onUpdate={(b) => adminFetch("/landing/admin/alumni/update", b)}
        onDelete={(b) => adminFetch("/landing/admin/alumni/delete", b)}
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
        ensure(val("full_name").length > 0, "full_name", "Required");
        ensure(
          val("current_position").length > 0,
          "current_position",
          "Required"
        );
        if (val("image_url"))
          ensure(urlOk(val("image_url")), "image_url", "Invalid URL");
        if (val("linkedin_url"))
          ensure(urlOk(val("linkedin_url")), "linkedin_url", "Invalid URL");
        if (val("github_url"))
          ensure(urlOk(val("github_url")), "github_url", "Invalid URL");
        if (val("bio"))
          ensure(val("bio").length <= 800, "bio", "Max 800 chars");
        ensure(intPattern.test(val("sort_order")), "sort_order", "Integer");
        break;
      case "landing_alumni":
        ensure(val("name").length > 0, "name", "Required");
        ensure(val("title").length > 0, "title", "Required");
        ensure(val("quote").length > 0, "quote", "Required");
        if (val("image_url")) {
          try {
            new URL(val("image_url"));
          } catch {
            e.image_url = "Invalid URL";
          }
        }
        ensure(
          intPattern.test(val("position")),
          "position",
          "Integer required"
        );
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
    const body = { ...form };
    ["active", "is_active", "highlight"].forEach((k) => {
      if (k in body) body[k] = body[k] === "true";
    });
    if (editId) body.id = editId;
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
              ) : k === "bio" ? (
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
