import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

/**
 * Minimalistic Tic-Tac-Toe game with:
 * - Start new game
 * - Play vs AI or Friend
 * - Display current board
 * - Show win/draw/lose message
 * - Track score (localStorage)
 * - View game history
 * - Responsive, light theme using specified colors
 *
 * Colors:
 *  primary:   #1976D2
 *  secondary: #424242
 *  accent:    #FFD600
 */

// Constants
const LS_KEYS = {
  SCORE: 'ttt_score',
  HISTORY: 'ttt_history',
  SETTINGS: 'ttt_settings',
};

const EMPTY_BOARD = Array(9).fill(null);

// Helpers
function calculateWinner(squares) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8], // rows
    [0,3,6],[1,4,7],[2,5,8], // cols
    [0,4,8],[2,4,6]          // diags
  ];
  for (let [a,b,c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line: [a,b,c] };
    }
  }
  if (squares.every(Boolean)) return { winner: null, line: [] }; // draw
  return null; // ongoing
}

/**
 * Very simple AI:
 * 1. If AI can win in 1 move, take it.
 * 2. If player can win in 1 move, block it.
 * 3. Take center if free.
 * 4. Take a corner if free.
 * 5. Take any side.
 */
function computeAiMove(squares, aiMark, playerMark) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  // Try winning
  for (const [a,b,c] of lines) {
    const line = [a,b,c];
    const marks = line.map(i => squares[i]);
    if (marks.filter(m => m === aiMark).length === 2 && marks.includes(null)) {
      return line[marks.indexOf(null)];
    }
  }
  // Block opponent
  for (const [a,b,c] of lines) {
    const line = [a,b,c];
    const marks = line.map(i => squares[i]);
    if (marks.filter(m => m === playerMark).length === 2 && marks.includes(null)) {
      return line[marks.indexOf(null)];
    }
  }
  // Center
  if (!squares[4]) return 4;
  // Corners
  const corners = [0,2,6,8].filter(i => !squares[i]);
  if (corners.length) return corners[Math.floor(Math.random()*corners.length)];
  // Sides
  const sides = [1,3,5,7].filter(i => !squares[i]);
  if (sides.length) return sides[Math.floor(Math.random()*sides.length)];
  // Fallback
  return squares.findIndex(v => !v);
}

