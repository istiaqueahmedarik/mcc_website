"use client";

import { isAdminClient } from "@/lib/isAdmin";
import React from "react";
import AlumniMemberCard from "@/components/alumni/AlumniMemberCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/lib/action";

function normalizeMember(member) {
  return {
    ...member,
    name: member.name || member.full_name || "",
    batch: member.batch || "",
    batch_id: member.batch_id || "",
    batch_year: Number(member.batch_year || 0) || null,
    designation: member.designation || "",
    company_name: member.company_name || "",
    position_in_club: member.position_in_club || "",
    club_position_year: member.club_position_year ? Number(member.club_position_year) : null,
    image_url: member.image_url || "",
    linkedin_url: member.linkedin_url || "",
    cf_handle: member.cf_handle || "",
    highlight: Boolean(member.highlight),
  };
}

function toFlatMembers(batches) {
  return (batches || []).flatMap((batch) =>
    (batch.members || []).map((m) =>
      normalizeMember({
        ...m,
        batch_id: batch.id,
        batch: batch.label || batch.batch || "",
        batch_year: batch.year,
      })
    )
  );
}

function matchText(value, query) {
  return String(value || "").toLowerCase().includes(query.toLowerCase());
}

export default function AlumniClient({ initialBatches, loadError }) {
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [batches, setBatches] = React.useState(initialBatches || []);
  const [query, setQuery] = React.useState("");
  const [batchFilter, setBatchFilter] = React.useState("all");
  const [companyFilter, setCompanyFilter] = React.useState("all");
  const [positionFilter, setPositionFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("name");
  const [loading, setLoading] = React.useState(false);

  const [batchDialogOpen, setBatchDialogOpen] = React.useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);
  const [editingMemberId, setEditingMemberId] = React.useState(null);

  const [batchForm, setBatchForm] = React.useState({ year: "", label: "", motto: "" });
  const [memberForm, setMemberForm] = React.useState({
    batch_id: "",
    full_name: "",
    designation: "",
    company_name: "",
    image_url: "",
    position_in_club: "",
    club_position_year: "",
    linkedin_url: "",
    cf_handle: "",
    highlight: false,
  });
  const [uploadingImage, setUploadingImage] = React.useState(false);

  const members = React.useMemo(() => toFlatMembers(batches), [batches]);
  const batchOptions = React.useMemo(() => [...new Set(members.map((m) => m.batch).filter(Boolean))].sort(), [members]);
  const companyOptions = React.useMemo(() => [...new Set(members.map((m) => m.company_name).filter(Boolean))].sort(), [members]);
  const positionOptions = React.useMemo(() => [...new Set(members.map((m) => m.position_in_club).filter(Boolean))].sort(), [members]);

  React.useEffect(() => {
    setIsAdmin(isAdminClient());
  }, []);

  async function refreshPublic() {
    const res = await fetch(process.env.NEXT_PUBLIC_SERVER_URL + "/alumni/public", { cache: "no-store" });
    const json = await res.json();
    if (!json.error) setBatches(json.batches || []);
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = members.filter((m) => {
      if (batchFilter !== "all" && m.batch !== batchFilter) return false;
      if (companyFilter !== "all" && m.company_name !== companyFilter) return false;
      if (positionFilter !== "all" && m.position_in_club !== positionFilter) return false;
      if (!q) return true;
      return (
        matchText(m.name, q) ||
        matchText(m.batch, q) ||
        matchText(m.designation, q) ||
        matchText(m.company_name, q) ||
        matchText(m.position_in_club, q) ||
        matchText(m.cf_handle, q)
      );
    });
    return list.sort((a, b) => {
      if (sortBy === "batch") return Number(b.batch_year || 0) - Number(a.batch_year || 0);
      if (sortBy === "company") return String(a.company_name || "").localeCompare(String(b.company_name || ""));
      if (sortBy === "position") return String(a.position_in_club || "").localeCompare(String(b.position_in_club || ""));
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [members, query, batchFilter, companyFilter, positionFilter, sortBy]);

  function resetMemberForm() {
    setEditingMemberId(null);
    setMemberForm({
      batch_id: "",
      full_name: "",
      designation: "",
      company_name: "",
      image_url: "",
      position_in_club: "",
      club_position_year: "",
      linkedin_url: "",
      cf_handle: "",
      highlight: false,
    });
  }

  function openEdit(member) {
    setEditingMemberId(member.id);
    setMemberForm({
      batch_id: member.batch_id || "",
      full_name: member.name || "",
      designation: member.designation || "",
      company_name: member.company_name || "",
      image_url: member.image_url || "",
      position_in_club: member.position_in_club || "",
      club_position_year: member.club_position_year ? String(member.club_position_year) : "",
      linkedin_url: member.linkedin_url || "",
      cf_handle: member.cf_handle || "",
      highlight: Boolean(member.highlight),
    });
    setMemberDialogOpen(true);
  }

  async function saveBatch() {
    if (!batchForm.year || !batchForm.label) {
      toast.error("Year and label are required.");
      return;
    }

    setLoading(true);
    const tid = toast.loading("Saving batch...");
    try {
      const { createAdminAlumniBatch } = await import("@/actions/alumni");
      const res = await createAdminAlumniBatch({
        year: Number(batchForm.year),
        label: batchForm.label,
        motto: batchForm.motto,
        is_active: true,
      });
      if (res?.error) throw new Error(res.error);
      await refreshPublic();
      setBatchDialogOpen(false);
      setBatchForm({ year: "", label: "", motto: "" });
      toast.success("Batch added", { id: tid });
    } catch (e) {
      toast.error(e?.message || "Failed to add batch", { id: tid });
    } finally {
      setLoading(false);
    }
  }

  async function saveMember() {
    if (!memberForm.batch_id || !memberForm.full_name || !memberForm.designation || !memberForm.company_name || !memberForm.position_in_club) {
      toast.error("Please fill all required fields.");
      return;
    }

    setLoading(true);
    const tid = toast.loading(editingMemberId ? "Updating alumni..." : "Adding alumni...");
    try {
      const { createAdminAlumniMember, updateAdminAlumniMember } = await import("@/actions/alumni");
      const payload = {
        batch_id: memberForm.batch_id,
        full_name: memberForm.full_name,
        designation: memberForm.designation,
        company_name: memberForm.company_name,
        image_url: memberForm.image_url,
        position_in_club: memberForm.position_in_club,
        club_position_year: memberForm.club_position_year ? Number(memberForm.club_position_year) : null,
        linkedin_url: memberForm.linkedin_url,
        cf_handle: memberForm.cf_handle,
        highlight: Boolean(memberForm.highlight),
        is_active: true,
      };

      const res = editingMemberId
        ? await updateAdminAlumniMember({ id: editingMemberId, ...payload })
        : await createAdminAlumniMember(payload);

      if (res?.error) throw new Error(res.error);
      await refreshPublic();
      setMemberDialogOpen(false);
      resetMemberForm();
      toast.success(editingMemberId ? "Alumni updated" : "Alumni added", { id: tid });
    } catch (e) {
      toast.error(e?.message || "Failed to save alumni", { id: tid });
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const idSeed = String(memberForm.full_name || "alumni").trim().replace(/\s+/g, "_").toLowerCase();
      const { url, error } = await uploadImage("alumni", idSeed, file, "all_picture");
      if (error || !url) {
        toast.error("Image upload failed");
        return;
      }
      setMemberForm((p) => ({ ...p, image_url: url }));
      toast.success("Image uploaded");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleDelete(member) {
    if (!member?.id) return;
    if (!window.confirm(`Delete ${member.name}?`)) return;
    setLoading(true);
    const tid = toast.loading("Deleting alumni...");
    try {
      const { deleteAdminAlumniMember } = await import("@/actions/alumni");
      const res = await deleteAdminAlumniMember({ id: member.id });
      if (res?.error) throw new Error(res.error);
      await refreshPublic();
      toast.success("Alumni deleted", { id: tid });
    } catch (e) {
      toast.error(e?.message || "Failed to delete alumni", { id: tid });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12 md:py-16">
      <header className="mb-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Alumni Directory</h1>
            <p className="mt-2 text-sm md:text-base text-muted-foreground">
              Alumni cards with batch, role, position year, and social links.
            </p>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" /> Add Batch
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Alumni Batch</DialogTitle>
                    <DialogDescription>Provide year, label, and motto.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Year</Label>
                      <Input value={batchForm.year} onChange={(e) => setBatchForm((p) => ({ ...p, year: e.target.value }))} placeholder="2023" />
                    </div>
                    <div>
                      <Label>Label</Label>
                      <Input value={batchForm.label} onChange={(e) => setBatchForm((p) => ({ ...p, label: e.target.value }))} placeholder="CSE" />
                    </div>
                    <div>
                      <Label>Motto</Label>
                      <Input value={batchForm.motto} onChange={(e) => setBatchForm((p) => ({ ...p, motto: e.target.value }))} placeholder="We build the future" />
                    </div>
                    <Button onClick={saveBatch} disabled={loading}>Save Batch</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog
                open={memberDialogOpen}
                onOpenChange={(open) => {
                  setMemberDialogOpen(open);
                  if (!open) resetMemberForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" /> Add Alumni
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingMemberId ? "Edit Alumni" : "Add Alumni"}</DialogTitle>
                    <DialogDescription>Fill requested alumni information.</DialogDescription>
                  </DialogHeader>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label>Name</Label>
                      <Input value={memberForm.full_name} onChange={(e) => setMemberForm((p) => ({ ...p, full_name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Batch</Label>
                      <select
                        value={memberForm.batch_id}
                        onChange={(e) => setMemberForm((p) => ({ ...p, batch_id: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select batch</option>
                        {(batches || []).map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.label} ({b.year})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Current Position (e.g. SWE)</Label>
                      <Input value={memberForm.designation} onChange={(e) => setMemberForm((p) => ({ ...p, designation: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Company (e.g. Google)</Label>
                      <Input value={memberForm.company_name} onChange={(e) => setMemberForm((p) => ({ ...p, company_name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Image URL</Label>
                      <Input value={memberForm.image_url} onChange={(e) => setMemberForm((p) => ({ ...p, image_url: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Upload Image</Label>
                      <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage || loading} />
                    </div>
                    <div>
                      <Label>Club Position</Label>
                      <Input value={memberForm.position_in_club} onChange={(e) => setMemberForm((p) => ({ ...p, position_in_club: e.target.value }))} placeholder="President" />
                    </div>
                    <div>
                      <Label>Club Position Year</Label>
                      <Input value={memberForm.club_position_year} onChange={(e) => setMemberForm((p) => ({ ...p, club_position_year: e.target.value }))} placeholder="2023" />
                    </div>
                    <div>
                      <Label>LinkedIn URL</Label>
                      <Input value={memberForm.linkedin_url} onChange={(e) => setMemberForm((p) => ({ ...p, linkedin_url: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Codeforces Handle</Label>
                      <Input value={memberForm.cf_handle} onChange={(e) => setMemberForm((p) => ({ ...p, cf_handle: e.target.value }))} />
                    </div>
                    <label className="flex items-center gap-2 text-sm mt-6">
                      <input
                        type="checkbox"
                        checked={Boolean(memberForm.highlight)}
                        onChange={(e) => setMemberForm((p) => ({ ...p, highlight: e.target.checked }))}
                      />
                      Show on landing page
                    </label>
                  </div>

                  <Button onClick={saveMember} disabled={loading || uploadingImage}>
                    {editingMemberId ? "Update Alumni" : "Add Alumni"}
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </header>

      <section className="border rounded-lg p-4 mb-8 bg-card space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search alumni..." className="pl-9" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
          <Select value={batchFilter} onChange={setBatchFilter} options={batchOptions} label="Batch" />
          <Select value={companyFilter} onChange={setCompanyFilter} options={companyOptions} label="Company" />
          <Select value={positionFilter} onChange={setPositionFilter} options={positionOptions} label="Position" />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="name">Sort: Name</option>
            <option value="batch">Sort: Batch</option>
            <option value="company">Sort: Company</option>
            <option value="position">Sort: Position</option>
          </select>
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setBatchFilter("all");
              setCompanyFilter("all");
              setPositionFilter("all");
              setSortBy("name");
            }}
          >
            Reset
          </Button>
        </div>
      </section>

      {loadError && <p className="text-sm text-red-500 mb-4">Failed to load alumni: {loadError}</p>}

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m) => (
          <AlumniMemberCard key={m.id} member={m} canEdit={isAdmin} onEdit={openEdit} onDelete={handleDelete} />
        ))}
      </section>

      {filtered.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-16">No alumni found.</div>
      )}
    </div>
  );
}

function Select({ value, onChange, options, label }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
      <option value="all">{label}: All</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
