import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {validateCandidateMap} from './candidate-map.mjs';
const read=()=>JSON.parse(fs.readFileSync(new URL('../../.local/dsh-pet-host-20261104/backend-template/runtime-candidates.json',import.meta.url)));
test('both fixed candidates retain their content identity and validated geometry',()=>{const x=read();assert.equal(validateCandidateMap(x),x);assert.notEqual(x.provenance.newKey,x.provenance.legacyKey);});
test('invalid alpha span is rejected before native input mapping',()=>{const x=read();x.contents[x.provenance.newKey].geometry.hitRows[0]=[10,9];assert.throws(()=>validateCandidateMap(x),/BACKEND_CANDIDATE_INVALID/);});
test('derivative paths cannot escape the private media directory',()=>{const x=read();x.contents[x.provenance.newKey].media.idle.file='../other.webm';assert.throws(()=>validateCandidateMap(x),/BACKEND_CANDIDATE_INVALID/);});
test('prop must name a manifest asset bound by a required hash',()=>{const x=read();x.contents[x.provenance.newKey].props[0].asset='unregistered-prop';assert.throws(()=>validateCandidateMap(x),/BACKEND_CANDIDATE_INVALID/);});
