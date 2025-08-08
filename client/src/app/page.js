'use client'

import React from 'react'
import AchievementPage from '@/components/achievements/AchievmentPage'
import MccLogo from '@/components/IconChanger/MccLogo'
import { Button } from '@/components/ui/button'
import MagicButton from '@/components/ui/MagicButton'
import MagicButton2 from '@/components/ui/MagicButton2'
import { Spotlight } from '@/components/ui/Spotlight'
import { InfiniteMovingCards } from '@/components/ui/InfiniteMovingCard'
import {
  TextRevealCard,
  TextRevealCardTitle,
} from '@/components/ui/TextReveal'
import { TextGenerateEffect } from '@/components/ui/TextGenEffect'
import {
  Anvil,
  AudioWaveform,
  Landmark,
  MoveRight,
  Tv,
} from 'lucide-react'
import Link from 'next/link'
import StatsCounter from '@/components/landing/StatsCounter'

export default function Home() {
  const [cms, setCms] = React.useState(null)
  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_SERVER_URL + '/landing/public', { cache: 'no-store' })
        const json = await res.json()
        if(!json.error) setCms(json)
      } catch(e){console.error(e)}
    }
    load()
  }, [])
  // Fallbacks
  const features = cms?.features || [
    { title: 'Problem Tracker', desc: 'Track practice across platforms with smart streaks & heatmaps.' },
    { title: 'Problem Bank', desc: 'Curated topic wise sets from beginner to advanced.' },
    { title: 'Class Videos', desc: 'Recorded sessions & micro lessons for revision.' },
    { title: 'Standings', desc: 'Real-time contest standings & performance analytics.' },
    { title: 'Live Share', desc: 'Share code & collaborate during virtual practice rooms.' },
    { title: 'Reports', desc: 'Weekly personalized growth reports & recommendations.' },
    { title: 'Achievements', desc: 'Celebrate milestones, badges & inter-club rankings.' },
    { title: 'Reminders', desc: 'Never miss a contest — instant multi-OJ notifications.' },
  ].map(f => ({ title: f.title, description: f.desc }))
  const stats = cms?.stats || [
    { title: 'Active Members', value: 500, suffix: '+' },
    { title: 'Contests Hosted', value: 120, suffix: '+' },
    { title: 'Problems Tracked', value: 8000, suffix: '+' },
    { title: 'National Awards', value: 35, suffix: '+' },
  ]
  const timeline = cms?.timeline || [
    { year: '2016', title: 'Founded', body: 'Started with a handful of passionate problem solvers.' },
    { year: '2018', title: 'First National Finals', body: 'Multiple teams qualify for national ICPC regional level.' },
    { year: '2021', title: 'Platform Launch', body: 'Internal tools evolve into a full learning platform.' },
    { year: '2024', title: 'Scaling Up', body: 'Hundreds of active members & cross‑university collabs.' },
  ]
  const alumni = cms?.alumni || [
    { quote: 'Leadership & Platform Scaling', name: 'Ayesha Rahman', title: 'Former President (2019–2020) • Software Engineer @ Google', image: '/mccLogo.png' },
    { quote: 'Problem Setting & Training', name: 'Mahmudul Hasan', title: 'Former Competitive Programming Lead • SDE @ Amazon', image: '/mccLogo.png' },
    { quote: 'Curriculum & Mentorship', name: 'Farhan Ahmed', title: 'Former Education Coordinator • SWE @ Meta', image: '/mccLogo.png' },
    { quote: 'AI Research & Innovation', name: 'Nusrat Jahan', title: 'Former Core Member • Research Engineer @ Microsoft', image: '/mccLogo.png' },
    { quote: 'Automation & Tooling', name: 'Sakib Chowdhury', title: 'Former Contest Ops • Engineer @ DeepMind', image: '/mccLogo.png' },
  ]

  return (
    <main className="scroll-smooth w-full flex flex-col gap-32 justify-center items-center overflow-x-hidden bg-background">
      <Spotlight
        className="-top-4 md:left-60 md:-top-20"
        fill="white"
      />

      {/* Hero */}
      <section className="relative min-h-[90vh] w-full flex justify-center items-center px-4 pt-20">
        <div className="flex justify-center items-center flex-col max-w-3xl gap-8 text-center">
          <TextGenerateEffect
            className="uppercase text-3xl md:text-5xl font-bold"
            words="Hello Programmer, Welcome To"
          />
          <MccLogo
            classes="animate-appear drop-shadow-xl"
            w={260}
            h={260}
          />
          <p className="text-muted-foreground max-w-xl leading-relaxed text-sm md:text-base">
            A community for algorithms, problem solving & collaborative learning. Compete, learn, build & grow with peers pushing the same limits as you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <MagicButton
              title="Join Now"
              position="right"
              icon={<MoveRight className="ml-2" />}
              otherClasses="hover:bg-primary hover:text-primary-foreground"
            />
            <MagicButton
              title="Explore Platform"
              otherClasses="hover:bg-secondary hover:text-secondary-foreground"
            />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_30%,hsl(var(--secondary))/40%,transparent_70%)]" />
      </section>

      {/* Stats */}
      <section className="w-full max-w-7xl px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <StatsCounter value={stats[0]?.value || 0} suffix={stats[0]?.suffix || ''} title={stats[0]?.title || ''} />
          <StatsCounter value={stats[1]?.value || 0} suffix={stats[1]?.suffix || ''} title={stats[1]?.title || ''} />
          <StatsCounter value={stats[2]?.value || 0} suffix={stats[2]?.suffix || ''} title={stats[2]?.title || ''} />
          <StatsCounter value={stats[3]?.value || 0} suffix={stats[3]?.suffix || ''} title={stats[3]?.title || ''} />
        </div>
      </section>

      {/* Features */}
      <section className="w-full max-w-7xl px-4">
        <h2 className="uppercase text-3xl md:text-4xl font-bold tracking-wider mb-10 text-center">
          What We Offer
        </h2>
        <div className="grid md:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-6 mb-16">
          {features.map((f) => (
            <div key={f.title} className="group relative rounded-xl border border-border/60 p-[1px] bg-gradient-to-br from-primary/10 via-background to-background hover:from-primary/30 transition-colors">
              <div className="h-full rounded-[inherit] p-5 flex flex-col justify-between bg-background/80 backdrop-blur">
                <div>
                  <h3 className="font-semibold text-sm md:text-base tracking-wide mb-2 group-hover:text-primary transition-colors">{f.title}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{f.description || f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Achievements Preview */}
      <section className="w-full max-w-7xl px-4 py-16 bg-primary/5 rounded-2xl">
        <h2 className="uppercase text-3xl md:text-4xl font-bold tracking-wider mb-8 text-center">
          Our Achievements
        </h2>
        <div className="flex flex-col items-center">
          <AchievementPage />
          <Link href="/achievements" className="mt-4">
            <Button>See more</Button>
          </Link>
        </div>
      </section>

      {/* Timeline / About */}
      <section className="w-full max-w-5xl px-4">
        <h2 className="uppercase text-3xl md:text-4xl font-bold tracking-wider mb-10 text-center">
          About The Club
        </h2>
        <div className="relative pl-4 before:content-[''] before:absolute before:left-1 before:top-0 before:bottom-0 before:w-px before:bg-border/60">
          {timeline.map((item, idx) => (
            <div key={item.year + idx} className="relative mb-10 last:mb-0">
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-gradient-to-br from-primary to-highlight shadow ring-2 ring-background" />
              <div className="ml-4 p-4 rounded-lg border bg-card/80 backdrop-blur-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-bold tracking-wider text-primary uppercase">{item.year}</span>
                  <h3 className="font-semibold text-base md:text-lg">{item.title}</h3>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{item.body || item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Alumni */}
      <section className="w-full max-w-7xl px-4">
        <h2 className="uppercase text-3xl md:text-4xl font-bold tracking-wider mb-4 text-center">
          Our Alumni
        </h2>
        <p className="text-center text-sm md:text-base text-muted-foreground max-w-2xl mx-auto mb-8">
          They honed their skills here and now contribute at world‑class companies & research labs. Stay inspired by their journeys.
        </p>
        <InfiniteMovingCards
          items={alumni}
          direction="right"
          speed="slow"
        />
        <div className="flex justify-center mt-6">
          <Link href="/alumni">
            <Button variant="outline">See all Alumni</Button>
          </Link>
        </div>
      </section>


    </main>
  )
}
