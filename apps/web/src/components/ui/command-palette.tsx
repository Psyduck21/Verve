// @ts-nocheck
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/utils/apiClient'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './command'
import { Calendar, Settings, Plus, RefreshCcw, Download, LogOut, LayoutDashboard, Sun, Moon, Monitor, Inbox } from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import { KEYBINDINGS } from '@/config/keybindings'
import { isHotkey } from '@/utils/keyboard'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { setTheme } = useTheme()
  const { openModal } = useTaskStore()

  const { data: profileResponse } = useQuery({
      queryKey: ["profile"],
      queryFn: apiClient.users.getProfile
  })

  const userPreferences = profileResponse?.data?.preferences || {}
  const defaultHotkeys = {
      'nav_dashboard': 'g d',
      'nav_inbox': 'g i',
      'nav_calendar': 'g c',
      'nav_tasks': 'g t',
      'nav_settings': 'g s',
      'action_create_task': 'c',
      'action_auto_schedule': 'r',
  }
  const hotkeys = userPreferences.hotkeys || defaultHotkeys
  const disabledCommands = userPreferences.disabled_commands || []

  const keyBuffer = useRef<string[]>([])
  const bufferTimeout = useRef<NodeJS.Timeout | null>(null)

  const isEnabled = (id: string) => !disabledCommands.includes(id)
  const getShortcut = (id: string) => hotkeys[id] || ''

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  const actions = {
    'nav_dashboard': () => router.push('/dashboard'),
    'nav_inbox': () => router.push('/inbox'),
    'nav_calendar': () => router.push('/calendar'),
    'nav_tasks': () => router.push('/tasks'),
    'nav_settings': () => router.push('/settings'),
    'action_create_task': () => openModal('task'),
    'action_auto_schedule': () => window.dispatchEvent(new CustomEvent('ai_reschedule_trigger'))
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
          return
      }

      // Command Palette Trigger — handled by GlobalShortcuts, skip here
      if (isHotkey(e, KEYBINDINGS.GLOBAL.COMMAND_PALETTE)) {
        return
      }

      // Handle Hotkey Sequences
      const key = e.key.toLowerCase()
      const modifiers = []
      if (e.metaKey) modifiers.push('cmd')
      if (e.ctrlKey) modifiers.push('ctrl')
      if (e.altKey) modifiers.push('alt')
      if (e.shiftKey) modifiers.push('shift')
      
      const keyCombo = [...modifiers, key].join('+')
      
      keyBuffer.current.push(keyCombo)
      
      if (bufferTimeout.current) clearTimeout(bufferTimeout.current)
      
      bufferTimeout.current = setTimeout(() => {
          keyBuffer.current = []
      }, 1000) // 1 second to complete a sequence

      const currentSequence = keyBuffer.current.join(' ')

      for (const [id, hotkey] of Object.entries(hotkeys)) {
          if (isEnabled(id) && hotkey === currentSequence) {
              e.preventDefault()
              keyBuffer.current = [] // clear buffer
              if (actions[id as keyof typeof actions]) {
                  actions[id as keyof typeof actions]()
              }
              break
          }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
        document.removeEventListener('keydown', handleKeyDown)
        if (bufferTimeout.current) clearTimeout(bufferTimeout.current)
    }
  }, [hotkeys, disabledCommands, router, setIsTaskModalOpen])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No commands found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          {isEnabled('nav_dashboard') && (
              <CommandItem onSelect={() => runCommand(actions['nav_dashboard'])}>
                <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
                <span>Go to Dashboard</span>
                <CommandShortcut>{getShortcut('nav_dashboard').toUpperCase()}</CommandShortcut>
              </CommandItem>
          )}
          {isEnabled('nav_inbox') && (
              <CommandItem onSelect={() => runCommand(actions['nav_inbox'])}>
                <Inbox className="mr-2 h-4 w-4 text-primary" />
                <span>Go to Inbox</span>
                <CommandShortcut>{getShortcut('nav_inbox').toUpperCase()}</CommandShortcut>
              </CommandItem>
          )}
          {isEnabled('nav_calendar') && (
              <CommandItem onSelect={() => runCommand(actions['nav_calendar'])}>
                <Calendar className="mr-2 h-4 w-4 text-primary" />
                <span>Go to Calendar</span>
                <CommandShortcut>{getShortcut('nav_calendar').toUpperCase()}</CommandShortcut>
              </CommandItem>
          )}
          {isEnabled('nav_tasks') && (
              <CommandItem onSelect={() => runCommand(actions['nav_tasks'])}>
                <Plus className="mr-2 h-4 w-4 text-primary" />
                <span>Go to Tasks</span>
                <CommandShortcut>{getShortcut('nav_tasks').toUpperCase()}</CommandShortcut>
              </CommandItem>
          )}
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Actions">
          {isEnabled('action_create_task') && (
              <CommandItem onSelect={() => runCommand(actions['action_create_task'])}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Create Task</span>
                <CommandShortcut>{getShortcut('action_create_task').toUpperCase()}</CommandShortcut>
              </CommandItem>
          )}
          {isEnabled('action_auto_schedule') && (
              <CommandItem onSelect={() => runCommand(actions['action_auto_schedule'])}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                <span>Auto-Schedule Unplanned Tasks</span>
                <CommandShortcut>{getShortcut('action_auto_schedule').toUpperCase()}</CommandShortcut>
              </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Preferences & Theme">
          <CommandItem onSelect={() => runCommand(() => setTheme('light'))}>
            <Sun className="mr-2 h-4 w-4" />
            <span>Light Mode</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme('dark'))}>
            <Moon className="mr-2 h-4 w-4" />
            <span>Dark Mode</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme('system'))}>
            <Monitor className="mr-2 h-4 w-4" />
            <span>System Theme</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Account">
          <CommandItem onSelect={() => runCommand(() => router.push('/settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => window.open('/api/v1/users/export', '_blank'))}>
            <Download className="mr-2 h-4 w-4" />
            <span>Export My Data</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/api/auth/logout'))}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
            <CommandShortcut>L</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
