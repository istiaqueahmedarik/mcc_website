import Accept from '@/components/Accept'
import Reject from '@/components/Reject'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { get_with_token, pendingUsers } from '@/lib/action'
import { cookies } from 'next/headers'
import Image from 'next/image'
import { redirect } from 'next/navigation'

export default async function Page() {
  if (!cookies().get('token')) {
    redirect('/login')
  }
  const user = await get_with_token('auth/user/profile')
  if (user?.result.length === 0) {
    redirect('/login')
  }
  if (user?.result[0].admin === false) {
    redirect('/')
  }
  const pendingU = await pendingUsers()
  return (
    <div className="min-h-screen w-full py-12 px-4 flex justify-center bg-background">
      {pendingU && pendingU.length > 0 ? (
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-3xl uppercase font-mono">All pending users</h1>
          <div className="max-sm:w-screen">
            <Table className="w-full max-w-5xl">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>MIST ID</TableHead>
                  <TableHead>MIST ID Card</TableHead>
                  <TableHead>Accept</TableHead>
                  <TableHead>Reject</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingU.map((user, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.full_name}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.mist_id}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger>
                          <Image
                            src={user.mist_id_card}
                            alt={user.full_name}
                            width={40}
                            height={40}
                          />
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Image of the ID card</DialogTitle>
                            <DialogDescription className="">
                              <Image
                                src={user.mist_id_card}
                                alt={user.full_name}
                                width={600}
                                height={600}
                              />
                            </DialogDescription>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell>
                      <Accept userId={user.id} />
                    </TableCell>
                    <TableCell>
                      <Reject userId={user.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-center">No Pending Users</h1>
          <p className="text-sm text-muted-foreground text-center">
            There are no pending users.
          </p>
        </div>
      )}
    </div>
  )
}
