"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export default function SubmissionChart({
  data
}) {
  // Add a safety check for data
  if (!data || data.length === 0) {
    return (
      <div className="h-[350px] w-full flex items-center justify-center">
        <p className="text-muted-foreground">No submission data available</p>
      </div>
    );
  }

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip
            formatter={(value, name) => {
              if (name === "personalCount") return [`${value} submissions`, "Personal"]
              if (name === "contestCount") return [`${value} submissions`, "Contest"]
              return [value, name]
            }} />
          <Legend
            formatter={(value) => {
              if (value === "personalCount") return "Personal Submissions"
              if (value === "contestCount") return "Contest Submissions"
              return value
            }} />
          <Bar
            dataKey="personalCount"
            name="personalCount"
            fill="#4f46e5"
            radius={[4, 4, 0, 0]} />
          <Bar
            dataKey="contestCount"
            name="contestCount"
            fill="#10b981"
            radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

