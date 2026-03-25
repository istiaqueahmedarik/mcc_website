"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, Save, X } from "lucide-react";

function parseBio(rawBio) {
  if (!rawBio) return { about: "", career_path: [] };
  if (typeof rawBio === "object") {
    return {
      ...rawBio,
      about: rawBio.about || rawBio.bio_summary || "",
      career_path: Array.isArray(rawBio.career_path) ? rawBio.career_path : [],
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
        career_path: Array.isArray(parsed.career_path) ? parsed.career_path : [],
      };
    }
  } catch {
    return { about: text, career_path: [] };
  }
  return { about: "", career_path: [] };
}

function normalizeMember(member) {
  const meta = parseBio(member.bio);
  return {
    ...member,
    position_in_club: member.position_in_club || member.role || "",
    designation: member.designation || "",
    company_name: member.company_name || meta.current_company || meta.company || "",
    location: meta.location || "",
    email: meta.email || "",
    phone: meta.phone || "",
    facebook_url: meta.facebook_url || meta.facebook || "",
    bio_summary: meta.about || "",
    career_path: Array.isArray(meta.career_path) ? meta.career_path.join(" -> ") : "",
  };
}

function buildMemberPayload(form, editId) {
  const clean = (v) => String(v ?? "").trim();
  const careerPath = clean(form.career_path)
    ? clean(form.career_path).split(/->|→|\|/).map((s) => s.trim()).filter(Boolean)
    : [];
  const bio = {
    about: clean(form.bio_summary),
    current_company: clean(form.company_name),
    location: clean(form.location),
    email: clean(form.email),
    phone: clean(form.phone),
    facebook_url: clean(form.facebook_url),
    career_path: careerPath,
  };
  const payload = {
    batch_id: form.batch_id,
    full_name: clean(form.full_name),
    role: clean(form.position_in_club),
    position_in_club: clean(form.position_in_club),
    designation: clean(form.designation),
    company_name: clean(form.company_name),
    current_position: [clean(form.designation), clean(form.company_name)].filter(Boolean).join(" @ "),
    image_url: clean(form.image_url),
    linkedin_url: clean(form.linkedin_url),
    highlight: form.highlight === true || form.highlight === "true",
    is_active: form.is_active === true || form.is_active === "true",
    bio: JSON.stringify(bio),
  };
  if (editId) payload.id = editId;
  return payload;
}

