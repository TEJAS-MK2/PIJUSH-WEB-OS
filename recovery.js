(()=>{"use strict";
const FORMAT="pijush-os-backup",VERSION=1,MAX_FILES=10000,MAX_BYTES=25*1024*1024,MAX_PATH=512;
function validateEntries(entries){
 if(!Array.isArray(entries)||entries.length>MAX_FILES)throw Error("Backup contains an invalid number of files");
 const seen=new Set();let bytes=0;
 return entries.map(entry=>{
  if(!Array.isArray(entry)||entry.length!==2)throw Error("Invalid backup entry");
  const path=entry[0],value=entry[1];
  if(typeof path!=="string"||!path||path.length>MAX_PATH||path.startsWith("/")||path.includes("\\")||path.split("/").some(part=>!part||part==="."||part===".."))throw Error("Unsafe backup path");
  if(seen.has(path))throw Error("Duplicate backup path: "+path);seen.add(path);
  if(!value||typeof value!=="object"||Array.isArray(value)||!["file","dir"].includes(value.type))throw Error("Invalid file record: "+path);
  const clean={type:value.type};
  if(value.type==="file"){
   if(typeof value.content!=="string")throw Error("File content is invalid: "+path);
   bytes+=new TextEncoder().encode(value.content).length;
   if(bytes>MAX_BYTES)throw Error("Backup exceeds the 25 MB limit");
   clean.content=value.content;
  }
  return [path,clean];
 });
}
function createBackup(entries){const files=validateEntries(entries);return JSON.stringify({format:FORMAT,version:VERSION,createdAt:new Date().toISOString(),files})}
function parseBackup(input){
 if(typeof input!=="string"||input.length>MAX_BYTES+1024*1024)throw Error("Backup file is too large");
 let data;try{data=JSON.parse(input)}catch{throw Error("Backup is not valid JSON")}
 if(!data||data.format!==FORMAT||data.version!==VERSION||!Array.isArray(data.files))throw Error("Unsupported PIJUSH OS backup format");
 return {format:FORMAT,version:VERSION,createdAt:typeof data.createdAt==="string"?data.createdAt:null,files:validateEntries(data.files)};
}
const api={createBackup,parseBackup,validateEntries,format:FORMAT,version:VERSION,maxBytes:MAX_BYTES};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
if(typeof window!=="undefined")window.PIJUSHRecovery=api;
})();