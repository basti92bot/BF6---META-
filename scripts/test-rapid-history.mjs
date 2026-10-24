import assert from "node:assert/strict";
import {findRapidStats,addPoint,asCount,requestRapid,keyFor} from "./collect-rapid-history.mjs";
assert.equal(asCount("1.206"),1206);
assert.equal(asCount("21,38%"),null);
const result=findRapidStats({
  stats:{wins:3000,losses:2000,kills:90000},
  modes:{"Battle Royale":{wins:900,losses:700},
    "Rapid Royale":{stats:{wins:31,losses:114,kills:1206,deaths:404}}},
});
assert.ok(result);assert.equal(result.values.wins,31);assert.equal(result.values.kills,1206);
assert.equal(result.series,"rapid-royale|");
assert.equal(findRapidStats({stats:{wins:3000,losses:2000}}),null);
assert.equal(findRapidStats({modes:{"Rapid Royale":{kills:20}}}),null);
const history={schemaVersion:1,players:{}};
addPoint(history,{name:"RockmasterR",platform:"ea"},result,1760000000000);
assert.equal(history.players["ea:rockmasterr"].points.length,1);
assert.equal(history.players["ea:rockmasterr"].points[0].values.wins,31);
const calls=[];
const transport=async url=>{
  calls.push(url);
  return {status:calls.length===1?404:200,ok:calls.length!==1,json:async()=>({gamemodes:[{mode:"Rapid Royale",stats:{wins:3,losses:7}}]})};
};
const fallback=await requestRapid({name:"demo",platform:"xbox"},transport);
assert.equal(fallback.values.wins,3);assert.equal(calls.length,2);
assert.ok(calls[1].includes("platform=ea"));
const psCalls=[];
const psTransport=async url=>{
  psCalls.push(url);
  return {
    status:psCalls.length<3?404:200,
    ok:psCalls.length===3,
    json:async()=>({modes:{"Rapid Royale":{wins:8,losses:5,kills:120,deaths:44}}})
  };
};
const playstation=await requestRapid({name:"playstationDemo",platform:"psn"},psTransport);
assert.equal(playstation.values.wins,8);
assert.deepEqual(psCalls.map(url=>new URL(url).searchParams.get("platform")),["psn","ea","ps5"]);
const noFallbackCalls=[];
const directSuccess=async url=>{
  noFallbackCalls.push(url);
  return {ok:true,status:200,json:async()=>({modes:{"Rapid Royale":{wins:1,losses:2}}})};
};
await requestRapid({name:"directPSN",platform:"psn"},directSuccess);
assert.equal(noFallbackCalls.length,1);
console.log("Collector tests passed.");
