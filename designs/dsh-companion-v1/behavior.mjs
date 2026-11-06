// Local, bounded pet behavior. No model calls, desktop access or network access.
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export class PetBehavior {
  constructor({ width = 900, height = 500, halfWidth = 64, petHeight = 190, random = Math.random } = {}) {
    this.random = random;
    this.halfWidth = halfWidth;
    this.petHeight = petHeight;
    this.width = width;
    this.height = height;
    this.x = width * 0.66;
    this.y = height;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.action = 'idle';
    this.actionRevision = 0;
    this.remaining = 4;
    this.target = this.x;
    this.energy = 82;
    this.affection = 68;
    this.elapsed = 0;
    this.paused = false;
    this.autonomous = true;
    this.follow = false;
    this.dragging = false;
    this.falling = false;
    this.events = [];
    this.profile = { speed: 42, restSeconds: [4, 8], walkChance: 0.6, playChance: 0.25 };
    this.note('见到你啦，先在旁边待一会儿。');
  }

  note(text) {
    this.events.unshift({ at: this.elapsed, text });
    this.events.length = Math.min(this.events.length, 4);
  }

  setBounds(width, height, halfWidth = this.halfWidth, petHeight = this.petHeight) {
    const wasGrounded = Math.abs(this.y - this.height) < 2;
    this.width = Math.max(width, halfWidth * 2 + 2);
    this.height = Math.max(height, petHeight + 4);
    this.halfWidth = halfWidth;
    this.petHeight = petHeight;
    this.x = clamp(this.x, halfWidth, this.width - halfWidth);
    this.target = clamp(this.target, halfWidth, this.width - halfWidth);
    this.y = wasGrounded ? this.height : clamp(this.y, Math.min(petHeight, this.height), this.height);
  }

  setProfile(profile) {
    this.profile = { ...profile };
    this.note('换了一种相处节奏。');
    if (!this.dragging && !this.falling && this.action !== 'sleep') this.perform('idle', 2);
  }

  perform(action, seconds = 5, message) {
    if (this.dragging || this.falling) return false;
    this.action = action;
    this.actionRevision++;
    this.remaining = seconds;
    this.vx = 0;
    this.target = this.x;
    if (message) this.note(message);
    if (action === 'eat') { this.energy = clamp(this.energy + 12, 0, 100); this.affection = clamp(this.affection + 3, 0, 100); }
    if (action === 'react') this.affection = clamp(this.affection + 2, 0, 100);
    return true;
  }

  walkTo(target, message = '去那边看看，很快就回来。') {
    if (this.dragging || this.falling || ['sleep', 'sleep-in', 'wake'].includes(this.action)) return;
    this.target = clamp(target, this.halfWidth, this.width - this.halfWidth);
    this.facing = this.target >= this.x ? 1 : -1;
    this.action = 'walk';
    this.remaining = 30;
    if (message) this.note(message);
  }

  dragTo(x, y) {
    this.x = clamp(x, this.halfWidth, this.width - this.halfWidth);
    this.y = clamp(y, Math.min(this.petHeight, this.height), this.height);
  }

  startDrag() {
    this.dragging = true;
    this.falling = false;
    this.vx = 0;
    this.vy = 0;
    this.action = 'idle';
    this.note('欸？要带我去哪儿？');
  }

  release(vx = 0, vy = 0) {
    this.dragging = false;
    this.falling = true;
    this.vx = clamp(vx, -700, 700);
    this.vy = clamp(vy, -650, 800);
  }

  decide() {
    if (!this.autonomous || this.follow) { this.perform('idle', 3); return; }
    const choice = this.random();
    if (choice < this.profile.walkChance && this.width > this.halfWidth * 4) {
      let target = this.halfWidth + this.random() * (this.width - this.halfWidth * 2);
      if (Math.abs(target - this.x) < 90) target = this.x < this.width / 2 ? this.width - this.halfWidth - 8 : this.halfWidth + 8;
      this.walkTo(target);
    } else if (choice < this.profile.walkChance + this.profile.playChance) {
      const options = ['look', 'stretch', 'play'];
      const action = options[Math.floor(this.random() * options.length)];
      this.perform(action, 5, { look: '听到一点动静，想看看。', stretch: '站久了，伸个懒腰。', play: '让我和小猫玩一会儿。' }[action]);
    } else {
      const [a, b] = this.profile.restSeconds;
      this.perform('idle', a + this.random() * (b - a), '在这里安静陪着你。');
    }
  }

  step(seconds) {
    if (this.paused) return;
    // Limit a frame after tab suspension; elapsed time is not replayed as physics.
    const dt = clamp(seconds, 0, 0.05);
    this.elapsed += dt;
    if (this.dragging) return;
    if (this.falling) {
      this.vy += 1000 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      const left = this.halfWidth, right = this.width - this.halfWidth;
      if (this.x < left || this.x > right) { this.x = clamp(this.x, left, right); this.vx *= -0.4; }
      if (this.y < this.petHeight) { this.y = Math.min(this.petHeight, this.height); this.vy = Math.abs(this.vy) * 0.25; }
      if (this.y >= this.height) {
        this.y = this.height;
        this.vx = 0;
        this.vy = 0;
        this.falling = false;
        this.perform('react', 3, '站稳了！下次轻一点嘛。');
      }
      return;
    }
    if (this.action === 'sleep') { this.energy = Math.min(100, this.energy + dt * 0.4); return; }
    this.energy = Math.max(0, this.energy - dt * 0.018);
    this.remaining -= dt;
    if (this.action === 'walk') {
      const distance = this.target - this.x;
      const amount = this.profile.speed * dt;
      if (Math.abs(distance) <= amount + 1) {
        this.x = this.target;
        this.perform('idle', this.profile.restSeconds[0], '走到啦，停下来歇一会儿。');
      } else { this.facing = Math.sign(distance); this.x += Math.sign(distance) * amount; }
    }
    if (this.remaining <= 0) {
      if (this.action === 'sleep-in') this.perform('sleep', Infinity, '睡着了，醒来再陪你。');
      else if (this.action === 'wake') this.perform('idle', 4, '睡饱了，又能继续陪你啦。');
      else if (this.action !== 'idle') this.perform('idle', this.profile.restSeconds[0]);
      else this.decide();
    }
  }
}
