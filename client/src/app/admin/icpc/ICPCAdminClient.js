"use client";

import {
    createIcpcJourneyAdmin,
    deleteIcpcJourneyAdmin,
    getIcpcJourneyAdminList,
    updateIcpcJourneyAdmin,
    uploadIcpcJourneyImages,
} from "@/actions/icpc_journey";
import EditorWrapper from "@/components/EditorWrapper";
import MarkdownRender from "@/components/MarkdownRenderer";
import React from "react";

const INITIAL_FORM = {
  year: "",
  competition: "",
  hosted_uni: "",
  num_of_teams: "",
  best_rank: "",
  references: "",
  images: "",
  description: "",
};

function toForm(item) {
  return {
    year: item?.year ? new Date(item.year).getUTCFullYear().toString() : "",
    competition: item?.competition || "",
    hosted_uni: item?.hosted_uni || "",
    num_of_teams: item?.num_of_teams ? String(item.num_of_teams) : "",
    best_rank: item?.best_rank ? String(item.best_rank) : "",
    references: item?.references || "",
    images: Array.isArray(item?.images) ? item.images.join("\n") : "",
    description: item?.description || "",
  };
}

function toPayload(form) {
  return {
    year: form.year,
    competition: form.competition,
    hosted_uni: form.hosted_uni,
    num_of_teams: form.num_of_teams,
    best_rank: form.best_rank,
    references: form.references,
    images: form.images,
    description: form.description,
  };
}

