// Main Application Controller: Game State, AI Turns, Modals, History, Sound & Theme

class App {
    constructor() {
        this.gameType = 'chess'; // 'chess' or 'checkers'
        this.gameMode = 'ai'; // 'ai' or 'friend'
        this.playerColor = 'w'; // 'w' or 'b'
        this.aiDifficulty = 'medium'; // 'easy', 'medium', 'hard'
        this.timerMinutes = 5; // default 5 min blitz

        // Engines
        this.chessEngine = new ChessEngine();
        this.chessAI = new ChessAI();
        this.checkersEngine = new CheckersEngine();
        this.checkersAI = new CheckersAI();

        // Pending promotion move holder
        this.pendingPromotion = null;

        // Sound
        this.sound = window.soundManager;

        // Timer
        this.timer = new GameTimer({
            minutes: this.timerMinutes,
            onTick: (data) => this.onTimerTick(data),
            onTimeout: (color) => this.onTimerTimeout(color)
        });

        // UI Board
        this.ui = new BoardUI('board-container', {
            gameType: this.gameType,
            onSquareClick: (r, c) => this.handleSquareClick(r, c),
            onMoveAttempt: (from, to) => this.handleMoveAttempt(from, to)
        });

        this.initEventListeners();
        this.startNewGame();
    }

    getCurrentEngine() {
        return this.gameType === 'chess' ? this.chessEngine : this.checkersEngine;
    }

    getCurrentAI() {
        return this.gameType === 'chess' ? this.chessAI : this.checkersAI;
    }

    startNewGame() {
        const engine = this.getCurrentEngine();
        engine.reset();
        this.ui.clearSelection();
        this.ui.setLastMove(null, null);
        this.ui.setCheck(null);

        // Board orientation
        if (this.gameMode === 'ai' && this.playerColor === 'b') {
            if (!this.ui.flipped) this.ui.flipBoard();
        } else {
            if (this.ui.flipped) this.ui.flipBoard();
        }

        this.timer.setTime(this.timerMinutes);
        this.timer.start('w');

        this.updateUI();
        this.renderMoveHistory();
        this.updateCapturedPieces();

        // If player is Black and playing vs AI, AI moves first
        if (this.gameMode === 'ai' && this.playerColor === 'b') {
            this.triggerAIMove();
        }
    }

    handleSquareClick(row, col) {
        const engine = this.getCurrentEngine();

        // If game is over or AI is currently thinking, ignore input
        if (this.isAITurn()) return;
        if (engine.isGameOver().over) return;

        // If a piece is already selected
        if (this.ui.selectedSquare) {
            const from = this.ui.selectedSquare;
            // If clicking the same square, deselect
            if (from.row === row && from.col === col) {
                this.ui.clearSelection();
                this.updateUI();
                return;
            }

            // Check if (row, col) is a legal move
            const legalMoves = this.ui.legalMoves;
            const move = legalMoves.find(m => m.to.row === row && m.to.col === col);

            if (move) {
                this.executePlayerMove(move);
                return;
            }
        }

        // Otherwise select piece if it belongs to current player
        const piece = engine.getPiece(row, col);
        if (piece && piece.color === engine.turn) {
            // In checkers: if multi-jump chain is active, only that piece can be selected
            if (this.gameType === 'checkers' && engine.activeChainPiece) {
                if (engine.activeChainPiece.row !== row || engine.activeChainPiece.col !== col) {
                    return;
                }
            }

            this.ui.selectedSquare = { row, col };
            this.ui.legalMoves = engine.getLegalMovesForSquare(row, col);
            this.sound.playClick();
            this.updateUI();
        } else {
            this.ui.clearSelection();
            this.updateUI();
        }
    }

    handleMoveAttempt(from, to) {
        if (this.isAITurn()) return;
        const engine = this.getCurrentEngine();
        if (engine.isGameOver().over) return;

        const legalMoves = engine.getLegalMovesForSquare(from.row, from.col);
        const move = legalMoves.find(m => m.to.row === to.row && m.to.col === to.col);

        if (move) {
            this.executePlayerMove(move);
        } else {
            this.ui.clearSelection();
            this.updateUI();
        }
    }

