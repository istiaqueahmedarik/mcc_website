'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPassword, sendResetOTP, verifyOTP } from '@/lib/action'
import { AtSign, Eye, EyeOff, Lock, Shield } from 'lucide-react'
import { useState } from 'react'

const STAGES = {
  EMAIL: 'email',
  OTP: 'otp',
  PASSWORD: 'password'
}

export default function ResetPasswordModal({ isOpen, onClose }) {
  const [stage, setStage] = useState(STAGES.EMAIL)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleClose = () => {
    setStage(STAGES.EMAIL)
    setEmail('')
    setOtp('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    onClose()
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await sendResetOTP(email)
      if (result.success) {
        setSuccess('OTP sent to your email successfully!')
        setTimeout(() => {
          setStage(STAGES.OTP)
          setSuccess('')
        }, 2000)
      } else {
        setError(result.message || 'Failed to send OTP')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOTPSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await verifyOTP(email, otp)
      if (result.success) {
        setSuccess('OTP verified successfully!')
        setTimeout(() => {
          setStage(STAGES.PASSWORD)
          setSuccess('')
        }, 2000)
      } else {
        setError(result.message || 'Invalid OTP')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    try {
      const result = await resetPassword(email, otp, password)
      if (result.success) {
        setSuccess('Password reset successfully!')
        setTimeout(() => {
          handleClose()
        }, 2000)
      } else {
        setError(result.message || 'Failed to reset password')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderEmailStage = () => (
    <form onSubmit={handleEmailSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-email">Email Address</Label>
        <div className="flex flex-row items-center justify-center w-full rounded-xl border group focus-within:border-primary px-2">
          <AtSign className="w-4 h-4" />
          <Input
            type="email"
            id="reset-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
            required
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Sending OTP...' : 'Send OTP'}
      </Button>
    </form>
  )

  const renderOTPStage = () => (
    <form onSubmit={handleOTPSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="otp">Enter OTP</Label>
        <div className="flex flex-row items-center justify-center w-full rounded-xl border group focus-within:border-primary px-2">
          <Shield className="w-4 h-4" />
          <Input
            type="text"
            id="otp"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter 6-digit OTP"
            className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
            maxLength="6"
            required
          />
        </div>
        <p className="text-sm text-muted-foreground">
          OTP sent to {email}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => setStage(STAGES.EMAIL)}
        >
          Back
        </Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? 'Verifying...' : 'Verify OTP'}
        </Button>
      </div>
    </form>
  )

  const renderPasswordStage = () => (
    <form onSubmit={handlePasswordSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <div className="flex flex-row items-center justify-center w-full rounded-xl border group focus-within:border-primary px-2">
          <Lock className="w-4 h-4" />
          <Input
            type={showPassword ? "text" : "password"}
            id="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <div className="flex flex-row items-center justify-center w-full rounded-xl border group focus-within:border-primary px-2">
          <Lock className="w-4 h-4" />
          <Input
            type={showConfirmPassword ? "text" : "password"}
            id="confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-transparent"
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

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => setStage(STAGES.OTP)}
        >
          Back
        </Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </Button>
      </div>
    </form>
  )

  const getTitle = () => {
    switch (stage) {
      case STAGES.EMAIL:
        return 'Reset Password'
      case STAGES.OTP:
        return 'Verify OTP'
      case STAGES.PASSWORD:
        return 'Set New Password'
      default:
        return 'Reset Password'
    }
  }

  const getDescription = () => {
    switch (stage) {
      case STAGES.EMAIL:
        return 'Enter your email address to receive a reset code'
      case STAGES.OTP:
        return 'Enter the verification code sent to your email'
      case STAGES.PASSWORD:
        return 'Create a new password for your account'
      default:
        return ''
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {stage === STAGES.EMAIL && renderEmailStage()}
        {stage === STAGES.OTP && renderOTPStage()}
        {stage === STAGES.PASSWORD && renderPasswordStage()}
      </DialogContent>
    </Dialog>
  )
}
