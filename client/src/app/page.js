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
import {
  TextRevealCard,
  TextRevealCardTitle,
} from '@/components/ui/text-reveal-card'
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

  return (
    <main className="scroll-smooth w-full flex flex-col gap-12 justify-center items-center overflow-x-hidden bg-background">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />
      <div className="p-12 w-full flex justify-center items-center">
        <div className="flex justify-center items-center flex-col max-w-96 gap-10">
          <TextGenerateEffect
            className="uppercase text-center text-2xl md:text-5xl"
            words="Hello Programmer, Welcome To"
          />

          <MccLogo
            classes="animate-appear max-sm:w-80"
            w={400}
            h={400}
          />

          <div className="flex sm:flex-row gap-4 line-clamp-1">
            <MagicButton
              title="Join Now"
              position="right"
              icon={<MoveRight />}
              otherClasses="hover:bg-muted  hover:text-primary"
            />
            <MagicButton
              title="Learn More"
              otherClasses="hover:bg-muted hover:text-primary"
            />
          </div>
        </div>
      </div>

      <div className="w-[90vw] max-w-7xl flex flex-col justify-center ">
        <div>
          <h1 className="font-mono uppercase text-2xl sm:text-4xl font-bold tracking-wider">
            Upcoming Events
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row w-full gap-4 ">
          <div className="flex-grow m-4">
            <Card className="bg-transparent">
              <CardHeader>
                <CardTitle className="text-card-foreground">Event 1</CardTitle>
                <CardDescription>Great event will occur</CardDescription>
              </CardHeader>
              <CardContent className="text-card-foreground">
                <p>
                  The event The event The event The event The event The event
                  The event The event The event The event The event The event
                  The event The event The event The event The event The event
                  The event The event The event The event The event{' '}
                </p>
              </CardContent>
              <CardFooter className="w-full flex justify-end ">
                <Button>See Event</Button>
              </CardFooter>
            </Card>
          </div>
          <div className="m-4 flex flex-col w-fit">
            <div className="px-4 border-l-2 text-nowrap nowrap hover:border-l-2 hover:border-yellowCus1-foreground text-2xl hover:text-yellowCus1-foreground">
              Event 1
            </div>
            <div className="px-4 border-l-2  hover:border-l-2 hover:border-yellowCus1-foreground  hover:text-yellowCus1-foreground">
              Event 1
            </div>
            <div className="px-4 border-l-2 hover:border-l-2 hover:border-yellowCus1-foreground  hover:text-yellowCus1-foreground">
              Event 1
            </div>
            <div className="px-4 border-l-2 hover:border-l-2 hover:border-yellowCus1-foreground  hover:text-yellowCus1-foreground">
              Event 1
            </div>
            <div className="px-4 border-l-2 hover:border-l-2 hover:border-yellowCus1-foreground  hover:text-yellowCus1-foreground">
              Event 1
            </div>
            <div className="px-4 border-l-2 hover:border-l-2 hover:border-yellowCus1-foreground  hover:text-yellowCus1-foreground">
              Event 1
            </div>
            <div className="px-4 border-l-2 hover:border-l-2 hover:border-yellowCus1-foreground  hover:text-yellowCus1-foreground">
              Event 1
            </div>
            <div className="px-4 border-l-2 hover:border-l-2 hover:border-yellowCus1-foreground  hover:text-yellowCus1-foreground">
              Event 1
            </div>

            <Button className="w-full m-4">See All</Button>
          </div>
        </div>
      </div>

      <div className="w-[90vw] max-w-7xl flex flex-col gap-4 justify-center min-h-[40vw]">
        <div>
          <h1 className="font-mono uppercase text-2xl sm:text-4xl font-bold tracking-wider">
            What We Offer
          </h1>
        </div>
        <div className="flex flex-wrap sm:items-center sm:flex-row flex-col max-sm:gap-4 sm:justify-between justify-center">
          <MagicButton2
            title="Problem Tracker"
            otherClasses="sm:text-2xl dark:text-primary hover:text-yellowCus1 dark:hover:text-yellowCus1-foreground"
            position="left"
            icon={<AudioWaveform />}
          />
          <MagicButton2
            title="Problem Bank"
            position="left"
            otherClasses="sm:text-2xl dark:text-primary hover:text-yellowCus1 dark:hover:text-yellowCus1-foreground"
            icon={<Landmark />}
          />
          <MagicButton2
            title="Class Videos"
            otherClasses="sm:text-2xl dark:text-primary hover:text-yellowCus1 dark:hover:text-yellowCus1-foreground"
            position="left"
            icon={<Tv />}
          />
          <MagicButton2
            title="Standing"
            position="left"
            otherClasses="sm:text-2xl dark:text-primary hover:text-yellowCus1 dark:hover:text-yellowCus1-foreground"
            icon={<Anvil />}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="sm:w-2/3">
            <Card className="bg-transparent">
              <CardHeader>
                <CardTitle className="text-card-foreground">Event 1</CardTitle>
                <CardDescription>Great event will occur</CardDescription>
              </CardHeader>
              <CardContent className="text-card-foreground">
                <p>
                  The event The event The event The event The event The event
                  The event The event The event The event The event The event
                  The event The event The event The event The event The event
                  The event The event The event The event The event{' '}
                </p>
              </CardContent>
              <CardFooter className="w-full flex justify-end ">
                <Button>See Event</Button>
              </CardFooter>
            </Card>
          </div>
          <div className="">
            <Card className="bg-transparent">
              <CardHeader>
                <CardTitle className="text-card-foreground">Event 1</CardTitle>
                <CardDescription>Great event will occur</CardDescription>
              </CardHeader>
              <CardContent className="text-card-foreground">
                <p>
                  The event The event The event The event The event The event
                  The event The event The event The event The event The event
                  The event The event The event The event The event The event
                  The event The event The event The event The event{' '}
                </p>
              </CardContent>
              <CardFooter className="w-full flex justify-end ">
                <Button>See Event</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>

      <div className="w-[90vw] max-w-7xl flex flex-col gap-4 justify-center">
        <div>
          <h1 className="font-mono uppercase text-2xl sm:text-4xl font-bold tracking-wider">
            Our Achievements
          </h1>
        </div>

        <div className="flex flex-col items-center">
          <InfiniteMovingCards
            items={testimonials}
            direction="right"
            speed="slow"
          />
        </div>
      </div>

      <div className="flex items-center justify-center  h-[40rem] w-full">
        <TextRevealCard
          text="MIST Computer Club"
          revealText="MIST Computer Club"
        >
          <TextRevealCardTitle>
            Be a part of something bigger!
          </TextRevealCardTitle>
        </TextRevealCard>
      </div>
    </main>
  )
}