    executePlayerMove(move) {
        const engine = this.getCurrentEngine();

        // Check if Chess pawn promotion is required
        if (this.gameType === 'chess' && move.from && move.to) {
            const piece = engine.getPiece(move.from.row, move.from.col);
            if (piece && piece.type === 'p') {
                const promoRank = piece.color === 'w' ? 0 : 7;
                if (move.to.row === promoRank && !move.promotion) {
                    // Show promotion modal
                    this.pendingPromotion = move;
                    this.showPromotionModal(piece.color);
                    return;
                }
            }
        }

        this.applyMove(move);
    }

    applyMove(move) {
        const engine = this.getCurrentEngine();
        const prevTurn = engine.turn;

        let result = false;
        let isCapture = false;

        if (this.gameType === 'chess') {
            const pieceAtDest = engine.getPiece(move.to.row, move.to.col);
            isCapture = !!pieceAtDest || !!move.isEnPassant;
            result = engine.makeMove(move);

            if (result) {
                this.ui.setLastMove(move.from, move.to);
                this.ui.clearSelection();

                // Sound effects
                if (engine.isCheck(engine.turn)) {
                    this.sound.playCheck();
                } else if (move.isCastle) {
                    this.sound.playCastle();
                } else if (isCapture) {
                    this.sound.playCapture();
                } else if (move.promotion) {
                    this.sound.playPromotion();
                } else {
                    this.sound.playMove();
                }

                // Check highlight
                if (engine.isCheck(engine.turn)) {
                    this.ui.setCheck(engine.findKing(engine.turn));
                } else {
                    this.ui.setCheck(null);
                }
            }
        } else {
            // Checkers
            const res = engine.makeMove(move);
            if (res && res.success) {
                result = true;
                this.ui.setLastMove(move.from, move.to);
                this.ui.clearSelection();

                if (move.isCapture) {
                    this.sound.playCapture();
                } else {
                    this.sound.playMove();
                }

                if (res.promoted) {
                    this.sound.playPromotion();
                }
            }
        }

        if (result) {
            this.timer.switchTurn(engine.turn);
            this.updateUI();
            this.renderMoveHistory();
            this.updateCapturedPieces();

            // Check Game Over
            const gameOver = engine.isGameOver();
            if (gameOver.over) {
                this.handleGameOver(gameOver);
                return;
            }

            // Check if AI needs to move next
            if (this.gameMode === 'ai' && engine.turn !== this.playerColor) {
                this.triggerAIMove();
            } else if (this.gameType === 'checkers' && engine.activeChainPiece && this.gameMode === 'ai' && engine.turn === this.playerColor) {
                // Multi-jump continues for human, auto-select the piece
                this.ui.selectedSquare = engine.activeChainPiece;
                this.ui.legalMoves = engine.getAllLegalMoves(engine.turn);
                this.updateUI();
            }
        }
    }

    triggerAIMove() {
        this.setAIThinking(true);
        const engine = this.getCurrentEngine();
        const ai = this.getCurrentAI();

        // Small realistic thinking delay
        setTimeout(() => {
            const bestMove = ai.getBestMove(engine, this.aiDifficulty);
            this.setAIThinking(false);

            if (bestMove) {
                const res = this.applyAIMove(bestMove);

                // If Checkers multi-jump chain for AI
                if (this.gameType === 'checkers' && engine.activeChainPiece) {
                    setTimeout(() => this.triggerAIMove(), 350);
                }
            }
        }, 400);
    }

