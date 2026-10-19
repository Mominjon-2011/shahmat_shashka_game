// Chess AI Engine using Minimax with Alpha-Beta Pruning,
// Piece-Square Tables (PST), MVV-LVA Move Ordering, and Difficulty Levels

class ChessAI {
    constructor() {
        this.pieceValues = {
            p: 100,
            n: 320,
            b: 330,
            r: 500,
            q: 900,
            k: 20000
        };

        // Piece-Square Tables (from White's perspective; flipped for Black)
        this.pst = {
            p: [
                [ 0,  0,  0,  0,  0,  0,  0,  0],
                [50, 50, 50, 50, 50, 50, 50, 50],
                [10, 10, 20, 30, 30, 20, 10, 10],
                [ 5,  5, 10, 25, 25, 10,  5,  5],
                [ 0,  0,  0, 20, 20,  0,  0,  0],
                [ 5, -5,-10,  0,  0,-10, -5,  5],
                [ 5, 10, 10,-20,-20, 10, 10,  5],
                [ 0,  0,  0,  0,  0,  0,  0,  0]
            ],
            n: [
                [-50,-40,-30,-30,-30,-30,-40,-50],
                [-40,-20,  0,  0,  0,  0,-20,-40],
                [-30,  0, 10, 15, 15, 10,  0,-30],
                [-30,  5, 15, 20, 20, 15,  5,-30],
                [-30,  0, 15, 20, 20, 15,  0,-30],
                [-30,  5, 10, 15, 15, 10,  5,-30],
                [-40,-20,  0,  5,  5,  0,-20,-40],
                [-50,-40,-30,-30,-30,-30,-40,-50]
            ],
            b: [
                [-20,-10,-10,-10,-10,-10,-10,-20],
                [-10,  0,  0,  0,  0,  0,  0,-10],
                [-10,  0,  5, 10, 10,  5,  0,-10],
                [-10,  5,  5, 10, 10,  5,  5,-10],
                [-10,  0, 10, 10, 10, 10,  0,-10],
                [-10, 10, 10, 10, 10, 10, 10,-10],
                [-10,  5,  0,  0,  0,  0,  5,-10],
                [-20,-10,-10,-10,-10,-10,-10,-20]
            ],
            r: [
                [ 0,  0,  0,  0,  0,  0,  0,  0],
                [ 5, 10, 10, 10, 10, 10, 10,  5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [ 0,  0,  0,  5,  5,  0,  0,  0]
            ],
            q: [
                [-20,-10,-10, -5, -5,-10,-10,-20],
                [-10,  0,  0,  0,  0,  0,  0,-10],
                [-10,  0,  5,  5,  5,  5,  0,-10],
                [ -5,  0,  5,  5,  5,  5,  0, -5],
                [  0,  0,  5,  5,  5,  5,  0, -5],
                [-10,  5,  5,  5,  5,  5,  0,-10],
                [-10,  0,  5,  0,  0,  0,  0,-10],
                [-20,-10,-10, -5, -5,-10,-10,-20]
            ],
            k: [
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-20,-30,-30,-40,-40,-30,-30,-20],
                [-10,-20,-20,-20,-20,-20,-20,-10],
                [ 20, 20,  0,  0,  0,  0, 20, 20],
                [ 20, 30, 10,  0,  0, 10, 30, 20]
            ]
        };
    }

    // Static evaluation: positive means advantage for White, negative for Black
    evaluate(board) {
        let score = 0;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) continue;

                const val = this.pieceValues[piece.type];
                let pstVal = 0;

                if (this.pst[piece.type]) {
                    const row = piece.color === 'w' ? r : 7 - r;
                    pstVal = this.pst[piece.type][row][c];
                }

                const totalVal = val + pstVal;
                if (piece.color === 'w') {
                    score += totalVal;
                } else {
                    score -= totalVal;
                }
            }
        }
        return score;
    }

    // Sort moves for Alpha-Beta pruning efficiency (MVV-LVA)
    orderMoves(moves, board) {
        return moves.sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;

            if (a.captured) {
                const victimVal = this.pieceValues[a.captured.type] || 0;
                const attacker = board[a.from.row][a.from.col];
                const attackerVal = attacker ? (this.pieceValues[attacker.type] || 0) : 0;
                scoreA = victimVal * 10 - attackerVal;
            }
            if (a.promotion) scoreA += 800;

            if (b.captured) {
                const victimVal = this.pieceValues[b.captured.type] || 0;
                const attacker = board[b.from.row][b.from.col];
                const attackerVal = attacker ? (this.pieceValues[attacker.type] || 0) : 0;
                scoreB = victimVal * 10 - attackerVal;
            }
            if (b.promotion) scoreB += 800;

            return scoreB - scoreA;
        });
    }

    // Minimax search with Alpha-Beta pruning
    minimax(engine, depth, alpha, beta, isMaximizing) {
        const moves = engine.getAllLegalMoves(engine.turn);

        // Terminal state or leaf node
        if (depth === 0 || moves.length === 0) {
            if (moves.length === 0) {
                if (engine.isCheck(engine.turn)) {
                    // Checkmate
                    return isMaximizing ? -50000 - depth : 50000 + depth;
                }
                // Stalemate
                return 0;
            }
            return this.evaluate(engine.board);
        }

        const orderedMoves = this.orderMoves(moves, engine.board);

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of orderedMoves) {
                engine.makeMove(move, true);
                const ev = this.minimax(engine, depth - 1, alpha, beta, false);
                engine.undoMove();
                maxEval = Math.max(maxEval, ev);
                alpha = Math.max(alpha, ev);
                if (beta <= alpha) break; // Beta cutoff
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of orderedMoves) {
                engine.makeMove(move, true);
                const ev = this.minimax(engine, depth - 1, alpha, beta, true);
                engine.undoMove();
                minEval = Math.min(minEval, ev);
                beta = Math.min(beta, ev);
                if (beta <= alpha) break; // Alpha cutoff
            }
            return minEval;
        }
    }

    // Get best move for current turn
    getBestMove(engine, difficulty = 'medium') {
        const moves = engine.getAllLegalMoves(engine.turn);
        if (moves.length === 0) return null;

        const isWhite = engine.turn === 'w';

        // Difficulty: easy (Oson)
        if (difficulty === 'easy') {
            // 40% chance of random move, otherwise depth 1
            if (Math.random() < 0.4) {
                return moves[Math.floor(Math.random() * moves.length)];
            }
            return this.searchBestMove(engine, 1, isWhite);
        }

        // Difficulty: medium (O'rta) - depth 2
        if (difficulty === 'medium') {
            return this.searchBestMove(engine, 2, isWhite);
        }

        // Difficulty: hard (Qiyin) - depth 3
        return this.searchBestMove(engine, 3, isWhite);
    }

    searchBestMove(engine, depth, isWhite) {
        const moves = engine.getAllLegalMoves(engine.turn);
        if (moves.length === 0) return null;

        const orderedMoves = this.orderMoves(moves, engine.board);
        let bestMove = orderedMoves[0];
        let bestScore = isWhite ? -Infinity : Infinity;

        let alpha = -Infinity;
        let beta = Infinity;

        for (const move of orderedMoves) {
            engine.makeMove(move, true);
            const score = this.minimax(engine, depth - 1, alpha, beta, !isWhite);
            engine.undoMove();

            if (isWhite) {
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
                alpha = Math.max(alpha, score);
            } else {
                if (score < bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
                beta = Math.min(beta, score);
            }
        }

        return bestMove;
    }
}

window.ChessAI = ChessAI;
