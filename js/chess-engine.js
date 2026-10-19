// Professional Chess Engine with Full FIDE Rules Support
// Castling, En Passant, Pawn Promotion, Pins, Check, Checkmate, Stalemate, 50-move rule

class ChessEngine {
    constructor() {
        this.reset();
    }

    reset() {
        this.board = this.createInitialBoard();
        this.turn = 'w'; // 'w' or 'b'
        this.castling = {
            wK: true,
            wQ: true,
            bK: true,
            bQ: true
        };
        this.enPassant = null; // { row, col }
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.history = []; // stack of { move, stateSnapshot, fen, san }
        this.capturedPieces = { w: [], b: [] }; // pieces captured by w, pieces captured by b
    }

    createInitialBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));
        const backRank = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

        for (let col = 0; col < 8; col++) {
            board[0][col] = { type: backRank[col], color: 'b' }; // Rank 8
            board[1][col] = { type: 'p', color: 'b' };           // Rank 7
            board[6][col] = { type: 'p', color: 'w' };           // Rank 2
            board[7][col] = { type: backRank[col], color: 'w' }; // Rank 1
        }
        return board;
    }

    cloneBoard(board = this.board) {
        return board.map(row => row.map(cell => cell ? { ...cell } : null));
    }

    getPiece(row, col) {
        if (row < 0 || row > 7 || col < 0 || col > 7) return null;
        return this.board[row][col];
    }

    isInBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    // Find king position of color
    findKing(color, board = this.board) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (p && p.type === 'k' && p.color === color) {
                    return { row: r, col: c };
                }
            }
        }
        return null;
    }

    // Check if square is attacked by opponent
    isSquareAttacked(row, col, attackerColor, board = this.board) {
        // Pawn attacks
        const pawnDir = attackerColor === 'w' ? 1 : -1; // row offset from target to attacking pawn
        const pR = row + pawnDir;
        if (this.isInBounds(pR, col - 1)) {
            const p = board[pR][col - 1];
            if (p && p.color === attackerColor && p.type === 'p') return true;
        }
        if (this.isInBounds(pR, col + 1)) {
            const p = board[pR][col + 1];
            if (p && p.color === attackerColor && p.type === 'p') return true;
        }

        // Knight attacks
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dr, dc] of knightMoves) {
            const nr = row + dr;
            const nc = col + dc;
            if (this.isInBounds(nr, nc)) {
                const p = board[nr][nc];
                if (p && p.color === attackerColor && p.type === 'n') return true;
            }
        }

        // Straight rays (Rook & Queen)
        const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of straightDirs) {
            let nr = row + dr;
            let nc = col + dc;
            while (this.isInBounds(nr, nc)) {
                const p = board[nr][nc];
                if (p) {
                    if (p.color === attackerColor && (p.type === 'r' || p.type === 'q')) {
                        return true;
                    }
                    break;
                }
                nr += dr;
                nc += dc;
            }
        }

        // Diagonal rays (Bishop & Queen)
        const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (const [dr, dc] of diagDirs) {
            let nr = row + dr;
            let nc = col + dc;
            while (this.isInBounds(nr, nc)) {
                const p = board[nr][nc];
                if (p) {
                    if (p.color === attackerColor && (p.type === 'b' || p.type === 'q')) {
                        return true;
                    }
                    break;
                }
                nr += dr;
                nc += dc;
            }
        }

        // King adjacent attacks
        const kingDirs = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        for (const [dr, dc] of kingDirs) {
            const nr = row + dr;
            const nc = col + dc;
            if (this.isInBounds(nr, nc)) {
                const p = board[nr][nc];
                if (p && p.color === attackerColor && p.type === 'k') return true;
            }
        }

        return false;
    }

    isCheck(color = this.turn, board = this.board) {
        const king = this.findKing(color, board);
        if (!king) return false;
        const opponent = color === 'w' ? 'b' : 'w';
        return this.isSquareAttacked(king.row, king.col, opponent, board);
    }

    // Generate pseudo-legal moves for a specific piece
    getPseudoMoves(row, col, board = this.board, enPassant = this.enPassant, castling = this.castling) {
        const piece = board[row][col];
        if (!piece) return [];
        const moves = [];
        const { type, color } = piece;
        const oppColor = color === 'w' ? 'b' : 'w';

        if (type === 'p') {
            const dir = color === 'w' ? -1 : 1;
            const startRank = color === 'w' ? 6 : 1;
            const promoRank = color === 'w' ? 0 : 7;

            // 1 square forward
            const fRow = row + dir;
            if (this.isInBounds(fRow, col) && !board[fRow][col]) {
                if (fRow === promoRank) {
                    ['q', 'r', 'b', 'n'].forEach(pr => {
                        moves.push({ from: { row, col }, to: { row: fRow, col }, promotion: pr });
                    });
                } else {
                    moves.push({ from: { row, col }, to: { row: fRow, col } });
                    // 2 squares forward from start rank
                    const f2Row = row + 2 * dir;
                    if (row === startRank && !board[f2Row][col]) {
                        moves.push({ from: { row, col }, to: { row: f2Row, col }, isDoublePawn: true });
                    }
                }
            }

            // Diagonal captures
            for (const dc of [-1, 1]) {
                const cCol = col + dc;
                if (this.isInBounds(fRow, cCol)) {
                    const target = board[fRow][cCol];
                    if (target && target.color === oppColor) {
                        if (fRow === promoRank) {
                            ['q', 'r', 'b', 'n'].forEach(pr => {
                                moves.push({ from: { row, col }, to: { row: fRow, col: cCol }, promotion: pr, captured: target });
                            });
                        } else {
                            moves.push({ from: { row, col }, to: { row: fRow, col: cCol }, captured: target });
                        }
                    } else if (enPassant && enPassant.row === fRow && enPassant.col === cCol) {
                        // En Passant capture
                        moves.push({
                            from: { row, col },
                            to: { row: fRow, col: cCol },
                            isEnPassant: true,
                            captured: { type: 'p', color: oppColor }
                        });
                    }
                }
            }
        } else if (type === 'n') {
            const knightOffsets = [
                [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                [1, -2], [1, 2], [2, -1], [2, 1]
            ];
            for (const [dr, dc] of knightOffsets) {
                const nr = row + dr;
                const nc = col + dc;
                if (this.isInBounds(nr, nc)) {
                    const target = board[nr][nc];
                    if (!target) {
                        moves.push({ from: { row, col }, to: { row: nr, col: nc } });
                    } else if (target.color === oppColor) {
                        moves.push({ from: { row, col }, to: { row: nr, col: nc }, captured: target });
                    }
                }
            }
        } else if (type === 'b' || type === 'r' || type === 'q') {
            const dirs = [];
            if (type === 'r' || type === 'q') dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
            if (type === 'b' || type === 'q') dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);

            for (const [dr, dc] of dirs) {
                let nr = row + dr;
                let nc = col + dc;
                while (this.isInBounds(nr, nc)) {
                    const target = board[nr][nc];
                    if (!target) {
                        moves.push({ from: { row, col }, to: { row: nr, col: nc } });
                    } else {
                        if (target.color === oppColor) {
                            moves.push({ from: { row, col }, to: { row: nr, col: nc }, captured: target });
                        }
                        break;
                    }
                    nr += dr;
                    nc += dc;
                }
            }
        } else if (type === 'k') {
            const kingDirs = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1],           [0, 1],
                [1, -1],  [1, 0],  [1, 1]
            ];
            for (const [dr, dc] of kingDirs) {
                const nr = row + dr;
                const nc = col + dc;
                if (this.isInBounds(nr, nc)) {
                    const target = board[nr][nc];
                    if (!target) {
                        moves.push({ from: { row, col }, to: { row: nr, col: nc } });
                    } else if (target.color === oppColor) {
                        moves.push({ from: { row, col }, to: { row: nr, col: nc }, captured: target });
                    }
                }
            }

            // Castling
            if (color === 'w' && row === 7 && col === 4) {
                // White Kingside
                if (castling.wK && !board[7][5] && !board[7][6] &&
                    !this.isSquareAttacked(7, 4, 'b', board) &&
                    !this.isSquareAttacked(7, 5, 'b', board) &&
                    !this.isSquareAttacked(7, 6, 'b', board)) {
                    moves.push({ from: { row, col }, to: { row: 7, col: 6 }, isCastle: 'K' });
                }
                // White Queenside
                if (castling.wQ && !board[7][3] && !board[7][2] && !board[7][1] &&
                    !this.isSquareAttacked(7, 4, 'b', board) &&
                    !this.isSquareAttacked(7, 3, 'b', board) &&
                    !this.isSquareAttacked(7, 2, 'b', board)) {
                    moves.push({ from: { row, col }, to: { row: 7, col: 2 }, isCastle: 'Q' });
                }
            } else if (color === 'b' && row === 0 && col === 4) {
                // Black Kingside
                if (castling.bK && !board[0][5] && !board[0][6] &&
                    !this.isSquareAttacked(0, 4, 'w', board) &&
                    !this.isSquareAttacked(0, 5, 'w', board) &&
                    !this.isSquareAttacked(0, 6, 'w', board)) {
                    moves.push({ from: { row, col }, to: { row: 0, col: 6 }, isCastle: 'K' });
                }
                // Black Queenside
                if (castling.bQ && !board[0][3] && !board[0][2] && !board[0][1] &&
                    !this.isSquareAttacked(0, 4, 'w', board) &&
                    !this.isSquareAttacked(0, 3, 'w', board) &&
                    !this.isSquareAttacked(0, 2, 'w', board)) {
                    moves.push({ from: { row, col }, to: { row: 0, col: 2 }, isCastle: 'Q' });
                }
            }
        }

        return moves;
    }

    // Apply move on board clone to check legality
    makeSimulatedMove(move, board = this.board) {
        const nextBoard = this.cloneBoard(board);
        const { from, to, promotion, isCastle, isEnPassant } = move;
        const piece = nextBoard[from.row][from.col];

        nextBoard[from.row][from.col] = null;

        if (promotion) {
            nextBoard[to.row][to.col] = { type: promotion, color: piece.color };
        } else {
            nextBoard[to.row][to.col] = piece;
        }

        if (isCastle === 'K') {
            const rRow = from.row;
            nextBoard[rRow][5] = nextBoard[rRow][7];
            nextBoard[rRow][7] = null;
        } else if (isCastle === 'Q') {
            const rRow = from.row;
            nextBoard[rRow][3] = nextBoard[rRow][0];
            nextBoard[rRow][0] = null;
        } else if (isEnPassant) {
            const capRow = from.row;
            nextBoard[capRow][to.col] = null;
        }

        return nextBoard;
    }

    // Get all legal moves for current player
    getAllLegalMoves(color = this.turn) {
        const legalMoves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece && piece.color === color) {
                    const pseudoMoves = this.getPseudoMoves(r, c);
                    for (const move of pseudoMoves) {
                        const simulated = this.makeSimulatedMove(move);
                        if (!this.isCheck(color, simulated)) {
                            legalMoves.push(move);
                        }
                    }
                }
            }
        }
        return legalMoves;
    }

    // Get legal moves for specific square
    getLegalMovesForSquare(row, col) {
        const piece = this.board[row][col];
        if (!piece || piece.color !== this.turn) return [];
        const pseudoMoves = this.getPseudoMoves(row, col);
        return pseudoMoves.filter(move => {
            const simulated = this.makeSimulatedMove(move);
            return !this.isCheck(piece.color, simulated);
        });
    }

    // Execute move officially
    makeMove(move, isSearch = false) {
        const { from, to, promotion, isCastle, isEnPassant } = move;
        const piece = this.board[from.row][from.col];
        if (!piece || piece.color !== this.turn) return false;

        const capturedPiece = this.board[to.row][to.col] || (isEnPassant ? { type: 'p', color: this.turn === 'w' ? 'b' : 'w' } : null);

        // State snapshot for undo
        const stateSnapshot = {
            board: this.cloneBoard(),
            turn: this.turn,
            castling: { ...this.castling },
            enPassant: this.enPassant ? { ...this.enPassant } : null,
            halfMoveClock: this.halfMoveClock,
            fullMoveNumber: this.fullMoveNumber,
            capturedPieces: {
                w: [...this.capturedPieces.w],
                b: [...this.capturedPieces.b]
            }
        };

        // Track captured
        if (capturedPiece && !isSearch) {
            this.capturedPieces[this.turn].push(capturedPiece);
        }

        // Generate Standard Algebraic Notation (SAN) if not internal search
        const san = isSearch ? '' : this.generateSAN(move, piece, capturedPiece);

        // Update board
        this.board[from.row][from.col] = null;
        if (promotion) {
            this.board[to.row][to.col] = { type: promotion, color: piece.color };
        } else {
            this.board[to.row][to.col] = piece;
        }

        // Castle rook move
        if (isCastle === 'K') {
            const rRow = from.row;
            this.board[rRow][5] = this.board[rRow][7];
            this.board[rRow][7] = null;
        } else if (isCastle === 'Q') {
            const rRow = from.row;
            this.board[rRow][3] = this.board[rRow][0];
            this.board[rRow][0] = null;
        } else if (isEnPassant) {
            this.board[from.row][to.col] = null;
        }

        // Update Castling rights
        if (piece.type === 'k') {
            if (piece.color === 'w') {
                this.castling.wK = false;
                this.castling.wQ = false;
            } else {
                this.castling.bK = false;
                this.castling.bQ = false;
            }
        } else if (piece.type === 'r') {
            if (from.row === 7 && from.col === 0) this.castling.wQ = false;
            if (from.row === 7 && from.col === 7) this.castling.wK = false;
            if (from.row === 0 && from.col === 0) this.castling.bQ = false;
            if (from.row === 0 && from.col === 7) this.castling.bK = false;
        }

        // Also if rook is captured on its original square
        if (to.row === 7 && to.col === 0) this.castling.wQ = false;
        if (to.row === 7 && to.col === 7) this.castling.wK = false;
        if (to.row === 0 && to.col === 0) this.castling.bQ = false;
        if (to.row === 0 && to.col === 7) this.castling.bK = false;

        // Update En Passant
        if (piece.type === 'p' && Math.abs(to.row - from.row) === 2) {
            this.enPassant = { row: (from.row + to.row) / 2, col: from.col };
        } else {
            this.enPassant = null;
        }

        // Update 50-move clock
        if (piece.type === 'p' || capturedPiece) {
            this.halfMoveClock = 0;
        } else {
            this.halfMoveClock++;
        }

        if (this.turn === 'b') {
            this.fullMoveNumber++;
        }

        // Switch turn
        this.turn = this.turn === 'w' ? 'b' : 'w';

        // History entry
        if (isSearch) {
            this.history.push({ move, stateSnapshot });
        } else {
            let finalSan = san;
            const opponentInCheck = this.isCheck(this.turn);
            const opponentMoves = this.getAllLegalMoves(this.turn);
            if (opponentMoves.length === 0) {
                if (opponentInCheck) {
                    finalSan += '#';
                }
            } else if (opponentInCheck) {
                finalSan += '+';
            }

            const fen = this.getFEN();
            this.history.push({
                move,
                stateSnapshot,
                san: finalSan,
                fen,
                isCapture: !!capturedPiece,
                isCheck: opponentInCheck,
                isCheckmate: opponentMoves.length === 0 && opponentInCheck
            });
        }

        return true;
    }

    undoMove() {
        if (this.history.length === 0) return null;
        const last = this.history.pop();
        const { stateSnapshot } = last;

        this.board = stateSnapshot.board;
        this.turn = stateSnapshot.turn;
        this.castling = stateSnapshot.castling;
        this.enPassant = stateSnapshot.enPassant;
        this.halfMoveClock = stateSnapshot.halfMoveClock;
        this.fullMoveNumber = stateSnapshot.fullMoveNumber;
        this.capturedPieces = stateSnapshot.capturedPieces;

        return last;
    }

    generateSAN(move, piece, captured) {
        if (move.isCastle === 'K') return 'O-O';
        if (move.isCastle === 'Q') return 'O-O-O';

        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const fromCoord = `${files[move.from.col]}${8 - move.from.row}`;
        const toCoord = `${files[move.to.col]}${8 - move.to.row}`;

        let san = '';
        if (piece.type === 'p') {
            if (captured) {
                san = `${files[move.from.col]}x${toCoord}`;
            } else {
                san = toCoord;
            }
            if (move.promotion) {
                san += `=${move.promotion.toUpperCase()}`;
            }
        } else {
            san = piece.type.toUpperCase();
            if (captured) san += 'x';
            san += toCoord;
        }

        return san;
    }

    isGameOver() {
        const legalMoves = this.getAllLegalMoves(this.turn);
        const inCheck = this.isCheck(this.turn);

        if (legalMoves.length === 0) {
            if (inCheck) {
                return {
                    over: true,
                    winner: this.turn === 'w' ? 'b' : 'w',
                    reason: 'checkmate' // Mot
                };
            } else {
                return {
                    over: true,
                    winner: null,
                    reason: 'stalemate' // Pat
                };
            }
        }

        if (this.halfMoveClock >= 100) {
            return {
                over: true,
                winner: null,
                reason: 'fiftyMoveRule' // 50 yurish qoidasi
            };
        }

        if (this.isInsufficientMaterial()) {
            return {
                over: true,
                winner: null,
                reason: 'insufficientMaterial' // Yetarli tosh yo'q
            };
        }

        return { over: false };
    }

    isInsufficientMaterial() {
        let whitePieces = [];
        let blackPieces = [];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (p) {
                    if (p.type === 'q' || p.type === 'r' || p.type === 'p') return false;
                    if (p.color === 'w') whitePieces.push(p);
                    else blackPieces.push(p);
                }
            }
        }

        // King vs King
        if (whitePieces.length === 1 && blackPieces.length === 1) return true;

        // King + Knight vs King or King + Bishop vs King
        if ((whitePieces.length === 1 && blackPieces.length === 2 && (blackPieces[1].type === 'n' || blackPieces[1].type === 'b')) ||
            (blackPieces.length === 1 && whitePieces.length === 2 && (whitePieces[1].type === 'n' || whitePieces[1].type === 'b'))) {
            return true;
        }

        return false;
    }

    getFEN() {
        let fen = '';
        for (let r = 0; r < 8; r++) {
            let emptyCount = 0;
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (!p) {
                    emptyCount++;
                } else {
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }
                    fen += p.color === 'w' ? p.type.toUpperCase() : p.type.toLowerCase();
                }
            }
            if (emptyCount > 0) fen += emptyCount;
            if (r < 7) fen += '/';
        }

        fen += ` ${this.turn} `;

        let castlingStr = '';
        if (this.castling.wK) castlingStr += 'K';
        if (this.castling.wQ) castlingStr += 'Q';
        if (this.castling.bK) castlingStr += 'k';
        if (this.castling.bQ) castlingStr += 'q';
        fen += (castlingStr || '-') + ' ';

        if (this.enPassant) {
            const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            fen += `${files[this.enPassant.col]}${8 - this.enPassant.row} `;
        } else {
            fen += '- ';
        }

        fen += `${this.halfMoveClock} ${this.fullMoveNumber}`;
        return fen;
    }

    loadFEN(fen) {
        const parts = fen.trim().split(/\s+/);
        if (parts.length < 4) return false;

        const rows = parts[0].split('/');
        if (rows.length !== 8) return false;

        const newBoard = Array(8).fill(null).map(() => Array(8).fill(null));

        for (let r = 0; r < 8; r++) {
            let c = 0;
            for (const char of rows[r]) {
                if (/\d/.test(char)) {
                    c += parseInt(char, 10);
                } else {
                    const color = char === char.toUpperCase() ? 'w' : 'b';
                    const type = char.toLowerCase();
                    newBoard[r][c] = { type, color };
                    c++;
                }
            }
        }

        this.board = newBoard;
        this.turn = parts[1] === 'w' ? 'w' : 'b';

        const castling = parts[2];
        this.castling = {
            wK: castling.includes('K'),
            wQ: castling.includes('Q'),
            bK: castling.includes('k'),
            bQ: castling.includes('q')
        };

        if (parts[3] !== '-') {
            const file = parts[3].charCodeAt(0) - 97;
            const rank = 8 - parseInt(parts[3][1], 10);
            this.enPassant = { row: rank, col: file };
        } else {
            this.enPassant = null;
        }

        this.halfMoveClock = parts[4] ? parseInt(parts[4], 10) : 0;
        this.fullMoveNumber = parts[5] ? parseInt(parts[5], 10) : 1;
        return true;
    }
}

window.ChessEngine = ChessEngine;
