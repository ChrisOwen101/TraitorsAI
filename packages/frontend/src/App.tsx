import { useEffect, useState, useRef } from "react"
import { socketService } from "./services/socket-service"
import { PlayerRole, GamePhase, type ChatMessageData, type GameStateUpdate } from "@traitors-ai/shared"

/**
 * Main application component for Traitors AI.
 */
export function App(): JSX.Element {
    const [isConnected, setIsConnected] = useState(false)
    const [gameId, setGameId] = useState<string | null>(null)
    const [playerId, setPlayerId] = useState<string | null>(null)
    const [playerName, setPlayerName] = useState<string | null>(null)
    const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.Lobby)
    const [playerCount, setPlayerCount] = useState(0)
    const [playersReady, setPlayersReady] = useState(0)
    const [isReady, setIsReady] = useState(false)
    const [myRole, setMyRole] = useState<PlayerRole | null>(null)
    const [knownRoles, setKnownRoles] = useState<{ playerId: string; playerName: string; role: PlayerRole | null }[]>([])
    const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([])
    const [messageInput, setMessageInput] = useState("")
    const [roundEndsAt, setRoundEndsAt] = useState<Date | null>(null)
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
    const [selectedVote, setSelectedVote] = useState<string | null>(null)
    const [hasVoted, setHasVoted] = useState(false)
    const [gameOver, setGameOver] = useState(false)
    const [winningTeam, setWinningTeam] = useState<PlayerRole | null>(null)
    const [joinGameId, setJoinGameId] = useState("")

    const chatEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Initialize socket connection
        socketService.connect()

        // Setup event listeners
        socketService.on("game:state", (data: GameStateUpdate) => {
            setGamePhase(data.phase)
            setPlayerCount(data.playerCount)
            if (data.playersReady !== undefined) setPlayersReady(data.playersReady)
            if (data.myRole !== undefined) setMyRole(data.myRole)
            if (data.knownRoles !== undefined) setKnownRoles(data.knownRoles)
            if (data.roundEndsAt) setRoundEndsAt(new Date(data.roundEndsAt))
        })

        socketService.on("player:joined", (data: { playerId: string; playerName: string }) => {
            console.log("Player joined:", data.playerName)
        })

        socketService.on("player:ready", (data: { playerId: string; isReady: boolean }) => {
            console.log("Player ready status changed:", data)
        })

        socketService.on("chat:message", (data: ChatMessageData) => {
            setChatMessages(prev => [...prev, data])
        })

        socketService.on("round:started", (data: { roundNumber: number; endsAt: string }) => {
            setRoundEndsAt(new Date(data.endsAt))
            setHasVoted(false)
            setSelectedVote(null)
        })

        socketService.on("round:ended", (data: { eliminatedPlayerId: string | null; eliminatedPlayerName: string | null }) => {
            if (data.eliminatedPlayerName) {
                setChatMessages(prev => [...prev, {
                    id: `system-${Date.now()}`,
                    playerId: "system",
                    playerName: "System",
                    message: `${data.eliminatedPlayerName} has been eliminated!`,
                    timestamp: new Date().toISOString(),
                }])
            } else {
                setChatMessages(prev => [...prev, {
                    id: `system-${Date.now()}`,
                    playerId: "system",
                    playerName: "System",
                    message: "No one was eliminated this round.",
                    timestamp: new Date().toISOString(),
                }])
            }
        })

        socketService.on("game:phase-changed", (data: { phase: GamePhase }) => {
            setGamePhase(data.phase)
            if (data.phase === "voting") {
                setChatMessages(prev => [...prev, {
                    id: `system-${Date.now()}`,
                    playerId: "system",
                    playerName: "System",
                    message: "Voting phase has begun! Cast your vote.",
                    timestamp: new Date().toISOString(),
                }])
            }
        })

        socketService.on("game:over", (data: { winners: string[]; winningTeam: PlayerRole }) => {
            setGameOver(true)
            setWinningTeam(data.winningTeam)
        })

        // Update connection status
        const checkConnection = setInterval(() => {
            setIsConnected(socketService.isConnected())
        }, 1000)

        return () => {
            clearInterval(checkConnection)
            socketService.disconnect()
        }
    }, [])

    // Timer countdown
    useEffect(() => {
        if (!roundEndsAt || gamePhase !== GamePhase.RoundInProgress) {
            setTimeRemaining(null)
            return
        }

        const interval = setInterval(() => {
            const now = new Date().getTime()
            const end = roundEndsAt.getTime()
            const remaining = Math.max(0, Math.floor((end - now) / 1000))
            setTimeRemaining(remaining)
        }, 100)

        return () => clearInterval(interval)
    }, [roundEndsAt, gamePhase])

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [chatMessages])

    const handleCreateGame = () => {
        socketService.emit("game:create", (response: { success: boolean; gameId?: string; playerId?: string; playerName?: string; error?: string }) => {
            if (response.success && response.gameId && response.playerId && response.playerName) {
                setGameId(response.gameId)
                setPlayerId(response.playerId)
                setPlayerName(response.playerName)
            } else {
                alert("Failed to create game: " + (response.error ?? "Unknown error"))
            }
        })
    }

    const handleJoinGame = () => {
        if (!joinGameId.trim()) return

        socketService.emit("game:join", { gameId: joinGameId.trim() }, (response: { success: boolean; playerId?: string; playerName?: string; gameId?: string; error?: string }) => {
            if (response.success && response.playerId && response.playerName) {
                setGameId(joinGameId.trim())
                setPlayerId(response.playerId)
                setPlayerName(response.playerName)
            } else {
                alert("Failed to join game: " + (response.error ?? "Unknown error"))
            }
        })
    }

    const handleToggleReady = () => {
        if (!gameId) return
        const newReadyState = !isReady
        setIsReady(newReadyState)
        socketService.emit("player:ready", { gameId, isReady: newReadyState })
    }

    const handleStartGame = () => {
        if (!gameId) return
        socketService.emit("game:start", { gameId }, (response: { success: boolean; error?: string }) => {
            if (!response.success) {
                alert("Failed to start game: " + (response.error ?? "Unknown error"))
            }
        })
    }

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault()
        if (!gameId || !messageInput.trim()) return

        socketService.emit("chat:send", { gameId, message: messageInput.trim() })
        setMessageInput("")
    }

    const handleVote = (targetId: string) => {
        if (!gameId || hasVoted) return

        socketService.emit("vote:cast", { gameId, targetPlayerId: targetId }, (response: { success: boolean; error?: string }) => {
            if (response.success) {
                setHasVoted(true)
                setSelectedVote(targetId)
            } else {
                alert("Failed to cast vote: " + (response.error ?? "Unknown error"))
            }
        })
    }

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    // Home screen
    if (!gameId) {
        return (
            <div className="min-h-screen flex flex-col">
                <header className="bg-slate-800 shadow-lg px-8 py-4 flex justify-between items-center flex-wrap gap-4">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-traitor to-traitor-light bg-clip-text text-transparent">
                        🎭 Traitors AI
                    </h1>
                    <div className="flex items-center gap-2 text-sm">
                        <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 status-pulse'}`} />
                        <span>{isConnected ? "Connected" : "Disconnected"}</span>
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center p-8">
                    <section className="max-w-2xl w-full text-center space-y-8">
                        <div className="space-y-4">
                            <h2 className="text-5xl font-bold">Welcome to Traitors AI</h2>
                            <p className="text-slate-400 text-lg">
                                A social deduction game with AI players. Can you find the traitors?
                            </p>
                        </div>

                        <div className="space-y-6">
                            <button
                                className="w-full max-w-md bg-gradient-to-r from-traitor to-traitor-light text-white font-bold py-4 px-8 rounded-lg text-lg uppercase tracking-wider transition-all hover:shadow-lg hover:shadow-traitor/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                onClick={handleCreateGame}
                                disabled={!isConnected}
                            >
                                Create New Game
                            </button>

                            <div className="flex gap-2 max-w-md mx-auto">
                                <input
                                    type="text"
                                    placeholder="Enter Game ID"
                                    value={joinGameId}
                                    onChange={(e) => setJoinGameId(e.target.value)}
                                    disabled={!isConnected}
                                    className="flex-1 bg-slate-700 border-2 border-transparent focus:border-traitor rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 outline-none transition-colors"
                                />
                                <button
                                    className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-all border-2 border-slate-500 hover:border-slate-400 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={handleJoinGame}
                                    disabled={!isConnected || !joinGameId.trim()}
                                >
                                    Join Game
                                </button>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        )
    }

    // Lobby screen
    if (gamePhase === GamePhase.Lobby) {
        return (
            <div className="min-h-screen flex flex-col">
                <header className="bg-slate-800 shadow-lg px-8 py-4 flex justify-between items-center">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-traitor to-traitor-light bg-clip-text text-transparent">
                        🎭 Traitors AI
                    </h1>
                    <div className="text-sm">
                        You are: <strong className="text-traitor-light">{playerName}</strong>
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center p-8">
                    <section className="max-w-2xl w-full text-center space-y-8">
                        <h2 className="text-4xl font-bold">Game Lobby</h2>

                        <div className="bg-slate-800 rounded-lg p-6 space-y-4">
                            <div className="flex items-center justify-center gap-4">
                                <strong>Game ID:</strong>
                                <code className="bg-slate-700 px-4 py-2 rounded text-traitor-light font-mono">
                                    {gameId}
                                </code>
                                <button
                                    className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-sm transition-all border border-slate-500 hover:border-slate-400"
                                    onClick={() => navigator.clipboard.writeText(gameId)}
                                >
                                    Copy
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="bg-slate-800 rounded-lg p-6">
                                <div className="text-slate-400 text-sm mb-2">Players</div>
                                <div className="text-5xl font-bold text-traitor">{playerCount}</div>
                            </div>
                            <div className="bg-slate-800 rounded-lg p-6">
                                <div className="text-slate-400 text-sm mb-2">Ready</div>
                                <div className="text-5xl font-bold text-traitor">{playersReady}/{playerCount}</div>
                            </div>
                        </div>

                        <div className="flex gap-4 justify-center">
                            <button
                                className={`font-bold py-3 px-8 rounded-lg uppercase tracking-wide transition-all ${isReady
                                    ? 'bg-slate-700 hover:bg-slate-600 text-white border-2 border-slate-500 hover:border-slate-400'
                                    : 'bg-gradient-to-r from-traitor to-traitor-light text-white hover:shadow-lg hover:shadow-traitor/50'
                                    }`}
                                onClick={handleToggleReady}
                            >
                                {isReady ? "Not Ready" : "Ready"}
                            </button>

                            {playersReady === playerCount && playerCount > 0 && (
                                <button
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg uppercase tracking-wide transition-all hover:shadow-lg hover:shadow-green-600/50"
                                    onClick={handleStartGame}
                                >
                                    Start Game
                                </button>
                            )}
                        </div>

                        <p className="text-slate-400 text-sm">
                            Share the Game ID with others. When everyone is ready, start the game!
                        </p>
                    </section>
                </main>
            </div>
        )
    }

    // Game over screen
    if (gameOver) {
        const didIWin = myRole === winningTeam

        return (
            <div className="min-h-screen flex flex-col">
                <header className="bg-slate-800 shadow-lg px-8 py-4">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-traitor to-traitor-light bg-clip-text text-transparent">
                        🎭 Traitors AI
                    </h1>
                </header>

                <main className="flex-1 flex items-center justify-center p-8">
                    <section className="max-w-2xl w-full text-center space-y-8">
                        <h2 className="text-5xl font-bold">{didIWin ? "🎉 Victory!" : "💀 Defeat"}</h2>
                        <p className="text-2xl">
                            The <strong className="text-traitor-light">{winningTeam}s</strong> have won!
                        </p>
                        <p className="text-xl">You were a <strong className={winningTeam === PlayerRole.Traitor ? "text-traitor" : "text-faithful"}>{myRole}</strong>.</p>

                        <div className="bg-slate-800 rounded-lg p-8 space-y-4">
                            <h3 className="text-2xl font-bold text-traitor mb-4">Final Roles</h3>
                            <div className="space-y-2">
                                {knownRoles.map(kr => (
                                    <div
                                        key={kr.playerId}
                                        className={`p-4 rounded-lg border-l-4 ${kr.role === PlayerRole.Traitor
                                            ? "bg-traitor/10 border-traitor text-traitor"
                                            : "bg-faithful/10 border-faithful text-faithful"
                                            }`}
                                    >
                                        {kr.playerName} - <strong>{kr.role}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            className="bg-gradient-to-r from-traitor to-traitor-light text-white font-bold py-4 px-8 rounded-lg text-lg uppercase tracking-wider transition-all hover:shadow-lg hover:shadow-traitor/50 hover:-translate-y-0.5"
                            onClick={() => window.location.reload()}
                        >
                            Play Again
                        </button>
                    </section>
                </main>
            </div>
        )
    }

    // In-game screen
    const votablePlayers = knownRoles.filter(kr => kr.playerId !== playerId)

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-slate-800 shadow-lg px-8 py-4 flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-traitor to-traitor-light bg-clip-text text-transparent">
                    🎭 Traitors AI
                </h1>
                <div className="flex items-center gap-4 flex-wrap">
                    <div className={`px-4 py-2 rounded-lg border-2 font-semibold ${myRole === PlayerRole.Traitor
                        ? "border-traitor text-traitor"
                        : "border-faithful text-faithful"
                        }`}>
                        You are: <strong>{myRole}</strong>
                    </div>
                    {gamePhase === GamePhase.RoundInProgress && timeRemaining !== null && (
                        <div className="text-2xl font-bold bg-slate-700 px-4 py-2 rounded-lg">
                            ⏱️ {formatTime(timeRemaining)}
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 p-4 overflow-hidden">
                <div className="max-w-7xl mx-auto h-full grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Players/Roles Panel */}
                    {knownRoles.length > 0 && (
                        <aside className="bg-slate-800 rounded-lg p-6 overflow-y-auto">
                            <h3 className="text-xl font-bold text-traitor mb-4">
                                {myRole === PlayerRole.Traitor ? "Known Roles" : "Players"}
                            </h3>
                            <div className="space-y-2">
                                {knownRoles.filter(kr => kr.playerId !== playerId).map(kr => (
                                    <div
                                        key={kr.playerId}
                                        className={`p-3 rounded-lg border-l-4 ${kr.role === PlayerRole.Traitor
                                            ? "bg-traitor/10 border-traitor text-traitor"
                                            : kr.role === PlayerRole.Faithful
                                                ? "bg-faithful/10 border-faithful text-faithful"
                                                : "bg-slate-700 border-slate-500 text-slate-300"
                                            }`}
                                    >
                                        <strong>{kr.playerName}</strong>{kr.role && ` - ${kr.role}`}
                                    </div>
                                ))}
                            </div>
                        </aside>
                    )}

                    {/* Chat Panel */}
                    <section className={`bg-slate-800 rounded-lg p-6 flex flex-col min-h-0 ${knownRoles.length > 0 ? "lg:col-span-1" : "lg:col-span-2"
                        }`}>
                        <h3 className="text-xl font-bold text-traitor mb-4">Chat</h3>
                        <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2">
                            {chatMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`p-3 rounded-lg border-l-4 ${msg.playerId === "system"
                                        ? "bg-yellow-500/10 border-yellow-500 text-yellow-500 italic"
                                        : msg.playerId === playerId
                                            ? "bg-traitor/10 border-traitor-light"
                                            : "bg-slate-700 border-slate-600"
                                        }`}
                                >
                                    <strong className="text-traitor-light block mb-1">{msg.playerName}:</strong>
                                    <span>{msg.message}</span>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {gamePhase === GamePhase.RoundInProgress && (
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    placeholder="Type a message..."
                                    maxLength={200}
                                    className="flex-1 bg-slate-700 border-2 border-transparent focus:border-traitor rounded-lg px-4 py-2 text-slate-100 placeholder-slate-500 outline-none transition-colors"
                                />
                                <button
                                    type="submit"
                                    className="bg-gradient-to-r from-traitor to-traitor-light text-white font-semibold px-6 py-2 rounded-lg hover:shadow-lg hover:shadow-traitor/50 transition-all"
                                >
                                    Send
                                </button>
                            </form>
                        )}
                    </section>

                    {/* Voting Panel */}
                    {gamePhase === GamePhase.Voting && (
                        <aside className="bg-slate-800 rounded-lg p-6 overflow-y-auto">
                            <h3 className="text-xl font-bold text-traitor mb-2">Cast Your Vote</h3>
                            <p className="text-slate-400 mb-4">Who do you think is a traitor?</p>

                            {hasVoted ? (
                                <div className="bg-green-500/20 border-2 border-green-500 text-green-500 p-4 rounded-lg text-center font-semibold">
                                    ✓ Vote cast! Waiting for others...
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {votablePlayers.map(player => (
                                        <button
                                            key={player.playerId}
                                            className={`w-full text-left p-3 rounded-lg font-semibold transition-all border-2 ${selectedVote === player.playerId
                                                ? "bg-traitor text-white border-traitor-light"
                                                : "bg-slate-700 hover:bg-slate-600 text-slate-100 border-slate-500 hover:border-slate-400"
                                                }`}
                                            onClick={() => handleVote(player.playerId)}
                                        >
                                            {player.playerName}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </aside>
                    )}
                </div>
            </main>
        </div>
    )
}

