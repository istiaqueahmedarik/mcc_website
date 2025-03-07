"use client";
import { useEffect, useState } from "react"

export default function CountdownTimer({
  targetTime
}) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetTime - Date.now()

      if (difference <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        }
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer);
  }, [targetTime])

  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      <div className="flex flex-col">
        <div className="text-xl font-bold text-red-600">{timeLeft.days}</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">Days</div>
      </div>
      <div className="flex flex-col">
        <div className="text-xl font-bold text-red-600">{timeLeft.hours}</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">Hours</div>
      </div>
      <div className="flex flex-col">
        <div className="text-xl font-bold text-red-600">{timeLeft.minutes}</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">Minutes</div>
      </div>
      <div className="flex flex-col">
        <div className="text-xl font-bold text-red-600">{timeLeft.seconds}</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">Seconds</div>
      </div>
    </div>
  );
}

