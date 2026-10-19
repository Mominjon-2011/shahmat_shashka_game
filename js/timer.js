// Chess / Checkers Dual Timer Clock System

class GameTimer {
    constructor(options = {}) {
        this.initialMinutes = options.minutes || 0; // 0 = unlimited
        this.whiteTime = this.initialMinutes * 60;
        this.blackTime = this.initialMinutes * 60;
        this.activeColor = null;
        this.interval = null;
        this.isRunning = false;
        this.onTick = options.onTick || (() => {});
        this.onTimeout = options.onTimeout || (() => {});
    }

    setTime(minutes) {
        this.stop();
        this.initialMinutes = minutes;
        this.whiteTime = minutes * 60;
        this.blackTime = minutes * 60;
        this.activeColor = null;
        this.notifyTick();
    }

    start(color = 'w') {
        if (this.initialMinutes === 0) return; // Unlimited
        this.activeColor = color;
        this.isRunning = true;
        clearInterval(this.interval);

        this.interval = setInterval(() => {
            if (!this.isRunning) return;

            if (this.activeColor === 'w') {
                this.whiteTime = Math.max(0, this.whiteTime - 1);
                if (this.whiteTime <= 0) {
                    this.stop();
                    this.onTimeout('w');
                    return;
                }
            } else if (this.activeColor === 'b') {
                this.blackTime = Math.max(0, this.blackTime - 1);
                if (this.blackTime <= 0) {
                    this.stop();
                    this.onTimeout('b');
                    return;
                }
            }

            this.notifyTick();
        }, 1000);
    }

    switchTurn(newColor) {
        if (this.initialMinutes === 0) return;
        this.activeColor = newColor;
        this.notifyTick();
    }

    pause() {
        this.isRunning = false;
        clearInterval(this.interval);
    }

    resume() {
        if (this.initialMinutes === 0 || !this.activeColor) return;
        this.start(this.activeColor);
    }

    stop() {
        this.isRunning = false;
        clearInterval(this.interval);
        this.interval = null;
    }

    reset() {
        this.stop();
        this.whiteTime = this.initialMinutes * 60;
        this.blackTime = this.initialMinutes * 60;
        this.activeColor = null;
        this.notifyTick();
    }

    formatTime(seconds) {
        if (this.initialMinutes === 0) return '∞';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    notifyTick() {
        this.onTick({
            whiteTimeStr: this.formatTime(this.whiteTime),
            blackTimeStr: this.formatTime(this.blackTime),
            whiteSeconds: this.whiteTime,
            blackSeconds: this.blackTime,
            activeColor: this.activeColor,
            isLowWhite: this.initialMinutes > 0 && this.whiteTime <= 20,
            isLowBlack: this.initialMinutes > 0 && this.blackTime <= 20
        });
    }
}

window.GameTimer = GameTimer;
