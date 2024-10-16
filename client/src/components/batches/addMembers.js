'use client'

const { useState, useActionState } = require('react')
import { Label } from '@/components/ui/label'
import { addBatchMemebers } from '@/lib/action'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Alert, AlertDescription } from '../ui/alert'
import { Button, buttonVariants } from '../ui/button'
import { Input } from '../ui/input'

const initialState = {
  message: '',
  success: false,
}

const AddMembers = ({ batch, nonUsers }) => {
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [selectedMembers, setSelectedMembers] = useState([])
  const [nonMem, setNonMem] = useState(nonUsers.slice(0, limit))
  const [state, setState] = useState(initialState)
  const [pending, setPending] = useState(false)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setPending(true)
    await addBatchMemebers({
      batch_id: batch.id,
      members: selectedMembers,
    })
    if (res.error) {
      setState({ message: res.error, success: false })
    } else {
      setState({ message: res.message, success: true })
    }
    setPending(false)
  }

  const goNext = () => {
    setNonMem(nonUsers.slice(offset + limit, offset + limit + limit))
    setOffset(offset + limit)
  }

  const goPrev = () => {
    setNonMem(nonUsers.slice(offset - limit, offset))
    setOffset(offset - limit)
  }

  // console.log(selectedMembers)

  return (
    <div className="min-h-screen w-full py-12 px-4 flex  justify-center bg-background">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Label
            htmlFor="name"
            className="text-xl font-extrabold"
          >
            Select Members
          </Label>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search members..."
              className="pl-10"
              onChange={(e) => {
                if (!e.target.value) {
                  setNonMem(nonUsers)
                  return
                }
                setNonMem(
                  nonMem.filter(
                    (mem) =>
                      mem.full_name
                        .toLowerCase()
                        .includes(e.target.value.toLowerCase()) ||
                      mem.mist_id.includes(e.target.value),
                  ),
                )
              }}
            />
          </div>

          {nonMem.length > 0 &&
            nonMem.map((mem, index) => (
              <div key={index}>
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    id={mem.id}
                    className="pl-10"
                    value={mem.id}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMembers([...selectedMembers, e.target.value])
                      } else {
                        setSelectedMembers(
                          selectedMembers.filter(
                            (mem) => mem != e.target.value,
                          ),
                        )
                      }
                    }}
                  />
                  {mem.mist_id} - {mem.full_name}
                </label>
              </div>
            ))}
        </div>

        <div className="flex justify-between w-full max-w-6xl mt-4">
          <Button
            disabled={offset === 0}
            type="button"
            variant="outline"
            className={`${
              offset === 0 && 'hidden'
            } flex flex-wrap ${buttonVariants({ variant: 'outline' })}`}
            onClick={goPrev}
          >
            <ChevronLeft className="mr-2 h-4 w-4 my-auto" />
            <span className="my-auto"> Previous</span>
          </Button>
          <Button
            disabled={!nonMem || nonMem.length < limit}
            variant="outline"
            type="button"
            className={`flex flex-wrap ${buttonVariants({ variant: 'outline' })}`}
            onClick={goNext}
          >
            <span className="my-auto"> Next</span>{' '}
            <ChevronRight className="ml-2 h-4 w-4 my-auto" />
          </Button>
        </div>

        {state?.message && (
          <Alert
            className="p-4"
            variant={state?.success ? 'default' : 'destructive'}
          >
            <AlertDescription>{state?.message}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          className="w-full mt-4"
          disabled={pending}
        >
          {pending ? 'Submitting...' : 'Add Members'}
        </Button>
      </form>
    </div>
  )
}

export default AddMembers
