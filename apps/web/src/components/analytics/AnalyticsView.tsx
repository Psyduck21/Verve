"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, Clock, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/utils/apiClient"

// STATIC DATA FOR THE OTHER CHARTS UNTIL WE IMPLEMENT THEM
const FOCUS_DATA = [
    { name: "8am", hours: 0 },
    { name: "10am", hours: 2 },
    { name: "12pm", hours: 1 },
    { name: "2pm", hours: 3 },
    { name: "4pm", hours: 1.5 },
    { name: "6pm", hours: 0.5 },
]

const CATEGORY_DATA = [
    { name: "Work", value: 45, color: "hsl(var(--primary))" },
    { name: "Personal", value: 25, color: "#60a5fa" },
    { name: "Health", value: 10, color: "#34d399" },
    { name: "Learning", value: 20, color: "#a855f7" },
]

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-popover border border-border p-3 rounded-xl shadow-lg backdrop-blur-md">
                <p className="text-sm font-medium text-foreground mb-1">{label}</p>
                {payload.map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
                        <span className="text-muted-foreground capitalize">{p.name}:</span>
                        <span className="font-bold text-foreground">{p.value}</span>
                    </div>
                ))}
            </div>
        )
    }
    return null
}

export default function AnalyticsView() {
    const { data: weeklyReportData, isLoading } = useQuery({
        queryKey: ['weeklyInsights'],
        queryFn: apiClient.analytics.getWeeklyInsights
    })

    const WEEKLY_DATA = weeklyReportData?.data?.weekly_tasks || [
        { name: "Mon", tasks: 0 },
        { name: "Tue", tasks: 0 },
        { name: "Wed", tasks: 0 },
        { name: "Thu", tasks: 0 },
        { name: "Fri", tasks: 0 },
        { name: "Sat", tasks: 0 },
        { name: "Sun", tasks: 0 },
    ]

    const totalCompleted = WEEKLY_DATA.reduce((sum: number, day: any) => sum + day.tasks, 0)

    return (
        <div className="flex flex-col h-full w-full bg-transparent overflow-y-auto" data-purpose="analytics-page">
            <div className="flex-1 bg-card rounded-tl-[32px] border-t border-border overflow-hidden">
                <div className="p-8 pb-32">
                
                {/* Header Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-island relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle2 className="w-16 h-16" /></div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Total Tasks Completed</p>
                        <h4 className="text-3xl font-bold text-foreground">{totalCompleted}</h4>
                        <div className="mt-4 flex items-center gap-2 text-xs">
                            <span className="flex items-center text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium"><TrendingUp className="w-3 h-3 mr-1" /> +12%</span>
                            <span className="text-muted-foreground">vs last week</span>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-island relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Clock className="w-16 h-16" /></div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Focus Hours</p>
                        <h4 className="text-3xl font-bold text-foreground">32.5h</h4>
                        <div className="mt-4 flex items-center gap-2 text-xs">
                            <span className="flex items-center text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium"><TrendingUp className="w-3 h-3 mr-1" /> +4.2h</span>
                            <span className="text-muted-foreground">vs last week</span>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-island relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-orange-500"><TrendingUp className="w-16 h-16" /></div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Current Streak</p>
                        <h4 className="text-3xl font-bold text-foreground">5 Days</h4>
                        <div className="mt-4 flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Personal best: 12 days</span>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-island relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-500"><CalendarIcon className="w-16 h-16" /></div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Completion Rate</p>
                        <h4 className="text-3xl font-bold text-foreground">84%</h4>
                        <div className="mt-4 flex items-center gap-2 text-xs">
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-[84%] rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Weekly Tasks Bar Chart */}
                    <div
                        className="bg-card/50 backdrop-blur-xl border border-border/50 p-6 rounded-2xl shadow-island relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transition-opacity duration-500 opacity-50 group-hover:opacity-100" />
                        <h3 className="text-[13px] font-bold tracking-wider uppercase text-muted-foreground mb-6">Tasks Completed</h3>
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={WEEKLY_DATA} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.3)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                                    <Tooltip cursor={{ fill: "hsl(var(--muted)/0.2)" }} content={<CustomTooltip />} />
                                    <Bar dataKey="tasks" fill="url(#colorTasks)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Focus Time Line Chart */}
                    <div
                        className="bg-card/50 backdrop-blur-xl border border-border/50 p-6 rounded-2xl shadow-island relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transition-opacity duration-500 opacity-50 group-hover:opacity-100" />
                        <h3 className="text-[13px] font-bold tracking-wider uppercase text-muted-foreground mb-6">Deep Work (Hours)</h3>
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={FOCUS_DATA} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.3)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="hours" stroke="#a855f7" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6, fill: "#a855f7", stroke: "hsl(var(--card))", strokeWidth: 2 }} fillOpacity={1} fill="url(#colorFocus)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Category Donut Chart */}
                    <div
                        className="bg-card/50 backdrop-blur-xl border border-border/50 p-6 rounded-2xl shadow-island xl:col-span-2 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden"
                    >
                        <div className="flex-1 z-10">
                            <h3 className="text-[13px] font-bold tracking-wider uppercase text-muted-foreground mb-3">Time Allocation</h3>
                            <p className="text-sm text-foreground/80 mb-8 max-w-md leading-relaxed">Your time is well balanced. You spent <span className="text-primary font-semibold">45%</span> of your time on work and maintained a healthy <span className="text-emerald-400 font-semibold">10%</span> for health routines.</p>
                            <div className="grid grid-cols-2 gap-4">
                                {CATEGORY_DATA.map(item => (
                                    <div key={item.name} className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
                                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}` }} />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground font-medium">{item.name}</span>
                                            <span className="text-sm font-bold text-foreground">{item.value}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="h-[280px] w-full md:w-[320px] shrink-0 z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <defs>
                                        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.2" />
                                        </filter>
                                    </defs>
                                    <Pie
                                        data={CATEGORY_DATA}
                                        innerRadius={80}
                                        outerRadius={110}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                        cornerRadius={8}
                                        filter="url(#shadow)"
                                    >
                                        {CATEGORY_DATA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", fontWeight: 500 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
    )
}
