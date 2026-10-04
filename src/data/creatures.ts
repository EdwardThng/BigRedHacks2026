import type { Form } from '../CreatureArt'

export type Rarity = 'common' | 'rare' | 'ultra'

/** One phase of a multi-try encounter: which form it shows, how many throws it lasts, and the catch chance. */
export type Stage = { form: Form; name: string; tries: number; catchRate: number; tell: string }

export type Creature = {
  id: string
  number: number
  name: string
  type: string
  /** who inspired it: a sponsor, a club or a local spot */
  inspiredBy: string
  /** headline name shown everywhere (the company or club); the creature name is the subtitle */
  brand: string
  rarity: Rarity
  spot: string
  lat: number
  lng: number
  /** catch radius in metres */
  radius: number
  /** wider zone where the creature roams, in metres */
  habitat: number
  /** window when it can appear, 24h local time; end < start wraps past midnight */
  hours: { start: number; end: number; label: string }
  clue: string
  /** short handwritten sighting note for the day map */
  note: string
  lore: string
  palette: { body: string; belly: string; accent: string }
  /** Multi-stage encounter. Without it, a single throw always catches. */
  stages?: Stage[]
}

/** Chance a creature is out during each 20-minute slot of its window. */
export const SPAWN_CHANCE: Record<Rarity, number> = { common: 1, rare: 0.35, ultra: 0.12 }
export const RARITY_LABEL: Record<Rarity, string> = { common: 'Common', rare: 'Rare', ultra: 'Ultra rare' }

