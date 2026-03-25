"use client";

import React from "react";

export default function LandingAdminClient({ token }) {
  const [data, setData] = React.useState({
    features: [],
    stats: [],
    timeline: [],
  });
  const [loading, setLoading] = React.useState(false);
  const base = process.env.NEXT_PUBLIC_SERVER_URL;

  async function load() {
    try {
      const headers = { Authorization: "Bearer " + token };
      const [f, s, t] = await Promise.all([
        fetch(base + "/landing/admin/features", { headers }).then((r) => r.json()),
        fetch(base + "/landing/admin/stats", { headers }).then((r) => r.json()),
        fetch(base + "/landing/admin/timeline", { headers }).then((r) => r.json()),
      ]);

      setData({
        features: f.result || [],
        stats: s.result || [],
        timeline: t.result || [],
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
        Manage dynamic landing page content only.
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
      {loading && (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded bg-primary text-primary-foreground shadow">
          Saving...
        </div>
      )}
    </div>
  );
}

function Section({ kind, title, items, fields, onCreate, onUpdate, onDelete }) {
  const [form, setForm] = React.useState({ active: "true" });
  const [editId, setEditId] = React.useState(null);
  const [errors, setErrors] = React.useState({});

  function validate(next) {
    const e = {};
    const val = (k) => (next[k] ?? "").toString().trim();
    const intPattern = /^\d+$/;
    const yearPattern = /^(\d{4})(?:[–-]?\d{0,4})?$/;
    function ensure(cond, key, msg) {
      if (!cond) e[key] = msg;
    }

    if (kind === "features") {
      ensure(val("title").length > 0, "title", "Required");
      ensure(val("description").length > 0, "description", "Required");
      ensure(intPattern.test(val("position")), "position", "Integer required");
    } else if (kind === "stats") {
      ensure(val("title").length > 0, "title", "Required");
      ensure(intPattern.test(val("value")), "value", "Integer required");
      ensure(val("suffix").length <= 5, "suffix", "Max 5 chars");
      ensure(intPattern.test(val("position")), "position", "Integer required");
    } else if (kind === "timeline") {
      ensure(yearPattern.test(val("year")), "year", "Year or range");
      ensure(val("title").length > 0, "title", "Required");
      ensure(val("body").length > 0, "body", "Required");
      ensure(intPattern.test(val("position")), "position", "Integer required");
    }

    ["active"].forEach((bf) => {
      if (bf in next) {
        if (!["true", "false", true, false].includes(next[bf])) e[bf] = "Invalid";
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
    if ("active" in mapped) mapped.active = String(mapped.active);
    setForm(mapped);
    validate(mapped);
  }

  function clear() {
    setEditId(null);
    setForm({ active: "true" });
    setErrors({});
  }

  function submit() {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) return;
    let body = { ...form };
    if ("active" in body) body.active = body.active === "true";
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
                    {String(it[k] ?? "")}
                  </td>
                ))}
                <td className="p-2 flex gap-2">
                  <button onClick={() => startEdit(it)} className="px-2 py-1 text-xs border rounded">
                    Edit
                  </button>
                  <button onClick={() => onDelete({ id: it.id })} className="px-2 py-1 text-xs border rounded text-red-500">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={fields.length + 2} className="p-4 text-center text-muted-foreground">
                  No items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border rounded p-4">
        <h3 className="font-medium mb-3 text-sm">{editId ? "Edit item" : "Create item"}</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {fields.map(([k, l]) => (
            <div key={k} className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-wide font-semibold flex justify-between">
                <span>{l}</span>
                {errors[k] && <span className="text-red-500 normal-case font-normal">{errors[k]}</span>}
              </label>
              {k === "active" ? (
                <select
                  name={k}
                  value={form[k] || "false"}
                  onChange={handleChange}
                  className={"px-2 py-1 border rounded bg-background/50 " + (errors[k] ? "border-red-500" : "")}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : k === "body" || k === "description" ? (
                <textarea
                  name={k}
                  value={form[k] || ""}
                  onChange={handleChange}
                  rows={3}
                  className={"px-2 py-1 border rounded bg-background/50 resize-none " + (errors[k] ? "border-red-500" : "")}
                />
              ) : (
                <input
                  name={k}
                  value={form[k] || ""}
                  onChange={handleChange}
                  className={"px-2 py-1 border rounded bg-background/50 " + (errors[k] ? "border-red-500" : "")}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={submit}
            disabled={hasErrors}
            className={"px-4 py-2 rounded bg-primary text-primary-foreground text-sm " + (hasErrors ? "opacity-50 cursor-not-allowed" : "")}
          >
            {editId ? "Update" : "Create"}
          </button>
          {editId && (
            <button onClick={clear} className="px-4 py-2 rounded border text-sm">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
