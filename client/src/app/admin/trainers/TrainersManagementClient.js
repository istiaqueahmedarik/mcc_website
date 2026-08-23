"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { get_with_token, post_with_token } from "@/lib/action";
import ProgressLink from "@/components/ProgressLink";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  IdCard,
  Key,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";

const EMPTY_USER_FORM = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  mist_id: "",
  batch_name: "",
  tshirt_size: "",
  profile_pic: "",
  mist_id_card: "",
  vjudge_id: "",
  vjudge_verified: false,
  cf_id: "",
  cf_verified: false,
  codechef_id: "",
  atcoder_id: "",
  trainer: false,
  admin: false,
  granted: true,
  trainer_title: "",
  trainer_bio: "",
  trainer_experience: "",
  trainer_specializations: "",
  trainer_linkedin: "",
  trainer_github: "",
  trainer_website: "",
};

const CSV_COLUMNS = [
  "full_name",
  "email",
  "password",
  "phone",
  "mist_id",
  "batch_name",
  "tshirt_size",
  "vjudge_id",
  "vjudge_verified",
  "cf_id",
  "cf_verified",
  "codechef_id",
  "atcoder_id",
  "trainer",
  "admin",
  "granted",
  "profile_pic",
  "mist_id_card",
  "trainer_title",
  "trainer_bio",
  "trainer_experience",
  "trainer_specializations",
  "trainer_linkedin",
  "trainer_github",
  "trainer_website",
];

const CSV_TEMPLATE = `${CSV_COLUMNS.join(",")}
Jane Doe,jane@example.com,change-me-123,+8801000000000,2022001,2022,L,jane_vj,true,jane_cf,true,janecc,janeat,false,false,true,,,,,,,,
Trainer One,trainer@example.com,change-me-456,+8801000000001,,Coaches,,trainer_vj,false,,,,true,false,true,,,,Senior Trainer,Contest coaching,5 years,"DP; Graphs",https://linkedin.com/in/trainer,https://github.com/trainer,https://trainer.dev
`;

const CSV_COLUMN_ALIASES = {
  name: "full_name",
  full_name: "full_name",
  student_id: "mist_id",
  mist: "mist_id",
  batch: "batch_name",
  codeforces: "cf_id",
  codeforces_id: "cf_id",
  cf: "cf_id",
  vjudge: "vjudge_id",
  vj: "vjudge_id",
  is_trainer: "trainer",
  is_admin: "admin",
  account_granted: "granted",
  specializations: "trainer_specializations",
};

const TSHIRT_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];

