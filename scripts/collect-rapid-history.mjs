// Battlefield 6 Rapid Royale server-side hourly snapshots.
// Only writes confirmed game-mode counters; never invents older matches.
import {readFileSync, writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";

const CUTOFF_MS = 50 * 24 * 60 * 60 * 1000;
const MODE = /^rapid[\s_-]*royale(?:[\s_-]*(?:solo|solos|duo|duos|trio|trios|squad|squads|[0-9]+))*$/i;
const MODE_FIELDS = new Set(["mode","gamemode","gameMode","game_mode","modeName","gamemodeName","gameModeName","playlist","playlistName","name","displayName","id"]);
const FIELDS = ["wins","losses","kills","deaths","assists","revives"];
const ALIASES = {
  wins:["wins","matchesWon","gamesWon"],
  losses:["losses","loses","matchesLost","gamesLost"],
  kills:["kills","playerKills","killsTotal"],
  deaths:["deaths","playerDeaths"],
  assists:["killAssists","assists","killAssistCount"],
  revives:["revives","reviveCount"]
};

export const keyFor = player => player.platform + ":" + player.name.toLowerCase();
export function asCount(value) {
  if(typeof value === "number")return Number.isSafeInteger(value)&&value>=0?value:null;
  if(typeof value!=="string")return null;
  const s=value.trim();
  if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(s))return null;
  const n=Number(s.replace(/\./g,""));
  return Number.isSafeInteger(n)&&n>=0?n:null;
}
function countsFrom(node) {
  if(!node||typeof node!=="object"||Array.isArray(node))return null;
  const candidates=[node,node.stats,node.overview,node.data,node.data?.stats,node.playerStats,node.global];
  const found=candidates.map(x=>{
    if(!x||typeof x!=="object"||Array.isArray(x))return null;
    const v={};
    for(const field of FIELDS){
      let count=null;
      for(const alias of ALIASES[field]){count=asCount(x[alias]);if(count!==null)break;}
      v[field]=count;
    }
    return v;
  }).filter(Boolean);
  found.sort((a,b)=>FIELDS.filter(k=>b[k]!==null).length-FIELDS.filter(k=>a[k]!==null).length);
  return found[0]||null;
}
export function findRapidStats(payload) {
  const candidates=[],seen=new WeakSet();
  let examined=0;
  function visit(obj,path,depth){
    if(!obj||typeof obj!=="object"||depth>10||seen.has(obj)||++examined>4500)return;
    seen.add(obj);
    if(!Array.isArray(obj)){
      for(const [field,val] of Object.entries(obj)){
        if(MODE_FIELDS.has(field)&&typeof val==="string"&&MODE.test(val))
          candidates.push({obj,label:val,path:[...path,val]});
      }
    }
    for(const [k,v] of Object.entries(obj)){
      if(!v||typeof v!=="object")continue;
      if(MODE.test(k))candidates.push({obj:v,label:k,path:[...path,k]});
      visit(v,[...path,k],depth+1);
    }
  }
  visit(payload,[],0);
  const viable=candidates.map(c=>{
    const values=countsFrom(c.obj);
    if(values?.wins===null||values?.losses===null||!values)return null;
    const seasonal=c.path.some(x=>/season|saison/i.test(x));
    const combined=/^rapid[\s_-]*royale$/i.test(c.label);
    const trios=/trios?|squads?/i.test(c.label);
    const modeLabel=combined?"Rapid Royale":trios?"Rapid Royale Trios":/solos?/i.test(c.label)?"Rapid Royale Solos":c.label;
    const series=combined?"rapid-royale":c.label.toLowerCase().replace(/[\s_-]+/g,"-");
    const seasonScope=seasonal?c.path.filter(x=>/season|saison/i.test(x)).join("/").toLowerCase():"";
    return {...c,values,seasonal,combined,trios,modeLabel,series:series+"|"+seasonScope};
  }).filter(Boolean);
  viable.sort((a,b)=>Number(a.seasonal)-Number(b.seasonal)||
    Number(b.combined)-Number(a.combined)||Number(b.trios)-Number(a.trios)||
    FIELDS.filter(k=>b.values[k]!==null).length-FIELDS.filter(k=>a.values[k]!==null).length||
    a.path.length-b.path.length);
  return viable[0]||null;
}
export function addPoint(history,player,sample,now=Date.now()){
  const k=keyFor(player);
  if(!history.players||typeof history.players!=="object")history.players={};
  const existing=history.players[k]||{};
  const points=Array.isArray(existing.points)?existing.points.filter(p=>
    Number.isFinite(p.ts)&&p.ts>=now-CUTOFF_MS&&p.ts<=now+60000&&
    p.values&&Number.isSafeInteger(p.values.wins)&&Number.isSafeInteger(p.values.losses)
  ):[];
  const last=points.at(-1);
  const next={ts:now,series:sample.series,values:sample.values};
  // Deduplicate a scheduled run retried within the same minute.
  if(last&&now-last.ts<60000&&last.series===next.series)points[points.length-1]=next;
  else points.push(next);
  history.players[k]={name:player.name,platform:player.platform,mode:sample.modeLabel,
    seasonal:sample.seasonal,points:points.slice(-1500),lastSuccessAt:new Date(now).toISOString()};
  history.lastSuccessAt=new Date(now).toISOString();
  history.schemaVersion=1;
  return history;
}
export async function requestRapid(player,transport=fetch){
  const tryPlatform=async platform=>{
    const qs=new URLSearchParams({name:player.name,platform,format_values:"false",seperation:"true"});
    const url="https://api.gametools.network/bf6/stats/?"+qs.toString();
    return transport(url,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(25000)});
  };
  let reply=await tryPlatform(player.platform);
  if(reply.status===404&&player.platform==="xbox")reply=await tryPlatform("ea");
  if(!reply.ok)throw new Error("HTTP "+reply.status);
  const json=await reply.json();
  const rapid=findRapidStats(json);
  if(!rapid)throw new Error("Keine eindeutig getrennten Rapid-Royale-Zähler");
  return rapid;
}
async function main(){
  const config=JSON.parse(readFileSync("data/rapid-players.json","utf8"));
  const file="data/rapid-history.json";
  let history={schemaVersion:1,lastSuccessAt:null,players:{}};
  try{history=JSON.parse(readFileSync(file,"utf8"));}catch{}
  let succeeded=0;
  for(const player of config.players||[]){
    if(player.enabled===false)continue;
    if(!player.name||!["ea","xbox","psn","steam","epic"].includes(player.platform))continue;
    try{
      const result=await requestRapid(player);
      addPoint(history,player,result);
      succeeded++;
      console.log(player.name+": "+result.modeLabel+" W "+result.values.wins+" / L "+result.values.losses);
    }catch(err){console.error(player.name+": "+err.message);}
  }
  if(!succeeded)throw new Error("Kein Spieler lieferte valide Rapid-Royale-Daten. Historie bleibt unverändert.");
  writeFileSync(file,JSON.stringify(history,null,2)+"\n");
  console.log("Erfolgreiche Spieler: "+succeeded);
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)
  main().catch(err=>{console.error(err);process.exitCode=1;});
