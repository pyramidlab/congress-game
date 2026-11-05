import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isHost} from '../src/lib/host-access';
test('production host access follows the configured UID allowlist',()=>{
 assert.equal(isHost('operator',false,'operator, backup',false),true);
 assert.equal(isHost('other',true,'operator, backup',false),false);
 assert.equal(isHost('operator',true,'',false),false);
 assert.equal(isHost('operator',true,'backup',false),false);
 assert.equal(isHost('test-host',true,'',true),true);
 assert.equal(isHost('test-player',false,'',true),false);
});