    applyAIMove(move) {
        const engine = this.getCurrentEngine();

        // In chess, default promotion to Queen for AI
        if (this.gameType === 'chess' && !move.promotion) {
            const piece = engine.getPiece(move.from.row, move.from.col);
            if (piece && piece.type === 'p') {
                const promoRank = piece.color === 'w' ? 0 : 7;
                if (move.to.row === promoRank) {
                    move.promotion = 'q';
                }
            }
        }

        let isCapture = false;
        if (this.gameType === 'chess') {
            const pieceAtDest = engine.getPiece(move.to.row, move.to.col);
            isCapture = !!pieceAtDest || !!move.isEnPassant;
            engine.makeMove(move);

            this.ui.setLastMove(move.from, move.to);
            this.ui.clearSelection();

            if (engine.isCheck(engine.turn)) {
                this.sound.playCheck();
                this.ui.setCheck(engine.findKing(engine.turn));
            } else {
                this.ui.setCheck(null);
                if (move.isCastle) this.sound.playCastle();
                else if (isCapture) this.sound.playCapture();
                else if (move.promotion) this.sound.playPromotion();
                else this.sound.playMove();
            }
        } else {
            // Checkers
            const res = engine.makeMove(move);
            this.ui.setLastMove(move.from, move.to);
            this.ui.clearSelection();

            if (move.isCapture) this.sound.playCapture();
            else this.sound.playMove();
            if (res.promoted) this.sound.playPromotion();
        }

        this.timer.switchTurn(engine.turn);
        this.updateUI();
        this.renderMoveHistory();
        this.updateCapturedPieces();

        const gameOver = engine.isGameOver();
        if (gameOver.over) {
            this.handleGameOver(gameOver);
        }
    }

    isAITurn() {
        if (this.gameMode !== 'ai') return false;
        const engine = this.getCurrentEngine();
        return engine.turn !== this.playerColor;
    }

    setAIThinking(thinking) {
        const aiIndicator = document.getElementById('ai-thinking-indicator');
        if (aiIndicator) {
            aiIndicator.style.display = thinking ? 'flex' : 'none';
        }
    }

    updateUI() {
        const engine = this.getCurrentEngine();
        this.ui.render(engine);
        this.updateEvaluationBar();
        this.updatePlayerCards();
    }

    updateEvaluationBar() {
        const evalBar = document.getElementById('eval-bar-fill');
        const evalScore = document.getElementById('eval-score');
        if (!evalBar || !evalScore) return;

        if (this.gameType === 'chess') {
            evalBar.parentElement.style.display = 'flex';
            const score = this.chessAI.evaluate(this.chessEngine.board);
            // Convert score to percentage: -1000 to +1000 centipawns maps to 5% - 95%
            const pct = Math.max(5, Math.min(95, 50 + (score / 1500) * 50));
            evalBar.style.height = `${pct}%`;

            const pawnUnits = (score / 100).toFixed(1);
            evalScore.textContent = score > 0 ? `+${pawnUnits}` : (score < 0 ? pawnUnits : '0.0');
        } else {
            // Checkers evaluation
            evalBar.parentElement.style.display = 'flex';
            const score = this.checkersAI.evaluate(this.checkersEngine.board);
            const pct = Math.max(5, Math.min(95, 50 + (score / 1000) * 50));
            evalBar.style.height = `${pct}%`;
            evalScore.textContent = score > 0 ? `+${Math.round(score/100)}` : Math.round(score/100);
        }
    }

    updatePlayerCards() {
        const engine = this.getCurrentEngine();
        const topCard = document.getElementById('player-top');
        const bottomCard = document.getElementById('player-bottom');

        if (!topCard || !bottomCard) return;

        const isWhiteBottom = !this.ui.flipped;
        const topColor = isWhiteBottom ? 'b' : 'w';
        const bottomColor = isWhiteBottom ? 'w' : 'b';

        // Active turn glow
        topCard.classList.toggle('active-turn', engine.turn === topColor);
        bottomCard.classList.toggle('active-turn', engine.turn === bottomColor);

        // Names
        const topName = document.getElementById('player-top-name');
        const bottomName = document.getElementById('player-bottom-name');

        if (this.gameMode === 'ai') {
            if (this.playerColor === topColor) {
                topName.textContent = "Siz (O'yinchi)";
                bottomName.textContent = `Kompyuter (${this.getDifficultyLabel()})`;
            } else {
                bottomName.textContent = "Siz (O'yinchi)";
                topName.textContent = `Kompyuter (${this.getDifficultyLabel()})`;
            }
        } else {
            topName.textContent = topColor === 'w' ? "Oqlar (O'yinchi 1)" : "Qoralar (O'yinchi 2)";
            bottomName.textContent = bottomColor === 'w' ? "Oqlar (O'yinchi 1)" : "Qoralar (O'yinchi 2)";
        }
    }

