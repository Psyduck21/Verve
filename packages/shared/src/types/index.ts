export * from './supabase'

import type { Tables } from './supabase'

export type Task = Tables<'tasks'>
export type Routine = Tables<'routines'>
export type User = Tables<'users'>
