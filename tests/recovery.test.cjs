const test=require("node:test");
const assert=require("node:assert/strict");
const recovery=require("../recovery.js");
const sample=[["Desktop",{type:"dir"}],["notes.txt",{type:"file",content:"saved notes"}],["InstalledApps/demo.pijapp",{type:"file",content:"{}"}]];
test("creates and parses a PIJUSH OS backup without losing file records",()=>{const parsed=recovery.parseBackup(recovery.createBackup(sample));assert.equal(parsed.files.length,3);assert.deepEqual(parsed.files,sample)});
test("rejects unknown backup formats and malformed JSON",()=>{assert.throws(()=>recovery.parseBackup("{"),/valid JSON/i);assert.throws(()=>recovery.parseBackup(JSON.stringify({format:"other",version:1,files:[]})),/format/i)});
test("rejects traversal, absolute, duplicate, and invalid entries",()=>{for(const path of ["../secret","/absolute","folder/../secret","folder\\secret"])assert.throws(()=>recovery.createBackup([[path,{type:"file",content:"x"}]]));assert.throws(()=>recovery.createBackup([["same",{type:"dir"}],["same",{type:"dir"}]]),/Duplicate/i);assert.throws(()=>recovery.createBackup([["bad",{type:"link"}]]),/Invalid file record/i)});
test("rejects oversized file payloads and too many entries",()=>{assert.throws(()=>recovery.createBackup([["large",{type:"file",content:"x".repeat(26*1024*1024)}]]),/25 MB/i);assert.throws(()=>recovery.validateEntries(Array.from({length:10001},(_,i)=>["f"+i,{type:"dir"}])),/number of files/i)});
test("backup round-trip preserves installed package and settings data",()=>{const input=[["System/settings.json",{type:"file",content:'{"sound":false}'}],["AppData/demo/data.txt",{type:"file",content:"persist me"}]];assert.deepEqual(recovery.parseBackup(recovery.createBackup(input)).files,input)});
