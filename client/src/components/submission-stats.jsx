import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, CheckCircle, Code } from "lucide-react"

export default function SubmissionStats({
  stats
}) {
  const getRegularityColor = (status) => {
    switch (status) {
      case "Regular":
        return "bg-green-500"
      case "Needs Monitoring":
        return "bg-yellow-500"
      case "Irregular":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Submission Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Code className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <span className="text-2xl font-bold">{stats.totalSubmissions}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Accepted</span>
            </div>
            <span className="text-xl font-semibold">{stats.acceptedSubmissions}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Submission Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold">{stats.submissionFrequency.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground">submissions per day</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">User Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Last Submission</span>
              </div>
              <span className="text-sm font-medium">{stats.lastSubmissionDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Regularity</span>
              <Badge className={getRegularityColor(stats.regularityStatus)}>{stats.regularityStatus}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

