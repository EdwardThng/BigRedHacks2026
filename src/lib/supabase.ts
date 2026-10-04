import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Null when env vars are missing, so the game still runs on local storage alone. */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

let userIdPromise: Promise<string | null> | null = null

/** Signs the player in anonymously on first use; the session persists in the browser. */
export function getUserId(): Promise<string | null> {
  if (!supabase) return Promise.resolve(null)
  userIdPromise ??= (async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) return data.session.user.id
    const { data: signIn, error } = await supabase.auth.signInAnonymously()
    if (error) {
      console.warn('Supabase sign-in failed; progress stays on this device.', error.message)
      userIdPromise = null
      return null
    }
    return signIn.user?.id ?? null
  })()
  return userIdPromise
}

export type CatchRow = {
  creature_id: string
  caught_at: string
  lat: number | null
  lng: number | null
  accuracy_m: number | null
}

export async function fetchCatches(): Promise<CatchRow[] | null> {
  const uid = await getUserId()
  if (!supabase || !uid) return null
  const { data, error } = await supabase
    .from('catches')
    .select('creature_id, caught_at, lat, lng, accuracy_m')
    .eq('user_id', uid)
  if (error) {
    console.warn('Could not load catches', error.message)
    return null
  }
  return data
}

export async function saveCatch(row: CatchRow) {
  const uid = await getUserId()
  if (!supabase || !uid) return
  const { error } = await supabase
    .from('catches')
    .upsert({ user_id: uid, ...row }, { onConflict: 'user_id,creature_id', ignoreDuplicates: true })
  if (error) console.warn('Could not save catch', error.message)
}

export async function clearCatches() {
  const uid = await getUserId()
  if (!supabase || !uid) return
  const { error } = await supabase.from('catches').delete().eq('user_id', uid)
  if (error) console.warn('Could not reset catches', error.message)
}

export async function saveVisit(creatureId: string, lat: number, lng: number, accuracy: number | null) {
  const uid = await getUserId()
  if (!supabase || !uid) return
  const { error } = await supabase
    .from('visits')
    .insert({ user_id: uid, creature_id: creatureId, lat, lng, accuracy_m: accuracy })
  if (error) console.warn('Could not save visit', error.message)
}

export async function touchProfile() {
  const uid = await getUserId()
  if (!supabase || !uid) return
  await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', uid)
}