// PUBLIC_INTERFACE
function App() {
  /** Root UI theme (light only per requirement, but keep toggleable state for extensibility) */
  const [theme] = useState('light');

  // Game state
  const [board, setBoard] = useState(EMPTY_BOARD);
  const [xIsNext, setXIsNext] = useState(true);
  const [mode, setMode] = useState('ai'); // 'ai' | 'friend'
  const [playerMark, setPlayerMark] = useState('X'); // player's mark in AI mode
  const aiMark = useMemo(() => (playerMark === 'X' ? 'O' : 'X'), [playerMark]);
  const [statusMessage, setStatusMessage] = useState('');

  // Score & history from localStorage
  const [score, setScore] = useState(() => {
    const saved = localStorage.getItem(LS_KEYS.SCORE);
    return saved ? JSON.parse(saved) : { X: 0, O: 0, draws: 0 };
  });
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem(LS_KEYS.HISTORY);
    return saved ? JSON.parse(saved) : [];
  });

  // Persist score/history
  useEffect(() => {
    localStorage.setItem(LS_KEYS.SCORE, JSON.stringify(score));
  }, [score]);
  useEffect(() => {
    localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(history));
  }, [history]);
  useEffect(() => {
    localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify({ mode, playerMark }));
  }, [mode, playerMark]);

  // Apply theme attribute (light as requested)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Derived state: winner/draw
  const result = calculateWinner(board);
  const gameOver = !!result;

  // Update status message
  useEffect(() => {
    if (!result) {
      setStatusMessage(`${xIsNext ? 'X' : 'O'} to move`);
      return;
    }
    if (result.winner === 'X' || result.winner === 'O') {
      setStatusMessage(`${result.winner} wins!`);
    } else {
      setStatusMessage('It\'s a draw');
    }
  }, [result, xIsNext]);

  // AI move when it's AI's turn in AI mode
  useEffect(() => {
    if (mode !== 'ai') return;
    if (gameOver) return;
    const currentTurnMark = xIsNext ? 'X' : 'O';
    if (currentTurnMark === aiMark) {
      // small delay for UX
      const id = setTimeout(() => {
        setBoard(prev => {
          const idx = computeAiMove(prev, aiMark, playerMark);
          if (idx === -1 || prev[idx]) return prev;
          const next = prev.slice();
          next[idx] = aiMark;
          return next;
        });
        setXIsNext(prev => !prev);
      }, 250);
      return () => clearTimeout(id);
    }
  }, [mode, xIsNext, aiMark, playerMark, gameOver]);

  // When game completes, record score and history once
  useEffect(() => {
    if (!result) return;
    const { winner } = result;

    setHistory(prev => {
      const entry = {
        id: Date.now(),
        board,
        winner, // 'X' | 'O' | null for draw
        mode,
        playerMark,
        timestamp: new Date().toISOString(),
      };
      return [entry, ...prev].slice(0, 50); // keep last 50 games
    });

    setScore(prev => {
      const updated = { ...prev };
      if (winner === 'X') updated.X += 1;
      else if (winner === 'O') updated.O += 1;
      else updated.draws += 1;
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]); // depend on gameOver to ensure it runs once at end

  // PUBLIC_INTERFACE
  function handleSquareClick(index) {
    /** Handle user clicking on a square. Prevent moves if occupied or game over. */
    if (board[index] || gameOver) return;
    const current = xIsNext ? 'X' : 'O';
    if (mode === 'ai') {
      // In AI mode, only allow clicks for the human player's mark
      if (current !== playerMark) return;
    }
    const next = board.slice();
    next[index] = current;
    setBoard(next);
    setXIsNext(!xIsNext);
  }

  // PUBLIC_INTERFACE
  function startNewGame(resetMode = false) {
    /** Start a new game. Optionally reset mode to default. */
    setBoard(EMPTY_BOARD);
    setXIsNext(true);
    setStatusMessage('');
    if (resetMode) {
      setMode('ai');
      setPlayerMark('X');
    }
  }

  // PUBLIC_INTERFACE
  function clearAll() {
    /** Clear scores and history. */
    setScore({ X: 0, O: 0, draws: 0 });
    setHistory([]);
    localStorage.removeItem(LS_KEYS.SCORE);
    localStorage.removeItem(LS_KEYS.HISTORY);
  }

  // Components
  const Square = ({ value, onClick, highlight }) => (
    <button
      className="ttt-square"
      onClick={onClick}
      aria-label={value ? `Square with ${value}` : 'Empty square'}
      style={highlight ? { boxShadow: `0 0 0 2px var(--accent)` } : undefined}
    >
      {value}
    </button>
  );

  const winnerLine = result && result.line ? result.line : [];

  return (
    <div className="App">
      <header className="ttt-header">
        <h1 className="ttt-title">Tic-Tac-Toe</h1>
        <p className="ttt-subtitle">Minimalistic. Fast. Fun.</p>
      </header>

      <main className="ttt-container">
        {/* Controls */}
        <section className="ttt-controls" aria-label="Game Controls">
          <div className="ttt-row">
            <div className="ttt-group">
              <label className="ttt-label">Mode</label>
              <div className="ttt-segment">
                <button
                  className={`ttt-seg-btn ${mode === 'ai' ? 'active' : ''}`}
                  onClick={() => { setMode('ai'); startNewGame(); }}
                >
                  vs AI
                </button>
                <button
                  className={`ttt-seg-btn ${mode === 'friend' ? 'active' : ''}`}
                  onClick={() => { setMode('friend'); startNewGame(); }}
                >
                  vs Friend
                </button>
              </div>
            </div>

            {mode === 'ai' && (
              <div className="ttt-group">
                <label className="ttt-label">You play as</label>
                <div className="ttt-segment">
                  <button
                    className={`ttt-seg-btn ${playerMark === 'X' ? 'active' : ''}`}
                    onClick={() => { setPlayerMark('X'); startNewGame(); }}
                  >
                    X
                  </button>
                  <button
                    className={`ttt-seg-btn ${playerMark === 'O' ? 'active' : ''}`}
                    onClick={() => { setPlayerMark('O'); startNewGame(); }}
                  >
                    O
                  </button>
                </div>
              </div>
            )}

            <div className="ttt-group">
              <label className="ttt-label">Actions</label>
              <div className="ttt-actions">
                <button className="btn primary" onClick={() => startNewGame()}>
                  New Game
                </button>
                <button className="btn ghost" onClick={clearAll}>
                  Clear Score & History
                </button>
              </div>
            </div>
          </div>

          <div className="ttt-status" role="status" aria-live="polite">
            {statusMessage}
            {!gameOver && (
              <span className="ttt-turn-indicator">
                {' '}• Turn: <strong>{xIsNext ? 'X' : 'O'}</strong>
              </span>
            )}
          </div>
        </section>

        {/* Board */}
        <section className="ttt-board-wrapper">
          <div className="ttt-board" role="grid" aria-label="Tic tac toe board">
            {board.map((val, idx) => (
              <Square
                key={idx}
                value={val}
                onClick={() => handleSquareClick(idx)}
                highlight={winnerLine.includes(idx)}
              />
            ))}
          </div>
        </section>

        {/* Score & History */}
        <section className="ttt-bottom">
          <div className="ttt-score" aria-label="Score">
            <div className="ttt-score-card">
              <div className="ttt-score-item">
                <span className="ttt-score-label">X</span>
                <span className="ttt-score-value">{score.X}</span>
              </div>
              <div className="ttt-score-item">
                <span className="ttt-score-label">O</span>
                <span className="ttt-score-value">{score.O}</span>
              </div>
              <div className="ttt-score-item">
                <span className="ttt-score-label">Draws</span>
                <span className="ttt-score-value">{score.draws}</span>
              </div>
            </div>
          </div>

          <div className="ttt-history" aria-label="Game History">
            <h3 className="ttt-history-title">Recent Games</h3>
            {history.length === 0 && (
              <p className="ttt-history-empty">No games played yet.</p>
            )}
            <ul className="ttt-history-list">
              {history.map(entry => (
                <li key={entry.id} className="ttt-history-item">
                  <div className="ttt-history-meta">
                    <span className="ttt-badge">{entry.mode === 'ai' ? 'AI' : 'Friend'}</span>
                    <span className="ttt-meta">{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="ttt-history-summary">
                    {entry.winner === null ? (
                      <span className="ttt-draw">Draw</span>
                    ) : (
                      <span className="ttt-winner">Winner: {entry.winner}</span>
                    )}
                    {entry.mode === 'ai' && (
                      <span className="ttt-meta"> • You: {entry.playerMark}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
