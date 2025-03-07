import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { deleteBatch, getAllBatches } from '@/lib/action'
import { Ellipsis } from 'lucide-react'
import {Link} from 'next-view-transitions'

export default async function ShowBatches() {
  const allBatches = await getAllBatches()
  return (
    <ScrollArea className="max:h-screen max:max-h-screen w-64 min-w-fit max-md:w-full rounded-md border mx-2">
      <div className="p-4">
        <h4 className="mb-8 text-lg font-medium leading-none">Batches</h4>
        {allBatches.length > 0 &&
          allBatches.map((batch, index) => {
            const binded = deleteBatch.bind(null, batch.id)
            return (
              <div
                key={index}
                className="flex flex-col gap-2"
              >
                <div className="flex justify-between gap-2">
                  {batch.name}
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Ellipsis />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <Link href={`/batches/edit/${batch.id}`}>Edit</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link href={`/batches/members/${batch.id}`}>
                          Add Members
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <form
                          action={binded}
                          className="w-full"
                        >
                          <button
                            type="submit"
                            className="w-full text-left p-0 m-0 bg-none"
                          >
                            Delete
                          </button>
                        </form>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Separator className="my-2" />
              </div>
            )
          })}
      </div>
    </ScrollArea>
  )
}
