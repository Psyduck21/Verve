"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

interface TaskBreakdownChartProps {
    pieData: { name: string; value: number; color: string }[]
    total: number
}

export function TaskBreakdownChart({ pieData, total }: TaskBreakdownChartProps) {
    if (pieData.length === 0) {
        return (
            <p className="text-sm font-medium text-muted-foreground text-center">No data for today.</p>
        )
    }

    return (
        <>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                <span className="text-4xl font-black text-foreground">{total}</span>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Tasks</span>
            </div>
            <div className="w-full h-48 z-10 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={85}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={6}
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                borderRadius: '16px',
                                border: '1px solid hsl(var(--border))',
                                backgroundColor: 'hsl(var(--card) / 0.8)',
                                backdropFilter: 'blur(12px)',
                                boxShadow: '0 8px 32px -8px rgba(0,0,0,0.1)'
                            }}
                            itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </>
    )
}
