"use client"

import { useState, useRef } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signUp } from "@/lib/action"
import {
  AtSign,
  CircleArrowOutUpRight,
  BadgeIcon as IdCard,
  Lock,
  LockKeyhole,
  Phone,
  UserRound,
  Upload,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import { Link } from "next-view-transitions"
import { useActionState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import Image from "next/image"
import MccLogo from "@/components/IconChanger/MccLogo"
import { OCRImage } from "@/lib/imageProcess"
import { cropBase64Image } from "@/lib/imageCrop"

const initialState = {
  message: "",
  success: false,
}

export default function Page() {
  const [state, formAction, pending] = useActionState(signUp, initialState)
  const [idCardImage, setIdCardImage] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResults, setScanResults] = useState(null)
  const fileInputRef = useRef(null)

  const handleIdCardUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setIdCardImage(reader.result)
        processIdCard(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const processIdCard = async (imageData) => {
    setIsScanning(true)
    setScanResults(null)
    
    try {
     
      const res = await OCRImage(imageData)
      console.log(res);
      
      const resData = {
        batchDetails: res.Batch_details,
        rollNo: res.Roll_no,
        profilePicture: await cropBase64Image(res.bounding_box, imageData),
      };
      
      setIsScanning(false)
      setScanResults(resData)
    } catch (error) {
      console.error("Error processing ID card:", error)
      setIsScanning(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  }

  return (
    <div className="min-h-screen w-full py-12 px-4 flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl"
      >
        <Card className="shadow-lg border-primary/10">
          <CardHeader className="space-y-1 pb-6 border-b">
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
              <CardTitle className="text-3xl font-bold text-center">Create Your Account</CardTitle>
              <CardDescription className="text-center pt-2">
                Have an existing account?{" "}
                <Link href="/login" className="text-primary font-medium hover:underline">
                  Login
                </Link>{" "}
                instead.
              </CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
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

                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="flex flex-row items-center w-full rounded-xl border group focus-within:border-primary focus-within:ring-1 focus-within:ring-primary px-3 transition-all duration-200">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                      <Input
                        type="password"
                        id="password"
                        name="password"
                        placeholder="Enter a super secret password"
                        className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                        required
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="confirm_password" className="text-sm font-medium">
                      Confirm Password
                    </Label>
                    <div className="flex flex-row items-center w-full rounded-xl border group focus-within:border-primary focus-within:ring-1 focus-within:ring-primary px-3 transition-all duration-200">
                      <LockKeyhole className="h-5 w-5 text-muted-foreground" />
                      <Input
                        type="password"
                        id="confirm_password"
                        name="confirm_password"
                        placeholder="Confirm your password"
                        className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                        required
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="mist_id_card" className="text-sm font-medium">
                      MIST ID Card
                    </Label>
                    <div
                      className={cn(
                        "flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed p-6 transition-all duration-200",
                        idCardImage
                          ? "border-primary/50 bg-primary/5"
                          : "border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5",
                      )}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="mist_id_card"
                        name="mist_id_card"
                        accept="image/*"
                        className="hidden"
                        onChange={handleIdCardUpload}
                        required
                      />

                      {!idCardImage ? (
                        <div className="flex flex-col items-center text-center">
                          <IdCard className="h-10 w-10 text-muted-foreground mb-2" />
                          <p className="text-sm font-medium">Upload your MIST ID Card</p>
                          <p className="text-xs text-muted-foreground mt-1">Click or drag and drop</p>
                          <Button variant="outline" size="sm" className="mt-4">
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
                            variant="secondary"
                            size="sm"
                            className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setIdCardImage(null)
                              setScanResults(null)
                              if (fileInputRef.current) fileInputRef.current.value = ""
                            }}
                          >
                            Change
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                  <input type="hidden" name="profile_pic" value={scanResults?.profilePicture || ""} />
                  <input type="hidden" name="batch_details" value={scanResults?.batchDetails || ""} />
                  <input type="hidden" name="mist_id" value={scanResults?.rollNo || ""} />

                  {state?.message && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <Alert variant={state?.success ? "default" : "destructive"}>
                        <AlertDescription>{state?.message}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}

                  <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button type="submit" className="w-full py-6 text-base" disabled={pending || isScanning}>
                      {pending || isScanning ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isScanning ? "Scanning ID Card..." : "Creating Account..."}
                        </motion.div>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </motion.div>
                </form>
              </motion.div>

              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                <motion.div
                  variants={itemVariants}
                  className={cn(
                    "border rounded-xl p-4 transition-all duration-300",
                    scanResults ? "border-primary/50 bg-primary/5" : "border-muted",
                  )}
                >
                  <h3 className="font-medium text-lg mb-4 flex items-center">
                    <IdCard className="mr-2 h-5 w-5" />
                    ID Card Information
                  </h3>

                  {isScanning ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      >
                        <Loader2 className="h-10 w-10 text-primary" />
                      </motion.div>
                      <p className="mt-4 text-sm text-muted-foreground">Processing...</p>
                    </div>
                  ) : scanResults ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Batch Details</p>
                          <p className="font-medium">{scanResults.batchDetails}</p>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Roll Number</p>
                          <p className="font-medium">{scanResults.rollNo}</p>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>

                      {scanResults.profilePicture && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Profile Picture</p>
                          <div className="flex justify-center">
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary"
                            >
                              <Image
                                src={scanResults.profilePicture || "/mccLogo.png"}
                                alt="Extracted Profile"
                                  className="w-full h-full object-cover"
                                  width={96}
                                  height={96}
                              />
                            </motion.div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                          <MccLogo className=" text-primary" w={160} h={160} />
                      <p className="text-sm text-muted-foreground">
                        Upload your ID card to automatically extract your information
                      </p>
                    </div>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="border rounded-xl p-4">
                  <h3 className="font-medium text-lg mb-4 flex items-center">
                    <CircleArrowOutUpRight className="mr-2 h-5 w-5" />
                    Competitive Programming Profiles
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="vjudge_id" className="text-sm font-medium">
                        Vjudge ID
                      </Label>
                      <div className="flex flex-row items-center w-full rounded-xl border group focus-within:border-primary focus-within:ring-1 focus-within:ring-primary px-3 transition-all duration-200">
                        <CircleArrowOutUpRight className="h-5 w-5 text-muted-foreground" />
                        <Input
                          type="text"
                          id="vjudge_id"
                          name="vjudge_id"
                          placeholder="Enter your Vjudge ID"
                          className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cf_id" className="text-sm font-medium">
                        Codeforces ID
                      </Label>
                      <div className="flex flex-row items-center w-full rounded-xl border group focus-within:border-primary focus-within:ring-1 focus-within:ring-primary px-3 transition-all duration-200">
                        <CircleArrowOutUpRight className="h-5 w-5 text-muted-foreground" />
                        <Input
                          type="text"
                          id="cf_id"
                          name="cf_id"
                          placeholder="Enter your Codeforces ID"
                          className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="codechef_id" className="text-sm font-medium">
                        CodeChef ID
                      </Label>
                      <div className="flex flex-row items-center w-full rounded-xl border group focus-within:border-primary focus-within:ring-1 focus-within:ring-primary px-3 transition-all duration-200">
                        <CircleArrowOutUpRight className="h-5 w-5 text-muted-foreground" />
                        <Input
                          type="text"
                          id="codechef_id"
                          name="codechef_id"
                          placeholder="Enter your CodeChef ID"
                          className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="atcoder_id" className="text-sm font-medium">
                        Atcoder ID
                      </Label>
                      <div className="flex flex-row items-center w-full rounded-xl border group focus-within:border-primary focus-within:ring-1 focus-within:ring-primary px-3 transition-all duration-200">
                        <CircleArrowOutUpRight className="h-5 w-5 text-muted-foreground" />
                        <Input
                          type="text"
                          id="atcoder_id"
                          name="atcoder_id"
                          placeholder="Enter your Atcoder ID"
                          className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-6">
            <p className="text-sm text-muted-foreground">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

