// UI Controller: Board Rendering, SVG Pieces, Drag & Drop, Touch, Highlights

class BoardUI {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.gameType = options.gameType || 'chess'; // 'chess' or 'checkers'
        this.flipped = false; // false: White bottom, true: Black bottom
        this.rotateOpponent = options.rotateOpponent || false;
        this.selectedSquare = null; // { row, col }
        this.legalMoves = []; // array of valid destination squares
        this.lastMove = null; // { from: {row, col}, to: {row, col} }
        this.checkSquare = null; // { row, col }
        this.onMoveAttempt = options.onMoveAttempt || (() => {});
        this.onSquareClick = options.onSquareClick || (() => {});

        // Dragging state
        this.draggedPiece = null;
        this.dragGhost = null;
        this.dragStartSquare = null;

        this.initDOM();
        this.initDragAndTouch();
    }

    // High quality vector SVG symbols for chess pieces
    getChessSVG(type, color) {
        const isWhite = color === 'w';
        const fill = isWhite ? '#ffffff' : '#262421';
        const stroke = isWhite ? '#262421' : '#f0f0f0';
        const strokeWidth = '1.5';

        const svgs = {
            k: `<svg viewBox="0 0 45 45" class="piece-svg chess-${color}k">
                <g fill="none" fill-rule="evenodd" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22.5 11.63V6M20 8h5" stroke-linejoin="miter"/>
                    <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="${fill}" stroke-linecap="butt"/>
                    <path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-6s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V23v-2.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v6z" fill="${fill}"/>
                    <path d="M12.5 30c5.5-3 14.5-3 20 0m-20 3.5c5.5-3.5 14.5-3.5 20 0m-20 3.5c5.5-3 14.5-3 20 0"/>
                </g>
            </svg>`,
            q: `<svg viewBox="0 0 45 45" class="piece-svg chess-${color}q">
                <g fill="none" fill-rule="evenodd" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.5-14-8 14-8-14-.5 14-7.5-11.5L9 26z" fill="${fill}" stroke-linecap="butt"/>
                    <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" fill="${fill}"/>
                    <path d="M11.5 30c3.5-1 18.5-1 22 0m-21.5 4c4-1 15-1 19 0m-17.5 3.5c4-1 11-1 15 0"/>
                    <circle cx="6" cy="12" r="2" fill="${fill}"/>
                    <circle cx="14" cy="9" r="2" fill="${fill}"/>
                    <circle cx="22.5" cy="8" r="2" fill="${fill}"/>
                    <circle cx="31" cy="9" r="2" fill="${fill}"/>
                    <circle cx="39" cy="12" r="2" fill="${fill}"/>
                </g>
            </svg>`,
            r: `<svg viewBox="0 0 45 45" class="piece-svg chess-${color}r">
                <g fill="none" fill-rule="evenodd" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 39h27v-3H9v3zm3-3v-4.5h21V36H12zm2-4.5l1.5-13.5h14L31 31.5H14zM11 14h23v-5H11v5z" fill="${fill}"/>
                    <path d="M12 9V5h4v3h5V5h4v3h5V5h4v4H12z" fill="${fill}"/>
                    <path d="M14 29.5v-13h17v13H14z" stroke-linecap="butt"/>
                    <path d="M12 36c7-1 14-1 21 0m-20-4.5c6.5-.5 13-.5 19 0"/>
                </g>
            </svg>`,
            b: `<svg viewBox="0 0 45 45" class="piece-svg chess-${color}b">
                <g fill="none" fill-rule="evenodd" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
                    <g fill="${fill}">
                        <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/>
                        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
                        <circle cx="22.5" cy="8.5" r="2.5"/>
                    </g>
                    <path d="M17.5 26h10M15 30h15m-7.5-14.5v5m-2.5-2.5h5" stroke-linejoin="miter"/>
                </g>
            </svg>`,
            n: `<svg viewBox="0 0 45 45" class="piece-svg chess-${color}n">
                <g fill="none" fill-rule="evenodd" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="${fill}"/>
                    <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0-.64 1.46-1 2.5-.42 1.22-1.74 1.5-2 2.5-.5 2 4 4 6 4 3 0 5-1.5 6-3 0 0 2.5-4.5 4.5-3.5s2.5 1 4.5.5c1-.25 2-1 3-2 0 0 3-4 1-8.5-2-4.5-4-5.5-4-5.5z" fill="${fill}"/>
                    <circle cx="9.5" cy="25.5" r="1.5" fill="${stroke}"/>
                    <path d="M15 15.5c2 1 4 2 6 2" stroke-linecap="round"/>
                </g>
            </svg>`,
            p: `<svg viewBox="0 0 45 45" class="piece-svg chess-${color}p">
                <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
                    fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
                ${isWhite ? '<path d="M12 36.5c6-1 15-1 21 0m-18-4c5-.7 11-.7 15 0" stroke="#262421" stroke-width="1.2" fill="none"/>' : ''}
            </svg>`
        };
        return svgs[type] || '';
    }

    // High quality 3D vector SVG for checkers piece
    getCheckersSVG(type, color) {
        const isWhite = color === 'w';
        const isKing = type === 'king';

        const outerFill = isWhite ? 'url(#wCheckGrad)' : 'url(#bCheckGrad)';
        const borderStroke = isWhite ? '#b58863' : '#111111';
        const crownFill = isWhite ? '#d97706' : '#fbbf24';

        return `<svg viewBox="0 0 60 60" class="piece-svg checkers-piece checkers-${color} ${isKing ? 'checkers-king' : ''}">
            <defs>
                <radialGradient id="wCheckGrad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stop-color="#ffffff"/>
                    <stop offset="70%" stop-color="#e2e8f0"/>
                    <stop offset="100%" stop-color="#cbd5e1"/>
                </radialGradient>
                <radialGradient id="bCheckGrad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stop-color="#475569"/>
                    <stop offset="60%" stop-color="#1e293b"/>
                    <stop offset="100%" stop-color="#0f172a"/>
                </radialGradient>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.45"/>
                </filter>
            </defs>
            <g filter="url(#shadow)">
                <circle cx="30" cy="30" r="25" fill="${outerFill}" stroke="${borderStroke}" stroke-width="2.5"/>
                <circle cx="30" cy="30" r="19" fill="none" stroke="${isWhite ? '#cbd5e1' : '#334155'}" stroke-width="1.5"/>
                <circle cx="30" cy="30" r="14" fill="none" stroke="${isWhite ? '#94a3b8' : '#1e293b'}" stroke-width="1.2"/>
            </g>
            ${isKing ? `
                <g transform="translate(16, 17) scale(0.6)">
                    <path d="M2 38h44v6H2z" fill="${crownFill}" stroke="#92400e" stroke-width="2"/>
                    <path d="M4 36l3-18 10 11 7-15 7 15 10-11 3 18z" fill="${crownFill}" stroke="#92400e" stroke-width="2"/>
                    <circle cx="7" cy="16" r="3" fill="#fef08a"/>
                    <circle cx="24" cy="9" r="3" fill="#fef08a"/>
                    <circle cx="41" cy="16" r="3" fill="#fef08a"/>
                </g>
            ` : ''}
        </svg>`;
    }

    initDOM() {
        this.container.innerHTML = '';
        this.boardEl = document.createElement('div');
        this.boardEl.className = 'board-grid';
        this.container.appendChild(this.boardEl);

        // Coordinates overlays
        this.coordLettersEl = document.createElement('div');
        this.coordLettersEl.className = 'board-coords coords-letters';
        this.coordNumbersEl = document.createElement('div');
        this.coordNumbersEl.className = 'board-coords coords-numbers';
        this.container.appendChild(this.coordLettersEl);
        this.container.appendChild(this.coordNumbersEl);

        this.renderCoordinates();
    }

    renderCoordinates() {
        this.coordLettersEl.innerHTML = '';
        this.coordNumbersEl.innerHTML = '';

        const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const displayLetters = this.flipped ? [...letters].reverse() : letters;

        displayLetters.forEach(letter => {
            const span = document.createElement('span');
            span.className = 'coord-letter';
            span.textContent = letter;
            this.coordLettersEl.appendChild(span);
        });

        for (let i = 0; i < 8; i++) {
            const rank = this.flipped ? i + 1 : 8 - i;
            const span = document.createElement('span');
            span.className = 'coord-number';
            span.textContent = rank;
            this.coordNumbersEl.appendChild(span);
        }
    }

    setGameType(type) {
        this.gameType = type;
        this.clearSelection();
        this.lastMove = null;
        this.checkSquare = null;
    }

    flipBoard() {
        this.flipped = !this.flipped;
        this.renderCoordinates();
    }

    clearSelection() {
        this.selectedSquare = null;
        this.legalMoves = [];
    }

    // Render full board from current engine state
    render(engine) {
        this.boardEl.innerHTML = '';

        if (this.rotateOpponent) {
            this.container.classList.add('rotate-opponent');
        } else {
            this.container.classList.remove('rotate-opponent');
        }

        const topColor = this.flipped ? 'w' : 'b';
        const displayRows = this.flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
        const displayCols = this.flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

        for (const r of displayRows) {
            for (const c of displayCols) {
                const square = document.createElement('div');
                const isLight = (r + c) % 2 === 0;
                square.className = `square ${isLight ? 'light' : 'dark'}`;
                square.dataset.row = r;
                square.dataset.col = c;

                // Highlighting: Selected
                if (this.selectedSquare && this.selectedSquare.row === r && this.selectedSquare.col === c) {
                    square.classList.add('selected');
                }

                // Highlighting: Last move from/to
                if (this.lastMove && this.lastMove.from && this.lastMove.to) {
                    if ((this.lastMove.from.row === r && this.lastMove.from.col === c) ||
                        (this.lastMove.to.row === r && this.lastMove.to.col === c)) {
                        square.classList.add('last-move');
                    }
                }

                // Highlighting: Check square (in chess)
                if (this.checkSquare && this.checkSquare.row === r && this.checkSquare.col === c) {
                    square.classList.add('in-check');
                }

                // Highlighting: Legal move target
                const legalMove = this.legalMoves.find(m => m.to.row === r && m.to.col === c);
                if (legalMove) {
                    const marker = document.createElement('div');
                    if (engine.getPiece(r, c) || legalMove.isCapture || legalMove.isEnPassant) {
                        marker.className = 'move-marker capture-ring';
                    } else {
                        marker.className = 'move-marker dot';
                    }
                    square.appendChild(marker);
                }

                // Render Piece
                const piece = engine.getPiece(r, c);
                if (piece) {
                    const pieceContainer = document.createElement('div');
                    pieceContainer.className = 'piece';
                    if (this.rotateOpponent && piece.color === topColor) {
                        pieceContainer.classList.add('is-top-player');
                    }
                    pieceContainer.dataset.row = r;
                    pieceContainer.dataset.col = c;
                    pieceContainer.dataset.color = piece.color;
                    pieceContainer.dataset.type = piece.type;

                    if (this.gameType === 'chess') {
                        pieceContainer.innerHTML = this.getChessSVG(piece.type, piece.color);
                    } else {
                        pieceContainer.innerHTML = this.getCheckersSVG(piece.type, piece.color);
                    }

                    square.appendChild(pieceContainer);
                }

                this.boardEl.appendChild(square);
            }
        }
    }

    setRotateOpponent(enabled) {
        this.rotateOpponent = enabled;
        if (enabled) {
            this.container.classList.add('rotate-opponent');
        } else {
            this.container.classList.remove('rotate-opponent');
        }
    }

    // Set highlights
    setLastMove(from, to) {
        if (!from || !to) {
            this.lastMove = null;
        } else {
            this.lastMove = { from, to };
        }
    }

    setCheck(square) {
        this.checkSquare = square || null;
    }

    // Drag & Drop + Pointer/Touch handlers
    initDragAndTouch() {
        let isPointerDown = false;
        let startSquare = null;
        let ghostEl = null;

        const onPointerDown = (e) => {
            const pieceEl = e.target.closest('.piece');
            const squareEl = e.target.closest('.square');
            if (!squareEl) return;

            const row = parseInt(squareEl.dataset.row, 10);
            const col = parseInt(squareEl.dataset.col, 10);

            if (pieceEl) {
                isPointerDown = true;
                startSquare = { row, col };
                this.dragStartSquare = startSquare;

                // Create floating ghost element for dragging
                ghostEl = pieceEl.cloneNode(true);
                ghostEl.classList.add('dragging-ghost');
                if (pieceEl.classList.contains('is-top-player')) {
                    ghostEl.classList.add('rotated-ghost');
                }
                document.body.appendChild(ghostEl);

                const moveGhost = (clientX, clientY) => {
                    const size = 64;
                    ghostEl.style.left = `${clientX - size / 2}px`;
                    ghostEl.style.top = `${clientY - size / 2}px`;
                };

                moveGhost(e.clientX, e.clientY);

                const onPointerMove = (moveEvt) => {
                    if (!isPointerDown || !ghostEl) return;
                    moveGhost(moveEvt.clientX, moveEvt.clientY);
                };

                const onPointerUp = (upEvt) => {
                    document.removeEventListener('pointermove', onPointerMove);
                    document.removeEventListener('pointerup', onPointerUp);

                    if (ghostEl) {
                        ghostEl.remove();
                        ghostEl = null;
                    }

                    isPointerDown = false;

                    // Detect target square under pointer release
                    const elemUnder = document.elementFromPoint(upEvt.clientX, upEvt.clientY);
                    const destSquareEl = elemUnder ? elemUnder.closest('.square') : null;

                    if (destSquareEl) {
                        const destRow = parseInt(destSquareEl.dataset.row, 10);
                        const destCol = parseInt(destSquareEl.dataset.col, 10);

                        // If dragged to a different square, trigger move attempt
                        if (destRow !== startSquare.row || destCol !== startSquare.col) {
                            this.onMoveAttempt(startSquare, { row: destRow, col: destCol });
                            return;
                        }
                    }

                    // Otherwise regular click handler
                    this.onSquareClick(row, col);
                };

                document.addEventListener('pointermove', onPointerMove);
                document.addEventListener('pointerup', onPointerUp);
            } else {
                // Click on empty square
                this.onSquareClick(row, col);
            }
        };

        this.boardEl.addEventListener('pointerdown', onPointerDown);
    }
}

window.BoardUI = BoardUI;
