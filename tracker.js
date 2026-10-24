"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const KEY = "bf6-winlost-v1";
  const MODES = {mp:"MEHRSPIELER",rapid:"RAPID ROYALE",br:"BATTLE ROYALE"};
  const PLATFORMS = {ea:"EA / PC",xbox:"XBOX",psn:"PLAYSTATION",steam:"STEAM"};
  const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const seed = {matches:[],players:[],mode:"mp"};
  const state = (() => {try {const data = JSON.parse(localStorage.getItem(KEY));return {matches:Array.isArray(data?.matches)?data.matches.filter(m=>["win","loss"].includes(m.result)&&MODES[m.mode]).slice(0,5000):[],players:Array.isArray(data?.players)?data.players.filter(p=>typeof p.name==="string"&&p.name&&PLATFORMS[p.platform]).slice(0,16).map(p=>({name:p.name,platform:p.platform})):[],mode:MODES[data?.mode]?data.mode:"mp"};}catch{return {...seed};}})();
  let filter = "all";
  let pending = new Set();
  const save = () => {try{localStorage.setItem(KEY, JSON.stringify(state));return true;}catch{return false;}};
  const int = value => {const n=Number(String(value ?? "").replace(/,/g,""));return Number.isFinite(n)?Math.round(n).toLocaleString("de-DE"):null;};
  const number = value => {const n=Number(String(value ?? "").replace("%","").replace(",", "."));return Number.isFinite(n)?n:null;};
  const metric = (obj,keys) => {for(const key of keys){if(obj?.[key]!==undefined && obj[key]!==null){const v=number(obj[key]);if(v!==null)return v;}}return null;};
  const escCsv = value => '"'+String(value).replace(/"/g,'""')+'"';
  const all = () => state.matches.slice().sort((a,b)=>b.ts-a.ts);
  const modeMatches = () => filter==="all"?all():all().filter(m=>m.mode===filter);
  function render(){
    const data=modeMatches(),wins=data.filter(m=>m.result==="win").length,losses=data.length-wins;
    $("wins").textContent=wins;$("losses").textContent=losses;
    $("winrate").textContent=data.length?Math.round(wins/data.length*100)+"%":"0%";
    let streak=0;if(data.length){const result=data[0].result;for(const m of data){if(m.result!==result)break;streak++;}$("streak").textContent=(result==="win"?"W":"L")+streak;}else $("streak").textContent="–";
    $("undo").disabled=!state.matches.length;
    $("export").disabled=!state.matches.length;
    $("history-count").textContent=data.length+" Matches"+(filter==="all"?"":" im Filter");
    $("history-list").innerHTML=data.length?data.slice(0,60).map(m=>'<div class="match-row"><span class="match-result '+(m.result==="win"?"win":"loss")+'">'+(m.result==="win"?"WIN":"LOST")+'</span><span class="match-main">'+safe(MODES[m.mode])+'<small>'+safe(new Date(m.ts).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}))+'</small></span><button type="button" class="match-remove" data-remove-match="'+safe(m.id)+'" aria-label="Match löschen">×</button></div>').join(""):'<p class="empty">Noch keine Matches erfasst.</p>';
    document.querySelectorAll("[data-filter]").forEach(b=>{const active=b.dataset.filter===filter;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));});
    $("match-mode").value=state.mode;
    $("refresh-all").disabled=!state.players.length;
    renderPlayers();
  }
  function addMatch(result){
    const m={id:String(Date.now())+"-"+Math.random().toString(36).slice(2,8),mode:state.mode,result,ts:Date.now()};
    state.matches.push(m);if(state.matches.length>5000)state.matches.shift();
    const stored=save();
    $("record-feedback").textContent=(result==="win"?"WIN":"LOST")+" gespeichert · "+MODES[state.mode]+(stored?"":" · Speicherung auf diesem Gerät nicht möglich");
    render();
  }
  function removeMatch(id){state.matches=state.matches.filter(m=>m.id!==id);save();render();}
  const fmt = v => v===null?"–":Number(v).toLocaleString("de-DE",{maximumFractionDigits:2});
  function playerKey(p){return p.platform+":"+p.name.toLowerCase();}
  const playerData = new Map();
  function renderPlayers(){
    $("player-list").innerHTML=state.players.map(p=>{
      const key=playerKey(p),d=playerData.get(key),loading=pending.has(key);
      const stats=d?.stats||{};
      const vals=[["K/D",stats.kd],["KILLS",stats.kills],["DEATHS",stats.deaths],["WINS",stats.wins],["LOSSES",stats.losses],["WINRATE",stats.winrate],["ACCURACY",stats.accuracy],["REVIVES",stats.revives],["ASSISTS",stats.assists]];
      return '<article class="player-card"><div class="player-title"><div><strong>'+safe(p.name)+'</strong><small>'+safe(PLATFORMS[p.platform])+'</small></div><div class="player-actions"><button type="button" data-refresh-player="'+safe(key)+'" '+(loading?'disabled':'')+'>'+(loading?'LÄDT…':'↻ LADEN')+'</button><button type="button" class="remove-player" data-remove-player="'+safe(key)+'" aria-label="Spieler entfernen">×</button></div></div><div class="player-metrics">'+vals.map(([label,value])=>'<div class="player-metric"><small>'+label+'</small><b>'+safe(value===null||value===undefined?"–":value)+'</b></div>').join("")+'</div><p class="player-status">'+safe(loading?'API wird abgefragt…':d?.message||"Noch nicht abgerufen")+'</p></article>';
    }).join("");
  }
  function unpack(data){
    if(!data||typeof data!=="object")return {};
    const candidates=[data,data.stats,data.overview,data.data,data.data?.stats,data.data?.overview,data.data?.playerStats,data.playerStats,data.data?.global,data.global];
    return candidates.find(x=>x&&typeof x==="object"&&!Array.isArray(x)&&["kills","deaths","killDeath","wins","matchesWon","kdRatio"].some(k=>x[k]!==undefined)) || candidates.find(x=>x&&typeof x==="object"&&!Array.isArray(x))||{};
  }
  function parseStats(source){
    const s=unpack(source);
    const kills=metric(s,["kills","playerKills","killsTotal"]);
    const deaths=metric(s,["deaths","playerDeaths"]);
    const wins=metric(s,["wins","matchesWon","gamesWon"]);
    const losses=metric(s,["losses","loses","matchesLost","gamesLost"]);
    const kd=metric(s,["killDeath","kdRatio","kd","kdr"])??(kills!==null&&deaths!==null?(deaths===0?kills:kills/deaths):null);
    const rate=metric(s,["winPercent","winPercentage","wlPercentage","winRate"])??(wins!==null&&losses!==null&&wins+losses>0?wins/(wins+losses)*100:null);
    const precision=metric(s,["accuracy","accuracyPercentage"]);
    const result={
      kd:kd===null?null:fmt(kd),kills:kills===null?null:int(kills),deaths:deaths===null?null:int(deaths),
      wins:wins===null?null:int(wins),losses:losses===null?null:int(losses),
      winrate:rate===null?null:fmt(rate)+"%",accuracy:precision===null?null:fmt(precision)+"%",
      revives:metric(s,["revives","reviveCount"]),assists:metric(s,["killAssists","assists","killAssistCount"])
    };
    for(const key of ["revives","assists"])result[key]=result[key]===null?null:int(result[key]);
    return {stats:result,any:Object.values(result).some(v=>v!==null)};
  }
  async function fetchPlayer(p){
    const key=playerKey(p);if(pending.has(key))return;
    pending.add(key);renderPlayers();
    try{
      const query=new URLSearchParams({name:p.name,platform:p.platform,format_values:"false"});
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
      let response;
      try{response=await fetch("https://api.gametools.network/bf6/stats/?"+query.toString(),{signal:controller.signal,headers:{"Accept":"application/json"}});}finally{clearTimeout(timer);}
      if(!response.ok)throw new Error("API HTTP "+response.status);
      const json=await response.json(),parsed=parseStats(json);
      if(!parsed.any)throw new Error("Keine auswertbaren Spielerwerte geliefert");
      playerData.set(key,{stats:parsed.stats,message:"Quelle: GameTools.Network · abgerufen "+new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})});
      $("api-feedback").textContent="API-Daten erfolgreich geladen. Es werden nur verfügbare Felder angezeigt.";
    }catch(err){
      playerData.set(key,{stats:{},message:"Abruf fehlgeschlagen: "+(err.name==="AbortError"?"Zeitüberschreitung":err.message)+". Eventuell verhindert CORS den Browser-Zugriff."});
      $("api-feedback").textContent="Mindestens ein API-Abruf war nicht erfolgreich.";
    }finally{pending.delete(key);if(state.players.some(x=>playerKey(x)===key))renderPlayers();}
  }
  async function refreshAll(){
    for(const player of state.players){await fetchPlayer(player);}
  }
  function exportCsv(){
    if(!state.matches.length)return;
    const rows=[["Datum","Ergebnis","Modus"],...all().map(m=>[new Date(m.ts).toISOString(),m.result==="win"?"WIN":"LOST",MODES[m.mode]])];
    const blob=new Blob(["\ufeff"+rows.map(r=>r.map(escCsv).join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"});
    const link=document.createElement("a"),url=URL.createObjectURL(blob);
    link.href=url;link.download="bf6-winlost-"+new Date().toISOString().slice(0,10)+".csv";link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  $("record-win").addEventListener("click",()=>addMatch("win"));
  $("record-loss").addEventListener("click",()=>addMatch("loss"));
  $("match-mode").addEventListener("change",e=>{state.mode=e.target.value;save();});
  document.querySelector(".filter-tabs").addEventListener("click",e=>{const button=e.target.closest("[data-filter]");if(!button)return;filter=button.dataset.filter;render();});
  $("history-list").addEventListener("click",e=>{const button=e.target.closest("[data-remove-match]");if(button)removeMatch(button.dataset.removeMatch);});
  $("undo").addEventListener("click",()=>{if(!state.matches.length)return;state.matches.pop();save();render();$("record-feedback").textContent="Letzter Eintrag rückgängig gemacht.";});
  $("export").addEventListener("click",exportCsv);
  $("clear-matches").addEventListener("click",()=>{if(!state.matches.length||!confirm("Wirklich alle erfassten Matches auf diesem Gerät löschen?"))return;state.matches=[];save();render();$("record-feedback").textContent="Match-Historie gelöscht.";});
  $("player-form").addEventListener("submit",e=>{e.preventDefault();const name=$("player-name").value.trim(),platform=$("player-platform").value;if(!name||!PLATFORMS[platform])return;
    if(state.players.some(p=>playerKey(p)===playerKey({name,platform}))){$("api-feedback").textContent="Spieler bereits gespeichert.";return;}
    if(state.players.length>=16){$("api-feedback").textContent="Maximal 16 Spieler möglich.";return;}
    const p={name,platform};state.players.push(p);save();$("player-name").value="";$("api-feedback").textContent=name+" hinzugefügt. Werte werden geladen.";render();fetchPlayer(p);
  });
  $("player-list").addEventListener("click",e=>{const refresh=e.target.closest("[data-refresh-player]"),remove=e.target.closest("[data-remove-player]");
    if(refresh){const p=state.players.find(x=>playerKey(x)===refresh.dataset.refreshPlayer);if(p)fetchPlayer(p);}
    if(remove){const key=remove.dataset.removePlayer;state.players=state.players.filter(p=>playerKey(p)!==key);playerData.delete(key);save();render();}
  });
  $("refresh-all").addEventListener("click",refreshAll);
  render();
})();