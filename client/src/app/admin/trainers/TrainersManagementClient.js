"use client";

import { useEffect, useState } from "react";
import { get_with_token, post_with_token } from "@/lib/action";
import ProgressLink from "@/components/ProgressLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  Shield,
  ShieldAlert,
  Award,
  Plus,
  AlertCircle,
  Users,
  CheckCircle2,
  GraduationCap,
  UserPlus,
  ShieldCheck,
  RefreshCw,
  Key,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";

export default function TrainersManagementClient() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("trainers");

  // Trainer modal state
  const [createTrainerOpen, setCreateTrainerOpen] = useState(false);
  const [trainerName, setTrainerName] = useState("");
  const [trainerEmail, setTrainerEmail] = useState("");
  const [trainerPhone, setTrainerPhone] = useState("");
  const [trainerPassword, setTrainerPassword] = useState("");
  const [trainerError, setTrainerError] = useState("");

  // Admin modal state
  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");

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

  const handleCreateTrainer = async (e) => {
    e.preventDefault();
    setTrainerError("");
    const res = await post_with_token("classroom/admin/create-trainer", {
      full_name: trainerName,
      email: trainerEmail,
      phone: trainerPhone,
      password: trainerPassword,
    });
    if (res && res.success) {
      setTrainerName("");
      setTrainerEmail("");
      setTrainerPhone("");
      setTrainerPassword("");
      setCreateTrainerOpen(false);
      setMessage(`Successfully created custom trainer user "${trainerName}".`);
      fetchUsers();
    } else {
      setTrainerError(res?.error || "Failed to create trainer user");
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setAdminError("");
    const res = await post_with_token("classroom/admin/create-admin", {
      full_name: adminName,
      email: adminEmail,
      phone: adminPhone,
      password: adminPassword,
    });
    if (res && res.success) {
      setAdminName("");
      setAdminEmail("");
      setAdminPhone("");
      setAdminPassword("");
      setCreateAdminOpen(false);
      setMessage(`Successfully created new admin user "${adminName}".`);
      fetchUsers();
    } else {
      setAdminError(res?.error || "Failed to create admin user");
    }
  };

  // Change password modal state
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [targetUserForPassword, setTargetUserForPassword] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const openChangePasswordModal = (user) => {
    setTargetUserForPassword(user);
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordError("");
    setChangePasswordOpen(true);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }

    setPasswordLoading(true);
    const res = await post_with_token("classroom/admin/change-password", {
      targetUserId: targetUserForPassword?.id,
      newPassword: newPassword,
    });
    setPasswordLoading(false);

    if (res && res.success) {
      setChangePasswordOpen(false);
      setMessage(res.message || `Successfully updated password for "${targetUserForPassword?.full_name}".`);
      setTargetUserForPassword(null);
    } else {
      setPasswordError(res?.error || "Failed to update user password");
    }
  };

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
      setMessage(`Successfully ${!currentStatus ? "granted" : "revoked"} trainer status.`);
    } else {
      setMessage(`Failed to update trainer status: ${res?.error || "Unknown error"}`);
    }
  };

  const toggleAdmin = async (userId, currentStatus) => {
    setMessage("");
    const res = await post_with_token("classroom/admin/toggle-admin", {
      targetUserId: userId,
      adminStatus: !currentStatus,
    });
    if (res && res.success) {
      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, admin: !currentStatus } : u))
      );
      setMessage(`Successfully ${!currentStatus ? "assigned" : "revoked"} admin status.`);
    } else {
      setMessage(`Failed to update admin status: ${res?.error || "Unknown error"}`);
    }
  };

  const filteredUsers = users.filter(
    u =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const trainerUsers = filteredUsers.filter(u => u.trainer || activeTab === "all");
  const adminUsers = filteredUsers.filter(u => u.admin || activeTab === "all");

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
    <div className="min-h-screen w-full py-8 px-4 md:px-8 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              <ShieldCheck className="h-4 w-4 text-primary" /> Admin Control Panel
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Trainers & Roles Management</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage trainer credentials, promote user admin privileges, and onboard new accounts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ProgressLink href="/trainer/dashboard">
              <Button variant="outline" className="gap-2 font-semibold">
                <Award className="h-4 w-4 text-primary" /> Trainer Dashboard
              </Button>
            </ProgressLink>

            {/* Create Custom Trainer Dialog */}
            <Dialog open={createTrainerOpen} onOpenChange={setCreateTrainerOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4 text-primary" /> Create Trainer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" /> Create Custom Trainer
                  </DialogTitle>
                  <DialogDescription>
                    Register a new account directly with trainer credentials.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTrainer} className="space-y-4 py-2">
                  {trainerError && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                      <AlertCircle className="h-4 w-4 shrink-0" /> {trainerError}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Full Name</label>
                    <Input
                      placeholder="e.g. Alex Rivera"
                      value={trainerName}
                      onChange={(e) => setTrainerName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Email Address</label>
                    <Input
                      type="email"
                      placeholder="e.g. alex.rivera@example.com"
                      value={trainerEmail}
                      onChange={(e) => setTrainerEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Phone Number (Optional)</label>
                    <Input
                      placeholder="e.g. +123456789"
                      value={trainerPhone}
                      onChange={(e) => setTrainerPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Password</label>
                    <Input
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={trainerPassword}
                      onChange={(e) => setTrainerPassword(e.target.value)}
                      required
                    />
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="submit" className="w-full">
                      Create Trainer Account
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Create Custom Admin Dialog */}
            <Dialog open={createAdminOpen} onOpenChange={setCreateAdminOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" /> Create Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-destructive" /> Create Custom Admin
                  </DialogTitle>
                  <DialogDescription>
                    Register a new account directly with full administrative privileges.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAdmin} className="space-y-4 py-2">
                  {adminError && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                      <AlertCircle className="h-4 w-4 shrink-0" /> {adminError}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Full Name</label>
                    <Input
                      placeholder="e.g. Admin Sarah"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Email Address</label>
                    <Input
                      type="email"
                      placeholder="e.g. sarah.admin@example.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Phone Number (Optional)</label>
                    <Input
                      placeholder="e.g. +123456789"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Password</label>
                    <Input
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                    />
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="submit" variant="default" className="w-full">
                      Create Admin Account
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Change Password Dialog */}
            <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" /> Change User Password
                  </DialogTitle>
                  <DialogDescription>
                    Set a new password for <span className="font-semibold text-foreground">{targetUserForPassword?.full_name}</span> ({targetUserForPassword?.email}).
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleChangePassword} className="space-y-4 py-2">
                  {passwordError && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                      <AlertCircle className="h-4 w-4 shrink-0" /> {passwordError}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">New Password</label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Minimum 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Confirm New Password</label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="submit" disabled={passwordLoading} className="w-full">
                      {passwordLoading ? "Updating Password..." : "Update Password"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : users.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered platform accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Trainers</CardTitle>
              <Award className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{loading ? "..." : trainerCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Classroom content & grading access</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">System Admins</CardTitle>
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{loading ? "..." : adminCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Full platform administration access</p>
            </CardContent>
          </Card>
        </div>

        {/* System Feedback Message */}
        {message && (
          <div className={`p-4 rounded-lg text-sm font-medium border flex items-center gap-2 ${message.startsWith("Failed") ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"}`}>
            {message.startsWith("Failed") ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span>{message}</span>
          </div>
        )}

        {/* Search & Tabs Controls */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="ghost" size="icon" onClick={fetchUsers} title="Refresh users list">
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 w-full max-w-md mb-6">
                <TabsTrigger value="trainers" className="flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5" /> Trainers ({trainerUsers.length})
                </TabsTrigger>
                <TabsTrigger value="admins" className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Admins ({adminUsers.length})
                </TabsTrigger>
                <TabsTrigger value="all" className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> All Users ({filteredUsers.length})
                </TabsTrigger>
              </TabsList>

              {/* Trainers Tab Content */}
              <TabsContent value="trainers" className="space-y-4">
                <UserRoleTable
                  users={filteredUsers}
                  loading={loading}
                  initialsOf={initialsOf}
                  onToggleTrainer={toggleTrainer}
                  onToggleAdmin={toggleAdmin}
                  onOpenChangePassword={openChangePasswordModal}
                  filterRole="trainer"
                />
              </TabsContent>

              {/* Admins Tab Content */}
              <TabsContent value="admins" className="space-y-4">
                <UserRoleTable
                  users={filteredUsers}
                  loading={loading}
                  initialsOf={initialsOf}
                  onToggleTrainer={toggleTrainer}
                  onToggleAdmin={toggleAdmin}
                  onOpenChangePassword={openChangePasswordModal}
                  filterRole="admin"
                />
              </TabsContent>

              {/* All Users Tab Content */}
              <TabsContent value="all" className="space-y-4">
                <UserRoleTable
                  users={filteredUsers}
                  loading={loading}
                  initialsOf={initialsOf}
                  onToggleTrainer={toggleTrainer}
                  onToggleAdmin={toggleAdmin}
                  onOpenChangePassword={openChangePasswordModal}
                  filterRole="all"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UserRoleTable({ users, loading, initialsOf, onToggleTrainer, onToggleAdmin, onOpenChangePassword, filterRole }) {
  const displayUsers = users.filter(u => {
    if (filterRole === "trainer") return u.trainer;
    if (filterRole === "admin") return u.admin;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-3 py-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 w-full bg-muted/40 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (displayUsers.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg">
        <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <h4 className="text-sm font-semibold">No users found</h4>
        <p className="text-xs text-muted-foreground mt-1">
          {filterRole === "trainer"
            ? "No users currently have trainer credentials."
            : filterRole === "admin"
            ? "No administrators match your search."
            : "No registered users match your query."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[280px]">User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Current Roles</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground shrink-0">
                    {initialsOf(user.full_name)}
                  </div>
                  <span className="truncate">{user.full_name}</span>
                </div>
              </TableCell>

              <TableCell className="text-muted-foreground text-sm truncate">
                {user.email}
              </TableCell>

              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  {user.admin && (
                    <Badge variant="destructive" className="gap-1 font-semibold">
                      <ShieldAlert className="h-3 w-3" /> Admin
                    </Badge>
                  )}
                  {user.trainer ? (
                    <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/20 border-primary/20">
                      <Award className="h-3 w-3" /> Trainer
                    </Badge>
                  ) : (
                    !user.admin && (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <GraduationCap className="h-3 w-3" /> Student
                      </Badge>
                    )
                  )}
                </div>
              </TableCell>

              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {/* Change Password Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChangePassword(user)}
                    className="h-8 text-xs font-semibold"
                    title="Change password for this user"
                  >
                    <Key className="h-3.5 w-3.5 mr-1" /> Password
                  </Button>

                  {/* Trainer Toggle Button */}
                  <Button
                    variant={user.trainer ? "outline" : "secondary"}
                    size="sm"
                    disabled={user.admin}
                    onClick={() => onToggleTrainer(user.id, user.trainer)}
                    className="h-8 text-xs font-semibold"
                  >
                    {user.admin ? (
                      "Admin (Trainer Locked)"
                    ) : user.trainer ? (
                      "Revoke Trainer"
                    ) : (
                      <>
                        <Award className="h-3.5 w-3.5 mr-1" /> Grant Trainer
                      </>
                    )}
                  </Button>

                  {/* Admin Toggle Button */}
                  <Button
                    variant={user.admin ? "destructive" : "default"}
                    size="sm"
                    onClick={() => onToggleAdmin(user.id, user.admin)}
                    className="h-8 text-xs font-semibold"
                  >
                    {user.admin ? (
                      "Revoke Admin"
                    ) : (
                      <>
                        <Shield className="h-3.5 w-3.5 mr-1" /> Assign Admin
                      </>
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
