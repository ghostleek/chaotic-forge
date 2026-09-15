export const DINO_MARIO = Object.freeze({
    version: 'dino-mario/2',
    width: 720,
    height: 320,
    ground: 258,
    playerX: 112,
    playerWidth: 28,
    playerHeight: 40,
    stepMs: 1000 / 60,
    finishTick: 1800,
    speed: 3,
    gravity: 0.6,
    jump: -11,
    bounce: -10,
    startingLives: 3,
    maxLives: 4,
    protectionTicks: 90
});
export const DINO_MARIO_PROVENANCE = Object.freeze({
    source: 'Google Dino and Mario — user-supplied references.',
    interpretation: 'An original scrolling runner with obstacle jumps and enemy stomp bounce.',
    decision: 'Use Dino × Mario as the default simulated onboarding example.',
    origin: 'Simulated demo · fixed authored example'
});
const COURSE = [
    [
        360,
        'meat'
    ],
    [
        600,
        'block'
    ],
    [
        1100,
        'walker'
    ],
    [
        1140,
        'block'
    ],
    [
        1600,
        'meat'
    ],
    [
        1800,
        'block'
    ],
    [
        2300,
        'walker'
    ],
    [
        2340,
        'block'
    ],
    [
        3100,
        'block'
    ],
    [
        3350,
        'meat'
    ],
    [
        3600,
        'walker'
    ],
    [
        3640,
        'block'
    ],
    [
        4400,
        'walker'
    ],
    [
        4440,
        'block'
    ]
];
export function encounterSize(kind) {
    if (kind === 'meat') return {
        width: 24,
        height: 24
    };
    return kind === 'block' ? {
        width: 28,
        height: 38
    } : {
        width: 30,
        height: 28
    };
}
export function createDinoMarioGame() {
    return {
        status: 'ready',
        tick: 0,
        feet: DINO_MARIO.ground,
        vy: 0,
        jumpDown: false,
        stomps: 0,
        lives: DINO_MARIO.startingLives,
        big: false,
        protection: 0,
        hits: 0,
        meat: 0,
        encounters: COURSE.map(([x, kind], id)=>({
                id,
                kind,
                x
            }))
    };
}
export function dinoPlayerSize(game) {
    const scale = game.big ? 1.4 : 1;
    return {
        width: DINO_MARIO.playerWidth * scale,
        height: DINO_MARIO.playerHeight * scale
    };
}
export function dinoScore(game) {
    return Math.floor(game.tick / 6) + game.stomps * 100 + game.meat * 50 + (game.status === 'won' ? 500 + game.lives * 100 : 0);
}
function axisTimes(min, max, targetMin, targetMax, delta) {
    if (delta === 0) return max > targetMin && min < targetMax ? [
        -Infinity,
        Infinity
    ] : null;
    const a = (targetMin - max) / delta;
    const b = (targetMax - min) / delta;
    return [
        Math.min(a, b),
        Math.max(a, b)
    ];
}
export function stepDinoMarioGame(previous, jumpDown = false) {
    if (previous.status !== 'playing') return previous;
    const c = DINO_MARIO;
    const game = {
        ...previous,
        tick: previous.tick + 1,
        protection: Math.max(0, previous.protection - 1),
        jumpDown,
        encounters: previous.encounters.map((e)=>({
                ...e
            }))
    };
    if (jumpDown && !previous.jumpDown && game.feet === c.ground) game.vy = c.jump;
    game.vy += c.gravity;
    let remaining = 1;
    while(remaining > 0){
        const dx = c.speed * remaining;
        const dy = game.vy * remaining;
        let contact;
        const player = dinoPlayerSize(game);
        for (const entity of game.encounters){
            if (game.protection > 0 && entity.kind !== 'meat') continue;
            const size = encounterSize(entity.kind);
            const top = c.ground - size.height;
            const x = axisTimes(c.playerX, c.playerX + player.width, entity.x, entity.x + size.width, dx);
            const y = axisTimes(game.feet - player.height, game.feet, top, c.ground, dy);
            if (!x || !y) continue;
            const time = Math.max(0, x[0], y[0]);
            const exit = Math.min(1, x[1], y[1]);
            if (time > exit || time >= x[1] || time >= y[1]) continue;
            if (!contact || time < contact.time) {
                contact = {
                    entity,
                    time,
                    top: dy > 0 && game.feet <= top && y[0] > x[0]
                };
            }
        }
        const time = contact?.time ?? 1;
        game.feet += dy * time;
        for (const entity of game.encounters)entity.x -= dx * time;
        if (!contact) break;
        game.encounters = game.encounters.filter((e)=>e.id !== contact.entity.id);
        if (contact.entity.kind === 'meat') {
            game.meat++;
            game.big = true;
            game.lives = Math.min(c.maxLives, game.lives + 1);
        } else if (contact.entity.kind === 'walker' && contact.top) {
            game.stomps++;
            game.vy = c.bounce;
        } else {
            game.hits++;
            game.lives--;
            game.big = false;
            game.protection = c.protectionTicks;
            if (game.lives === 0) {
                game.status = 'lost';
                break;
            }
        }
        remaining *= 1 - time;
    }
    if (game.feet >= c.ground) {
        game.feet = c.ground;
        game.vy = 0;
    }
    game.encounters = game.encounters.filter((e)=>e.x + encounterSize(e.kind).width >= 0);
    if (game.status === 'playing' && game.tick >= c.finishTick) game.status = 'won';
    return game;
}