    getDifficultyLabel() {
        const labels = {
            easy: 'Oson',
            medium: "O'rta",
            hard: 'Qiyin'
        };
        return labels[this.aiDifficulty] || "O'rta";
    }

    updateCapturedPieces() {
        const engine = this.getCurrentEngine();
        const whiteCapEl = document.getElementById('captured-white');
        const blackCapEl = document.getElementById('captured-black');
        if (!whiteCapEl || !blackCapEl) return;

        whiteCapEl.innerHTML = '';
        blackCapEl.innerHTML = '';

        if (this.gameType === 'chess') {
            const piecesByW = engine.capturedPieces.w; // black pieces captured by white
            const piecesByB = engine.capturedPieces.b; // white pieces captured by black

            piecesByW.forEach(p => {
                const span = document.createElement('span');
                span.className = 'captured-piece';
                span.innerHTML = this.ui.getChessSVG(p.type, 'b');
                whiteCapEl.appendChild(span);
            });

            piecesByB.forEach(p => {
                const span = document.createElement('span');
                span.className = 'captured-piece';
                span.innerHTML = this.ui.getChessSVG(p.type, 'w');
                blackCapEl.appendChild(span);
            });
        } else {
            const piecesByW = engine.capturedPieces.w;
            const piecesByB = engine.capturedPieces.b;

            piecesByW.forEach(() => {
                const span = document.createElement('span');
                span.className = 'captured-piece-checker dark';
                whiteCapEl.appendChild(span);
            });

            piecesByB.forEach(() => {
                const span = document.createElement('span');
                span.className = 'captured-piece-checker light';
                blackCapEl.appendChild(span);
            });
        }
    }

    renderMoveHistory() {
        const historyList = document.getElementById('move-history-list');
        if (!historyList) return;

        const engine = this.getCurrentEngine();
        historyList.innerHTML = '';

        const history = engine.history;
        if (history.length === 0) {
            historyList.innerHTML = '<div class="empty-history">Hali yurishlar qilinmadi</div>';
            return;
        }

        let currentTurnRow = null;

        history.forEach((item, idx) => {
            if (idx % 2 === 0) {
                currentTurnRow = document.createElement('div');
                currentTurnRow.className = 'history-row';

                const numCol = document.createElement('span');
                numCol.className = 'move-num';
                numCol.textContent = `${Math.floor(idx / 2) + 1}.`;
                currentTurnRow.appendChild(numCol);

                const whiteMove = document.createElement('span');
                whiteMove.className = 'move-white';
                whiteMove.textContent = item.san || item.notation;
                currentTurnRow.appendChild(whiteMove);

                historyList.appendChild(currentTurnRow);
            } else if (currentTurnRow) {
                const blackMove = document.createElement('span');
                blackMove.className = 'move-black';
                blackMove.textContent = item.san || item.notation;
                currentTurnRow.appendChild(blackMove);
            }
        });

        // Auto-scroll to bottom of history
        historyList.scrollTop = historyList.scrollHeight;
    }

