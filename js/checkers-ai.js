// Checkers AI with Minimax and Alpha-Beta Pruning
// Positional evaluation, King value, Back row defense, Central dominance

class CheckersAI {
    constructor() {}

    evaluate(board) {
        let score = 0;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) continue;

                let val = piece.type === 'king' ? 350 : 100;

                // Positional weights
                if (piece.type === 'man') {
                    // Advancement bonus
                    if (piece.color === 'w') {
                        val += (7 - r) * 7;
                        // Back row protection bonus
                        if (r === 7) val += 15;
                    } else {
                        val += r * 7;
                        // Back row protection bonus
                        if (r === 0) val += 15;
                    }
                }

                // Center dominance bonus
                if (c >= 2 && c <= 5 && r >= 2 && r <= 5) {
                    val += 10;
                }

                if (piece.color === 'w') {
                    score += val;
                } else {
                    score -= val;
                }
            }
        }

        return score;
    }

    minimax(engine, depth, alpha, beta, isMaximizing) {
        const moves = engine.getAllLegalMoves(engine.turn);

        if (depth === 0 || moves.length === 0) {
            if (moves.length === 0) {
                return isMaximizing ? -20000 - depth : 20000 + depth;
            }
            return this.evaluate(engine.board);
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of moves) {
                const res = engine.makeMove(move);
                // If turn didn't end due to multi-jump, continue with current maximizing player
                const nextIsMax = res.turnEnded ? false : true;
                const nextDepth = res.turnEnded ? depth - 1 : depth;
                const ev = this.minimax(engine, nextDepth, alpha, beta, nextIsMax);
                engine.undoMove();
                maxEval = Math.max(maxEval, ev);
                alpha = Math.max(alpha, ev);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                const res = engine.makeMove(move);
                const nextIsMax = res.turnEnded ? true : false;
                const nextDepth = res.turnEnded ? depth - 1 : depth;
                const ev = this.minimax(engine, nextDepth, alpha, beta, nextIsMax);
                engine.undoMove();
                minEval = Math.min(minEval, ev);
                beta = Math.min(beta, ev);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    getBestMove(engine, difficulty = 'medium') {
        const moves = engine.getAllLegalMoves(engine.turn);
        if (moves.length === 0) return null;

        const isWhite = engine.turn === 'w';

        if (difficulty === 'easy') {
            if (Math.random() < 0.45) {
                return moves[Math.floor(Math.random() * moves.length)];
            }
            return this.searchBestMove(engine, 1, isWhite);
        }

        if (difficulty === 'medium') {
            return this.searchBestMove(engine, 3, isWhite);
        }

        // Hard
        return this.searchBestMove(engine, 5, isWhite);
    }

    searchBestMove(engine, depth, isWhite) {
        const moves = engine.getAllLegalMoves(engine.turn);
        if (moves.length === 0) return null;

        let bestMove = moves[0];
        let bestScore = isWhite ? -Infinity : Infinity;
        let alpha = -Infinity;
        let beta = Infinity;

        for (const move of moves) {
            const res = engine.makeMove(move);
            const nextIsMax = res.turnEnded ? !isWhite : isWhite;
            const nextDepth = res.turnEnded ? depth - 1 : depth;
            const score = this.minimax(engine, nextDepth, alpha, beta, nextIsMax);
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

window.CheckersAI = CheckersAI;
