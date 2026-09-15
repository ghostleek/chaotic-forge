export const GRID_WIDTH = 32;
export const GRID_HEIGHT = 24;
const same = (a, b) => a.x === b.x && a.y === b.y;
const inside = (p) => p.x > 0 && p.x < GRID_WIDTH - 1 && p.y > 0 && p.y < GRID_HEIGHT - 1;
/** Retained original grid game. Simulation has no browser, timers or network. */
export class PixelRuntime {
    bound;
    seed = 0;
    tick = 0;
    pending = null;
    turn = null;
    rules;
    verticalSpeed = 0;
    foodTarget = 3;
    state;
    constructor(build, seed) { this.bound = JSON.stringify(build); this.reset(build, seed); }
    random() {
        this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
        return this.seed / 4294967296;
    }
    reset(build, seed) {
        if (JSON.stringify(build) !== this.bound)
            throw new Error('Runtime manifest mismatch');
        if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
            throw new Error('Invalid seed');
        this.seed = seed >>> 0;
        this.tick = 0;
        this.pending = null;
        this.turn = null;
        if (!build.pixelRules)
            throw new Error('Missing generated pixel rules');
        this.rules = structuredClone(build.pixelRules);
        this.verticalSpeed = 0;
        this.foodTarget = this.rules.foodCount;
        this.state = {
            kind: 'pixel', mode: this.rules.mode, title: this.rules.title, palette: this.rules.palette,
            platforms: [{ x: 4, y: 17 }, { x: 11, y: 12 }, { x: 19, y: 8 }, { x: 25, y: 15 }], snake: [{ x: 16, y: 18 }, { x: 16, y: 19 }, { x: 16, y: 20 }],
            direction: { x: 0, y: -1 }, food: [{ x: 16, y: 15 }],
            aliens: this.rules.invaders ? [{ x: 16, y: 8 }, { x: 5, y: 3 }, { x: 25, y: 5 }] : [], shots: [],
            lives: 3, gameOver: false, points: 0, hits: 0, kills: 0, eaten: 0, feedback: 'EAT. GROW. ZAP.', flashUntil: 0,
            metrics: { snakeFood: 0, invaderHits: 0, bounceShots: 0, shots: 0, foodSpawned: 1 },
        };
        if (this.rules.mode !== 'snake')
            this.state.snake = [{ x: 16, y: 21 }];
        this.fillFood();
        return this.snapshot();
    }
    fillFood() {
        for (let attempts = 0; this.state.food.length < this.foodTarget && attempts < 128; attempts++) {
            const p = { x: 2 + Math.floor(this.random() * 28), y: 3 + Math.floor(this.random() * 18) };
            if ([...this.state.snake, ...this.state.food, ...this.state.aliens].some(c => same(c, p)))
                continue;
            this.state.food.push(p);
            this.state.metrics.foodSpawned++;
        }
    }
    input(frame) {
        if (this.pending || this.isComplete() || frame.tick !== this.tick || !Number.isInteger(frame.buttons) || frame.buttons < 0 || frame.buttons > 63 || frame.yaw !== 0 || frame.pitch !== 0)
            throw new Error('Invalid pixel input frame');
        this.pending = { ...frame };
        const d = frame.buttons & 1 ? { x: 0, y: -1 } : frame.buttons & 2 ? { x: 0, y: 1 } : frame.buttons & 4 ? { x: -1, y: 0 } : frame.buttons & 8 ? { x: 1, y: 0 } : null;
        if (d && !(d.x === -this.state.direction.x && d.y === -this.state.direction.y))
            this.turn = d;
    }
    crash() {
        if (this.state.gameOver)
            return;
        this.state.points = Math.max(0, this.state.points - this.rules.hitPenalty);
        this.state.hits++;
        this.state.flashUntil = this.tick + 30;
        this.state.lives = Math.max(0, 3 - this.state.hits);
        this.state.gameOver = this.state.lives === 0;
        this.state.feedback = this.state.gameOver ? 'GAME OVER. NO LIVES LEFT.' : `${this.state.lives} LIVES LEFT`;
        if (this.state.gameOver)
            return;
        this.state.snake = this.rules.mode === 'snake' ? [{ x: 16, y: 18 }, { x: 16, y: 19 }, { x: 16, y: 20 }] : [{ x: 16, y: 21 }];
        this.verticalSpeed = 0;
        this.state.direction = { x: 0, y: -1 };
        this.turn = null;
        this.state.aliens = this.state.aliens.filter(a => !this.state.snake.some(s => same(a, s)));
    }
    step() {
        if (!this.pending)
            throw new Error('A captured frame is required');
        const buttons = this.pending.buttons;
        this.pending = null;
        const s = this.state;
        if (s.gameOver) {
            this.tick++;
            return this.snapshot();
        }
        if (this.rules.mode === 'snake' && this.tick % this.rules.moveTicks === 0) {
            if (this.turn) {
                s.direction = this.turn;
                this.turn = null;
            }
            const head = { x: s.snake[0].x + s.direction.x, y: s.snake[0].y + s.direction.y };
            if (this.rules.wrapWalls) {
                head.x = head.x <= 0 ? 30 : head.x >= 31 ? 1 : head.x;
                head.y = head.y <= 0 ? 22 : head.y >= 23 ? 1 : head.y;
            }
            const food = s.food.findIndex(p => same(p, head));
            const body = food >= 0 ? s.snake : s.snake.slice(0, -1);
            if (!inside(head) || body.some(p => same(p, head)) || s.aliens.some(p => same(p, head)))
                this.crash();
            else {
                s.snake.unshift(head);
                if (food >= 0) {
                    s.food.splice(food, 1);
                    s.points += this.rules.foodPoints;
                    s.eaten++;
                    s.metrics.snakeFood++;
                    s.feedback = `+${this.rules.foodPoints} / NOM NOM`;
                    if (!this.rules.growTail || s.snake.length > 40)
                        s.snake.pop();
                    this.fillFood();
                }
                else
                    s.snake.pop();
            }
        }
        if (this.rules.mode !== 'snake')
            this.moveArcade(buttons);
        if (s.gameOver) {
            this.tick++;
            return this.snapshot();
        }
        if (this.rules.shooting && this.tick % this.rules.fireTicks === 0 && s.shots.length < 64) {
            s.shots.push({ x: Math.round(s.snake[0].x), y: Math.round(s.snake[0].y), dx: this.rules.mode === 'snake' ? s.direction.x : 0, dy: this.rules.mode === 'snake' ? s.direction.y : -1, bounces: this.rules.ricochet ? 1 : 0 });
            s.metrics.shots++;
        }
        if (this.tick % 3 === 0) {
            s.shots = s.shots.filter(shot => {
                let next = { x: shot.x + shot.dx, y: shot.y + shot.dy };
                if (!inside(next)) {
                    if (!shot.bounces)
                        return false;
                    if (next.x <= 0 || next.x >= GRID_WIDTH - 1)
                        shot.dx *= -1;
                    if (next.y <= 0 || next.y >= GRID_HEIGHT - 1)
                        shot.dy *= -1;
                    shot.bounces--;
                    s.metrics.bounceShots++;
                    next = { x: shot.x + shot.dx, y: shot.y + shot.dy };
                }
                shot.x = next.x;
                shot.y = next.y;
                const enemy = s.aliens.findIndex(a => same(a, shot));
                if (enemy < 0)
                    return true;
                s.aliens.splice(enemy, 1);
                s.points += this.rules.alienPoints;
                s.kills++;
                s.metrics.invaderHits++;
                s.feedback = `+${this.rules.alienPoints} / INVADER ZAPPED`;
                return false;
            });
        }
        if (this.tick > 0 && this.tick % this.rules.alienStepTicks === 0) {
            for (const alien of s.aliens)
                alien.y++;
            if (s.aliens.some(a => same(a, s.snake[0])))
                this.crash();
            s.aliens = s.aliens.filter(a => a.y < GRID_HEIGHT - 1);
        }
        if (s.gameOver) {
            this.tick++;
            return this.snapshot();
        }
        if (this.rules.invaders && this.tick % 120 === 0 && s.aliens.length < 18) {
            const alien = { x: 2 + Math.floor(this.random() * 28), y: 2 };
            if (!s.aliens.some(a => same(a, alien)))
                s.aliens.push(alien);
        }
        this.tick++;
        if (this.tick % 60 === 0)
            s.points += this.rules.survivalPoints;
        return this.snapshot();
    }
    moveArcade(buttons) {
        const s = this.state, p = s.snake[0];
        const direction = buttons & 4 ? -1 : buttons & 8 ? 1 : 0;
        if (this.rules.mode === 'invaders') {
            if (this.tick % Math.max(2, Math.round(this.rules.moveTicks / 3)) === 0)
                p.x += direction;
            p.x = this.rules.wrapWalls ? (p.x < 1 ? 30 : p.x > 30 ? 1 : p.x) : Math.max(1, Math.min(30, p.x));
            if (this.tick % 12 === 0) {
                for (const food of s.food)
                    food.y++;
                s.food = s.food.filter(food => food.y < 23);
            }
        }
        else {
            const oldY = p.y;
            p.x += direction * (1.8 / this.rules.moveTicks);
            p.x = this.rules.wrapWalls ? (p.x < 1 ? 30 : p.x > 30 ? 1 : p.x) : Math.max(1, Math.min(30, p.x));
            this.verticalSpeed = Math.min(0.42, this.verticalSpeed + 0.018);
            p.y += this.verticalSpeed;
            const platform = s.platforms.find(f => p.x >= f.x - 0.5 && p.x <= f.x + 4.5 && oldY < f.y && p.y >= f.y - 0.8);
            if (this.verticalSpeed > 0 && (platform || p.y >= 21)) {
                p.y = platform ? platform.y - 1 : 21;
                this.verticalSpeed = -0.56;
            }
        }
        const food = s.food.findIndex(f => Math.abs(f.x - p.x) < 1 && Math.abs(f.y - p.y) < 1);
        if (food >= 0) {
            s.food.splice(food, 1);
            s.eaten++;
            s.metrics.snakeFood++;
            s.points += this.rules.foodPoints;
            s.feedback = `+${this.rules.foodPoints} / COLLECTED`;
        }
        if (s.aliens.some(a => Math.abs(a.x - p.x) < 1 && Math.abs(a.y - p.y) < 1))
            this.crash();
        this.fillFood();
    }
    snapshot() {
        return { tick: this.tick, completed: this.isComplete(), completedOrders: 0, failedOrders: 0,
            points: this.state.points, hits: this.state.hits,
            state: { ...this.state, platforms: this.state.platforms.map(p => ({ ...p })), direction: { ...this.state.direction }, metrics: { ...this.state.metrics },
                snake: this.state.snake.map(p => ({ ...p })), food: this.state.food.map(p => ({ ...p })),
                aliens: this.state.aliens.map(p => ({ ...p })), shots: this.state.shots.map(p => ({ ...p })) } };
    }
    isComplete() { return this.tick >= 3600; }
    validateScore(build, trial) {
        if (JSON.stringify(build) !== this.bound || trial.buildHash !== build.contentHash || trial.buildId !== build.buildId || trial.frames.length !== 3600)
            throw new Error('Pixel trial manifest mismatch');
        const replay = new PixelRuntime(build, trial.seed);
        for (const frame of trial.frames) {
            replay.input(frame);
            replay.step();
        }
        const end = replay.snapshot();
        return { completedOrders: 0, failedOrders: 0, points: end.points, hits: end.hits };
    }
}
export const createPixelRuntime = (build, seed) => new PixelRuntime(build, seed);
