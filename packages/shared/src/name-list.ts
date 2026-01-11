/**
 * List of human names for random player assignment.
 */

export const HUMAN_NAMES: readonly string[] = [
    "Alex", "Jordan", "Taylor", "Morgan", "Casey",
    "Riley", "Avery", "Quinn", "Sage", "Dakota",
    "Jamie", "Skylar", "Rowan", "Cameron", "Parker",
    "Charlie", "Drew", "Finley", "Hayden", "Reese",
    "Sam", "Blake", "Devon", "Emerson", "Harper",
    "Jasper", "River", "Sawyer", "Spencer", "Winter",
    "Ashton", "Bailey", "Brooklyn", "Chandler", "Dylan",
    "Elliott", "Fallon", "Gray", "Hunter", "Indigo",
    "Kai", "Logan", "Marley", "Noah", "Ocean",
    "Peyton", "Phoenix", "Raven", "Rory", "Ryan",
    "Sage", "Sloane", "Tatum", "Terrell", "Val",
    "Wren", "Zion", "Angel", "Aspen", "Blair",
    "Brooks", "Eden", "Ellis", "Harley", "Haven",
    "Justice", "Kendall", "London", "Lyric", "Micah",
    "Oakley", "Payton", "Presley", "Reagan", "Robin",
    "Shawn", "Stevie", "Tanner", "Toby", "Tyler",
    "Adrian", "August", "Bellamy", "Carter", "Chris",
    "Corey", "Dallas", "Darcy", "Devin", "Elliot",
    "Emery", "Frankie", "Gale", "Harper", "Hollis",
    "Indiana", "Jules", "Kelly", "Lane", "Leslie",
    "Mason", "Merritt", "Nico", "Palmer", "Reign"
] as const

/**
 * Get a random name from the list.
 */
export function getRandomName(): string {
    return HUMAN_NAMES[Math.floor(Math.random() * HUMAN_NAMES.length)]
}

/**
 * Get a name that hasn't been used in the provided list.
 */
export function getUniqueName(usedNames: string[]): string {
    const available = HUMAN_NAMES.filter(name => !usedNames.includes(name))

    if (available.length === 0) {
        // If all names are used, append a number
        return `${getRandomName()}${Math.floor(Math.random() * 1000)}`
    }

    return available[Math.floor(Math.random() * available.length)]
}
