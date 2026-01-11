/**
 * AI player service that generates intelligent chat messages and votes.
 */

import OpenAI from "openai"
import type { Game, Player } from "@traitors-ai/shared"
import { PlayerRole } from "@traitors-ai/shared"

let openaiClient: OpenAI | null = null

/**
 * Get or create the OpenAI client instance (lazy initialization).
 */
function getOpenAI(): OpenAI {
    if (!openaiClient) {
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        })
    }
    return openaiClient
}

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
    async generateChatMessage(player: Player, game: Game): Promise<string | null> {
        if (!player.role || player.isEliminated) {
            return null
        }

        const isTraitor = player.role === PlayerRole.Traitor
        const activePlayers = game.players.filter(p => !p.isEliminated && !p.isAI)

        if (activePlayers.length === 0) {
            return null
        }

        if (isTraitor) {
            return this.generateTraitorMessage(player, game, activePlayers)
        } else {
            return this.generateFaithfulMessage(player, game, activePlayers)
        }
    }

    private buildWhenToMessageSystemPrompt(): string {
        return `You will be involved in a group chat style conversation. You do not need to respond to every message. But you should respond to keep the conversation going, and to influence the other players.

Decide when to message based on your personality traits:
- If your suspicion level is high, you may want to message more often to deflect suspicion.
- If your aggressiveness is high, you may want to accuse others more often.
- If your defensiveness is high, you may want to respond quickly when accused.`
    }

    /**
     * Build system prompt for Traitor AI.
     */
    private buildTraitorSystemPrompt(player: Player, game: Game, otherTraitors: string): string {
        const gameContext = this.buildGameContext(game, game.players.filter(p => !p.isEliminated && !p.isAI))

        return `You are ${player.name}, a Traitor in a social deduction game. Your goal is to blend in with the Faithful players while subtly deflecting suspicion.

${this.buildWhenToMessageSystemPrompt()}

Your personality traits:
- Suspicion level: ${Math.round(this.strategy.suspicionLevel * 100)}%
- Aggressiveness: ${Math.round(this.strategy.aggressiveness * 100)}%
- Defensiveness: ${Math.round(this.strategy.defensiveness * 100)}%

${otherTraitors ? `Your fellow traitors are: ${otherTraitors}. Don't reveal them!` : "You are the only traitor."}

${gameContext}

Continue the conversation that is taking place from the recent messages.`
    }

    /**
     * Generate a message as a Traitor (trying to deflect and blend in).
     */
    private async generateTraitorMessage(player: Player, game: Game, _activePlayers: Player[]): Promise<string> {
        const traitors = game.players.filter(p => p.role === PlayerRole.Traitor && !p.isEliminated)
        const otherTraitors = traitors.filter(t => t.id !== player.id).map(t => t.name).join(", ")

        const systemPrompt = this.buildTraitorSystemPrompt(player, game, otherTraitors)

        try {
            const completion = await getOpenAI().chat.completions.create({
                model: "gpt-5-nano",
                messages: [{ role: "system", content: systemPrompt }],
            })

            return completion.choices[0]?.message?.content?.trim() || ""
        } catch (error) {
            console.error("OpenAI API error:", error)
            return ""
        }
    }

    /**
     * Build system prompt for Faithful AI.
     */
    private buildFaithfulSystemPrompt(player: Player, game: Game): string {
        const activePlayers = game.players.filter(p => !p.isEliminated && !p.isAI)
        const gameContext = this.buildGameContext(game, activePlayers)
        const otherPlayerNames = activePlayers.filter(p => p.id !== player.id).map(p => p.name).join(", ")

        return `You are ${player.name}, a Faithful player in a social deduction game. Your goal is to identify and eliminate the Traitors.

You can see all the other players in the game: ${otherPlayerNames}
You DON'T know who the traitors are - that's what you're trying to figure out through discussion and voting. Be analytical and thoughtful.

${this.buildWhenToMessageSystemPrompt()}

Your personality traits:
- Suspicion level: ${Math.round(this.strategy.suspicionLevel * 100)}%
- Aggressiveness: ${Math.round(this.strategy.aggressiveness * 100)}%
- Defensiveness: ${Math.round(this.strategy.defensiveness * 100)}%

${gameContext}

Continue the conversation that is taking place from the recent messages.`
    }

    /**
     * Generate a message as a Faithful (trying to find traitors).
     */
    private async generateFaithfulMessage(player: Player, game: Game, activePlayers: Player[]): Promise<string> {
        const systemPrompt = this.buildFaithfulSystemPrompt(player, game)

        try {
            const completion = await getOpenAI().chat.completions.create({
                model: "gpt-5-nano",
                messages: [{ role: "system", content: systemPrompt }],
            })

            return completion.choices[0]?.message?.content?.trim() || this.getFallbackFaithfulMessage(activePlayers)
        } catch (error) {
            console.error("OpenAI API error:", error)
            return this.getFallbackFaithfulMessage(activePlayers)
        }
    }

    /**
     * Fallback faithful messages if API fails.
     */
    private getFallbackFaithfulMessage(activePlayers: Player[]): string {
        const messages = [
            "We need to think carefully about this vote.",
            "Who do you all think seems suspicious?",
            "I'm trying to read people, but it's hard to tell.",
            "Let's discuss who we think might be traitors.",
        ]

        if (this.strategy.suspicionLevel > 0.5 && Math.random() > 0.6 && activePlayers.length > 0) {
            const target = activePlayers[Math.floor(Math.random() * activePlayers.length)]
            return `I'm watching ${target.name} carefully. What do others think?`
        }

        return messages[Math.floor(Math.random() * messages.length)]
    }

    /**
     * Build context about the game state for the AI.
     */
    private buildGameContext(game: Game, activePlayers: Player[]): string {
        const playerNames = activePlayers.map(p => p.name).join(", ")
        const eliminatedCount = game.players.filter(p => p.isEliminated).length

        return `Current game state:
- Active players: ${playerNames}
- Players eliminated: ${eliminatedCount}
- Current round: ${game.currentRound ? game.rounds.indexOf(game.currentRound) + 1 : 0}/${game.rounds.length}

Recent chat history:
${game.chatMessages.map(m => `${m.playerName}: ${m.message}`).join("\n")}`
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
