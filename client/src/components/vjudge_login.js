"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { post, post_with_token } from "@/lib/action"

export function LoginForm({ onLoginSuccess }) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const loginToVJudge = async (email, pass) => {
        try {
            const username = email || ""
            const password = pass || ""

            console.log("Authenticating with VJudge...")

            // curl - X GET "http://localhost:5000/user/vjudge_login" \
            // -H "Authorization: Bearer <your_jwt_token>" \
            // -H "Content-Type: application/json" \
            // -d '{"email": "your_vjudge_email", "pass": "your_password"}'
            console.log(pass);
            const res = await post_with_token('user/vjudge_login', {
                vj_email: username,
                pass: password,
            })
            console.log(res);
            try {
                return res.JSESSIONID
            }
            catch (error) {
                console.error("Error parsing JSON response:", error)
                return ""
            }

        } catch (error) {
            console.error("Error during VJudge authentication:", error)
            return ""
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const sessionId = await loginToVJudge(username, password)

            if (sessionId) {
                localStorage.setItem("vjudge_session", sessionId)
                localStorage.setItem("vjudge_username", username)
                toast("Login successful. You have been logged in to VJudge")
                onLoginSuccess()
            } else {
                toast("Login failed. Invalid credentials or server error")
            }
        } catch (error) {
            toast("Login error. An error occurred during login")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                    id="username"
                    placeholder="Enter your VJudge username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
            </Button>
        </form>
    )
}
