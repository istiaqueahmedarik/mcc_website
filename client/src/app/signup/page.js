"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/action";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  AtSign,
  CheckCircle2,
  Eye,
  EyeOff,
  BadgeIcon as IdCard,
  Info,
  Loader2,
  Lock,
  LockKeyhole,
  Phone,
  Upload,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";

const initialState = {
  message: "",
  success: false,
};

export default function Page() {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const [idCardImage, setIdCardImage] = useState(null);
  const fileInputRef = useRef(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [idError, setIdError] = useState("");

  const maxIdSize = 5 * 1024 * 1024; // 5MB

  const passwordStrength = (pw) => {
    // Simple validation: just check if password is at least 8 characters
    return pw.length >= 8 ? 1 : 0;
  };

  const handlePickedFile = (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setIdError("Please select a JPG or PNG image.");
      return;
    }
    if (file.size > maxIdSize) {
      setIdError("File too large. Max 5MB.");
      return;
    }
    setIdError("");
    const reader = new FileReader();
    reader.onload = () => {
      setIdCardImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleIdCardUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePickedFile(file);
    }
  };

  const onDropIdCard = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      // set file onto the hidden input as well
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileInputRef.current) fileInputRef.current.files = dt.files;
      handlePickedFile(file);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="min-h-screen w-full py-12 px-4 flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl"
      >
        <Card className="shadow-lg border-primary/10 overflow-hidden">
          <CardHeader className="space-y-1 pb-6 border-b">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <CardTitle className="text-3xl font-bold text-center">
                Create Your Account
              </CardTitle>
              <CardDescription className="text-center pt-2">
                Have an existing account?{" "}
                <Link
                  href="/login"
                  className="text-primary font-medium hover:underline"
                >
                  Login
                </Link>{" "}
                instead.
              </CardDescription>
              <div className="mt-3 flex items-center justify-center text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mr-1" />
                Enter your student details manually and upload a clear image of
                your ID card for verification.
              </div>
            </motion.div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mx-auto max-w-2xl">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <form action={formAction} className="space-y-4">
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="full_name" className="text-sm font-medium">
                      Full Name
                    </Label>
                    <div className="flex flex-row items-center w-full rounded-xl border group focus-within:border-primary focus-within:ring-1 focus-within:ring-primary px-3 transition-all duration-200">
                      <UserRound className="h-5 w-5 text-muted-foreground" />
                      <Input
                        type="text"
                        id="full_name"
                        name="full_name"
                        placeholder="Enter your full name"
                        className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                        required
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <div className="flex flex-row items-center w-full rounded-xl border group focus-within:border-primary focus-within:ring-1 focus-within:ring-primary px-3 transition-all duration-200">
                      <AtSign className="h-5 w-5 text-muted-foreground" />
                      <Input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="Enter your email"
                        className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                        required
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone Number
                    </Label>
                    <div className="flex flex-row items-center w-full rounded-xl border group focus-within:border-primary focus-within:ring-1 focus-within:ring-primary px-3 transition-all duration-200">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <Input
                        type="text"
                        id="phone"
                        name="phone"
                        placeholder="Enter your mobile number"
                        className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                        required
                      />
                    </div>
                  </motion.div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <motion.div variants={itemVariants} className="space-y-2">
                      <Label htmlFor="mist_id" className="text-sm font-medium">
                        MIST Student ID
                      </Label>
                      <div className="flex flex-row items-center w-full rounded-xl border group focus-within:border-primary focus-within:ring-1 focus-within:ring-primary px-3 transition-all duration-200">
                        <IdCard className="h-5 w-5 text-muted-foreground" />
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]+"
                          id="mist_id"
                          name="mist_id"
                          placeholder="Enter your student ID"
                          className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                          required
                        />
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-2">
                      <Label
                        htmlFor="batch_name"
                        className="text-sm font-medium"
                      >
                        Batch Details
                      </Label>
                      <Input
                        type="text"
                        id="batch_name"
                        name="batch_name"
                        placeholder="For example, CSE 22"
                        className="rounded-xl"
                        maxLength={120}
                        required
                      />
                    </motion.div>
                  </div>

                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="flex flex-row items-center w-full rounded-xl border group focus-within:border-primary focus-within:ring-1 focus-within:ring-primary px-3 transition-all duration-200">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        placeholder="Enter a strong password"
                        className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        aria-label="Toggle password visibility"
                        onClick={() => setShowPassword((v) => !v)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <div className="h-2 w-full bg-gray-200/60 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          password.length >= 8
                            ? "bg-green-500"
                            : password.length > 0
                            ? "bg-red-500"
                            : "bg-transparent"
                        }`}
                        style={{
                          width: `${
                            password.length >= 8
                              ? "100"
                              : password.length > 0
                              ? "50"
                              : "0"
                          }%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {password.length >= 8 ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Password meets requirements
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          Password must be at least 8 characters long
                        </span>
                      )}
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label
                      htmlFor="confirm_password"
                      className="text-sm font-medium"
                    >
                      Confirm Password
                    </Label>
                    <div className="flex flex-row items-center w-full rounded-xl border group focus-within:border-primary focus-within:ring-1 focus-within:ring-primary px-3 transition-all duration-200">
                      <LockKeyhole className="h-5 w-5 text-muted-foreground" />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirm_password"
                        name="confirm_password"
                        placeholder="Confirm your password"
                        className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        aria-label="Toggle confirm password visibility"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {confirmPassword && (
                      <div
                        className={`text-xs ${
                          confirmPassword === password
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {confirmPassword === password
                          ? "Passwords match"
                          : "Passwords do not match"}
                      </div>
                    )}
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="profile_pic" className="text-sm font-medium">
                      Profile Picture
                    </Label>
                    <Input
                      type="file"
                      id="profile_pic"
                      name="profile_pic"
                      accept="image/jpeg,image/png"
                      className="h-auto cursor-pointer rounded-xl py-2 file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload a clear photo of yourself (JPG/PNG, max 5MB).
                    </p>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label
                      htmlFor="mist_id_card"
                      className="text-sm font-medium"
                    >
                      MIST ID Card
                    </Label>
                    <div
                      className={cn(
                        "flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed p-6 transition-all duration-200",
                        idCardImage
                          ? "border-primary/50 bg-primary/5"
                          : "border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5"
                      )}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={onDropIdCard}
                      role="button"
                      tabIndex={0}
                      aria-label="Upload MIST ID card image"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="mist_id_card"
                        name="mist_id_card"
                        accept="image/jpeg,image/png"
                        className="hidden"
                        onChange={handleIdCardUpload}
                        required
                      />

                      {!idCardImage ? (
                        <div className="flex flex-col items-center text-center">
                          <IdCard className="h-10 w-10 text-muted-foreground mb-2" />
                          <p className="text-sm font-medium">
                            Upload your MIST ID Card
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Click or drag & drop (JPG/PNG, max 5MB)
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-4"
                          >
                            <Upload className="h-4 w-4 mr-2" /> Select Image
                          </Button>
                        </div>
                      ) : (
                        <div className="relative w-full">
                          <Image
                            src={idCardImage || "/mccLogo.png"}
                            alt="ID Card Preview"
                            className="w-full h-auto rounded-lg object-cover max-h-[150px]"
                            width={300}
                            height={200}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIdCardImage(null);
                              if (fileInputRef.current)
                                fileInputRef.current.value = "";
                            }}
                          >
                            Change
                          </Button>
                        </div>
                      )}
                      {idError && (
                        <p className="text-xs text-red-600 mt-2">{idError}</p>
                      )}
                    </div>
                  </motion.div>

                  {state?.message && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Alert
                        variant={state?.success ? "default" : "destructive"}
                      >
                        <AlertDescription>{state?.message}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}

                  <motion.div
                    variants={itemVariants}
                    className="flex items-start gap-2"
                  >
                    <input
                      id="agree"
                      type="checkbox"
                      className="mt-1"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                    />
                    <Label
                      htmlFor="agree"
                      className="text-sm text-muted-foreground"
                    >
                      I agree to the Terms of Service and Privacy Policy
                    </Label>
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      className="w-full py-6 text-base"
                      disabled={
                        pending ||
                        !agree ||
                        !password ||
                        password !== confirmPassword
                      }
                    >
                      {pending ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center"
                        >
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </motion.div>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </motion.div>
                </form>
              </motion.div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-6">
            <p className="text-sm text-muted-foreground">
              By creating an account, you agree to our Terms of Service and
              Privacy Policy
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
