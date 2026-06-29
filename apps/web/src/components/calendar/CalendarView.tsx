"use client"

import { useState, useEffect, useMemo } from "react"
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from "react-big-calendar"
import { format, parse, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, isWithinInterval, getDay } from "date-fns"
import { enUS } from "date-fns/locale/en-US"
import { ChevronLeft, ChevronRight, PanelRightClose, PanelRightOpen, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react"
import { Icon } from "@/components/ui/Icon"
import { useEvents } from "@/hooks/useEvents"
import { useUpdateTask, useTasks } from "@/hooks/useTasks"
import { TimeblocksPanel } from "@/components/timeblocks/TimeblocksPanel"
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop"
import "react-big-calendar/lib/addons/dragAndDrop/styles.css"
import { UnscheduledTasksPanel, draggedTaskPayload } from "./UnscheduledTasksPanel"
import { EditTaskModal } from "@/components/tasks/EditTaskModal"
import { KEYBINDINGS } from "@/config/keybindings"
import { isHotkey } from "@/utils/keyboard"
import { cn } from "@/lib/utils"
import { apiClient } from "@/utils/apiClient"

const DnDCalendar = withDragAndDrop(BigCalendar)

import "react-big-calendar/lib/css/react-big-calendar.css"
import "./calendar-overrides.css"

const locales = {
    "en-US": enUS,
}

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
})


// Custom Event Block (Premium Styling)
function EventBlock({ event, isFocused }: { event: any, isFocused?: boolean }) {
    const task = event.task || {}
    const priority = task.priority || "low"
    const category = task.category || "work"

    const PRIORITY_BORDER_COLORS: Record<string, string> = {
        critical: "border-l-destructive",
        high:     "border-l-status-review",
        medium:   "border-l-status-progress",
        low:      "border-l-muted-foreground",
    }

    const CATEGORY_BG_COLORS: Record<string, string> = {
        work:     "bg-tag-work-bg text-tag-work-text",
        personal: "bg-tag-personal-bg text-tag-personal-text",
        health:   "bg-tag-health-bg text-tag-health-text",
        learning: "bg-tag-learning-bg text-tag-learning-text",
    }

    const containerClass = cn(
        category && CATEGORY_BG_COLORS[category as keyof typeof CATEGORY_BG_COLORS] ? CATEGORY_BG_COLORS[category as keyof typeof CATEGORY_BG_COLORS] : "bg-card text-card-foreground",
        priority && PRIORITY_BORDER_COLORS[priority as keyof typeof PRIORITY_BORDER_COLORS] ? PRIORITY_BORDER_COLORS[priority as keyof typeof PRIORITY_BORDER_COLORS] : "border-l-border"
    );

    const startTime = event.start ? format(new Date(event.start), 'hh:mm') : ''
    const endTime = event.end ? format(new Date(event.end), 'hh:mm') : ''

    return (
        <div className={`h-full overflow-hidden w-full px-1.5 py-1 rounded-sm border-l-4 border-r border-y border-r-border border-y-border text-[11px] leading-tight transition-all duration-200 cursor-pointer flex flex-col justify-start items-start ${containerClass} ${isFocused ? '!border-l-black z-50 relative' : 'hover:shadow-md'}`}>
            <span className="font-semibold opacity-90 line-clamp-2 mt-0">
                {startTime}-{endTime} <span className="font-black">{event.title}</span>
            </span>
            {event.description && (
                <span className="text-[9px] font-medium opacity-80 line-clamp-1 mt-0.5">
                    {event.description}
                </span>
            )}
        </div>
    )
}


interface CalendarViewProps {
    selectedDate?: Date
    onSelectedDateChange?: (date: Date) => void
}

