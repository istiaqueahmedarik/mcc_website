"use client"

import { useEffect, useState } from "react"
import { Clock, Share2, Users, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import Image from "next/image"

import { get, get_with_token, post, post_with_token } from "@/lib/action"
import Link from "next/link"

export default function LiveShareModal({ reportData, reportId }) {
  console.log(typeof reportData)
    const [isOpen, setIsOpen] = useState(false)
    const [isSharing, setIsSharing] = useState(false)
    const [existingReport, setExistingReport] = useState(null)
    const [apiLoading, setApiLoading] = useState(false)
    const [lastUpdated, setLastUpdated] = useState("")
    const bodyString = JSON.stringify(reportData)
    const handleStart = async () => {
      setApiLoading(true)
      try {
        const result = await post_with_token('public-contest-report/admin/insert', { Shared_contest_id: reportId, JSON_string: bodyString })
        setExistingReport({ report_id: result.report_id, Shared_contest_id: reportId, JSON_string: bodyString })
        setIsSharing(true)
        setLastUpdated(new Date().toLocaleString())
      } catch (e) {
        console.error(e)
      } finally {
        setApiLoading(false)
      }
    }
    const handleStop = async () => {
      if (!existingReport) return
      setApiLoading(true)
      try {
          await post_with_token('public-contest-report/admin/delete', { Shared_contest_id: reportId })
        setExistingReport(null)
        setIsSharing(false)
        setLastUpdated("")
      } catch (e) {
        console.error(e)
      } finally {
        setApiLoading(false)
      }
    }
    const handleUpdate = async () => {
      if (!existingReport) return
      setApiLoading(true)
      try {
          await post_with_token('public-contest-report/admin/update', {  Shared_contest_id: reportId, JSON_string: bodyString })
        setExistingReport(prev => ({ ...prev, JSON_string: bodyString }))
        setLastUpdated(new Date().toLocaleString())
      } catch (e) {
        console.error(e)
      } finally {
        setApiLoading(false)
      }
    }

    useEffect(() => { 
        if (isOpen) {
            setApiLoading(true)
            post('public-contest-report/get', { report_id : reportId })
                .then(data => {
                console.log(data)
                const found = data?.success && data.result.length>0
                  if (found) { setExistingReport(found); setIsSharing(true); setLastUpdated(new Date(data.result[0].Updated_at).toLocaleDateString()) }
                else { setExistingReport(null); setIsSharing(false) }
            })
            .catch(console.error)
            .finally(() => setApiLoading(false))
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])
  if (apiLoading)
    return <>
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
      <div className="text-center text-gray-500">Loading...</div>
      
    </>
    return (
        <div className="flex items-center justify-center ">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <Share2 className="h-4 w-4" />
                        Live Share
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <DialogTitle className="text-xl">Live Share</DialogTitle>
                            <DialogDescription>Share this page in real-time with your team members</DialogDescription>
                          </div>
                          {/* Info dialog replicating ranking & effective score explanation */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" title="How ranking & effective score are calculated">
                                <Info className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Ranking & Effective Score Calculation</DialogTitle>
                                <DialogDescription asChild>
                                  <div className="space-y-4 text-sm leading-relaxed mt-2">
                                    <div>
                                      <h4 className="font-semibold mb-1">Per-Contest Metrics</h4>
                                      <ul className="list-disc list-inside space-y-1">
                                        <li><strong>Solved</strong>: Number of accepted problems.</li>
                                        <li><strong>Penalty</strong>: Base contest penalty (e.g., time + wrong submission penalties) plus any demerit penalties (100 per demerit point if user absent; or integrated into recorded penalty).</li>
                                        <li><strong>Score</strong>: Weighted score for that contest (base finalScore × contest weight). Negative impact from demerits is already applied to the stored finalScore.</li>
                                      </ul>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-1">Aggregated Totals (Raw)</h4>
                                      <ul className="list-disc list-inside space-y-1">
                                        <li><strong>Total Solved</strong>: Sum of solved across all contests (after weighting if applied inside finalScore logic).</li>
                                        <li><strong>Total Penalty</strong>: Sum of penalty across contests (includes added penalty for demerits / absences).</li>
                                        <li><strong>Total Score</strong>: Sum of each contest&apos;s finalScore x weight.</li>
                                      </ul>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-1">Standard Deviation Adjustment</h4>
                                      <p>To reward consistency, a standard deviation (SD) penalty is applied:</p>
                                      <ul className="list-disc list-inside space-y-1">
                                        <li><strong>Score SD</strong>: SD of per-contest scores.</li>
                                        <li><strong>Penalty SD</strong>: SD of per-contest penalties.</li>
                                      </ul>
                                      <p className="mt-1">Higher variability (larger SD) reduces effective performance.</p>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-1">Effective Metrics</h4>
                                      <ul className="list-disc list-inside space-y-1">
                                        <li><strong>Effective Solved / Effective Score</strong>: totalScore - scoreSD.</li>
                                        <li><strong>Effective Penalty</strong>: totalPenalty + penaltySD.</li>
                                        <li><strong>Total Demerits</strong>: Sum of demerit points across contests (shown; each demerit may also affect score/penalty already).</li>
                                      </ul>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-1">Ranking Order</h4>
                                      <ol className="list-decimal list-inside space-y-1">
                                        <li>Higher <strong>Effective Solved / Score</strong></li>
                                        <li>Lower <strong>Effective Penalty</strong> (tie-breaker)</li>
                                        <li>Higher <strong>Contests Attended</strong> (final tie-breaker)</li>
                                      </ol>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-1">Removing Worst Contests / Opt-out</h4>
                                      <p>1 worst contest (generally) opt out. </p>
                                    </div>
                                  </div>
                                </DialogDescription>
                              </DialogHeader>
                            </DialogContent>
                          </Dialog>
                        </div>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="mx-auto w-full max-w-2xl  relative">
                                   
                                    <Image width={1024} height={1024} src="/liveShare.svg" alt="Live Share" className="rounded-lg" />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="share-toggle" className="text-base">
                                        Enable Live Sharing
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        {isSharing ? 
                                        <Link href={`/contests_report/live/${reportId}`} target="_blank" rel="noopener noreferrer">
                                            <span className="text-blue-500 hover:underline">View Live Share</span>
                                        </Link> : 
                                        "Live sharing is disabled"}
                                    </p>
                                </div>
                                
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Last Updated</Label>
                                    <p className="text-sm text-muted-foreground">{lastUpdated}</p>
                                </div>
                                <div
                                    className={cn("h-2 w-2 rounded-full", isSharing ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600")}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="sm:justify-between">
                      <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Cancel
                      </Button>
                      {!isSharing ? (
                        <Button type="button" disabled={apiLoading} className="gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={handleStart}>
                          <Share2 className="h-4 w-4" /> Start Sharing
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button type="button" disabled={apiLoading} className="gap-2 bg-red-600 hover:bg-red-700" onClick={handleStop}>
                            <Share2 className="h-4 w-4" /> Stop Sharing
                          </Button>
                          <Button type="button" disabled={apiLoading} className="gap-2 bg-yellow-600 hover:bg-yellow-700" onClick={handleUpdate}>
                            <Share2 className="h-4 w-4" /> Update Share
                          </Button>
                        </div>
                      )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
