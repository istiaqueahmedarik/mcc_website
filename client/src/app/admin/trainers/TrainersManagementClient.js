"use client";

import { useEffect, useState } from "react";
import { get_with_token, post_with_token } from "@/lib/action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShieldAlert, Award, UserCheck, Shield, Plus, AlertCircle, Users, Sparkles, GraduationCap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function TrainersManagementClient() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Custom trainer creation states
  const [createOpen, setCreateOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [createError, setCreateError] = useState("");

  const handleCreateTrainer = async (e) => {
    e.preventDefault();
    setCreateError("");
    const res = await post_with_token("classroom/admin/create-trainer", {
      full_name: fullName,
      email,
      phone,
      password,
    });
    if (res && res.success) {
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setCreateOpen(false);
      setMessage(`Successfully created custom trainer user "${fullName}".`);
      fetchUsers();
    } else {
      setCreateError(res.error || "Failed to create trainer user");
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    const res = await get_with_token("classroom/admin/users");
    if (res && res.result) {
      setUsers(res.result);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleTrainer = async (userId, currentStatus) => {
    setMessage("");
    const res = await post_with_token("classroom/admin/toggle-trainer", {
      targetUserId: userId,
      trainerStatus: !currentStatus,
    });
    if (res && res.success) {
      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, trainer: !currentStatus } : u))
      );
      setMessage(`Successfully updated trainer status for user.`);
    } else {
      setMessage(`Failed to update trainer status: ${res.error || "Unknown error"}`);
    }
  };

  const filteredUsers = users.filter(
    u =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const trainerCount = users.filter(u => u.trainer).length;
  const adminCount = users.filter(u => u.admin).length;

  const initialsOf = (name) =>
    (name || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("");

  return (
    <div className="relative min-h-screen">
      {/* Ambient gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-[hsl(var(--profile-accent-1))]/20 blur-3xl" />
        <div className="absolute -top-16 right-0 h-72 w-72 rounded-full bg-[hsl(var(--profile-accent-3))]/20 blur-3xl" />
      </div>

      <div className="relative container mx-auto py-10 px-4 max-w-5xl">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-[hsl(var(--profile-accent-solid))]/[0.12] via-card to-card p-8 shadow-sm mb-8">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[hsl(var(--profile-accent-2))]/20 blur-2xl" />
          <div className="relative flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs font-semibold text-muted-foreground backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--profile-accent-solid))]" />
                Admin Control
              </div>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight flex items-center gap-3">
                <span className="grid place-items-center h-12 w-12 rounded-2xl bg-[hsl(var(--profile-accent-solid))] text-white shadow-lg shadow-[hsl(var(--profile-accent-solid))]/30">
                  <Shield className="h-7 w-7" />
                </span>
                Manage Trainers
              </h1>
              <p className="text-muted-foreground mt-3 max-w-xl">
                Assign or revoke trainer credentials, and onboard new trainers directly with a dedicated account.
              </p>
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="font-semibold shadow-lg shadow-[hsl(var(--profile-accent-solid))]/25 flex items-center gap-2 rounded-2xl bg-[hsl(var(--profile-accent-solid))] hover:bg-[hsl(var(--profile-accent-solid-alt))] text-white">
                  <Plus className="h-5 w-5" /> Create Custom Trainer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create Custom Trainer</DialogTitle>
                  <DialogDescription>
                    Register a new user directly with trainer credentials.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTrainer} className="space-y-4 py-4">
                  {createError && (
                    <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                      <AlertCircle className="h-4 w-4" /> {createError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Full Name</label>
                    <Input
                      placeholder="e.g. Trainer Jack"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Email Address</label>
                    <Input
                      type="email"
                      placeholder="e.g. trainer.jack@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Phone Number (Optional)</label>
                    <Input
                      placeholder="e.g. +123456789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Password</label>
                    <Input
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full font-semibold rounded-xl mt-2 bg-[hsl(var(--profile-accent-solid))] hover:bg-[hsl(var(--profile-accent-solid-alt))] text-white">
                      Create Trainer User
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Quick stats */}
          {!loading && (
            <div className="relative mt-8 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-2xl border bg-background/60 px-4 py-2 backdrop-blur">
                <Users className="h-4 w-4 text-[hsl(var(--profile-accent-solid))]" />
                <span className="text-sm font-bold">{users.length}</span>
                <span className="text-xs text-muted-foreground">Users</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border bg-background/60 px-4 py-2 backdrop-blur">
                <Award className="h-4 w-4 text-[hsl(var(--profile-accent-solid))]" />
                <span className="text-sm font-bold">{trainerCount}</span>
                <span className="text-xs text-muted-foreground">Trainers</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border bg-background/60 px-4 py-2 backdrop-blur">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                <span className="text-sm font-bold">{adminCount}</span>
                <span className="text-xs text-muted-foreground">Admins</span>
              </div>
            </div>
          )}
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2 bg-card p-2 rounded-2xl border focus-within:border-[hsl(var(--profile-accent-solid))] transition-colors mb-6">
          <Search className="h-5 w-5 text-muted-foreground ml-1" />
          <Input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none w-full"
          />
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-2xl text-sm font-semibold border flex items-center gap-2 ${message.startsWith("Failed") ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-green-500/10 text-green-600 border-green-500/20"}`}>
            {message.startsWith("Failed") ? <AlertCircle className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
            {message}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border bg-card p-5 animate-pulse flex items-center gap-4">
                <div className="h-11 w-11 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-3xl border border-dashed text-center p-14 bg-card">
            <div className="inline-flex p-4 bg-muted rounded-2xl">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mt-4">No users found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try a different name or email.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredUsers.map(user => (
              <div
                key={user.id}
                className="group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-[hsl(var(--profile-accent-solid))]/40"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[hsl(var(--profile-accent-2))]/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-start gap-4">
                  <span className={`grid place-items-center h-11 w-11 shrink-0 rounded-full text-sm font-bold ${user.admin ? "bg-red-500/15 text-red-500" : user.trainer ? "bg-[hsl(var(--profile-accent-solid))]/15 text-[hsl(var(--profile-accent-solid))]" : "bg-muted text-muted-foreground"}`}>
                    {initialsOf(user.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {user.admin && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                          <ShieldAlert className="h-3 w-3" /> Admin
                        </span>
                      )}
                      {user.trainer ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[hsl(var(--profile-accent-solid))]/10 text-[hsl(var(--profile-accent-solid))] border border-[hsl(var(--profile-accent-solid))]/20">
                          <Award className="h-3 w-3" /> Trainer
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border">
                          <GraduationCap className="h-3 w-3" /> Student
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="relative mt-4 pt-4 border-t">
                  <Button
                    variant={user.trainer ? "outline" : "default"}
                    size="sm"
                    disabled={user.admin}
                    className={`w-full font-semibold rounded-xl gap-1.5 ${user.trainer ? "text-red-500 hover:text-red-600 border-red-500/30 hover:bg-red-500/10" : "bg-[hsl(var(--profile-accent-solid))] hover:bg-[hsl(var(--profile-accent-solid-alt))] text-white"}`}
                    onClick={() => toggleTrainer(user.id, user.trainer)}
                  >
                    {user.admin ? "Admin (locked)" : user.trainer ? "Revoke Trainer" : (<><Award className="h-4 w-4" /> Grant Trainer</>)}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
