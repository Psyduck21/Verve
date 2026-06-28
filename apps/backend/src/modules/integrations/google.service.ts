import { google } from 'googleapis'
import { db } from '../../lib/db'
import { tasks, calendarSyncState, routines, taskExternalMetadata } from '@verve/db'
import { eq, and } from '@verve/db'
import { TasksService } from '../tasks/tasks.service'

export async function syncGoogleCalendar(userId: string, oauthClient: any) {
  const syncState = await db.query.calendarSyncState.findFirst({
    where: (cs, { eq, and }) => and(
      eq(cs.user_id, userId),
      eq(cs.provider, 'google')
    )
  })

  let syncRoutineId = (await db.query.routines.findFirst({
    where: (r, { eq, and }) => and(eq(r.user_id, userId), eq(r.title, 'Calendar Sync')),
  }))?.id
  if (!syncRoutineId) {
    const [newRoutine] = await db
      .insert(routines)
      .values({
        user_id: userId,
        title: 'Calendar Sync',
        goal: 'Imported events from external calendars',
        is_active: true,
        sort_order: -2,
      })
      .returning({ id: routines.id })
    syncRoutineId = newRoutine.id
  }

  const calendar = google.calendar({ version: 'v3', auth: oauthClient })
  
  let pageToken = undefined
  let nextSyncToken = undefined
  let allEvents: any[] = []

  try {
    do {
      const response = await calendar.events.list({
        calendarId: 'primary',
        singleEvents: true,
        maxResults: 2500,
        syncToken: syncState?.sync_token || undefined,
        pageToken,
        ...( !syncState?.sync_token ? { timeMin: new Date().toISOString() } : {} )
      })

      if (response.data.items) {
        allEvents = allEvents.concat(response.data.items)
      }
      pageToken = response.data.nextPageToken as string | undefined
      nextSyncToken = response.data.nextSyncToken as string | undefined
    } while (pageToken)

    for (const event of allEvents) {
      const existingMeta = await db.query.taskExternalMetadata.findFirst({
        where: (m, { eq, and }) => and(
          eq(m.user_id, userId),
          eq(m.external_id, event.id),
          eq(m.external_provider, 'google_calendar')
        )
      })

      if (event.status === 'cancelled') {
        if (existingMeta) {
          await TasksService.deleteTask(userId, existingMeta.task_id)
        }
      } else {
        const start = event.start?.dateTime || event.start?.date
        const end = event.end?.dateTime || event.end?.date
        
        if (!start) continue

        const startObj = new Date(start)
        
        let durationMins = 30
        if (start && end) {
          const startMs = new Date(start).getTime()
          const endMs = new Date(end).getTime()
          durationMins = Math.round((endMs - startMs) / 60000)
        }

        if (existingMeta) {
          await TasksService.updateTask(userId, existingMeta.task_id, {
            title: event.summary || 'Busy',
            scheduled_at: startObj,
            estimated_duration_minutes: durationMins,
            is_time_locked: true,
            external_link: event.htmlLink,
          })
        } else {
          await TasksService.createTask(userId, {
            routine_id: syncRoutineId,
            title: event.summary || 'Busy',
            priority: 'medium',
            status: 'not_started',
            scheduled_at: startObj,
            estimated_duration_minutes: durationMins,
            is_time_locked: true,
            external_provider: 'google_calendar',
            external_id: event.id,
            external_link: event.htmlLink,
            source_metadata: { location: event.location, attendees: event.attendees },
          })
        }
      }
    }

    if (nextSyncToken) {
      if (syncState) {
        await db.update(calendarSyncState).set({
          sync_token: nextSyncToken,
          last_synced_at: new Date()
        }).where(eq(calendarSyncState.id, syncState.id))
      } else {
        await db.insert(calendarSyncState).values({
          user_id: userId,
          provider: 'google',
          sync_token: nextSyncToken,
          last_synced_at: new Date()
        })
      }
    }

  } catch (error: any) {
    if (error.code === 410) {
      if (syncState) {
        await db.update(calendarSyncState).set({ sync_token: null }).where(eq(calendarSyncState.id, syncState.id))
      }
      await syncGoogleCalendar(userId, oauthClient)
    } else {
      throw error
    }
  }
}
