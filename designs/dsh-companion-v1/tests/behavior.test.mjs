import test from 'node:test';
import assert from 'node:assert/strict';
import { PetBehavior } from '../behavior.mjs';

function advance(pet, seconds) { for (let i = 0; i < seconds * 60; i++) pet.step(1 / 60); }

test('a thrown pet lands inside the work area even after an extreme throw', () => {
  const pet = new PetBehavior({ width: 600, height: 450 });
  pet.startDrag();
  pet.dragTo(590, 230);
  pet.release(10000, -10000);
  pet.autonomous = false;
  advance(pet, 8);
  assert.equal(pet.falling, false);
  assert.equal(pet.y, 450);
  assert.ok(pet.x >= pet.halfWidth && pet.x <= pet.width - pet.halfWidth);
});

test('resizing and size changes keep a grounded pet and its target on screen', () => {
  const pet = new PetBehavior({ width: 1000, height: 600 });
  pet.walkTo(990);
  pet.setBounds(340, 350, 91, 300);
  assert.equal(pet.y, 350);
  assert.ok(pet.x <= 249);
  assert.ok(pet.target <= 249);
});

test('sleep requires explicit waking and restores energy without autonomous walking', () => {
  const pet = new PetBehavior({ width: 600, height: 450, random: () => 0 });
  pet.energy = 40;
  pet.perform('sleep-in', 1);
  advance(pet, 10);
  assert.equal(pet.action, 'sleep');
  assert.ok(pet.energy > 40);
  pet.autonomous = false;
  pet.perform('wake', 1);
  advance(pet, 2);
  assert.equal(pet.action, 'idle');
});

test('pause freezes physics and resuming continues a pending fall', () => {
  const pet = new PetBehavior({ width: 600, height: 450 });
  pet.startDrag();pet.dragTo(300, 230);pet.release(0, 0);
  pet.paused = true;
  advance(pet, 3);
  assert.equal(pet.y, 230);
  pet.paused = false;
  advance(pet, 3);
  assert.equal(pet.y, 450);
  assert.equal(pet.falling, false);
});

test('quiet autonomy never moves until enabled; autonomous walking reaches a destination', () => {
  const pet = new PetBehavior({ width: 600, height: 450, random: () => 0.2 });
  pet.autonomous = false;
  const start = pet.x;
  advance(pet, 12);
  assert.equal(pet.x, start);
  pet.autonomous = true;
  pet.remaining = 0;
  advance(pet, 1);
  assert.equal(pet.action, 'walk');
  assert.notEqual(pet.x, start);
});