export default function TrainersManagementClient() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState("trainers");
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [createUserError, setCreateUserError] = useState("");
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [targetUserForPassword, setTargetUserForPassword] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await get_with_token("classroom/admin/users");
    if (res?.result) {
      setUsers(res.result);
    } else if (res?.error) {
      setMessage({ type: "error", text: res.error });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) => {
      const searchable = [
        user.full_name,
        user.email,
        user.phone,
        user.mist_id,
        user.batch_name,
        user.vjudge_id,
        user.cf_id,
        user.codechef_id,
        user.atcoder_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(needle);
    });
  }, [search, users]);

  const trainerUsers = filteredUsers.filter((user) => user.trainer);
  const adminUsers = filteredUsers.filter((user) => user.admin);
  const trainerCount = users.filter((user) => user.trainer).length;
  const adminCount = users.filter((user) => user.admin).length;

  const initialsOf = (name) =>
    (name || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");

  const updateUserForm = (field, value) => {
    setUserForm((previous) => ({ ...previous, [field]: value }));
  };

  const resetCreateUserForm = () => {
    setUserForm(EMPTY_USER_FORM);
    setCreateUserError("");
    setShowCreatePassword(false);
  };

  const handleCreateUserOpenChange = (open) => {
    setCreateUserOpen(open);
    if (!open) resetCreateUserForm();
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setCreateUserError("");
    setCreateUserLoading(true);
    const res = await post_with_token("classroom/admin/create-user", serializeUserForm(userForm));
    setCreateUserLoading(false);

    if (res?.success) {
      const createdName = res.user?.full_name || userForm.full_name;
      setMessage({ type: "success", text: `Created user ${createdName}.` });
      setCreateUserOpen(false);
      resetCreateUserForm();
      fetchUsers();
    } else {
      setCreateUserError(res?.error || "Failed to create user");
    }
  };

  const openChangePasswordModal = (user) => {
    setTargetUserForPassword(user);
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordError("");
    setChangePasswordOpen(true);
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
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
      newPassword,
    });
    setPasswordLoading(false);

    if (res?.success) {
      setChangePasswordOpen(false);
      setMessage({
        type: "success",
        text: res.message || `Updated password for ${targetUserForPassword?.full_name}.`,
      });
      setTargetUserForPassword(null);
    } else {
      setPasswordError(res?.error || "Failed to update user password");
    }
  };

  const toggleTrainer = async (userId, currentStatus) => {
    setMessage(null);
    const res = await post_with_token("classroom/admin/toggle-trainer", {
      targetUserId: userId,
      trainerStatus: !currentStatus,
    });
    if (res?.success) {
      setUsers((previous) =>
        previous.map((user) => (user.id === userId ? { ...user, trainer: !currentStatus } : user))
      );
      setMessage({
        type: "success",
        text: `${!currentStatus ? "Granted" : "Revoked"} trainer status.`,
      });
    } else {
      setMessage({ type: "error", text: res?.error || "Failed to update trainer status" });
    }
  };

  const toggleAdmin = async (userId, currentStatus) => {
    setMessage(null);
    const res = await post_with_token("classroom/admin/toggle-admin", {
      targetUserId: userId,
      adminStatus: !currentStatus,
    });
    if (res?.success) {
      setUsers((previous) =>
        previous.map((user) => (user.id === userId ? { ...user, admin: !currentStatus } : user))
      );
      setMessage({
        type: "success",
        text: `${!currentStatus ? "Assigned" : "Revoked"} admin status.`,
      });
    } else {
      setMessage({ type: "error", text: res?.error || "Failed to update admin status" });
    }
  };

  const handleBulkComplete = (result) => {
    const skipped = Number(result?.failedCount || 0);
    const created = Number(result?.createdCount || 0);
    if (created > 0) {
      setMessage({
        type: skipped > 0 ? "warning" : "success",
        text: skipped > 0
          ? `Created ${created} users. ${skipped} rows need review.`
          : `Created ${created} users from CSV.`,
      });
      fetchUsers();
    } else if (result?.error) {
      setMessage({ type: "error", text: result.error });
    }
  };

  return (
    <div className="min-h-screen w-full bg-background px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Admin Control Panel
            </div>
            <h1 className="text-3xl font-bold">Trainers & Roles Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create complete user accounts, import users, and manage trainer or admin access.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ProgressLink href="/trainer/dashboard">
              <Button variant="outline" className="gap-2 font-semibold">
                <Award className="h-4 w-4 text-primary" />
                Trainer Dashboard
              </Button>
            </ProgressLink>

            <BulkUserImportDialog
              open={bulkOpen}
              onOpenChange={setBulkOpen}
              onComplete={handleBulkComplete}
            />

            <Dialog open={createUserOpen} onOpenChange={handleCreateUserOpenChange}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Create Full User
                  </DialogTitle>
                  <DialogDescription>
                    Add a login-ready account with profile fields and role flags.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateUser} className="space-y-5 py-2">
                  {createUserError && <InlineError message={createUserError} />}

                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField
                      id="admin-create-full-name"
                      label="Full Name"
                      value={userForm.full_name}
                      onChange={(value) => updateUserForm("full_name", value)}
                      placeholder="Jane Doe"
                      required
                    />
                    <TextField
                      id="admin-create-email"
                      label="Email"
                      type="email"
                      value={userForm.email}
                      onChange={(value) => updateUserForm("email", value)}
                      placeholder="jane@example.com"
                      required
                    />
                    <PasswordField
                      id="admin-create-password"
                      label="Password"
                      value={userForm.password}
                      onChange={(value) => updateUserForm("password", value)}
                      visible={showCreatePassword}
                      onToggleVisible={() => setShowCreatePassword((value) => !value)}
                      required
                    />
                    <TextField
                      id="admin-create-phone"
                      label="Phone"
                      value={userForm.phone}
                      onChange={(value) => updateUserForm("phone", value)}
                      placeholder="+8801000000000"
                    />
                    <TextField
                      id="admin-create-mist-id"
                      label="MIST ID"
                      value={userForm.mist_id}
                      onChange={(value) => updateUserForm("mist_id", value)}
                      placeholder="2022001"
                    />
                    <TextField
                      id="admin-create-batch"
                      label="Batch"
                      value={userForm.batch_name}
                      onChange={(value) => updateUserForm("batch_name", value)}
                      placeholder="2022"
                    />
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold" htmlFor="admin-create-tshirt">
                        T-shirt Size
                      </label>
                      <Select
                        value={userForm.tshirt_size || "none"}
                        onValueChange={(value) => updateUserForm("tshirt_size", value === "none" ? "" : value)}
                      >
                        <SelectTrigger id="admin-create-tshirt">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {TSHIRT_OPTIONS.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <CheckboxRow
                      id="admin-create-granted"
                      label="Granted"
                      description="Account is ready for normal access."
                      checked={userForm.granted}
                      onCheckedChange={(checked) => updateUserForm("granted", checked)}
                    />
                    <CheckboxRow
                      id="admin-create-trainer"
                      label="Trainer"
                      description="Can manage classroom workflows."
                      checked={userForm.trainer}
                      onCheckedChange={(checked) => updateUserForm("trainer", checked)}
                    />
                    <CheckboxRow
                      id="admin-create-admin-role"
                      label="Admin"
                      description="Can manage platform administration."
                      checked={userForm.admin}
                      onCheckedChange={(checked) => updateUserForm("admin", checked)}
                    />
                  </div>

                  <div className="rounded-md border p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <IdCard className="h-4 w-4 text-muted-foreground" />
                      Competitive Handles
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField
                        id="admin-create-vjudge"
                        label="VJudge"
                        value={userForm.vjudge_id}
                        onChange={(value) => updateUserForm("vjudge_id", value)}
                        placeholder="vjudge_handle"
                      />
                      <CheckboxRow
                        id="admin-create-vjudge-verified"
                        label="VJudge Verified"
                        description="Marks the handle as admin verified."
                        checked={userForm.vjudge_verified}
                        onCheckedChange={(checked) => updateUserForm("vjudge_verified", checked)}
                      />
                      <TextField
                        id="admin-create-cf"
                        label="Codeforces"
                        value={userForm.cf_id}
                        onChange={(value) => updateUserForm("cf_id", value)}
                        placeholder="cf_handle"
                      />
                      <CheckboxRow
                        id="admin-create-cf-verified"
                        label="Codeforces Verified"
                        description="Marks the handle as admin verified."
                        checked={userForm.cf_verified}
                        onCheckedChange={(checked) => updateUserForm("cf_verified", checked)}
                      />
                      <TextField
                        id="admin-create-codechef"
                        label="CodeChef"
                        value={userForm.codechef_id}
                        onChange={(value) => updateUserForm("codechef_id", value)}
                        placeholder="codechef_handle"
                      />
                      <TextField
                        id="admin-create-atcoder"
                        label="AtCoder"
                        value={userForm.atcoder_id}
                        onChange={(value) => updateUserForm("atcoder_id", value)}
                        placeholder="atcoder_handle"
                      />
                    </div>
                  </div>

                  <details className="rounded-md border p-4">
                    <summary className="cursor-pointer text-sm font-semibold">Optional Media and Trainer Profile</summary>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <TextField
                        id="admin-create-profile-pic"
                        label="Profile Picture URL"
                        value={userForm.profile_pic}
                        onChange={(value) => updateUserForm("profile_pic", value)}
                        placeholder="https://..."
                      />
                      <TextField
                        id="admin-create-mist-card"
                        label="MIST ID Card URL"
                        value={userForm.mist_id_card}
                        onChange={(value) => updateUserForm("mist_id_card", value)}
                        placeholder="https://..."
                      />
                      <TextField
                        id="admin-create-trainer-title"
                        label="Trainer Title"
                        value={userForm.trainer_title}
                        onChange={(value) => updateUserForm("trainer_title", value)}
                        placeholder="Senior Trainer"
                      />
                      <TextField
                        id="admin-create-trainer-experience"
                        label="Trainer Experience"
                        value={userForm.trainer_experience}
                        onChange={(value) => updateUserForm("trainer_experience", value)}
                        placeholder="5 years"
                      />
                      <TextField
                        id="admin-create-trainer-specializations"
                        label="Specializations"
                        value={userForm.trainer_specializations}
                        onChange={(value) => updateUserForm("trainer_specializations", value)}
                        placeholder="DP; Graphs; Greedy"
                      />
                      <TextField
                        id="admin-create-linkedin"
                        label="LinkedIn URL"
                        value={userForm.trainer_linkedin}
                        onChange={(value) => updateUserForm("trainer_linkedin", value)}
                        placeholder="https://linkedin.com/in/..."
                      />
                      <TextField
                        id="admin-create-github"
                        label="GitHub URL"
                        value={userForm.trainer_github}
                        onChange={(value) => updateUserForm("trainer_github", value)}
                        placeholder="https://github.com/..."
                      />
                      <TextField
                        id="admin-create-website"
                        label="Website URL"
                        value={userForm.trainer_website}
                        onChange={(value) => updateUserForm("trainer_website", value)}
                        placeholder="https://..."
                      />
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-semibold" htmlFor="admin-create-trainer-bio">
                          Trainer Bio
                        </label>
                        <Textarea
                          id="admin-create-trainer-bio"
                          value={userForm.trainer_bio}
                          onChange={(event) => updateUserForm("trainer_bio", event.target.value)}
                          placeholder="Short trainer profile"
                        />
                      </div>
                    </div>
                  </details>

                  <DialogFooter>
                    <Button type="submit" disabled={createUserLoading} className="w-full sm:w-auto">
                      {createUserLoading ? "Creating..." : "Create User"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <ChangePasswordDialog
              open={changePasswordOpen}
              onOpenChange={setChangePasswordOpen}
              targetUser={targetUserForPassword}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              showNewPassword={showNewPassword}
              showConfirmPassword={showConfirmPassword}
              passwordError={passwordError}
              loading={passwordLoading}
              onNewPasswordChange={setNewPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onToggleNewPassword={() => setShowNewPassword((value) => !value)}
              onToggleConfirmPassword={() => setShowConfirmPassword((value) => !value)}
              onSubmit={handleChangePassword}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            title="Total Users"
            value={loading ? "..." : users.length}
            detail="Login-capable platform accounts"
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
          <MetricCard
            title="Active Trainers"
            value={loading ? "..." : trainerCount}
            detail="Classroom content and grading access"
            icon={<Award className="h-4 w-4 text-primary" />}
            valueClassName="text-primary"
          />
          <MetricCard
            title="System Admins"
            value={loading ? "..." : adminCount}
            detail="Full platform administration access"
            icon={<ShieldAlert className="h-4 w-4 text-destructive" />}
            valueClassName="text-destructive"
          />
        </div>

        {message && <StatusMessage message={message} />}

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users, IDs, handles..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                />
              </div>

              <Button variant="ghost" size="icon" onClick={fetchUsers} title="Refresh users list">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6 grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="trainers" className="gap-1.5">
                  <Award className="h-3.5 w-3.5" />
                  Trainers ({trainerUsers.length})
                </TabsTrigger>
                <TabsTrigger value="admins" className="gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  Admins ({adminUsers.length})
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  All ({filteredUsers.length})
                </TabsTrigger>
              </TabsList>

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

function serializeUserForm(form) {
  return Object.fromEntries(
    Object.entries(form).map(([key, value]) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return [key, trimmed || null];
      }
      return [key, value];
    })
  );
}

function MetricCard({ title, value, detail, icon, valueClassName = "" }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName}`}>{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function StatusMessage({ message }) {
  const isError = message.type === "error";
  const isWarning = message.type === "warning";
  const classes = isError
    ? "border-destructive/20 bg-destructive/10 text-destructive"
    : isWarning
      ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

  return (
    <div className={`flex items-center gap-2 rounded-lg border p-4 text-sm font-medium ${classes}`} role="status">
      {isError ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
      <span>{message.text}</span>
    </div>
  );
}

function InlineError({ message }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

function TextField({ id, label, value, onChange, type = "text", placeholder, required = false }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold" htmlFor={id}>
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
  required = false,
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          placeholder="Minimum 8 characters"
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          className="pr-10"
          required={required}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={onToggleVisible}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    </div>
  );
}

function CheckboxRow({ id, label, description, checked, onCheckedChange }) {
  return (
    <div className="flex min-h-[76px] gap-3 rounded-md border p-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(Boolean(value))}
        className="mt-0.5"
      />
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </label>
    </div>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
  targetUser,
  newPassword,
  confirmPassword,
  showNewPassword,
  showConfirmPassword,
  passwordError,
  loading,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onToggleNewPassword,
  onToggleConfirmPassword,
  onSubmit,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Change User Password
          </DialogTitle>
          <DialogDescription>
            Set a new password for <span className="font-semibold text-foreground">{targetUser?.full_name}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          {passwordError && <InlineError message={passwordError} />}
          <PasswordField
            id="admin-change-password-new"
            label="New Password"
            value={newPassword}
            onChange={onNewPasswordChange}
            visible={showNewPassword}
            onToggleVisible={onToggleNewPassword}
            required
          />
          <PasswordField
            id="admin-change-password-confirm"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={onConfirmPasswordChange}
            visible={showConfirmPassword}
            onToggleVisible={onToggleConfirmPassword}
            required
          />
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BulkUserImportDialog({ open, onOpenChange, onComplete }) {
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [bulkResult, setBulkResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setCsvText("");
    setParsedRows([]);
    setParseErrors([]);
    setBulkResult(null);
    setLoading(false);
  };

  const handleOpenChange = (nextOpen) => {
    onOpenChange(nextOpen);
    if (!nextOpen) reset();
  };

  const handleParse = () => {
    const result = parseUsersCsv(csvText);
    setParsedRows(result.users);
    setParseErrors(result.errors);
    setBulkResult(null);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    const result = parseUsersCsv(text);
    setParsedRows(result.users);
    setParseErrors(result.errors);
    setBulkResult(null);
  };

  const handleSubmit = async () => {
    const nextRows = parsedRows.length > 0 ? parsedRows : parseUsersCsv(csvText).users;
    if (nextRows.length === 0) {
      setParseErrors([{ rowNumber: 1, reason: "No user rows found" }]);
      return;
    }

    setLoading(true);
    const res = await post_with_token("classroom/admin/create-users-bulk", { users: nextRows });
    setLoading(false);
    setBulkResult(res);
    onComplete(res);
    if (res?.success && Number(res.failedCount || 0) === 0) {
      handleOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4 text-primary" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Bulk User Import
          </DialogTitle>
          <DialogDescription>
            Upload or paste a header-based CSV. Password, full_name, and email are required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="sm:max-w-sm" />
            <Button type="button" variant="outline" className="gap-2" onClick={downloadCsvTemplate}>
              <Download className="h-4 w-4" />
              Template
            </Button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold" htmlFor="admin-bulk-csv">
              CSV Input
            </label>
            <Textarea
              id="admin-bulk-csv"
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              placeholder={CSV_TEMPLATE}
              className="min-h-[180px] font-mono text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={handleParse} disabled={!csvText.trim()}>
              Preview CSV
            </Button>
            <span className="text-xs text-muted-foreground">
              {parsedRows.length} parsed rows
              {parseErrors.length > 0 ? `, ${parseErrors.length} local issues` : ""}
            </span>
          </div>

          {parseErrors.length > 0 && (
            <ImportErrors title="Local CSV Issues" errors={parseErrors} />
          )}

          {parsedRows.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Handles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.slice(0, 6).map((row) => (
                    <TableRow key={`${row.rowNumber}-${row.email}`}>
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell className="font-medium">{row.full_name || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{row.email || "-"}</TableCell>
                      <TableCell>
                        <RoleBadges user={row} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {[row.vjudge_id, row.cf_id, row.codechef_id, row.atcoder_id].filter(Boolean).join(" / ") || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsedRows.length > 6 && (
                <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                  Showing 6 of {parsedRows.length} rows.
                </div>
              )}
            </div>
          )}

          {bulkResult?.errors?.length > 0 && (
            <ImportErrors title="Server Row Results" errors={bulkResult.errors} />
          )}
          {bulkResult?.error && !bulkResult?.errors?.length && <InlineError message={bulkResult.error} />}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
          <Button type="button" disabled={loading || parsedRows.length === 0} onClick={handleSubmit}>
            {loading ? "Importing..." : "Create Users"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportErrors({ title, errors }) {
  return (
    <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
        <AlertCircle className="h-4 w-4" />
        {title}
      </div>
      <div className="max-h-40 space-y-1 overflow-auto text-xs text-muted-foreground">
        {errors.slice(0, 12).map((error, index) => (
          <div key={`${error.rowNumber}-${index}`}>
            Row {error.rowNumber}: {error.reason}
            {error.email ? ` (${error.email})` : ""}
          </div>
        ))}
        {errors.length > 12 && <div>{errors.length - 12} more rows need review.</div>}
      </div>
    </div>
  );
}

function UserRoleTable({
  users,
  loading,
  initialsOf,
  onToggleTrainer,
  onToggleAdmin,
  onOpenChangePassword,
  filterRole,
}) {
  const displayUsers = users.filter((user) => {
    if (filterRole === "trainer") return user.trainer;
    if (filterRole === "admin") return user.admin;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-3 py-6">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-12 w-full animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
    );
  }

  if (displayUsers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center">
        <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h4 className="text-sm font-semibold">No users found</h4>
        <p className="mt-1 text-xs text-muted-foreground">
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
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[260px]">User</TableHead>
            <TableHead className="min-w-[220px]">Email</TableHead>
            <TableHead className="min-w-[140px]">Student ID</TableHead>
            <TableHead className="min-w-[220px]">Handles</TableHead>
            <TableHead className="min-w-[180px]">Roles</TableHead>
            <TableHead className="min-w-[330px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {initialsOf(user.full_name)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate">{user.full_name || "Unnamed User"}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[user.phone, user.batch_name].filter(Boolean).join(" · ") || "No contact metadata"}
                    </div>
                  </div>
                </div>
              </TableCell>

              <TableCell className="truncate text-sm text-muted-foreground">{user.email}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{user.mist_id || "-"}</TableCell>
              <TableCell>
                <HandleList user={user} />
              </TableCell>
              <TableCell>
                <RoleBadges user={user} />
              </TableCell>

              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChangePassword(user)}
                    className="h-8 text-xs font-semibold"
                    title="Change password for this user"
                  >
                    <Key className="mr-1 h-3.5 w-3.5" />
                    Password
                  </Button>

                  <Button
                    variant={user.trainer ? "outline" : "secondary"}
                    size="sm"
                    disabled={user.admin}
                    onClick={() => onToggleTrainer(user.id, user.trainer)}
                    className="h-8 text-xs font-semibold"
                  >
                    {user.admin ? (
                      "Admin Locked"
                    ) : user.trainer ? (
                      "Revoke Trainer"
                    ) : (
                      <>
                        <Award className="mr-1 h-3.5 w-3.5" />
                        Grant Trainer
                      </>
                    )}
                  </Button>

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
                        <Shield className="mr-1 h-3.5 w-3.5" />
                        Assign Admin
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

function RoleBadges({ user }) {
  const isAdmin = toBoolean(user.admin);
  const isTrainer = toBoolean(user.trainer);
  const isGranted = user.granted === undefined ? true : toBoolean(user.granted);

  return (
    <div className="flex flex-wrap gap-1.5">
      {isAdmin && (
        <Badge variant="destructive" className="gap-1 font-semibold">
          <ShieldAlert className="h-3 w-3" />
          Admin
        </Badge>
      )}
      {isTrainer && (
        <Badge className="gap-1 border-primary/20 bg-primary/15 text-primary hover:bg-primary/20">
          <Award className="h-3 w-3" />
          Trainer
        </Badge>
      )}
      {!isAdmin && !isTrainer && (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <GraduationCap className="h-3 w-3" />
          Student
        </Badge>
      )}
      {!isGranted && (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <Lock className="h-3 w-3" />
          Pending
        </Badge>
      )}
    </div>
  );
}

function HandleList({ user }) {
  const handles = [
    { label: "VJ", value: user.vjudge_id, verified: toBoolean(user.vjudge_verified) },
    { label: "CF", value: user.cf_id, verified: toBoolean(user.cf_verified) },
    { label: "CC", value: user.codechef_id },
    { label: "AT", value: user.atcoder_id },
  ].filter((handle) => handle.value);

  if (handles.length === 0) {
    return <span className="text-xs text-muted-foreground">No handles</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {handles.map((handle) => (
        <Badge key={handle.label} variant="outline" className="max-w-[120px] gap-1 font-mono text-[11px]">
          {handle.label}:{String(handle.value)}
          {handle.verified && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
        </Badge>
      ))}
    </div>
  );
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const normalized = String(value || "").trim().toLowerCase();
  return ["true", "1", "yes", "y", "on"].includes(normalized);
}

function parseUsersCsv(text) {
  const table = parseCsvTable(text);
  if (table.length === 0) return { users: [], errors: [{ rowNumber: 1, reason: "CSV is empty" }] };

  const headers = table[0].map((header) => CSV_COLUMN_ALIASES[normalizeCsvHeader(header)] || normalizeCsvHeader(header));
  const required = ["full_name", "email", "password"];
  const missing = required.filter((column) => !headers.includes(column));
  const errors = missing.map((column) => ({ rowNumber: 1, reason: `Missing ${column} column` }));
  const users = [];

  table.slice(1).forEach((cells, index) => {
    const rowNumber = index + 2;
    if (cells.every((cell) => !String(cell || "").trim())) return;

    const row = { rowNumber };
    headers.forEach((header, cellIndex) => {
      if (!header) return;
      row[header] = String(cells[cellIndex] || "").trim();
    });
    for (const column of required) {
      if (!row[column]) errors.push({ rowNumber, email: row.email || null, reason: `${column} is required` });
    }
    users.push(row);
  });

  return { users, errors };
}

function parseCsvTable(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows.filter((item) => item.some((value) => String(value || "").trim()));
}

function normalizeCsvHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mcc-admin-users-template.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
