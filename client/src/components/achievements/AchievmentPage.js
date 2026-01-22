"use client";
import { getAchievements } from "@/lib/action";
import { useEffect, useState } from "react";
import FeaturedAchievement from '@/components/achievements/featured_achievement';
import MoreAchievements from '@/components/achievements/more_achievements';

export default function AchievementPage() {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [resetKey, setResetKey] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const data = await getAchievements();
        setAchievements(data.slice(0, 12) || []);
        console.log("achi: ", data);
      } catch (error) {
        console.error("Error fetching achievements:", error);
        setAchievements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  useEffect(() => {
    if (achievements.length <= 1) return;
    const timer = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % achievements.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [achievements.length, resetKey]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!Array.isArray(achievements) || achievements.length === 0) {
    return <></>;
  }

  const featuredAchievement = achievements[featuredIndex];

  const resetTimer = () => {
    setResetKey((prev) => !prev);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center gap-10">
      
      <FeaturedAchievement featuredAchievement={featuredAchievement}/>
      <MoreAchievements achievements={achievements} setFeaturedIndex={setFeaturedIndex} featuredIndex={featuredIndex} resetTimer={resetTimer} />
    </div>
  );
}