export default function AlumniAdminClient({ token }) {
  const [batches, setBatches] = React.useState([]);
  const [members, setMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const base = process.env.NEXT_PUBLIC_SERVER_URL;

  async function load() {
    const headers = { Authorization: "Bearer " + token };
    const [b, m] = await Promise.all([
      fetch(base + "/alumni/admin/batch", { headers }).then((r) => r.json()),
      fetch(base + "/alumni/admin/member", { headers }).then((r) => r.json()),
    ]);
    setBatches(b.result || []);
    const batchMap = new Map((b.result || []).map((x) => [String(x.id), x]));
    setMembers(
      (m.result || []).map((x) => {
        const batch = batchMap.get(String(x.batch_id));
        return {
          ...normalizeMember(x),
          batch_label: batch ? `${batch.label} (${batch.year})` : String(x.batch_id),
        };
      })
    );
  }

  React.useEffect(() => {
    load().catch(console.error);
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
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="min-h-screen w-full p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Alumni Management</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Manage alumni batches and directory members.
        </p>
      </div>
      
      <Section
        kind="batch"
        title="Alumni Batches"
        description="Create and manage graduation batches."
        items={batches}
        fields={[
          ["year", "Year"],
          ["label", "Label"],
          ["motto", "Motto"],
          ["is_active", "Active"],
        ]}
        onCreate={(b) => adminFetch("/alumni/admin/batch/create", b)}
        onUpdate={(b) => adminFetch("/alumni/admin/batch/update", b)}
        onDelete={(b) => adminFetch("/alumni/admin/batch/delete", b)}
      />
      <Section
        kind="member"
        title="Alumni Members"
        description="Manage individual alumni profiles and details."
        items={members}
        fields={[
          ["batch_id", "Batch"],
          ["full_name", "Full Name"],
          ["position_in_club", "Position in Club"],
          ["designation", "Designation"],
          ["company_name", "Company"],
          ["image_url", "Image"],
          ["linkedin_url", "LinkedIn"],
          ["email", "Email"],
          ["facebook_url", "Facebook URL"],
          ["phone", "Phone"],
          ["career_path", "Career Path (->)"],
          ["bio_summary", "Bio Summary"],
          ["highlight", "Show on Landing"],
          ["is_active", "Active"],
        ]}
        batches={batches}
        onCreate={(b) => adminFetch("/alumni/admin/member/create", b)}
        onUpdate={(b) => adminFetch("/alumni/admin/member/update", b)}
        onDelete={(b) => adminFetch("/alumni/admin/member/delete", b)}
      />
      {loading && (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded-md bg-primary text-primary-foreground shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving changes...
        </div>
      )}
    </div>
  );
}

function Section({ kind, title, description, items, fields, onCreate, onUpdate, onDelete, batches }) {
  const [form, setForm] = React.useState({ is_active: "true", highlight: "false" });
  const [editId, setEditId] = React.useState(null);
  const [errors, setErrors] = React.useState({});
  const [uploading, setUploading] = React.useState(false);

  // ... (keep validate function same)
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
    const ensure = (cond, key, msg) => {
      if (!cond) e[key] = msg;
    };

    if (kind === "batch") {
      ensure(intPattern.test(val("year")) && val("year").length === 4, "year", "4-digit year");
      ensure(val("label").length > 0, "label", "Required");
      if (val("motto")) ensure(val("motto").length <= 140, "motto", "Max 140 chars");
    } else {
      ensure(val("batch_id").length > 0, "batch_id", "Required");
      ensure(val("full_name").length > 0, "full_name", "Required");
      ensure(val("position_in_club").length > 0, "position_in_club", "Required");
      ensure(val("designation").length > 0, "designation", "Required");
      ensure(val("company_name").length > 0, "company_name", "Required");
      if (val("email")) ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("email")), "email", "Invalid email");
      if (val("phone")) ensure(/^[0-9+()\-\s]{6,20}$/.test(val("phone")), "phone", "Invalid phone");
      if (val("image_url")) ensure(urlOk(val("image_url")), "image_url", "Invalid URL");
      if (val("linkedin_url")) ensure(urlOk(val("linkedin_url")), "linkedin_url", "Invalid URL");
      if (val("facebook_url")) ensure(urlOk(val("facebook_url")), "facebook_url", "Invalid URL");
    }
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

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const id = String(form.full_name || "alumni").replace(/\s+/g, "_").toLowerCase();
      const { url, error } = await uploadImage("alumni", id, file, "all_picture");
      if (error) {
        alert("Image upload failed");
        return;
      }
      setForm((f) => ({ ...f, image_url: url }));
    } finally {
      setUploading(false);
    }
  }

  function startEdit(item) {
    setEditId(item.id);
    const mapped = { ...item };
    ["is_active", "highlight"].forEach((k) => {
      if (k in mapped) mapped[k] = String(mapped[k]);
    });
    setForm(mapped);
    validate(mapped);
    // Scroll to form
    document.getElementById(`form-${kind}`)?.scrollIntoView({ behavior: 'smooth' });
  }

  function clear() {
    setEditId(null);
    const base = { is_active: "true", highlight: "false" };
    setForm(base);
    setErrors({});
  }

  function submit() {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) return;
    let body = { ...form };
    ["is_active", "highlight"].forEach((k) => {
      if (k in body) body[k] = body[k] === "true";
    });
    if (kind === "member") {
      body = buildMemberPayload(body, editId);
    } else if (editId) {
      body.id = editId;
    }
    (editId ? onUpdate(body) : onCreate(body)).then(() => clear());
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={clear} className="gap-2">
              <Plus className="h-4 w-4" /> New Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  {fields.map(([k, l]) => (
                    <TableHead key={k} className="whitespace-nowrap">{l}</TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={fields.length + 2} className="h-24 text-center text-muted-foreground">
                      No items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-mono text-xs">{it.id.slice(0, 8)}...</TableCell>
                      {fields.map(([k]) => (
                        <TableCell key={k} className="max-w-[150px] truncate" title={String(it[k] ?? "")}>
                           {k === "batch_id" && kind === "member" ? (
                              <Badge variant="outline">{String(it.batch_label ?? it[k] ?? "")}</Badge>
                           ) : ["is_active", "highlight"].includes(k) ? (
                              <Badge variant={it[k] ? "default" : "secondary"}>{String(it[k])}</Badge>
                           ) : (
                              String(it[k] ?? "")
                           )}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(it)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete({ id: it.id })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card id={`form-${kind}`} className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="text-lg">{editId ? "Edit Item" : "Create New Item"}</CardTitle>
          <CardDescription>Fill in the details below. {editId && "Editing ID: " + editId}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fields.map(([k, l]) => (
              <div key={k} className="flex flex-col gap-2">
                <Label className="flex justify-between">
                  {l}
                  {errors[k] && <span className="text-destructive text-xs font-normal">{errors[k]}</span>}
                </Label>
                
                {kind === "member" && k === "batch_id" ? (
                  <select
                    name={k}
                    value={form[k] || ""}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" disabled>Select a batch...</option>
                    {(batches || []).map((b) => (
                      <option key={b.id} value={b.id}>{b.label} ({b.year})</option>
                    ))}
                  </select>
                ) : ["is_active", "highlight"].includes(k) ? (
                  <select
                    name={k}
                    value={form[k] || "false"}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : ["bio_summary", "career_path"].includes(k) ? (
                  <Textarea
                    name={k}
                    value={form[k] || ""}
                    onChange={handleChange}
                    rows={4}
                    className={errors[k] ? "border-destructive" : ""}
                    placeholder={k === "career_path" ? "Role -> Company | Role -> Company" : "Short bio..."}
                  />
                ) : (
                  <Input
                    name={k}
                    value={form[k] || ""}
                    onChange={handleChange}
                    className={errors[k] ? "border-destructive" : ""}
                  />
                )}
              </div>
            ))}
            
            {kind === "member" && (
              <div className="flex flex-col gap-2">
                <Label>Upload Image</Label>
                <Input type="file" accept="image/*" onChange={handleImageUpload} />
                {uploading && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin"/> Uploading...</span>}
              </div>
            )}
          </div>
          
          <div className="mt-8 flex gap-4">
            <Button onClick={submit} disabled={uploading}>
              <Save className="h-4 w-4 mr-2" />
              {editId ? "Update Item" : "Create Item"}
            </Button>
            {editId && (
              <Button variant="outline" onClick={clear}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
