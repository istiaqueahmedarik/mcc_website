'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, Plus, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { 
    createDemerit, 
    getAllDemerits, 
    updateDemerit, 
    deleteDemerit 
} from '@/actions/contest_details'

export default function DemeritManagementPage() {
    const [demerits, setDemerits] = useState([])
    const [loading, setLoading] = useState(true)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [editingDemerit, setEditingDemerit] = useState(null)
    
    // Form state
    const [formData, setFormData] = useState({
        contestId: '',
        vjudgeId: '',
        demeritPoint: '',
        reason: ''
    })

    useEffect(() => {
        loadDemerits()
    }, [])

    const loadDemerits = async () => {
        setLoading(true)
        try {
            const response = await getAllDemerits()
            if (response.success) {
                setDemerits(response.data)
            } else {
                toast.error('Failed to load demerits')
            }
        } catch (error) {
            console.error('Error loading demerits:', error)
            toast.error('Error loading demerits')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!formData.contestId || !formData.vjudgeId || !formData.demeritPoint || !formData.reason) {
            toast.error('All fields are required')
            return
        }

        try {
            const response = editingDemerit 
                ? await updateDemerit(
                    editingDemerit.id,
                    formData.contestId,
                    formData.vjudgeId,
                    formData.demeritPoint,
                    formData.reason
                )
                : await createDemerit(
                    formData.contestId,
                    formData.vjudgeId,
                    formData.demeritPoint,
                    formData.reason
                )

            if (response.success) {
                toast.success(editingDemerit ? 'Demerit updated successfully' : 'Demerit created successfully')
                setFormData({ contestId: '', vjudgeId: '', demeritPoint: '', reason: '' })
                setIsCreateDialogOpen(false)
                setIsEditDialogOpen(false)
                setEditingDemerit(null)
                loadDemerits()
            } else {
                toast.error(response.error || 'Failed to save demerit')
            }
        } catch (error) {
            console.error('Error saving demerit:', error)
            toast.error('Error saving demerit')
        }
    }

    const handleEdit = (demerit) => {
        setEditingDemerit(demerit)
        setFormData({
            contestId: demerit.contest_id,
            vjudgeId: demerit.vjudge_id,
            demeritPoint: demerit.demerit_point.toString(),
            reason: demerit.reason
        })
        setIsEditDialogOpen(true)
    }

    const handleDelete = async (demeritId) => {
        if (!confirm('Are you sure you want to delete this demerit?')) {
            return
        }

        try {
            const response = await deleteDemerit(demeritId)
            if (response.success) {
                toast.success('Demerit deleted successfully')
                loadDemerits()
            } else {
                toast.error(response.error || 'Failed to delete demerit')
            }
        } catch (error) {
            console.error('Error deleting demerit:', error)
            toast.error('Error deleting demerit')
        }
    }

    const resetForm = () => {
        setFormData({ contestId: '', vjudgeId: '', demeritPoint: '', reason: '' })
        setEditingDemerit(null)
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString()
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Demerit Management</h1>
                    <p className="text-muted-foreground">Manage contest demerits for participants</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Demerit
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Demerit</DialogTitle>
                            <DialogDescription>
                                Add a demerit for a participant in a specific contest.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="contestId">Contest ID</Label>
                                <Input
                                    id="contestId"
                                    value={formData.contestId}
                                    onChange={(e) => setFormData({ ...formData, contestId: e.target.value })}
                                    placeholder="Enter contest ID"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="vjudgeId">VJudge ID</Label>
                                <Input
                                    id="vjudgeId"
                                    value={formData.vjudgeId}
                                    onChange={(e) => setFormData({ ...formData, vjudgeId: e.target.value })}
                                    placeholder="Enter participant's VJudge ID"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="demeritPoint">Demerit Points</Label>
                                <Input
                                    id="demeritPoint"
                                    type="number"
                                    value={formData.demeritPoint}
                                    onChange={(e) => setFormData({ ...formData, demeritPoint: e.target.value })}
                                    placeholder="Enter demerit points"
                                    min="1"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="reason">Reason</Label>
                                <Textarea
                                    id="reason"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Enter reason for demerit"
                                    rows={3}
                                    required
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">Create Demerit</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Demerit</DialogTitle>
                        <DialogDescription>
                            Update the demerit details.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="editContestId">Contest ID</Label>
                            <Input
                                id="editContestId"
                                value={formData.contestId}
                                onChange={(e) => setFormData({ ...formData, contestId: e.target.value })}
                                placeholder="Enter contest ID"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="editVjudgeId">VJudge ID</Label>
                            <Input
                                id="editVjudgeId"
                                value={formData.vjudgeId}
                                onChange={(e) => setFormData({ ...formData, vjudgeId: e.target.value })}
                                placeholder="Enter participant's VJudge ID"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="editDemeritPoint">Demerit Points</Label>
                            <Input
                                id="editDemeritPoint"
                                type="number"
                                value={formData.demeritPoint}
                                onChange={(e) => setFormData({ ...formData, demeritPoint: e.target.value })}
                                placeholder="Enter demerit points"
                                min="1"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="editReason">Reason</Label>
                            <Textarea
                                id="editReason"
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="Enter reason for demerit"
                                rows={3}
                                required
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Update Demerit</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>All Demerits</CardTitle>
                    <CardDescription>
                        View and manage all demerits in the system
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">Loading demerits...</div>
                    ) : demerits.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                            No demerits found
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Contest ID</TableHead>
                                        <TableHead>VJudge ID</TableHead>
                                        <TableHead>User Name</TableHead>
                                        <TableHead>Points</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {demerits.map((demerit) => (
                                        <TableRow key={demerit.id}>
                                            <TableCell className="font-mono">{demerit.contest_id}</TableCell>
                                            <TableCell className="font-mono">{demerit.vjudge_id}</TableCell>
                                            <TableCell>{demerit.user_name || 'Unknown'}</TableCell>
                                            <TableCell>
                                                <Badge variant="destructive">
                                                    -{demerit.demerit_point}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                {demerit.reason}
                                            </TableCell>
                                            <TableCell>{formatDate(demerit.created_at)}</TableCell>
                                            <TableCell>
                                                <div className="flex space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(demerit)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDelete(demerit.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