export class DinoPartyRuntime {
    bound;
    game;
    pending = null;
    rules;
    constructor(build, seed){
        this.bound = JSON.stringify(build);
        this.reset(build, seed);
    }
    reset(build, seed) {
        if (JSON.stringify(build) !== this.bound || !build.runnerRules || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid runner manifest or seed');
        this.rules = {
            ...build.runnerRules
        };
        this.game = {
            ...createDinoMarioGame(),
            status: 'playing'
        };
        this.pending = null;
        return this.snapshot();
    }
    input(frame) {
        if (this.pending || this.isComplete() || frame.tick !== this.game.tick || !Number.isInteger(frame.buttons) || frame.buttons < 0 || frame.buttons > 63 || frame.yaw !== 0 || frame.pitch !== 0) throw new Error('Invalid runner input frame');
        this.pending = {
            ...frame
        };
    }
    step() {
        if (!this.pending) throw new Error('Runner step needs one input');
        this.game = stepDinoMarioGame(this.game, (this.pending.buttons & 17) !== 0);
        this.pending = null;
        return this.snapshot();
    }
    isComplete() {
        return this.game.status === 'won' || this.game.status === 'lost';
    }
    snapshot() {
        const points = dinoScore(this.game) + this.game.stomps * this.rules.stompBonus + this.game.meat * this.rules.meatBonus + (this.game.status === 'won' ? this.rules.finishBonus : 0);
        return {
            tick: this.game.tick,
            completed: this.isComplete(),
            completedOrders: 0,
            failedOrders: 0,
            points,
            hits: this.game.hits,
            state: {
                kind: 'dino',
                title: 'Dino × Mario',
                ...this.game,
                encounters: this.game.encounters.map((e)=>({
                        ...e
                    })),
                points,
                gameOver: this.isComplete(),
                maxLives: 4,
                feedback: this.game.status === 'won' ? 'COURSE COMPLETE' : this.game.status === 'lost' ? 'NO LIVES LEFT' : this.game.protection ? 'HIT · KEEP RUNNING' : this.game.big ? 'POWERED UP' : 'JUMP · STOMP · EAT'
            }
        };
    }
    validateScore(build, trial) {
        if (JSON.stringify(build) !== this.bound || trial.buildHash !== build.contentHash || trial.buildId !== build.buildId || !trial.endedEarly) throw new Error('Runner trial manifest mismatch');
        const replay = new DinoPartyRuntime(build, trial.seed);
        for (const frame of trial.frames){
            replay.input(frame);
            replay.step();
        }
        if (!replay.isComplete()) throw new Error('Runner trace must reach a replay-verified finish or elimination');
        const end = replay.snapshot();
        return {
            completedOrders: 0,
            failedOrders: 0,
            points: end.points,
            hits: end.hits
        };
    }
}
export const createDinoRuntime = (build, seed)=>new DinoPartyRuntime(build, seed);