// Coordinates from OpenStreetMap. eHub is the Student Agencies Building (409 College Ave).
export const CREATURES: Creature[] = [
  {
    id: 'scryvern',
    brand: 'Palantir',
    number: 1,
    name: 'Scryvern',
    type: 'Oracle',
    inspiredBy: 'Palantir',
    rarity: 'rare',
    spot: 'Malott Hall',
    lat: 42.44819,
    lng: -76.48019,
    radius: 25,
    habitat: 45,
    hours: { start: 21, end: 24, label: '9pm to midnight' },
    clue: 'Where the numbers people work late, something small and dark watches the whole campus through a glowing stone.',
    note: 'saw a glow in the window, late',
    lore: 'Scryvern is a pocket-sized dragon that never lets go of its seeing stone. It can find anything on campus, but it only shows itself to people who stay up late enough to look.',
    palette: { body: '#1d1d26', belly: '#4a4a5a', accent: '#7fe3ff' },
  },
  {
    id: 'boostling',
    brand: 'SpaceX',
    number: 2,
    name: 'Boostling',
    type: 'Launch',
    inspiredBy: 'SpaceX',
    rarity: 'rare',
    spot: 'Engineering Quad',
    lat: 42.44468,
    lng: -76.48369,
    radius: 35,
    habitat: 60,
    hours: { start: 8, end: 11, label: '8 to 11am' },
    clue: 'The quad where bridges are built and problem sets are due. Listen for a countdown before morning lecture.',
    note: 'heard a countdown before 9am',
    lore: 'Boostling practices launches on the Engineering Quad every morning. Most attempts end in a tumble, but it always lands upright and tries again.',
    palette: { body: '#e9edf2', belly: '#ffffff', accent: '#1c2533' },
  },
  {
    id: 'pitchling',
    brand: 'CEC',
    number: 3,
    name: 'Pitchling',
    type: 'Founder',
    inspiredBy: 'Cornell Entrepreneurship Club',
    rarity: 'common',
    spot: 'eHub Collegetown',
    lat: 42.44235,
    lng: -76.48499,
    radius: 25,
    habitat: 40,
    hours: { start: 9, end: 22, label: '9am to 10pm' },
    clue: 'Upstairs on College Ave, where every idea is a startup and every startup has a deck.',
    note: 'tried to pitch me something',
    lore: 'Pitchling lights up whenever it has an idea, which is constantly. It carries a tiny pitch deck everywhere and will present it to anyone who stands still.',
    palette: { body: '#ffd96a', belly: '#fff3c4', accent: '#8a6a12' },
  },
  {
    id: 'kiln',
    brand: 'Anthropic',
    number: 4,
    name: 'Kiln',
    type: 'Dozing',
    inspiredBy: 'Anthropic',
    rarity: 'ultra',
    spot: 'McGraw Tower',
    lat: 42.44757,
    lng: -76.48504,
    radius: 25,
    habitat: 40,
    hours: { start: 23, end: 1, label: '11pm to 1am' },
    clue: 'When the clock tower strikes midnight, listen at its foot for something snoring. Its third eye is already watching you.',
    note: 'snoring? one eye open…',
    lore: 'Kiln sleeps curled up on its cushion at the foot of McGraw Tower, snoring through the midnight chimes. Its third eye never closes, so it always knows exactly who is sneaking up on it.',
    palette: { body: '#efe3c4', belly: '#f6edd6', accent: '#1b1b24' },
    // Six tries, three states. Catch rates are placeholders from the design sheet; tune freely.
    stages: [
      { form: 'dozing', name: 'Dozing', tries: 3, catchRate: 0.25, tell: 'Asleep; the third eye watches' },
      { form: 'awake', name: 'Awake', tries: 2, catchRate: 0.15, tell: 'Sitting up, annoyed, dodging' },
      { form: 'furious', name: 'Furious', tries: 1, catchRate: 0.3, tell: 'Roaring, wings spread. One last try.' },
    ],
  },
  {
    id: 'vaultling',
    brand: 'Capital One',
    number: 5,
    name: 'Vaultling',
    type: 'Finance',
    inspiredBy: 'Capital One',
    rarity: 'common',
    spot: 'Day Hall',
    lat: 42.44718,
    lng: -76.48311,
    radius: 25,
    habitat: 40,
    hours: { start: 9, end: 17, label: '9am to 5pm' },
    clue: 'The building where the university keeps its paperwork. Something here jingles when it walks.',
    note: 'jingled like spare change',
    lore: 'Vaultling keeps everything it finds safe inside its belly vault: coins, lost ID cards, the occasional dining hall swipe. It always gives them back.',
    palette: { body: '#244a85', belly: '#dfe8f5', accent: '#d03027' },
  },
  {
    id: 'chilibao',
    brand: 'Asian Chili Spot',
    number: 6,
    name: 'Chilibao',
    type: 'Spicy',
    inspiredBy: 'Asian Chili Spot',
    rarity: 'common',
    spot: 'Asian Chili Spot',
    lat: 42.44171,
    lng: -76.48455,
    radius: 25,
    habitat: 40,
    hours: { start: 11, end: 23, label: '11am to 11pm' },
    clue: 'Down Dryden Road, follow the smell of something very, very spicy.',
    note: 'smelled it before I saw it',
    lore: 'Chilibao is a chili pepper who is extremely proud of being spicy. Its cheeks glow brighter the hungrier you are.',
    palette: { body: '#e5372e', belly: '#ffd0c7', accent: '#3fa34d' },
  },
]

/** Hours are real now: rarity depends on them. ?demo bypasses this so recordings always work. */
export const ENFORCE_HOURS = true

export function inWindow(c: Creature, date = new Date()) {
  const h = date.getHours()
  const { start, end } = c.hours
  return start <= end ? h >= start && h < end : h >= start || h < end
}

function roll(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return ((h >>> 0) % 10000) / 10000
}

/**
 * Whether a creature is out right now: inside its window, and its rarity roll for this
 * 20-minute slot came up. Every player gets the same roll, so a rare spawn is a shared event.
 */
export function isActive(c: Creature, date = new Date()) {
  if (!inWindow(c, date)) return false
  const slot = Math.floor(date.getTime() / (20 * 60 * 1000))
  return roll(`${c.id}:${slot}`) < SPAWN_CHANCE[c.rarity]
}
