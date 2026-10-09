const test=require("node:test");
const assert=require("node:assert/strict");
const system=require("../system-center.js");

test("snapshot names are trimmed and constrained",()=>{
 assert.equal(system.validateSnapshotName("  Before update  "),"Before update");
 assert.throws(()=>system.validateSnapshotName("   "),/1 to 48/i);
 assert.throws(()=>system.validateSnapshotName("x".repeat(49)),/1 to 48/i);
 assert.throws(()=>system.validateSnapshotName("bad\nname"),/control characters/i);
});

test("snapshot records preserve backup content and metadata",()=>{
 const backup=JSON.stringify({format:"pijush-os-backup",version:1,files:[]});
 const snapshot=system.makeSnapshot("Stable baseline",backup,"2026-10-09T00:00:00.000Z");
 assert.equal(snapshot.name,"Stable baseline");
 assert.equal(snapshot.backup,backup);
 assert.equal(snapshot.bytes,Buffer.byteLength(backup));
 assert.equal(system.validateSnapshotRecord(snapshot),true);
});

test("snapshot validation rejects malformed records",()=>{
 assert.throws(()=>system.validateSnapshotRecord(null),/Invalid snapshot ID/i);
 assert.throws(()=>system.validateSnapshotRecord({id:"short",name:"x",createdAt:"no date",backup:"{}"}),/Invalid snapshot ID/i);
 assert.throws(()=>system.validateSnapshotRecord({id:"12345678",name:"x",createdAt:"not-a-date",backup:"{}"}),/Invalid snapshot date/i);
});

test("snapshots are bounded to 8 MB",()=>{
 assert.throws(()=>system.makeSnapshot("too large","x".repeat(8*1024*1024+1)),/8 MB/i);
});
