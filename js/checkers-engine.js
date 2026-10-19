// Professional Checkers (Russian / Classic Draughts) Engine
// Flying Kings (Damka), Backward Captures, Mandatory Captures, Multi-jump Chains

class CheckersEngine {
    constructor() {
        this.reset();
    }

    reset() {
        this.board = this.createInitialBoard();
        this.turn = 'w'; // 'w' (White) or 'b' (Black)
        this.history = []; // stack of { move, stateSnapshot, notation }
        this.activeChainPiece = null; // { row, col } during a multi-jump sequence
        this.capturedPieces = { w: [], b: [] }; // w = pieces black lost, b = pieces white lost
    }

    createInitialBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                // Checkers is played on dark squares: (r + c) is odd
                if ((r + c) % 2 === 1) {
                    if (r < 3) {
                        board[r][c] = { type: 'man', color: 'b' };
                    } else if (r > 4) {
                        board[r][c] = { type: 'man', color: 'w' };
                    }
                }
            }
        }
        return board;
    }

    cloneBoard(board = this.board) {
        return board.map(row => row.map(cell => cell ? { ...cell } : null));
    }

    isInBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    getPiece(row, col) {
        if (!this.isInBounds(row, col)) return null;
        return this.board[row][col];
    }

    // Get capture moves for a specific piece
    getPieceCaptures(row, col, board = this.board) {
        const piece = board[row][col];
        if (!piece) return [];
        const captures = [];
        const oppColor = piece.color === 'w' ? 'b' : 'w';
        const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

        if (piece.type === 'man') {
            // Regular man can capture diagonally forward AND backward by jumping 1 opponent piece
            for (const [dr, dc] of diagDirs) {
                const midR = row + dr;
                const midC = col + dc;
                const endR = row + 2 * dr;
                const endC = col + 2 * dc;

                if (this.isInBounds(endR, endC)) {
                    const midPiece = board[midR][midC];
                    const endSquare = board[endR][endC];
                    if (midPiece && midPiece.color === oppColor && !endSquare) {
                        captures.push({
                            from: { row, col },
                            to: { row: endR, col: endC },
                            captured: { row: midR, col: midC, piece: midPiece },
                            isCapture: true
                        });
                    }
                }
            }
        } else if (piece.type === 'king') {
            // Russian Draughts Flying King (Uchuvchi Damka)
            // Can fly along empty squares, jump one opponent piece at any distance,
            // and land on ANY empty square after it along that diagonal!
            for (const [dr, dc] of diagDirs) {
                let midR = -1;
                let midC = -1;
                let foundOpponent = false;
                let r = row + dr;
                let c = col + dc;

                while (this.isInBounds(r, c)) {
                    const currentPiece = board[r][c];
                    if (!foundOpponent) {
                        if (currentPiece) {
                            if (currentPiece.color === oppColor) {
                                foundOpponent = true;
                                midR = r;
                                midC = c;
                            } else {
                                break; // Own piece blocks
                            }
                        }
                    } else {
                        // After finding one opponent piece
                        if (currentPiece) {
                            break; // Second piece blocks landing
                        } else {
                            // Valid landing square for Damka
                            captures.push({
                                from: { row, col },
                                to: { row: r, col: c },
                                captured: { row: midR, col: midC, piece: board[midR][midC] },
                                isCapture: true
                            });
                        }
                    }
                    r += dr;
                    c += dc;
                }
            }
        }

        return captures;
    }

    // Get simple (non-capture) moves for a piece
    getPieceSimpleMoves(row, col, board = this.board) {
        const piece = board[row][col];
        if (!piece) return [];
        const moves = [];

        if (piece.type === 'man') {
            // Forward moves only
            const forwardDir = piece.color === 'w' ? -1 : 1;
            for (const dc of [-1, 1]) {
                const nr = row + forwardDir;
                const nc = col + dc;
                if (this.isInBounds(nr, nc) && !board[nr][nc]) {
                    moves.push({
                        from: { row, col },
                        to: { row: nr, col: nc },
                        isCapture: false
                    });
                }
            }
        } else if (piece.type === 'king') {
            // Flying King: can move any number of empty squares in all 4 diagonals
            const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
            for (const [dr, dc] of diagDirs) {
                let nr = row + dr;
                let nc = col + dc;
                while (this.isInBounds(nr, nc) && !board[nr][nc]) {
                    moves.push({
                        from: { row, col },
                        to: { row: nr, col: nc },
                        isCapture: false
                    });
                    nr += dr;
                    nc += dc;
                }
            }
        }

        return moves;
    }

    // Get all legal moves for current player
    getAllLegalMoves(color = this.turn) {
        // If an active multi-jump chain is in progress, only that piece can move!
        if (this.activeChainPiece) {
            return this.getPieceCaptures(this.activeChainPiece.row, this.activeChainPiece.col);
        }

        const allCaptures = [];
        const allSimple = [];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece && piece.color === color) {
                    const captures = this.getPieceCaptures(r, c);
                    if (captures.length > 0) {
                        allCaptures.push(...captures);
                    }
                    if (allCaptures.length === 0) {
                        const simple = this.getPieceSimpleMoves(r, c);
                        allSimple.push(...simple);
                    }
                }
            }
        }

        // Rule: Mandatory Capture! If captures exist, simple moves are forbidden.
        if (allCaptures.length > 0) {
            return allCaptures;
        }

        // Otherwise generate remaining simple moves
        if (allSimple.length === 0) {
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const piece = this.board[r][c];
                    if (piece && piece.color === color) {
                        allSimple.push(...this.getPieceSimpleMoves(r, c));
                    }
                }
            }
        }

        return allSimple;
    }

    // Get legal moves for specific square
    getLegalMovesForSquare(row, col) {
        const piece = this.board[row][col];
        if (!piece || piece.color !== this.turn) return [];

        const allLegal = this.getAllLegalMoves(this.turn);
        return allLegal.filter(m => m.from.row === row && m.from.col === col);
    }

    // Execute move
    makeMove(move) {
        const { from, to, captured, isCapture } = move;
        const piece = this.board[from.row][from.col];
        if (!piece || piece.color !== this.turn) return false;

        const stateSnapshot = {
            board: this.cloneBoard(),
            turn: this.turn,
            activeChainPiece: this.activeChainPiece ? { ...this.activeChainPiece } : null,
            capturedPieces: {
                w: [...this.capturedPieces.w],
                b: [...this.capturedPieces.b]
            }
        };

        // Move piece
        this.board[from.row][from.col] = null;
        let finalPiece = { ...piece };

        // Handle capture removal
        if (isCapture && captured) {
            this.board[captured.row][captured.col] = null;
            this.capturedPieces[this.turn].push(captured.piece);
        }

        // King promotion check (White reaches row 0, Black reaches row 7)
        let promoted = false;
        if (piece.type === 'man') {
            if ((piece.color === 'w' && to.row === 0) || (piece.color === 'b' && to.row === 7)) {
                finalPiece.type = 'king';
                promoted = true;
            }
        }

        this.board[to.row][to.col] = finalPiece;

        // Multi-jump chain check
        let turnEnded = true;
        if (isCapture) {
            const nextCaptures = this.getPieceCaptures(to.row, to.col);
            if (nextCaptures.length > 0) {
                // Must continue capturing with the same piece!
                this.activeChainPiece = { row: to.row, col: to.col };
                turnEnded = false;
            }
        }

        if (turnEnded) {
            this.activeChainPiece = null;
            this.turn = this.turn === 'w' ? 'b' : 'w';
        }

        const notation = this.generateNotation(from, to, isCapture, promoted);
        this.history.push({
            move,
            stateSnapshot,
            notation,
            isCapture,
            promoted,
            turnEnded
        });

        return { success: true, turnEnded, promoted };
    }

    undoMove() {
        if (this.history.length === 0) return null;
        const last = this.history.pop();
        const { stateSnapshot } = last;

        this.board = stateSnapshot.board;
        this.turn = stateSnapshot.turn;
        this.activeChainPiece = stateSnapshot.activeChainPiece;
        this.capturedPieces = stateSnapshot.capturedPieces;

        return last;
    }

    generateNotation(from, to, isCapture, promoted) {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const fromStr = `${files[from.col]}${8 - from.row}`;
        const toStr = `${files[to.col]}${8 - to.row}`;
        const sep = isCapture ? ':' : '-';
        let str = `${fromStr}${sep}${toStr}`;
        if (promoted) str += ' (Damka)';
        return str;
    }

    isGameOver() {
        // Count pieces
        let whiteCount = 0;
        let blackCount = 0;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (p) {
                    if (p.color === 'w') whiteCount++;
                    else blackCount++;
                }
            }
        }

        if (whiteCount === 0) {
            return { over: true, winner: 'b', reason: 'noPieces' };
        }
        if (blackCount === 0) {
            return { over: true, winner: 'w', reason: 'noPieces' };
        }

        // Check legal moves
        const moves = this.getAllLegalMoves(this.turn);
        if (moves.length === 0) {
            return {
                over: true,
                winner: this.turn === 'w' ? 'b' : 'w',
                reason: 'noMoves' // Yurish imkoniyati qolmagan
            };
        }

        return { over: false };
    }
}

window.CheckersEngine = CheckersEngine;
