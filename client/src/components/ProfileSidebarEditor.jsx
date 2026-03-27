"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CheckCircle2,
  Edit3,
  IdCard,
  LogOut,
  Mail,
  Phone,
  ScanFace,
  Save,
  Shield,
  Shirt,
  ZoomIn
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useFormStatus } from "react-dom";

export default function ProfileSidebarEditor({ user, saveAction, logoutAction }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="profile-card space-y-2" aria-label="Profile Summary">
      <form action={saveAction} encType="multipart/form-data" className="space-y-2">
        <div className="flex justify-center">
          <div className="relative group">
            <Avatar
              className="h-32 w-32 rounded-2xl border-2 transition-all duration-300 hover:scale-105"
              style={{ borderColor: "hsl(var(--profile-primary))" }}
            >
              <AvatarImage
                src={user.profile_pic}
                alt={user.full_name || "User"}
                className="object-cover"
              />
              <AvatarFallback
                className="text-4xl"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--profile-primary)), hsl(var(--profile-success)))",
                  color: "white",
                }}
              >
                {user.full_name ? user.full_name.charAt(0) : "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-xl font-bold pb-2">{user.full_name || "User"}</h1>
          <div className="flex flex-wrap justify-center gap-2">
            {user.admin && (
              <span
                className="profile-badge"
                style={{
                  background: "hsl(var(--profile-primary))",
                  color: "white",
                }}
              >
                <Shield className="h-3.5 w-3.5" />
                Admin
              </span>
            )}
            {user.granted && (
              <span className="profile-badge profile-badge-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified
              </span>
            )}
          </div>
          <p
            className="mt-2 text-xs"
            style={{ color: "hsl(var(--profile-text-muted))" }}
          >
            Joined at: {new Date(user.created_at).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="space-y-2">
          <div>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "hsl(var(--profile-text-muted))" }}
                aria-hidden="true"
              />
              <Input
                id="email-input"
                value={user.email || ""}
                readOnly
                disabled
                className="h-9 pl-9 text-sm profile-focus-ring"
                style={{ borderRadius: "var(--profile-radius-sm)" }}
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <Phone
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "hsl(var(--profile-text-muted))" }}
                aria-hidden="true"
              />
              <Input
                id="phone-input"
                name="phone"
                type="text"
                defaultValue={user.phone || ""}
                placeholder="Enter phone number"
                disabled={!isEditing}
                className="h-9 pl-9 text-sm profile-focus-ring"
                style={{ borderRadius: "var(--profile-radius-sm)" }}
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <ScanFace
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "hsl(var(--profile-text-muted))" }}
                aria-hidden="true"
              />
              <Input
                id="batch-input"
                name="batch_name"
                type="text"
                defaultValue={user.batch_name || ""}
                placeholder="Enter your batch (e.g. CSE-22)"
                disabled={!isEditing}
                className="h-9 pl-9 text-sm profile-focus-ring"
                style={{ borderRadius: "var(--profile-radius-sm)" }}
              />
            </div>
          </div>

          <div className="" style={{ borderColor: "rgba(var(--profile-border), 0.45)" }}>

            <div className="flex items-center gap-2">
              <div className="relative w-full">
                <IdCard
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: "hsl(var(--profile-text-muted))" }}
                  aria-hidden="true"
                />
                <Input
                  id="mist-id-input"
                  name="mist_id"
                  type="text"
                  defaultValue={user.mist_id ?? ""}
                  placeholder="Enter your MIST student ID"
                  disabled={!isEditing}
                  className="text-sm w-full pl-9 profile-focus-ring"
                  style={{
                    borderRadius: "var(--profile-radius-sm)",
                    background: "hsl(var(--profile-surface-2))",
                    color: "hsl(var(--profile-text))",
                  }}
                />
              </div>
              {user.mist_id_card && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 shrink-0 profile-focus-ring"
                      style={{ borderRadius: "var(--profile-radius-sm)" }}
                      title="View MIST ID Card"
                      aria-label="View MIST ID Card"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl">
                    <DialogTitle className="text-lg font-medium">
                      MIST ID Card
                    </DialogTitle>
                    <Image
                      src={user.mist_id_card || "/placeholder.svg"}
                      alt="MIST ID Card"
                      className="w-full h-auto rounded-md"
                      width={600}
                      height={400}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>

        <div className="">
          <div className="flex items-center gap-2">
            <div className="relative border rounded-md w-full">
              <Shirt
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "hsl(var(--profile-text-muted))" }}
                aria-hidden="true"
              />
              <select
                id="tshirt-size"
                name="tshirt_size"
                defaultValue={user.tshirt_size || ""}
                disabled={!isEditing}
                className="flex h-9 w-full items-center justify-between py-2 pl-9 pr-3 text-sm profile-focus-ring disabled:opacity-70"
                style={{
                  borderRadius: "var(--profile-radius-sm)",
                  // border: "1px solid rgba(var(--profile-border))",
                  background: "hsl(var(--profile-surface-2))",
                  color: "hsl(var(--profile-text))",
                }}
              >
                <option value="">Select size</option>
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
                <option value="3XL">3XL</option>
                <option value="4XL">4XL</option>
              </select>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 shrink-0 profile-focus-ring"
                  style={{ borderRadius: "var(--profile-radius-sm)" }}
                  title="View T-shirt size guide"
                  aria-label="View T-shirt size guide"
                >
                  ?
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 text-xs">
                <p className="mb-2 font-medium">Unisex sizes</p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>XS: 34-36in | S: 36-38in</li>
                  <li>M: 38-40in | L: 40-42in</li>
                  <li>XL: 42-44in | XXL: 44-46in</li>
                  <li>3XL: 46-48in | 4XL: 48-50in</li>
                </ul>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        

        {isEditing && (
          <div
            className=""
            style={{ borderColor: "rgba(var(--profile-border), 0.45)" }}
          >
            <Label
              htmlFor="profile-pic"
              className="text-sm font-medium mb-2 block"
              style={{ color: "hsl(var(--profile-text-secondary))" }}
            >
              Update Profile Picture
            </Label>
            <Input
              id="profile-pic"
              type="file"
              name="image"
              accept="image/*"
              className="w-full text-sm profile-focus-ring"
              style={{ borderRadius: "var(--profile-radius-sm)" }}
            />
          </div>
        )}

        <div className="space-y-2" style={{ borderColor: "rgba(var(--profile-border), 0.45)" }}>
          {!isEditing ? (
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setIsEditing(true);
              }}
              className="w-full profile-focus-ring"
              style={{
                background: "hsl(var(--profile-primary))",
                color: "white",
                borderRadius: "var(--profile-radius-sm)",
              }}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <SaveSubmitButton />
          )}
        </div>
      </form>

      <form action={logoutAction}>
        <Button
          type="submit"
          variant="outline"
          className="w-full profile-focus-ring"
          style={{
            borderRadius: "var(--profile-radius-sm)",
            color: "hsl(var(--profile-danger))",
            borderColor: "hsl(var(--profile-danger) / 0.3)",
          }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </form>
    </div>
  );
}

function SaveSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full profile-focus-ring"
      style={{
        background: "hsl(var(--profile-primary))",
        color: "white",
        borderRadius: "var(--profile-radius-sm)",
      }}
    >
      <Save className="h-4 w-4 mr-2" />
      {pending ? "Saving..." : "Save"}
    </Button>
  );
}
