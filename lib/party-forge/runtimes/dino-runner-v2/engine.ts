import type { BuildManifest, PartyRuntime, RuntimeInput, TrialInput } from '../../contracts.ts';
import { createDinoMarioGame, stepDinoMarioGame, dinoScore, type DinoMarioState } from '../../demos/dino-mario.ts';

export class DinoPartyRuntime implements PartyRuntime {
  private bound: string;
  private game!: DinoMarioState;
  private pending: RuntimeInput | null = null;
  private rules!: NonNullable<BuildManifest['runnerRules']>;
  constructor(build: BuildManifest, seed: number) { this.bound = JSON.stringify(build); this.reset(build, seed); }
  reset(build: BuildManifest, seed: number) {
    if (JSON.stringify(build) !== this.bound || !build.runnerRules || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid runner manifest or seed');
    this.rules = {...build.runnerRules};
    this.game = {...createDinoMarioGame(), status: 'playing'};
    this.pending = null;
    return this.snapshot();
  }
  input(frame: RuntimeInput) {
    if (this.pending || this.isComplete() || frame.tick !== this.game.tick || !Number.isInteger(frame.buttons) || frame.buttons < 0 || frame.buttons > 63 || frame.yaw !== 0 || frame.pitch !== 0) throw new Error('Invalid runner input frame');
    this.pending = {...frame};
  }
  step() {
    if (!this.pending) throw new Error('Runner step needs one input');
    this.game = stepDinoMarioGame(this.game, (this.pending.buttons & 17) !== 0);
    this.pending = null;
    return this.snapshot();
  }
  isComplete() { return this.game.status === 'won' || this.game.status === 'lost'; }
  snapshot() {
    const points = dinoScore(this.game) + this.game.stomps * this.rules.stompBonus + this.game.meat * this.rules.meatBonus + (this.game.status === 'won' ? this.rules.finishBonus : 0);
    return {tick: this.game.tick, completed: this.isComplete(), completedOrders: 0, failedOrders: 0, points, hits: this.game.hits,
      state: {kind: 'dino', title: 'Dino × Mario', ...this.game, encounters: this.game.encounters.map(e=>({...e})), points, gameOver: this.isComplete(), maxLives: 4,
        feedback: this.game.status === 'won' ? 'COURSE COMPLETE' : this.game.status === 'lost' ? 'NO LIVES LEFT' : this.game.protection ? 'HIT · KEEP RUNNING' : this.game.big ? 'POWERED UP' : 'JUMP · STOMP · EAT'}};
  }
  validateScore(build: BuildManifest, trial: TrialInput) {
    if (JSON.stringify(build) !== this.bound || trial.buildHash !== build.contentHash || trial.buildId !== build.buildId || !trial.endedEarly) throw new Error('Runner trial manifest mismatch');
    const replay = new DinoPartyRuntime(build, trial.seed);
    for (const frame of trial.frames) { replay.input(frame); replay.step(); }
    if (!replay.isComplete()) throw new Error('Runner trace must reach a replay-verified finish or elimination');
    const end = replay.snapshot();
    return {completedOrders: 0, failedOrders: 0, points: end.points, hits: end.hits};
  }
}
export const createDinoRuntime = (build: BuildManifest, seed: number) => new DinoPartyRuntime(build, seed);