export default function CalendarView({ selectedDate, onSelectedDateChange }: CalendarViewProps) {
    const [view, setView] = useState<any>(Views.WEEK)
    const [date, setDate] = useState(() => new Date())
    const [currentTime, setCurrentTime] = useState(() => new Date())
    const [isPanelOpen, setIsPanelOpen] = useState(true)
    const [activeTab, setActiveTab] = useState<'tasks' | 'timeblocks'>('tasks')
    const [selectedTask, setSelectedTask] = useState<any>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [focusedEventId, setFocusedEventId] = useState<string | null>(null)

    const calendarRange = useMemo(() => {
        return {
            start: startOfWeek(date),
            end: endOfWeek(date),
        }
    }, [date])

    const queryParams = useMemo(() => ({
        start_date: calendarRange.start.toISOString(),
        end_date: calendarRange.end.toISOString(),
    }), [calendarRange])

    const { events } = useEvents(queryParams)
    const { data: tasks = [] } = useTasks(queryParams)
    const { mutate: updateTask } = useUpdateTask()


    // Dynamically calculate stats based on current view range
    const stats = useMemo(() => {
        let start, end;
        if (view === Views.DAY) {
            start = startOfDay(date);
            end = endOfDay(date);
        } else if (view === Views.WEEK) {
            start = startOfWeek(date);
            end = endOfWeek(date);
        } else {
            start = startOfMonth(date);
            end = endOfMonth(date);
        }

        const tasksInView = tasks.filter(t => {
            if (!t.scheduled_at) return false;
            return isWithinInterval(new Date(t.scheduled_at), { start, end });
        });

        const totalScheduled = tasksInView.length;
        const completed = tasksInView.filter(t => t.status === "completed").length;
        const missed = tasksInView.filter(t => t.status === "missed" || (t.status !== "completed" && t.scheduled_at && new Date(t.scheduled_at) < new Date())).length;

        const completionRate = totalScheduled > 0 ? Math.round((completed / totalScheduled) * 100) : 0;
        const missedRate = totalScheduled > 0 ? Math.round((missed / totalScheduled) * 100) : 0;

        return {
            totalScheduled,
            completed,
            completionRate,
            missed,
            missedRate
        }
    }, [tasks, view, date]);

    // Real-time indicator string update
    useEffect(() => {
        const updateTime = () => {
            const now = new Date()
            setCurrentTime(now)
            const timeString = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase()
            document.documentElement.style.setProperty('--current-time-string', `"${timeString}"`)
        }
        updateTime()
        const interval = setInterval(updateTime, 60000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (onSelectedDateChange) {
            onSelectedDateChange(date)
        }
    }, [date])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
            if (isEditModalOpen) return // Let modal handle its own keys

            const key = e.key.toLowerCase()
            let startRange, endRange;
            if (view === Views.DAY) {
                startRange = startOfDay(date);
                endRange = endOfDay(date);
            } else if (view === Views.WEEK) {
                startRange = startOfWeek(date);
                endRange = endOfWeek(date);
            } else {
                startRange = startOfMonth(date);
                endRange = endOfMonth(date);
            }

            const visibleEvents = events
                .filter(ev => ev.start && isWithinInterval(new Date(ev.start), { start: startRange, end: endRange }))
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

            if (isHotkey(e, KEYBINDINGS.CALENDAR.NAV_DOWN)) {
                e.preventDefault()
                if (visibleEvents.length === 0) return
                const currentIndex = visibleEvents.findIndex(ev => ev.task?.id === focusedEventId)
                const nextIndex = currentIndex < visibleEvents.length - 1 ? currentIndex + 1 : 0
                setFocusedEventId(visibleEvents[nextIndex].task?.id || null)
            } else if (isHotkey(e, KEYBINDINGS.CALENDAR.NAV_UP)) {
                e.preventDefault()
                if (visibleEvents.length === 0) return
                const currentIndex = visibleEvents.findIndex(ev => ev.task?.id === focusedEventId)
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : visibleEvents.length - 1
                setFocusedEventId(visibleEvents[prevIndex].task?.id || null)
            } else if (isHotkey(e, KEYBINDINGS.CALENDAR.DESELECT)) {
                setFocusedEventId(null)
            } else if (isHotkey(e, KEYBINDINGS.CALENDAR.EDIT_EVENT) && focusedEventId) {
                e.preventDefault()
                const focusedEvent = visibleEvents.find(ev => ev.task?.id === focusedEventId)
                if (focusedEvent) {
                    setSelectedTask(focusedEvent.task)
                    setIsEditModalOpen(true)
                }
            } else if (isHotkey(e, KEYBINDINGS.CALENDAR.UNSCHEDULE) && focusedEventId) {
                e.preventDefault()
                const focusedEvent = visibleEvents.find(ev => ev.task?.id === focusedEventId)
                if (focusedEvent && focusedEvent.task && !focusedEvent.task.is_time_locked) {
                    updateTask({ id: focusedEvent.task.id, scheduled_at: null })
                }
            }

            if (activeTab === 'tasks' && isHotkey(e, ['n'])) {
                e.preventDefault()
                setIsPanelOpen(true)
                setActiveTab('timeblocks')
                window.dispatchEvent(new CustomEvent('create_timeblock_directly'))
                return
            }

            if (isHotkey(e, KEYBINDINGS.CALENDAR.TOGGLE_PANEL)) {
                e.preventDefault()
                setIsPanelOpen(prev => !prev)
            }
            if (isHotkey(e, KEYBINDINGS.CALENDAR.VIEW_DAY)) {
                e.preventDefault()
                setView(Views.DAY)
            }
            if (isHotkey(e, KEYBINDINGS.CALENDAR.VIEW_WEEK)) {
                e.preventDefault()
                setView(Views.WEEK)
            }
            if (isHotkey(e, KEYBINDINGS.CALENDAR.VIEW_MONTH)) {
                e.preventDefault()
                setView(Views.MONTH)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [view, date, events, focusedEventId, isEditModalOpen, activeTab])

    // Listen for timeblock modal event and open panel + switch tab
    useEffect(() => {
        const handleOpenTimeblockModal = () => {
            setIsPanelOpen(true)
            setActiveTab('timeblocks')
        }
        window.addEventListener('open_timeblock_modal', handleOpenTimeblockModal)
        return () => window.removeEventListener('open_timeblock_modal', handleOpenTimeblockModal)
    }, [])

    const CustomWeekHeader = useMemo(() => {
        return ({ date, label }: any) => {
            const dayEvents = events.filter((e: any) => {
                if (!e.start) return false
                const eDate = new Date(e.start)
                return eDate.getDate() === date.getDate() &&
                    eDate.getMonth() === date.getMonth() &&
                    eDate.getFullYear() === date.getFullYear()
            })
            return (
                <div className="flex items-center gap-3 py-1 justify-center">
                    <span className="font-bold text-2xl text-foreground">{format(date, 'd')}</span>
                    <div className="flex flex-col items-start justify-center">
                        <span className="font-bold text-xs uppercase leading-none mb-1 text-foreground">{format(date, 'EEE')}</span>
                        <span className="text-[10px] font-bold text-muted-foreground leading-none">{dayEvents.length} tasks</span>
                    </div>
                </div>
            )
        }
    }, [events])

    // Custom toolbar functions
    const goToBack = () => {
        const newDate = new Date(date)
        if (view === Views.MONTH) newDate.setMonth(newDate.getMonth() - 1)
        else if (view === Views.WEEK) newDate.setDate(newDate.getDate() - 7)
        else newDate.setDate(newDate.getDate() - 1)
        setDate(newDate)
    }
    const goToNext = () => {
        const newDate = new Date(date)
        if (view === Views.MONTH) newDate.setMonth(newDate.getMonth() + 1)
        else if (view === Views.WEEK) newDate.setDate(newDate.getDate() + 7)
        else newDate.setDate(newDate.getDate() + 1)
        setDate(newDate)
    }
    const goToCurrent = () => setDate(new Date())

    const slotPropGetter = (date: Date) => {
        const hour = date.getHours()
        // Non-working hours: before 9 AM or after 5 PM
        if (hour < 9 || hour >= 17) {
            return {
                className: 'non-working-hour'
            }
        }
        return {}
    }

    const dayPropGetter = (date: Date): any => {
        // Find which column this day is (0-6 in week view, 0 in day view)
        const colIndex = view === Views.WEEK ? date.getDay() : 0;
        return {
            style: {
                '--col-index': colIndex
            } as any
        }
    }

    // Set calendar start time to 9 AM (work time)
    const minTime = new Date()
    minTime.setHours(9, 0, 0, 0)

    // Set calendar max time (e.g. 8 PM)
    const maxTime = new Date()
    maxTime.setHours(20, 0, 0, 0)

    const onEventDrop = ({ event, start, end }: any) => {
        const taskId = event.task?.id
        if (!taskId) return
        
        // Skip optimistic UI and drag action for time-locked tasks
        if (event.task?.is_time_locked) return

        const durationMins = Math.round((end.getTime() - start.getTime()) / 60000)

        updateTask({
            id: taskId,
            scheduled_at: start.toISOString(),
            estimated_duration_minutes: durationMins
        })
    }

    const onEventResize = ({ event, start, end }: any) => {
        const taskId = event.task?.id
        if (!taskId) return

        // Skip optimistic UI and resize action for time-locked tasks
        if (event.task?.is_time_locked) return

        const durationMins = Math.round((end.getTime() - start.getTime()) / 60000)

        updateTask({
            id: taskId,
            scheduled_at: start.toISOString(),
            estimated_duration_minutes: durationMins
        })
    }

    const onDropFromOutside = ({ start, end, allDay }: any) => {
        if (!draggedTaskPayload) return

        const task = draggedTaskPayload
        const durationMins = task.estimated_duration_minutes || 30

        // If end date is missing (e.g. dropped on month view), we calculate it from duration
        let dropEnd = end
        if (!dropEnd || dropEnd <= start) {
            dropEnd = new Date(start.getTime() + durationMins * 60000)
        }

        updateTask({
            id: task.id,
            scheduled_at: start.toISOString(),
            estimated_duration_minutes: durationMins
        })

        // Reset payload after drop
        // Note: draggedTaskPayload will be overwritten on next drag anyway
    }

    // Required by react-big-calendar to accept external drops
    const dragFromOutsideItem = () => {
        if (!draggedTaskPayload) return {}
        
        return {
            id: draggedTaskPayload.id,
            title: draggedTaskPayload.title,
            task: draggedTaskPayload
        }
    }

    const handleSelectEvent = (event: any) => {
        if (event.task) {
            setSelectedTask(event.task)
            setIsEditModalOpen(true)
        }
    }

    const timeblockDate = selectedDate || date

    return (
        <div className="flex flex-col h-full w-full animate-fade-in-up gap-2">
            {/* Custom Top Toolbar */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                    {/* Today Title & Selected Date */}
                    <div className="flex items-baseline gap-3">
                        <button
                            onClick={goToCurrent}
                            className="text-3xl font-black text-foreground hover:text-primary transition-colors cursor-pointer"
                        >
                            Today
                        </button>
                        <span className="text-lg font-bold text-muted-foreground">
                            {format(date, "MMM d, yyyy")}
                        </span>
                    </div>

                    {/* Date Shift Arrows */}
                    <div className="flex items-center bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                        <button
                            onClick={goToBack}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <Icon icon={ChevronLeft} size="sm" />
                        </button>
                        <div className="w-px h-4 bg-border" />
                        <button
                            onClick={goToNext}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <Icon icon={ChevronRight} size="sm" />
                        </button>
                    </div>

                    {/* View Categories */}
                    <div className="flex bg-muted p-1 rounded-xl border border-border">
                        {[Views.DAY, Views.WEEK, Views.MONTH].map(v => (
                            <button
                                key={v}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg capitalize transition-colors ${view === v
                                    ? "bg-card text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                                    }`}
                                onClick={() => setView(v)}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            {/* Stat Cards Row (Above the Calendar Block) */}
            <div className="grid grid-cols-3 gap-4 shrink-0">
                <div className="bg-card border border-border rounded-xl p-3 flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-muted-foreground">Total Scheduled</span>
                        {stats.totalScheduled > 0 && <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5"><ArrowUpRight size={10} /> Active</span>}
                    </div>
                    <span className="text-2xl font-black mt-2">{stats.totalScheduled}</span>
                </div>
                <div className="bg-card border border-border rounded-xl p-3 flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-muted-foreground">Completed Tasks</span>
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5"><ArrowUpRight size={10} /> {stats.completionRate}%</span>
                    </div>
                    <span className="text-2xl font-black mt-2">{stats.completed}</span>
                </div>
                <div className="bg-card border border-border rounded-xl p-3 flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-muted-foreground">Missed / Overdue</span>
                        <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded flex items-center gap-0.5"><ArrowDownRight size={10} /> {stats.missedRate}%</span>
                    </div>
                    <span className="text-2xl font-black mt-2">{stats.missed}</span>
                </div>
            </div>


            {/* Calendar & Sidebar Row */}
            <div className="flex-1 flex min-h-0 relative gap-4">
                <div className="flex-1 bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col h-full min-w-0 relative">

                    {/* Toggle Button for Sidebar */}
                    <button
                        onClick={() => setIsPanelOpen(!isPanelOpen)}
                        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-card border border-border shadow-md rounded-full p-1.5 text-muted-foreground hover:text-foreground transition-all"
                        title="Toggle side panel"
                    >
                        {isPanelOpen ? <Icon icon={PanelRightClose} size="sm" /> : <Icon icon={PanelRightOpen} size="sm" />}
                    </button>

                    <DnDCalendar
                        localizer={localizer}
                        events={events}
                        startAccessor={(e: any) => new Date(e.start)}
                        endAccessor={(e: any) => new Date(e.end)}
                        getNow={() => currentTime}
                        scrollToTime={new Date(currentTime.getTime() - 4 * 60 * 60 * 1000)}
                        min={minTime}
                        max={maxTime}
                        view={view}
                        date={date}
                        onView={(v: any) => setView(v)}
                        onNavigate={(d: any) => setDate(d)}
                        toolbar={false}
                        components={{
                            event: (props: any) => <EventBlock {...props} isFocused={props.event.task?.id === focusedEventId} />,
                            week: {
                                header: CustomWeekHeader
                            }
                        }}
                        slotPropGetter={slotPropGetter}
                        dayPropGetter={dayPropGetter}
                        className="flex-1 font-sans text-sm calendar-overrides"
                        dayLayoutAlgorithm="no-overlap"
                        resizable
                        onEventDrop={onEventDrop}
                        onEventResize={onEventResize}
                        onDropFromOutside={onDropFromOutside}
                        dragFromOutsideItem={dragFromOutsideItem}
                        onSelectEvent={handleSelectEvent}
                        formats={{
                            dayFormat: 'EEE d' // e.g., "Mon 21"
                        }}
                    />
                </div>

                <div className={cn(
                    "flex flex-col h-full transition-all duration-300 ease-in-out",
                    isPanelOpen ? "w-80 opacity-100" : "w-0 opacity-0 overflow-hidden"
                )}>
                    <div className="h-full bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('tasks')}
                                className={cn(
                                    "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                                    activeTab === 'tasks'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-background text-muted-foreground hover:bg-muted/80'
                                )}
                            >
                                Tasks
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('timeblocks')}
                                className={cn(
                                    "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                                    activeTab === 'timeblocks'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-background text-muted-foreground hover:bg-muted/80'
                                )}
                            >
                                Timeblocks
                            </button>
                        </div>
                        <div className="h-full overflow-hidden">
                            {activeTab === 'tasks' ? (
                                <UnscheduledTasksPanel isOpen={true} onTaskClick={handleSelectEvent} className="h-full" />
                            ) : (
                                <TimeblocksPanel selectedDate={timeblockDate} className="h-full" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <EditTaskModal 
                open={isEditModalOpen} 
                onClose={() => {
                    setIsEditModalOpen(false)
                    setTimeout(() => setSelectedTask(null), 200) // delay cleanup for animation
                }} 
                task={selectedTask} 
            />

        </div>
    )
}
