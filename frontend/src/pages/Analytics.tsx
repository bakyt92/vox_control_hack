import { BarChart3, Users, MessageSquare, TrendingUp, Clock } from "lucide-react";

// Mock analytics data
const stats = [
  {
    title: "Total Conversations",
    value: "1,234",
    change: "+12.5%",
    trend: "up",
    icon: MessageSquare,
  },
  {
    title: "Active Users",
    value: "89",
    change: "+5.2%",
    trend: "up",
    icon: Users,
  },
  {
    title: "Avg. Session Duration",
    value: "4m 32s",
    change: "-8.3%",
    trend: "down",
    icon: Clock,
  },
  {
    title: "Success Rate",
    value: "94.2%",
    change: "+2.1%",
    trend: "up",
    icon: TrendingUp,
  },
];

const recentConversations = [
  { id: "1", agent: "Maya", user: "John D.", duration: "5m 12s", status: "completed" },
  { id: "2", agent: "Maya", user: "Sarah M.", duration: "3m 45s", status: "completed" },
  { id: "3", agent: "Alex", user: "Mike R.", duration: "8m 30s", status: "in-progress" },
  { id: "4", agent: "Maya", user: "Emma L.", duration: "2m 18s", status: "completed" },
];

export default function Analytics() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Track your agent performance and user engagement
        </p>
      </div>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="rounded-lg border border-border bg-card p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <stat.icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{stat.title}</span>
                </div>
                <span
                  className={`text-xs font-medium ${
                    stat.trend === "up" ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Recent Conversations Table */}
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border/30 px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Recent Conversations</h2>
          </div>
          <div className="divide-y divide-border/30">
            {recentConversations.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{conv.user}</p>
                    <p className="text-xs text-muted-foreground">Agent: {conv.agent}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">{conv.duration}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      conv.status === "completed"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {conv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Placeholder for charts */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Conversation Volume</h2>
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Chart visualization would go here
          </div>
        </div>
    </div>
  );
}
