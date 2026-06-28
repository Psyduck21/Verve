import type { FastifyPluginAsync } from 'fastify'
import { db } from '../../lib/db'
import { tasks } from '@verve/db'
import { eq, and, gte, lte, sql, desc } from '@verve/db'

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/ingest',         async (_, r) => r.status(501).send({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Coming in Phase 6' } }))
  
  app.get('/weekly-report', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    
    // Get last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    // Aggregate tasks completed per day
    const completedTasks = await db
      .select({
        day: sql<string>`to_char(${tasks.updated_at}, 'Dy')`,
        date: sql<string>`to_char(${tasks.updated_at}, 'YYYY-MM-DD')`,
        tasks: sql<number>`count(*)::integer`
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.user_id, user.id),
          eq(tasks.status, 'completed'),
          gte(tasks.updated_at, sevenDaysAgo)
        )
      )
      .groupBy(sql`to_char(${tasks.updated_at}, 'Dy'), to_char(${tasks.updated_at}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${tasks.updated_at}, 'YYYY-MM-DD')`)

    // We can also calculate focus hours by summing actual_duration_minutes
    // For now, we format it as WEEKLY_DATA format required by the frontend
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    
    const reportData = daysOfWeek.map(dayName => {
      const found = completedTasks.find(t => t.day === dayName)
      return {
        name: dayName,
        tasks: found ? found.tasks : 0
      }
    })

    return reply.send({ success: true, data: { weekly_tasks: reportData } })
  })

  app.get('/trends', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    
    // Get last 30 days for trend analysis
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    // Tasks completed per day over 30 days
    const dailyTasks = await db
      .select({
        date: sql<string>`to_char(${tasks.updated_at}, 'YYYY-MM-DD')`,
        completed: sql<number>`count(*)::integer`
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.user_id, user.id),
          eq(tasks.status, 'completed'),
          gte(tasks.updated_at, thirtyDaysAgo)
        )
      )
      .groupBy(sql`to_char(${tasks.updated_at}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${tasks.updated_at}, 'YYYY-MM-DD')`)

    // Calculate moving average (7-day)
    const trendData = dailyTasks.map((day, index) => {
      const window = dailyTasks.slice(Math.max(0, index - 6), index + 1)
      const avg = window.reduce((sum, d) => sum + d.completed, 0) / window.length
      return {
        date: day.date,
        completed: day.completed,
        average: Math.round(avg * 10) / 10
      }
    })

    return reply.send({ success: true, data: { trends: trendData } })
  })

  app.get('/heatmap', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    
    // Get last 365 days for heatmap
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    
    // Tasks completed per day
    const dailyActivity = await db
      .select({
        date: sql<string>`to_char(${tasks.updated_at}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::integer`
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.user_id, user.id),
          eq(tasks.status, 'completed'),
          gte(tasks.updated_at, oneYearAgo)
        )
      )
      .groupBy(sql`to_char(${tasks.updated_at}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${tasks.updated_at}, 'YYYY-MM-DD')`)

    // Format as heatmap data (level 0-4 based on count)
    const heatmapData = dailyActivity.map(day => {
      let level = 0
      if (day.count >= 1) level = 1
      if (day.count >= 3) level = 2
      if (day.count >= 5) level = 3
      if (day.count >= 8) level = 4
      
      return {
        date: day.date,
        count: day.count,
        level
      }
    })

    return reply.send({ success: true, data: { heatmap: heatmapData } })
  })

  app.get('/streaks', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    
    // Get all completed tasks ordered by date
    const completedTasks = await db
      .select({
        date: sql<string>`to_char(${tasks.updated_at}, 'YYYY-MM-DD')`
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.user_id, user.id),
          eq(tasks.status, 'completed')
        )
      )
      .orderBy(desc(sql`to_char(${tasks.updated_at}, 'YYYY-MM-DD')`))

    // Calculate current streak
    const uniqueDates = [...new Set(completedTasks.map(t => t.date))]
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    let previousDate: string | null = null

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // Check if streak is still active (completed today or yesterday)
    const streakActive = uniqueDates.includes(today) || uniqueDates.includes(yesterday)

    for (const date of uniqueDates) {
      if (!previousDate) {
        tempStreak = 1
      } else {
        const prev = new Date(previousDate)
        const curr = new Date(date)
        const diffDays = (prev.getTime() - curr.getTime()) / 86400000
        
        if (diffDays === 1) {
          tempStreak++
        } else {
          if (tempStreak > longestStreak) longestStreak = tempStreak
          tempStreak = 1
        }
      }
      previousDate = date
    }
    
    if (tempStreak > longestStreak) longestStreak = tempStreak

    // Calculate current streak from today backwards
    if (streakActive) {
      currentStreak = 1
      for (let i = 1; i < uniqueDates.length; i++) {
        const curr = new Date(uniqueDates[i - 1])
        const prev = new Date(uniqueDates[i])
        const diffDays = (curr.getTime() - prev.getTime()) / 86400000
        
        if (diffDays === 1) {
          currentStreak++
        } else {
          break
        }
      }
    }

    return reply.send({ 
      success: true, 
      data: { 
        current_streak: currentStreak,
        longest_streak: longestStreak,
        streak_active: streakActive
      } 
    })
  })
}