    onTimerTick(data) {
        const isWhiteBottom = !this.ui.flipped;
        const topClock = document.getElementById('player-top-time');
        const bottomClock = document.getElementById('player-bottom-time');

        if (!topClock || !bottomClock) return;

        if (isWhiteBottom) {
            bottomClock.textContent = data.whiteTimeStr;
            topClock.textContent = data.blackTimeStr;
            bottomClock.classList.toggle('low-time', data.isLowWhite);
            topClock.classList.toggle('low-time', data.isLowBlack);
        } else {
            topClock.textContent = data.whiteTimeStr;
            bottomClock.textContent = data.blackTimeStr;
            topClock.classList.toggle('low-time', data.isLowWhite);
            bottomClock.classList.toggle('low-time', data.isLowBlack);
        }
    }

    onTimerTimeout(color) {
        const winner = color === 'w' ? 'b' : 'w';
        this.handleGameOver({
            over: true,
            winner,
            reason: 'timeout'
        });
    }

    handleGameOver(result) {
        this.timer.stop();

        const modal = document.getElementById('gameover-modal');
        const title = document.getElementById('gameover-title');
        const subtitle = document.getElementById('gameover-subtitle');

        let winnerText = '';
        if (result.winner === 'w') {
            winnerText = "Oqlar g'alaba qozondi!";
        } else if (result.winner === 'b') {
            winnerText = "Qoralar g'alaba qozondi!";
        } else {
            winnerText = "Durrang!";
        }

        let reasonText = '';
        switch (result.reason) {
            case 'checkmate':
                reasonText = 'Mot! Shoh hujum ostida qoldi va qochishga yo\'l yo\'q.';
                break;
            case 'stalemate':
                reasonText = 'Pat! Shohga hujum yo\'q, ammo qoidalarga muvofiq yurish imkoni qolmagan.';
                break;
            case 'timeout':
                reasonText = 'Vaqt tugadi!';
                break;
            case 'noPieces':
                reasonText = 'Raqibning barcha toshlari olib qo\'yildi!';
                break;
            case 'noMoves':
                reasonText = 'Raqibning yurish imkoniyati qolmadi (qamal holati)!';
                break;
            case 'resign':
                reasonText = 'Raqib taslim bo\'ldi.';
                break;
            case 'fiftyMoveRule':
                reasonText = '50 ta yurish davomida tosh olinmadi va piyoda surilmadi (Durrang).';
                break;
            case 'insufficientMaterial':
                reasonText = 'Mot qilish uchun taxtada yetarli tosh yo\'q (Durrang).';
                break;
            default:
                reasonText = 'O\'yin yakunlandi.';
        }

        title.textContent = winnerText;
        subtitle.textContent = reasonText;

        // Sound
        if (result.winner) {
            if (this.gameMode === 'ai') {
                if (result.winner === this.playerColor) {
                    this.sound.playVictory();
                } else {
                    this.sound.playDefeat();
                }
            } else {
                this.sound.playVictory();
            }
        }

        if (modal) modal.style.display = 'flex';
    }

    showPromotionModal(color) {
        const modal = document.getElementById('promotion-modal');
        const piecesContainer = document.getElementById('promotion-pieces');
        if (!modal || !piecesContainer) return;

        piecesContainer.innerHTML = '';
        const pieces = ['q', 'r', 'b', 'n'];

        pieces.forEach(type => {
            const btn = document.createElement('div');
            btn.className = 'promotion-option';
            btn.innerHTML = this.ui.getChessSVG(type, color);
            btn.onclick = () => {
                modal.style.display = 'none';
                if (this.pendingPromotion) {
                    this.pendingPromotion.promotion = type;
                    this.applyMove(this.pendingPromotion);
                    this.pendingPromotion = null;
                }
            };
            piecesContainer.appendChild(btn);
        });

        modal.style.display = 'flex';
    }

    undo() {
        const engine = this.getCurrentEngine();
        if (engine.history.length === 0) return;

        // If vs AI, undo two moves (player and AI)
        if (this.gameMode === 'ai' && engine.history.length >= 2) {
            engine.undoMove();
            engine.undoMove();
        } else {
            engine.undoMove();
        }

        this.ui.clearSelection();
        this.ui.setLastMove(null, null);
        this.ui.setCheck(this.gameType === 'chess' && engine.isCheck(engine.turn) ? engine.findKing(engine.turn) : null);
        this.updateUI();
        this.renderMoveHistory();
        this.updateCapturedPieces();
    }

