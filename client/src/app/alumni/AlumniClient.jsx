"use client";

import React from "react";
import { Filter, Search } from "lucide-react";
import AlumniMemberCard from "@/components/alumni/AlumniMemberCard";

function normalizeMember(member) {
  return {
    ...member,
    name: member.name || "",
    batch: member.batch || "",
    company_name: member.company_name || member.current_company || "",
    designation: member.designation || "",
    position_in_club: member.position_in_club || member.role || "",
    headline:
      member.designation && (member.company_name || member.current_company)
        ? `${member.designation} @ ${member.company_name || member.current_company}`
        : member.now || member.current_position || "",
    image_url: member.image_url || "",
    linkedin_url: member.linkedin_url || "",
    facebook_url: member.facebook_url || "",
    email: member.email || "",
    phone: member.phone || "",
    location: member.location || "",
    bio_summary: member.bio_summary || "",
    career_path: member.career_path || [],
    role: member.role || "",
    now: member.now || "",
    highlight: member.highlight || false,
    bio: member.bio_summary || "", // Mapping for card compatibility
  };
}

function toFlatMembers(batches) {
  return (batches || []).flatMap((batch) =>
    (batch.members || []).map((m) =>
      normalizeMember({
        ...m,
        batch_id: batch.id,
        batch: batch.batch || batch.label || String(batch.year),
        batch_year: batch.year,
      })
    )
  );
}

function matchText(value, query) {
  return String(value || "").toLowerCase().includes(query.toLowerCase());
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export default function AlumniClient({ initialBatches, loadError }) {
  const [query, setQuery] = React.useState("");
  const [batchFilter, setBatchFilter] = React.useState("all");
  const [companyFilter, setCompanyFilter] = React.useState("all");
  const [designationFilter, setDesignationFilter] = React.useState("all");
  const [clubPositionFilter, setClubPositionFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("name");

  const members = React.useMemo(() => toFlatMembers(initialBatches), [initialBatches]);

  const batchOptions = React.useMemo(
    () => uniqueSorted(members.map((m) => m.batch)),
    [members]
  );
  const companyOptions = React.useMemo(
    () => uniqueSorted(members.map((m) => m.company_name)),
    [members]
  );
  const designationOptions = React.useMemo(
    () => uniqueSorted(members.map((m) => m.designation)),
    [members]
  );
  const clubPositionOptions = React.useMemo(
    () => uniqueSorted(members.map((m) => m.position_in_club)),
    [members]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = members.filter((m) => {
      if (batchFilter !== "all" && m.batch !== batchFilter) return false;
      if (companyFilter !== "all" && m.company_name !== companyFilter) return false;
      if (designationFilter !== "all" && m.designation !== designationFilter) return false;
      if (clubPositionFilter !== "all" && m.position_in_club !== clubPositionFilter) return false;
      if (!q) return true;
      return (
        matchText(m.name, q) ||
        matchText(m.headline, q) ||
        matchText(m.company_name, q) ||
        matchText(m.designation, q) ||
        matchText(m.position_in_club, q) ||
        matchText(m.batch, q)
      );
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "batch") return Number(b.batch_year || 0) - Number(a.batch_year || 0);
      if (sortBy === "company") return a.company_name.localeCompare(b.company_name);
      if (sortBy === "designation") return a.designation.localeCompare(b.designation);
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [members, query, batchFilter, companyFilter, designationFilter, clubPositionFilter, sortBy]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12 md:py-16">
      <header className="mb-8 md:mb-10">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Alumni Directory</h1>
        <p className="mt-2 text-sm md:text-base text-muted-foreground">
          Explore our alumni by batch, company, designation, and club position.
        </p>
      </header>

      <section className="border rounded-lg p-4 md:p-5 mb-8 bg-card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search alumni..."
              className="w-full pl-9 pr-3 py-2 rounded-md border bg-background text-sm"
            />
          </div>
          <Select value={batchFilter} onChange={setBatchFilter} options={batchOptions} label="Batch" />
          <Select value={companyFilter} onChange={setCompanyFilter} options={companyOptions} label="Company" />
          <Select value={designationFilter} onChange={setDesignationFilter} options={designationOptions} label="Designation" />
          <Select value={clubPositionFilter} onChange={setClubPositionFilter} options={clubPositionOptions} label="Club Position" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-md border bg-background text-sm"
          >
            <option value="name">Sort: Name</option>
            <option value="batch">Sort: Batch</option>
            <option value="company">Sort: Company</option>
            <option value="designation">Sort: Designation</option>
          </select>
        </div>
      </section>

      {loadError && <p className="text-sm text-red-500 mb-4">Failed to load alumni: {loadError}</p>}

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((m) => (
          <AlumniMemberCard key={m.id} member={m} query={query} variant="default" />
        ))}
      </section>

      {filtered.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-16">No alumni found for selected filters.</div>
      )}
    </div>
  );
}

function Select({ value, onChange, options, label }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="px-3 py-2 rounded-md border bg-background text-sm">
      <option value="all">{label}: All</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
