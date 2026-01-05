import MccLogo from '@/components/IconChanger/MccLogo'
import { Github, Linkedin, Mail, MessageSquare } from 'lucide-react'
import Link from 'next/link'

const links = {
  explore: [
    { label: 'Contests', href: '/upcomingContest' },
    { label: 'Achievements', href: '/achievements' },
    { label: 'Courses', href: '/courses' },
    { label: 'Dashboard', href: '/my_dashboard' },
  ],
  resources: [
    { label: 'Problem Tracker', href: '#' },
    { label: 'Reports', href: '#' },
    { label: 'Reminders', href: '#' },
    { label: 'Live Share', href: '#' },
  ],
  community: [
    { label: 'About Us', href: '#about' },
    { label: 'Alumni', href: '/alumni' },
    { label: 'Contact', href: 'mailto:club@example.com' },
  ],
}

export default function Footer() {
  return (
    <footer className="relative w-full mt-32 border-t border-border/60 bg-background/70 backdrop-blur-md">
      <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(circle_at_50%_0%,black,transparent_70%)] bg-gradient-to-b from-primary/10 via-background to-background" />
      <div className="relative mx-auto max-w-7xl px-6 py-16 grid gap-12 md:grid-cols-4">
        <div className="flex flex-col gap-4">
          <MccLogo w={120} h={120} />
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Empowering programmers through contests, collaboration & continuous learning.
          </p>
          <div className="flex gap-3 mt-2">
            <a href="https://github.com/mistcomputerclub" aria-label="GitHub" className="p-2 rounded-md border border-border/60 hover:bg-primary/10 transition-colors"><Github className="h-4 w-4" /></a>
            <a href="mailto:computerclubmist@gmail.com" aria-label="Email" className="p-2 rounded-md border border-border/60 hover:bg-primary/10 transition-colors"><Mail className="h-4 w-4" /></a>
            <a href="https://www.linkedin.com/company/mistcomputerclub" aria-label="LinkedIn" className="p-2 rounded-md border border-border/60 hover:bg-primary/10 transition-colors"><Linkedin className="h-4 w-4" /></a>
            <a href="https://discord.gg/NXnnA4aNqU" aria-label="Discord" className="p-2 rounded-md border border-border/60 hover:bg-primary/10 transition-colors"><MessageSquare className="h-4 w-4" /></a>
          </div>
        </div>

        {Object.entries(links).map(([section, items]) => (
          <div key={section} className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{section}</h3>
            <ul className="space-y-2">
              {items.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="relative border-t border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-6 text-[11px] md:text-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-muted-foreground">© {new Date().getFullYear()} MIST Computer Club. All rights reserved.</span>
          <div className="flex gap-4 text-muted-foreground/70">
            <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="#" className="hover:text-primary transition-colors">Code of Conduct</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