    initEventListeners() {
        // Game Selector (Chess / Checkers)
        const btnChess = document.getElementById('select-chess');
        const btnCheckers = document.getElementById('select-checkers');

        btnChess.addEventListener('click', () => {
            if (this.gameType === 'chess') return;
            btnChess.classList.add('active');
            btnCheckers.classList.remove('active');
            this.gameType = 'chess';
            this.ui.setGameType('chess');
            this.startNewGame();
        });

        btnCheckers.addEventListener('click', () => {
            if (this.gameType === 'checkers') return;
            btnCheckers.classList.add('active');
            btnChess.classList.remove('active');
            this.gameType = 'checkers';
            this.ui.setGameType('checkers');
            this.startNewGame();
        });

        // New game button
        document.getElementById('btn-new-game')?.addEventListener('click', () => this.startNewGame());
        document.getElementById('modal-btn-restart')?.addEventListener('click', () => {
            document.getElementById('gameover-modal').style.display = 'none';
            this.startNewGame();
        });

        // Flip board
        document.getElementById('btn-flip-board')?.addEventListener('click', () => {
            this.ui.flipBoard();
            this.updateUI();
        });

        // Undo move
        document.getElementById('btn-undo')?.addEventListener('click', () => this.undo());

        // Resign
        document.getElementById('btn-resign')?.addEventListener('click', () => {
            const engine = this.getCurrentEngine();
            if (engine.isGameOver().over) return;
            const winner = engine.turn === 'w' ? 'b' : 'w';
            this.handleGameOver({
                over: true,
                winner,
                reason: 'resign'
            });
        });

        // Sound toggle
        const soundBtn = document.getElementById('btn-toggle-sound');
        soundBtn?.addEventListener('click', () => {
            const enabled = this.sound.toggle();
            soundBtn.textContent = enabled ? '🔊 Ovoz yoqilgan' : '🔇 Ovoz o\'chirilgan';
        });

        // Mode switch (AI vs Friend)
        document.getElementById('select-mode')?.addEventListener('change', (e) => {
            this.gameMode = e.target.value;
            const diffContainer = document.getElementById('difficulty-container');
            const colorContainer = document.getElementById('color-container');
            if (diffContainer) diffContainer.style.display = this.gameMode === 'ai' ? 'block' : 'none';
            if (colorContainer) colorContainer.style.display = this.gameMode === 'ai' ? 'block' : 'none';
            this.startNewGame();
        });

        // AI Difficulty
        document.getElementById('select-difficulty')?.addEventListener('change', (e) => {
            this.aiDifficulty = e.target.value;
        });

        // Player Color
        document.getElementById('select-color')?.addEventListener('change', (e) => {
            let col = e.target.value;
            if (col === 'random') {
                col = Math.random() < 0.5 ? 'w' : 'b';
            }
            this.playerColor = col;
            this.startNewGame();
        });

        // Time Control
        document.getElementById('select-time')?.addEventListener('change', (e) => {
            this.timerMinutes = parseInt(e.target.value, 10);
            this.startNewGame();
        });

        // Board Theme switcher
        document.getElementById('select-theme')?.addEventListener('change', (e) => {
            const theme = e.target.value;
            const container = document.getElementById('board-container');
            container.classList.remove('theme-wood', 'theme-emerald', 'theme-slate', 'theme-classic');
            container.classList.add(`theme-${theme}`);
        });

        // Rules modal
        const rulesModal = document.getElementById('rules-modal');
        document.getElementById('btn-rules')?.addEventListener('click', () => {
            rulesModal.style.display = 'flex';
        });
        document.getElementById('btn-close-rules')?.addEventListener('click', () => {
            rulesModal.style.display = 'none';
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