export default function ICPCAdminClient({ token }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [editId, setEditId] = React.useState(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState(null);
  const [error, setError] = React.useState("");
  const [form, setForm] = React.useState(INITIAL_FORM);

  async function load() {
    setLoading(true);
    setError("");
    const res = await getIcpcJourneyAdminList(token);
    if (res.error) {
      setError(res.error);
      setItems([]);
    } else {
      setItems(res.result || []);
    }
    setLoading(false);
  }

  React.useEffect(() => {
    load();
  }, []);

  function startEdit(item) {
    setEditId(item.id);
    setForm(toForm(item));
    setIsModalOpen(true);
  }

  function resetForm() {
    setEditId(null);
    setForm(INITIAL_FORM);
    setIsModalOpen(false);
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = toPayload(form);
    const res = editId
      ? await updateIcpcJourneyAdmin(token, { id: editId, ...payload })
      : await createIcpcJourneyAdmin(token, payload);

    if (res.error) {
      setError(res.error);
      setSaving(false);
      return;
    }

    await load();
    resetForm();
    setSaving(false);
  }

  function openCreateModal() {
    setEditId(null);
    setForm(INITIAL_FORM);
    setError("");
    setIsModalOpen(true);
  }

  async function handleImageUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setError("");

    const res = await uploadIcpcJourneyImages(files);
    if (res.error) {
      setError(res.error);
      setUploading(false);
      return;
    }

    setForm((prev) => {
      const existing = prev.images ? prev.images.split(/\r?\n/).filter(Boolean) : [];
      const merged = [...existing, ...(res.urls || [])];
      return { ...prev, images: merged.join("\n") };
    });

    setUploading(false);
    e.target.value = "";
  }

  const imageLinks = form.images
    ? form.images.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
    : [];

  function requestDelete(item) {
    setPendingDelete(item);
    setIsDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    setPendingDelete(null);
    setIsDeleteModalOpen(false);
  }

  async function confirmDelete() {
    if (!pendingDelete?.id) return;

    setSaving(true);
    setError("");
    const res = await deleteIcpcJourneyAdmin(token, pendingDelete.id);
    if (res.error) {
      setError(res.error);
      setSaving(false);
      closeDeleteModal();
      return;
    }
    await load();
    setSaving(false);
    closeDeleteModal();
  }

  return (
    <div className="min-h-screen w-full p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">ICPC Journey CMS</h1>
          <p className="text-sm text-muted-foreground">Insert and update ICPC journey records.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm"
        >
          Create Entry
        </button>
      </div>

      <div className="overflow-x-auto border rounded mb-6">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-2 text-left">Year</th>
              <th className="p-2 text-left">Competition</th>
              <th className="p-2 text-left">Hosted</th>
              <th className="p-2 text-left">Teams</th>
              <th className="p-2 text-left">Best Rank</th>
              <th className="p-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-2">{item.year ? new Date(item.year).getUTCFullYear() : ""}</td>
                <td className="p-2 max-w-sm truncate">{item.competition}</td>
                <td className="p-2">{item.hosted_uni}</td>
                <td className="p-2">{item.num_of_teams ?? ""}</td>
                <td className="p-2">{item.best_rank ?? ""}</td>
                <td className="p-2">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => startEdit(item)}
                      className="px-2 py-1 text-xs border rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => requestDelete(item)}
                      className="px-2 py-1 text-xs border rounded text-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  No records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 overflow-y-auto">
          <div className="max-w-5xl mx-auto bg-background border rounded-lg shadow-lg">
            <form onSubmit={onSubmit} className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{editId ? "Update entry" : "Create entry"}</h2>
                <button type="button" onClick={resetForm} className="text-xs px-2 py-1 border rounded">
                  Close
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <label className="text-sm">
                  <span className="block text-xs mb-1">Year</span>
                  <input
                    name="year"
                    value={form.year}
                    onChange={onChange}
                    placeholder="2026"
                    required
                    className="w-full px-3 py-2 border rounded bg-background"
                  />
                </label>

                <label className="text-sm">
                  <span className="block text-xs mb-1">Competition</span>
                  <input
                    name="competition"
                    value={form.competition}
                    onChange={onChange}
                    required
                    className="w-full px-3 py-2 border rounded bg-background"
                  />
                </label>

                <label className="text-sm">
                  <span className="block text-xs mb-1">Hosted University</span>
                  <input
                    name="hosted_uni"
                    value={form.hosted_uni}
                    onChange={onChange}
                    className="w-full px-3 py-2 border rounded bg-background"
                  />
                </label>

                <label className="text-sm">
                  <span className="block text-xs mb-1">Reference</span>
                  <input
                    name="references"
                    value={form.references}
                    onChange={onChange}
                    className="w-full px-3 py-2 border rounded bg-background"
                  />
                </label>

                <label className="text-sm">
                  <span className="block text-xs mb-1">Total Teams</span>
                  <input
                    name="num_of_teams"
                    value={form.num_of_teams}
                    onChange={onChange}
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border rounded bg-background"
                  />
                </label>

                <label className="text-sm">
                  <span className="block text-xs mb-1">Best Rank</span>
                  <input
                    name="best_rank"
                    value={form.best_rank}
                    onChange={onChange}
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border rounded bg-background"
                  />
                </label>

                <div className="text-sm md:col-span-2">
                  <span className="block text-xs mb-1">Upload Images</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="w-full px-3 py-2 border rounded bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Files are uploaded to Supabase bucket: icpc_journey_images
                  </p>
                  {uploading && <p className="text-xs mt-1">Uploading images...</p>}
                </div>

                <label className="text-sm md:col-span-2">
                  <span className="block text-xs mb-1">Image Links (auto-filled after upload)</span>
                  <textarea
                    name="images"
                    value={form.images}
                    onChange={onChange}
                    rows={4}
                    className="w-full px-3 py-2 border rounded bg-background resize-y"
                  />
                </label>

                {imageLinks.length > 0 && (
                  <div className="md:col-span-2 border rounded p-3 text-sm">
                    <p className="font-medium mb-2">Uploaded Links</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {imageLinks.map((url, idx) => (
                        <a key={`${url}-${idx}`} href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline block truncate">
                          {url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-sm md:col-span-2">
                  <span className="block text-xs mb-2">Description (Markdown)</span>
                  <EditorWrapper
                    value={form.description}
                    handleChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        description: typeof value === "string" ? value : (value?.toString?.() || ""),
                      }))
                    }
                  />
                </div>

                <div className="text-sm md:col-span-2 border rounded p-3">
                  <span className="block text-xs mb-2">Description Preview</span>
                  <MarkdownRender
                    content={form.description || ""}
                    className="w-full max-w-none prose-sm"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

              <div className="mt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : editId ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded border text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-background border rounded-lg shadow-lg p-5">
            <h3 className="text-lg font-semibold mb-2">Delete Entry</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Are you sure you want to delete
              {" "}
              <span className="font-medium text-foreground">{pendingDelete?.competition || "this entry"}</span>
              {" "}
              ({pendingDelete?.year ? new Date(pendingDelete.year).getUTCFullYear() : "N/A"})?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="px-3 py-2 rounded border text-sm"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3 py-2 rounded bg-red-600 text-white text-sm disabled:opacity-50"
                disabled={saving}
              >
                {saving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
