"use client";

import { isAdminClient } from "@/lib/isAdmin";
import React from "react";
import AlumniMemberCard from "@/components/alumni/AlumniMemberCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
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
  const [filtersExpanded, setFiltersExpanded] = React.useState(false);

  // Count active filters
  const activeFilterCount = [
    batchFilter !== "all" ? 1 : 0,
    companyFilter !== "all" ? 1 : 0,
    positionFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const [batchDialogOpen, setBatchDialogOpen] = React.useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [editingMemberId, setEditingMemberId] = React.useState(null);
  const [memberToDelete, setMemberToDelete] = React.useState(null);

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
  const designationOptions = React.useMemo(() => [...new Set(members.map((m) => m.designation).filter(Boolean))].sort(), [members]);

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

  async function handleDeleteClick(member) {
    if (!member?.id) return;
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!memberToDelete?.id) return;
    setLoading(true);
    const tid = toast.loading("Deleting alumni...");
    try {
      const { deleteAdminAlumniMember } = await import("@/actions/alumni");
      const res = await deleteAdminAlumniMember({ id: memberToDelete.id });
      if (res?.error) throw new Error(res.error);
      await refreshPublic();
      toast.success("Alumni deleted", { id: tid });
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    } catch (e) {
      toast.error(e?.message || "Failed to delete alumni", { id: tid });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12 md:py-16">
      <datalist id="companies-list">
        {companyOptions.map((o) => <option key={o} value={o} />)}
      </datalist>
      <datalist id="designations-list">
        {designationOptions.map((o) => <option key={o} value={o} />)}
      </datalist>
      <datalist id="positions-list">
        {positionOptions.map((o) => <option key={o} value={o} />)}
      </datalist>

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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                      <Select
                        value={memberForm.batch_id}
                        onValueChange={(val) => setMemberForm((p) => ({ ...p, batch_id: val }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select batch" />
                        </SelectTrigger>
                        <SelectContent>
                          {(batches || []).map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.label} ({b.year})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Current Position (e.g. SWE)</Label>
                      <Input 
                        value={memberForm.designation} 
                        onChange={(e) => setMemberForm((p) => ({ ...p, designation: e.target.value }))}
                        list="designations-list"
                        placeholder="Software Engineer"
                      />
                    </div>
                    <div>
                      <Label>Company (e.g. Google)</Label>
                      <Input 
                        value={memberForm.company_name} 
                        onChange={(e) => setMemberForm((p) => ({ ...p, company_name: e.target.value }))}
                        list="companies-list"
                        placeholder="Google"
                      />
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
                      <Input 
                        value={memberForm.position_in_club} 
                        onChange={(e) => setMemberForm((p) => ({ ...p, position_in_club: e.target.value }))} 
                        list="positions-list"
                        placeholder="President" 
                      />
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

      <section className="mb-6">
        {/* Main filter bar - compact single row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              placeholder="Search alumni..." 
              className="pl-9 h-9 bg-background/50" 
            />
            {query && (
              <button 
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle button */}
          <Button
            variant={filtersExpanded || activeFilterCount > 0 ? "secondary" : "outline"}
            size="sm"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="h-9 gap-1.5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filtersExpanded ? 'rotate-180' : ''}`} />
          </Button>

          {/* Sort dropdown - always visible */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 w-auto min-w-[120px] bg-background/50">
              <span className="text-muted-foreground text-xs mr-1">Sort:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="batch">Batch</SelectItem>
              <SelectItem value="company">Company</SelectItem>
              <SelectItem value="position">Position</SelectItem>
            </SelectContent>
          </Select>

          {/* Results count */}
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} {filtered.length === 1 ? 'alumni' : 'alumni'}
          </span>
        </div>

        {/* Expandable filter panel */}
        {filtersExpanded && (
          <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-border/50">
            <FilterSelect value={batchFilter} onChange={setBatchFilter} options={batchOptions} label="Batch" />
            <FilterSelect value={companyFilter} onChange={setCompanyFilter} options={companyOptions} label="Company" />
            <FilterSelect value={positionFilter} onChange={setPositionFilter} options={positionOptions} label="Position" />
            
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBatchFilter("all");
                  setCompanyFilter("all");
                  setPositionFilter("all");
                }}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Active filter pills - show when filters are active but panel is collapsed */}
        {!filtersExpanded && activeFilterCount > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {batchFilter !== "all" && (
              <FilterPill label="Batch" value={batchFilter} onClear={() => setBatchFilter("all")} />
            )}
            {companyFilter !== "all" && (
              <FilterPill label="Company" value={companyFilter} onClear={() => setCompanyFilter("all")} />
            )}
            {positionFilter !== "all" && (
              <FilterPill label="Position" value={positionFilter} onClear={() => setPositionFilter("all")} />
            )}
          </div>
        )}
      </section>

      {loadError && <p className="text-sm text-red-500 mb-4">Failed to load alumni: {loadError}</p>}

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m, index) => (
          <AlumniMemberCard key={m.id} member={m} canEdit={isAdmin} onEdit={openEdit} onDelete={handleDeleteClick} index={index} />
        ))}
      </section>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Alumni</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{memberToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={loading}>
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {filtered.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-16">No alumni found.</div>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, options, label }) {
  const isActive = value !== "all";
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`h-8 w-auto min-w-[100px] text-xs ${isActive ? 'border-primary/50 bg-primary/5' : 'bg-background/50'}`}>
        <span className="text-muted-foreground mr-1">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FilterPill({ label, value, onClear }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      <span className="text-primary/70">{label}:</span>
      <span className="max-w-[100px] truncate">{value}</span>
      <button onClick={onClear} className="ml-0.5 hover:text-primary/80">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
