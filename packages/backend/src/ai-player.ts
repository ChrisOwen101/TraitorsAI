/**
 * AI player service that generates intelligent chat messages and votes.
 */

import type { Game, Player } from "@traitors-ai/shared"
import { PlayerRole } from "@traitors-ai/shared"

/**
 * Strategies AI can use when playing as Traitor or Faithful.
 */
interface AIStrategy {
    suspicionLevel: number // 0-1, how suspicious to be
    aggressiveness: number // 0-1, how aggressive in accusations
    defensiveness: number // 0-1, how defensive when accused
}

/**
 * AI player that can chat and vote intelligently based on role.
 */
export class AIPlayer {
    private strategy: AIStrategy

    constructor() {
        // Randomize AI personality
        this.strategy = {
            suspicionLevel: Math.random(),
            aggressiveness: Math.random(),
            defensiveness: Math.random(),
        }
    }

    /**
     * Generate a chat message based on game state and role.
     */
    generateChatMessage(player: Player, game: Game): string | null {
        if (!player.role || player.isEliminated) {
            return null
        }

        const isTraitor = player.role === PlayerRole.Traitor
        const activePlayers = game.players.filter(p => !p.isEliminated && !p.isAI)

        if (activePlayers.length === 0) {
            return null
        }

        // Don't spam - 30% chance to speak each time called
        if (Math.random() > 0.3) {
            return null
        }

        if (isTraitor) {
            return this.generateTraitorMessage(player, game, activePlayers)
        } else {
            return this.generateFaithfulMessage(player, game, activePlayers)
        }
    }

    /**
     * Generate a message as a Traitor (trying to deflect and blend in).
     */
    private generateTraitorMessage(_player: Player, game: Game, activePlayers: Player[]): string {
        const messages = [
            "I think we need to be careful about who we trust here.",
            "Someone's definitely not being truthful.",
            "I have a bad feeling about some people in this group.",
            "We should focus on finding the traitors, not turning on each other.",
            "I'm getting suspicious vibes from a few people.",
            "Let's think about who's been acting strange.",
            "I want to trust everyone, but something feels off.",
            "We need to work together to find the traitors.",
        ]

        // Occasionally accuse a random non-traitor
        if (this.strategy.aggressiveness > 0.6 && Math.random() > 0.7) {
            const traitors = game.players.filter(p => p.role === PlayerRole.Traitor && !p.isEliminated)
            const nonTraitors = activePlayers.filter(p => !traitors.some(t => t.id === p.id))

            if (nonTraitors.length > 0) {
                const target = nonTraitors[Math.floor(Math.random() * nonTraitors.length)]
                return `I'm not sure about ${target.name}. They've been very quiet.`
            }
        }

        return messages[Math.floor(Math.random() * messages.length)]
    }

    /**
     * Generate a message as a Faithful (trying to find traitors).
     */
    private generateFaithfulMessage(_player: Player, _game: Game, activePlayers: Player[]): string {
        const messages = [
            "We need to think carefully about this vote.",
            "Who do you all think seems suspicious?",
            "I'm trying to read people, but it's hard to tell.",
            "Let's discuss who we think might be traitors.",
            "I want to hear everyone's thoughts before voting.",
            "Someone here is lying, we just need to figure out who.",
            "We should analyze who's been deflecting suspicion.",
            "Trust your instincts everyone.",
        ]

        // Occasionally express suspicion about someone
        if (this.strategy.suspicionLevel > 0.5 && Math.random() > 0.6) {
            if (activePlayers.length > 0) {
                const target = activePlayers[Math.floor(Math.random() * activePlayers.length)]
                return `I'm watching ${target.name} carefully. What do others think?`
            }
        }

        return messages[Math.floor(Math.random() * messages.length)]
    }

    /**
     * Decide who to vote for based on role and game state.
     */
    chooseVoteTarget(player: Player, game: Game): string | null {
        if (!player.role || player.isEliminated) {
            return null
        }

        const activePlayers = game.players.filter(p => !p.isEliminated && p.id !== player.id)

        if (activePlayers.length === 0) {
            return null
        }

        const isTraitor = player.role === PlayerRole.Traitor

        if (isTraitor) {
            // Traitors vote for Faithful players
            const faithful = activePlayers.filter(p => p.role === PlayerRole.Faithful)
            if (faithful.length > 0) {
                return faithful[Math.floor(Math.random() * faithful.length)].id
            }
        } else {
            // Faithful vote randomly (they don't know who's who)
            return activePlayers[Math.floor(Math.random() * activePlayers.length)].id
        }

        return activePlayers[Math.floor(Math.random() * activePlayers.length)].id
    }
}
