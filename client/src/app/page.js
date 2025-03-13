'use client'

import AchievementPage from '@/components/achievements/AchievmentPage'
import MccLogo from '@/components/IconChanger/MccLogo'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { InfiniteMovingCards } from '@/components/ui/InfiniteMovingCard'
import MagicButton from '@/components/ui/MagicButton'
import MagicButton2 from '@/components/ui/MagicButton2'
import { Spotlight } from '@/components/ui/Spotlight'

import { TextRevealCard, TextRevealCardTitle } from '@/components/ui/text-reveal-card'

import { TextGenerateEffect } from '@/components/ui/TextGenEffect'
import { Anvil, AudioWaveform, Landmark, MoveRight, Tv } from 'lucide-react'

export default function Home() {
  const testimonials = [
    {

      quote:
        "Collaborating with Adrian was an absolute pleasure. His professionalism, promptness, and dedication to delivering exceptional results were evident throughout our project. Adrian's enthusiasm for every facet of development truly stands out. If you're seeking to elevate your website and elevate your brand, Adrian is the ideal partner.",
      name: 'Michael Johnson',
      title: 'Director of AlphaStream Technologies',
    },
    {
      quote:
        "Collaborating with Adrian was an absolute pleasure. His professionalism, promptness, and dedication to delivering exceptional results were evident throughout our project. Adrian's enthusiasm for every facet of development truly stands out. If you're seeking to elevate your website and elevate your brand, Adrian is the ideal partner.",
      name: 'Michael Johnson',
      title: 'Director of AlphaStream Technologies',
    },
    {
      quote:
        "Collaborating with Adrian was an absolute pleasure. His professionalism, promptness, and dedication to delivering exceptional results were evident throughout our project. Adrian's enthusiasm for every facet of development truly stands out. If you're seeking to elevate your website and elevate your brand, Adrian is the ideal partner.",
      name: 'Michael Johnson',
      title: 'Director of AlphaStream Technologies',
    },
    {
      quote:
        "Collaborating with Adrian was an absolute pleasure. His professionalism, promptness, and dedication to delivering exceptional results were evident throughout our project. Adrian's enthusiasm for every facet of development truly stands out. If you're seeking to elevate your website and elevate your brand, Adrian is the ideal partner.",
      name: 'Michael Johnson',
      title: 'Director of AlphaStream Technologies',
    },
    {
      quote:
        "Collaborating with Adrian was an absolute pleasure. His professionalism, promptness, and dedication to delivering exceptional results were evident throughout our project. Adrian's enthusiasm for every facet of development truly stands out. If you're seeking to elevate your website and elevate your brand, Adrian is the ideal partner.",
      name: 'Michael Johnson',
      title: 'Director of AlphaStream Technologies',
    },
  ]

    

  const events = [
    { id: 1, title: "Hackathon 2024", description: "Annual coding competition" },
    { id: 2, title: "Test Test", description: "Test Test Test Test" },
    { id: 3, title: "Test Test Test", description: "Test Test Test Test" },
    { id: 4, title: "Test Test Test", description: "Test Test Test" },
    { id: 5, title: "Test Test", description: "Test Test Test Test" },
  ];


  return (
    <main className="scroll-smooth w-full flex flex-col gap-16 justify-center items-center overflow-x-hidden bg-background">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />


      <section className="min-h-screen w-full flex justify-center items-center px-4">
        <div className="flex justify-center items-center flex-col max-w-2xl gap-10 text-center">

          <TextGenerateEffect
            className="uppercase text-3xl md:text-5xl font-bold"
            words="Hello Programmer, Welcome To"
          />

          <MccLogo
            classes="animate-appear"
            w={300}
            h={300}
          />
          <div className="flex flex-col sm:flex-row gap-4">

            <MagicButton
              title="Join Now"
              position="right"
              icon={<MoveRight className="ml-2" />}
              otherClasses="hover:bg-primary hover:text-primary-foreground"
            />
            <MagicButton
              title="Learn More"
              otherClasses="hover:bg-secondary hover:text-secondary-foreground"
            />
          </div>
        </div>
      </section>


      {/* <section className="w-full max-w-7xl px-4 py-16 bg-secondary/10 rounded-lg">
        <h2 className="uppercase text-3xl md:text-4xl font-bold tracking-wider mb-8 text-center">
          Upcoming Events
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-background/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{events[0].title}</CardTitle>
              <CardDescription>{events[0].description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test 
              </p>
            </CardContent>
            <CardFooter className="justify-end">
              <Button>Learn More</Button>
            </CardFooter>
          </Card>
          <div className="space-y-4">
            {events.slice(1).map((event) => (
              <div key={event.id} className="group">
                <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                  {event.title}
                </h3>
                <p className="text-sm text-muted-foreground">{event.description}</p>
              </div>
            ))}
            <Button className="w-full mt-4">See All Events</Button>

          </div>
        </div>
      </section> */}

      <section className="w-full max-w-7xl px-4 py-16">
        <h2 className="uppercase text-3xl md:text-4xl font-bold tracking-wider mb-8 text-center">
          What We Offer
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <MagicButton2
            title="Problem Tracker"
            otherClasses="text-xl md:text-xl hover:text-primary"
            position="left"
            icon={<AudioWaveform className="mr-2" />}
          />
          <MagicButton2
            title="Problem Bank"
            position="left"
            otherClasses="text-xl md:text-2xl hover:text-primary"
            icon={<Landmark className="mr-2" />}
          />
          <MagicButton2
            title="Class Videos"
            otherClasses="text-xl md:text-2xl hover:text-primary"
            position="left"
            icon={<Tv className="mr-2" />}
          />
          <MagicButton2
            title="Standing"
            position="left"
            otherClasses="text-xl md:text-2xl hover:text-primary"
            icon={<Anvil className="mr-2" />}
          />
        </div>

        {/* <div className="grid md:grid-cols-3 gap-8">
          <Card className="md:col-span-2 bg-background/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Test Test Test</CardTitle>
              <CardDescription>Test Test Test Test Test Test Test </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test 
              </p>
            </CardContent>
            <CardFooter className="justify-end">
              <Button>Explore Resources</Button>
            </CardFooter>
          </Card>
          <Card className="bg-background/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Community Support</CardTitle>
              <CardDescription>Learn together, grow together</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test 
              </p>
            </CardContent>
            <CardFooter className="justify-end">
              <Button>Join Community</Button>
            </CardFooter>
          </Card>

        </div> */}
      </section>


      <section className="w-full max-w-7xl px-4 py-16 bg-primary/5">
        <h2 className="uppercase text-3xl md:text-4xl font-bold tracking-wider mb-8 text-center">
          Our Achievements
        </h2>
        <div className="flex flex-col items-center">
          <AchievementPage/>
          {/* <InfiniteMovingCards
            items={testimonials}
            direction="right"
            speed="slow"
          /> */}
        </div>

      </section>

      <section className="flex items-center justify-center h-[40rem] w-full bg-gradient-to-b from-background to-secondary/20">
        <TextRevealCard
          text="MIST Computer Club"
          revealText="Join Us Today!"

        >
          <TextRevealCardTitle>
            Be a part of something bigger!
          </TextRevealCardTitle>
        </TextRevealCard>

      </section>

    </main>
  )
}