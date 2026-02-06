const ADJECTIVES = [
  'brave', 'bright', 'calm', 'clever', 'cosmic',
  'crisp', 'daring', 'eager', 'fancy', 'fierce',
  'gentle', 'grand', 'happy', 'hasty', 'jolly',
  'keen', 'lazy', 'lively', 'lucky', 'mighty',
  'misty', 'noble', 'odd', 'plucky', 'proud',
  'quick', 'quiet', 'rapid', 'rusty', 'shiny',
  'silent', 'silly', 'sleek', 'sneaky', 'snowy',
  'solar', 'spicy', 'steady', 'stormy', 'stout',
  'super', 'swift', 'tender', 'tiny', 'vivid',
  'warm', 'wild', 'witty', 'zany', 'zippy'
]

const NOUNS = [
  'alpaca', 'badger', 'beacon', 'breeze', 'canyon',
  'castle', 'cedar', 'cloud', 'comet', 'coral',
  'crane', 'dingo', 'dragon', 'falcon', 'flame',
  'forest', 'galaxy', 'glacier', 'harbor', 'hawk',
  'island', 'jaguar', 'lantern', 'lemur', 'lotus',
  'mango', 'meadow', 'meteor', 'moon', 'nebula',
  'octopus', 'otter', 'panda', 'parrot', 'peach',
  'phoenix', 'pine', 'prism', 'quasar', 'raven',
  'reef', 'river', 'rocket', 'sage', 'sierra',
  'spark', 'summit', 'tiger', 'vortex', 'wolf'
]

export const TOTAL_CODENAMES = ADJECTIVES.length * NOUNS.length

export function generateCodename(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adj}-${noun}`
}
