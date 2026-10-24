"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const KEY = "bf6-winlost-v1";
  const PLATFORMS = {ea:"EA / PC",xbox:"XBOX",psn:"PLAYSTATION",steam:"STEAM"};
  // Remove only the obsolete BOT defaults. RockmasterR is deliberately retained.
  const RETIRED_DEFAULT_NAMES = new Set(["rockbotmasterr","strausbot","botuturn"]);
  const safe = value => String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const num = value => {
    if(value===null||value===undefined||String(value).trim()==="")return null;
    const n=Number(String(value).replace("%","").replace(",","."));
    return Number.isFinite(n)?n:null;
  };
  const number = num;
  const int = value => {
    const n=num(value);
    return n===null?null:Math.round(n).toLocaleString("de-DE");
  };
  const metric = (obj,keys) => {
    for(const k of keys){const n=num(obj?.[k]);if(n!==null)return n;}
    return null;
  };
  const fmt = n => n===null?"–":Number(n).toLocaleString("de-DE",{maximumFractionDigits:2});
  const dateTime = t => new Date(t).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
  const countFrom = value => {
    if(value===null||value===undefined)return null;
    const s=String(value).trim();
    if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(s))return null;
    const n=Number(s.replace(/\./g,""));
    return Number.isSafeInteger(n)&&n>=0?n:null;
  };
  const playerKey = p => p.platform+":"+p.name.toLowerCase();
  const loadState = () => {
    let data={};
    try{data=JSON.parse(localStorage.getItem(KEY))||{}}catch{}
    const firstCleanup=data.defaultBotsClearedV19!==true;
    const players=Array.isArray(data.players)?data.players
      .filter(p=>typeof p?.name==="string"&&p.name.trim()&&PLATFORMS[p.platform])
      .filter(p=>!firstCleanup||!RETIRED_DEFAULT_NAMES.has(p.name.trim().toLowerCase()))
      .slice(0,16).map(p=>({name:p.name,platform:p.platform})):[];
    const snapshots={};
    if(data.snapshots&&typeof data.snapshots==="object"&&!Array.isArray(data.snapshots)){
      for(const p of players){
        const key=playerKey(p);
        const list=data.snapshots[key];
        if(!Array.isArray(list))continue;
        snapshots[key]=list.filter(x=>Number.isFinite(x?.ts)&&x.ts>0&&x.ts<=Date.now()+3600000&&x.values&&typeof x.values==="object"&&["wins","losses","kills","deaths"].some(k=>Number.isSafeInteger(x.values[k])&&x.values[k]>=0)).slice(-2500).sort((a,b)=>a.ts-b.ts);
      }
    }
    // Preserve archived records even for names no longer shown in the player selector.
    if(data.snapshots&&typeof data.snapshots==="object"&&!Array.isArray(data.snapshots)){
      for(const [key,points] of Object.entries(data.snapshots)){
        if(!Object.prototype.hasOwnProperty.call(snapshots,key)&&Array.isArray(points))
          snapshots[key]=points.slice(-2500);
      }
    }
    // Keep old manual records and statistical snapshots untouched.
    const previous=typeof data.trackedPlayer==="string"?data.trackedPlayer:"";
    const trackedPlayer=players.some(p=>playerKey(p)===previous)?previous:"";
    return {...data,players,trackedPlayer,snapshots,defaultBotsClearedV19:true};
  };
  const state=loadState();
  const playerData=new Map();
  const pending=new Set();
  let serverHistory={schemaVersion:1,players:{}};
  function getPoints(key) {
    const remote=serverHistory.players?.[key]?.points;
    if(Array.isArray(remote)&&remote.length){
      return remote.filter(p=>Number.isFinite(p?.ts)&&p?.values&&
        Number.isSafeInteger(p.values.wins)&&Number.isSafeInteger(p.values.losses)).sort((a,b)=>a.ts-b.ts);
    }
    return state.snapshots[key]||[];
  }
  async function loadServerHistory(){
    try {
      const [playersResponse,historyResponse]=await Promise.all([
        fetch("./data/rapid-players.json",{cache:"no-store"}),
        fetch("./data/rapid-history.json",{cache:"no-store"})
      ]);
      if(playersResponse.ok){
        const config=await playersResponse.json();
        if(Array.isArray(config.players)){
          let modified=false;
          for(const p of config.players){
            if(!p||p.enabled===false||!PLATFORMS[p.platform]||
              typeof p.name!=="string"||!p.name.trim())continue;
            // Ignore a stale offline cache of the removed default roster.
            if(RETIRED_DEFAULT_NAMES.has(p.name.trim().toLowerCase())&&
               !state.players.some(x=>playerKey(x)===playerKey(p)))continue;
            if(!state.players.some(existing=>playerKey(existing)===playerKey(p))){
              if(state.players.length>=16)break;
              state.players.push({name:p.name,platform:p.platform});
              modified=true;
            }
          }
          if(modified)save();
        }
      }
      if(historyResponse.ok){
        const data=await historyResponse.json();
        if(data?.schemaVersion===1&&data.players&&typeof data.players==="object")
          serverHistory=data;
      }
    }catch(error){
      console.warn("Stündliche BF6-Historie konnte nicht geladen werden",error);
    }
    renderPlayers();renderAuto();
  }
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch{return false}};
  save(); // Persist the one-time migration before any API refresh repopulates UI.
  const activePlayer=()=>state.players.find(p=>playerKey(p)===state.trackedPlayer)||state.players[0]||null;
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

  // The GameTools "seperation" response is not guaranteed to include every mode.
  // Only accept explicit Rapid Royale labels, never BF6-wide or other REDSEC totals.
  const rapidLabel = value => /^rapid[\s_-]*royale(?:[\s_-]*(?:solo|solos|trio|trios|duo|duos|squad|squads|[0-9]+))*$/i.test(String(value ?? "").trim());
  const modeFields = new Set(["mode","gamemode","gameMode","game_mode","modeName","gamemodeName","gameModeName","playlist","playlistName","name","displayName","id"]);
  function findRapidMode(source){
    const candidates = [], seen = new WeakSet();
    let walked = 0;
    const inspect = (value, path, depth) => {
      if(!value || typeof value!=="object" || depth>10 || seen.has(value) || ++walked>4500)return;
      seen.add(value);
      if(!Array.isArray(value)){
        // Require an explicit game mode identity, not a parent containing generic stats.
        const label=Object.entries(value).find(([k,v])=>modeFields.has(k)&&typeof v==="string"&&rapidLabel(v));
        if(label)candidates.push({item:value,path:path.concat(String(label[1])),modeLabel:String(label[1])});
      }
      for(const [key,child] of Object.entries(value)){
        if(!child || typeof child!=="object")continue;
        if(rapidLabel(key))candidates.push({item:child,path:path.concat(key),modeLabel:key});
        inspect(child,path.concat(key),depth+1);
      }
    };
    inspect(source,[],0);
    const options=candidates.map(candidate=>{
      const parsed=parseStats(candidate.item);
      const path=candidate.path.join(" ").toLowerCase();
      const seasonal=/season|saison/.test(path);
      const count=Object.values(parsed.stats).filter(v=>v!==null).length;
      const label=candidate.modeLabel;
      const combined=/^rapid[\s_-]*royale$/i.test(label);
      const trios=/trios?|squads?/i.test(label);
      const modeTitle=combined?"Rapid Royale":trios?"Rapid Royale Trios":/solos?/i.test(label)?"Rapid Royale Solos":label.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/[_-]/g," ");
      return {...candidate,parsed,seasonal,count,combined,trios,modeTitle};
    }).filter(x=>x.parsed.any);
    // Prefer explicit all-time mode stats over season-specific summaries.
    options.sort((a,b)=>Number(a.seasonal)-Number(b.seasonal)||Number(b.combined)-Number(a.combined)||Number(b.trios)-Number(a.trios)||b.count-a.count||a.path.length-b.path.length);
    return options[0] || null;
  }

  function parseSnapshot(stats){
    const values={};
    for(const key of ["wins","losses","kills","deaths","assists","revives"])values[key]=countFrom(stats?.[key]);
    if(Object.values(values).every(v=>v===null))return null;
    return {ts:Date.now(),values};
  }
  function recordSnapshot(player,stats){
    const point=parseSnapshot(stats);
    if(!point)return;
    const key=playerKey(player),list=state.snapshots[key]||[];
    const last=list[list.length-1];
    // Limit stored points: at least every 15 minutes or when the counters change.
    const changed=!last||Object.keys(point.values).some(k=>point.values[k]!==last.values[k]);
    if(changed||point.ts-(last?.ts||0)>=15*60*1000)list.push(point);
    const minTime=Date.now()-45*86400000;
    state.snapshots[key]=list.filter(x=>x.ts>=minTime).slice(-2500);
    save();
  }
  function diffCounts(now,then,key){
    const current=now?.values[key],before=then?.values[key];
    if(!Number.isSafeInteger(current)||!Number.isSafeInteger(before)||current<before)return null;
    return current-before;
  }
  function periodStats(key,days,maxGap){
    const points=getPoints(key);
    const last=points[points.length-1];
    if(!last||Date.now()-last.ts>4*3600000)return null;
    const target=Date.now()-days*86400000;
    const earlier=points.filter(p=>p.ts<=target&&target-p.ts<=maxGap&&
      (p.series??"local")===(last.series??"local")).at(-1);
    if(!earlier)return null;
    const wins=diffCounts(last,earlier,"wins"),losses=diffCounts(last,earlier,"losses");
    const kills=diffCounts(last,earlier,"kills"),deaths=diffCounts(last,earlier,"deaths");
    const matches=wins!==null&&losses!==null?wins+losses:null;
    const winrate=matches&&matches>0?100*wins/matches:null;
    const kd=kills!==null&&deaths!==null?(deaths===0?(kills===0?null:kills):kills/deaths):null;
    return {wins,losses,kills,deaths,winrate,kd,from:earlier.ts,to:last.ts};
  }
  function drawPeriod(prefix,data){
    for(const key of ["wins","losses","kills","deaths"]){
      $(prefix+"-"+key).textContent=data?.[key]===null||data?.[key]===undefined?"–":data[key].toLocaleString("de-DE");
    }
    $(prefix+"-winrate").textContent=data?.winrate===null||data?.winrate===undefined?"–":fmt(data.winrate)+"%";
    $(prefix+"-kd").textContent=data?.kd===null||data?.kd===undefined?"–":fmt(data.kd);
    $(prefix+"-window").textContent=data?"Vergleich ab "+dateTime(data.from):"Noch keine passenden Vergleichsdaten";
  }
  function renderPeriods(){
    const current=activePlayer();
    const key=current?playerKey(current):"";
    const day=key?periodStats(key,1,3*3600000):null;
    const week=key?periodStats(key,7,18*3600000):null;
    drawPeriod("day",day);drawPeriod("week",week);
    const points=getPoints(key);
    const remote=!!serverHistory.players?.[key]?.points?.length;
    $("period-note").textContent=!current?"Zuerst unter EA-IDs einen Spieler hinzufügen."
      :!points.length?"Noch kein erfolgreicher API-Messstand. Der stündliche Serverabruf ist vorbereitet."
      :(remote?"Gemeinsamer stündlicher Verlauf":"Lokaler Verlauf")+" seit "+dateTime(points[0].ts)+
        ". Zuletzt erfasst: "+dateTime(points.at(-1).ts)+
        ". Die Auswertung vergleicht näherungsweise 24 Stunden bzw. 7 Tage. Fehlt ein Vergleichswert, bleibt das Feld leer.";
  }
  function renderAuto(){
    const current=activePlayer(),key=current?playerKey(current):"";
    if(state.trackedPlayer!==key){state.trackedPlayer=key;save();}
    const select=$("tracked-player");
    select.innerHTML=current?state.players.map(p=>'<option value="'+safe(playerKey(p))+'">'+safe(p.name)+' · '+safe(PLATFORMS[p.platform])+'</option>').join(""):'<option value="">EA-ID hinzufügen</option>';
    select.value=key;
    select.disabled=!current;
    $("refresh-tracked").disabled=!current||pending.has(key);
    const d=current?playerData.get(key):null;
    const last=serverHistory.players?.[key]?.points?.at(-1);
    const saved=last?.values||{};
    const stats=d?.stats&&Object.keys(d.stats).length?d.stats:{
      wins:saved.wins,losses:saved.losses,kills:saved.kills,deaths:saved.deaths,
      assists:saved.assists,revives:saved.revives,
      winrate:saved.wins!=null&&saved.losses!=null&&saved.wins+saved.losses>0
        ?fmt(100*saved.wins/(saved.wins+saved.losses))+"%":null
    };
    const wins=countFrom(stats.wins),losses=countFrom(stats.losses);
    $("auto-wins").textContent=wins===null?"–":wins.toLocaleString("de-DE");
    $("auto-losses").textContent=losses===null?"–":losses.toLocaleString("de-DE");
    $("auto-winrate").textContent=stats.winrate??(wins!==null&&losses!==null&&wins+losses>0?fmt(100*wins/(wins+losses))+"%":"–");
    $("auto-matches").textContent=wins!==null&&losses!==null?(wins+losses).toLocaleString("de-DE"):"–";
    $("auto-status").textContent=!current?"Noch kein Spieler hinterlegt. Unten EA-ID hinzufügen."
      :pending.has(key)?"Lade Rapid-Royale-Daten für "+current.name+"…"
      :d?.message||(last?"Stündlicher Serverstand vom "+dateTime(last.ts):"Rapid-Royale-Daten noch nicht geladen.");
    renderPeriods();
  }
  function renderPlayers(){
    $("player-list").innerHTML=state.players.map(p=>{
      const key=playerKey(p),d=playerData.get(key),loading=pending.has(key);
      const saved=serverHistory.players?.[key]?.points?.at(-1)?.values||{};
      const stats=d?.stats&&Object.keys(d.stats).length?d.stats:{
        wins:saved.wins,losses:saved.losses,kills:saved.kills,deaths:saved.deaths,
        assists:saved.assists,revives:saved.revives,
        kd:saved.kills!=null&&saved.deaths>0?fmt(saved.kills/saved.deaths):null,
        winrate:saved.wins!=null&&saved.losses!=null&&saved.wins+saved.losses>0
          ?fmt(100*saved.wins/(saved.wins+saved.losses))+"%":null
      };
      const vals=[["K/D",stats.kd],["KILLS",stats.kills],["DEATHS",stats.deaths],["WINS",stats.wins],["LOSSES",stats.losses],["WINRATE",stats.winrate],["ACCURACY",stats.accuracy],["REVIVES",stats.revives],["ASSISTS",stats.assists]];
      return '<article class="player-card"><div class="player-title"><div><strong>'+safe(p.name)+'</strong><small>'+safe(PLATFORMS[p.platform])+'</small></div><div class="player-actions"><button type="button" data-refresh-player="'+safe(key)+'" '+(loading?'disabled':'')+'>'+(loading?'LÄDT…':'↻ LADEN')+'</button><button type="button" class="remove-player" data-remove-player="'+safe(key)+'" aria-label="Spieler entfernen">×</button></div></div><div class="player-metrics">'+vals.map(([label,value])=>'<div class="player-metric"><small>'+label+'</small><b>'+safe(value===null||value===undefined?"–":value)+'</b></div>').join("")+'</div><p class="player-status">'+safe(loading?'API wird abgefragt…':d?.message||"Noch nicht abgerufen")+'</p></article>';
    }).join("");
    $("refresh-all").disabled=!state.players.length;
  }
  async function fetchPlayer(p){
    const key=playerKey(p);if(pending.has(key))return;
    pending.add(key);renderPlayers();renderAuto();
    try{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
      const request=platform=>{
        const query=new URLSearchParams({name:p.name,platform,format_values:"false",seperation:"true"});
        return fetch("https://api.gametools.network/bf6/stats/?"+query.toString(),{signal:controller.signal,headers:{"Accept":"application/json"}});
      };
      let response,usedPlatform=p.platform;
      const fallbackPlatforms=p.platform==="xbox"?["ea"]:
        p.platform==="psn"?["ea","ps5","ps4"]:[];
      try{
        response=await request(p.platform);
        for(const platform of fallbackPlatforms){
          if(response.status!==404)break;
          response=await request(platform);
          if(response.ok)usedPlatform=platform;
        }
      }finally{clearTimeout(timer);}
      if(response.status===404)throw Object.assign(new Error(
        "Spieler nicht gefunden (HTTP 404). "+(p.platform==="psn"
          ?"PlayStation-, PS5-, PS4- und EA-Abfrage erfolglos. Prüfe die EA-ID, sie kann anders lauten als dein PSN-Online-Name."
          :"Prüfe die exakte EA-ID.")),{status:404});
      if(!response.ok)throw Object.assign(new Error("GameTools antwortet mit HTTP "+response.status),{status:response.status});
      const json=await response.json();
      const rapid=findRapidMode(json);
      if(!rapid){
        playerData.set(key,{stats:{},message:"Spieler gefunden, keine getrennten Rapid-Royale-Daten verfügbar. Keine Gesamtstatistiken angezeigt."});
        $("api-feedback").textContent="Profil gefunden. Rapid-Royale-Daten fehlen in der API-Antwort.";
        return;
      }
      recordSnapshot(p,rapid.parsed.stats);
      const suffix=rapid.seasonal?" · nur Saisonwerte":"";
      const fallback=usedPlatform!==p.platform?" · über "+(usedPlatform==="ea"?"EA/PC":usedPlatform.toUpperCase())+" gefunden":"";
      playerData.set(key,{stats:rapid.parsed.stats,message:rapid.modeTitle+suffix+fallback+" · GameTools.Network · "+new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})});
      $("api-feedback").textContent="Rapid-Royale-Statistiken geladen. Verlauf lokal gespeichert.";
    }catch(err){
      const message=err.status===404?err.message
        :err.name==="AbortError"?"Zeitüberschreitung. Erneut laden."
        :err instanceof TypeError?"API-Verbindung fehlgeschlagen. Netzwerk oder Browser-CORS prüfen."
        :err.message||"Unbekannter API-Fehler.";
      playerData.set(key,{stats:{},message});
      $("api-feedback").textContent="Rapid-Royale-Statistiken für "+p.name+" konnten nicht geladen werden.";
    }finally{pending.delete(key);if(state.players.some(x=>playerKey(x)===key)){renderPlayers();renderAuto();}}
  }
  async function refreshAll(){
    for(const p of state.players){await fetchPlayer(p);}
  }
  $("tracked-player").addEventListener("change",e=>{
    const p=state.players.find(x=>playerKey(x)===e.target.value);
    if(!p)return;state.trackedPlayer=playerKey(p);save();renderAuto();
    if(!playerData.has(playerKey(p)))fetchPlayer(p);
  });
  $("refresh-tracked").addEventListener("click",()=>{const p=activePlayer();if(p)fetchPlayer(p);});
  $("player-form").addEventListener("submit",e=>{
    e.preventDefault();
    const name=$("player-name").value.trim(),platform=$("player-platform").value;
    if(!name||!PLATFORMS[platform])return;
    const p={name,platform},key=playerKey(p);
    if(state.players.some(x=>playerKey(x)===key)){$("api-feedback").textContent="Spieler bereits gespeichert.";return;}
    if(state.players.length>=16){$("api-feedback").textContent="Maximal 16 Spieler möglich.";return;}
    state.players.push(p);
    if(!state.trackedPlayer)state.trackedPlayer=key;
    save();
    $("player-name").value="";
    $("api-feedback").textContent=name+" hinzugefügt. Werte werden geladen.";
    renderPlayers();renderAuto();fetchPlayer(p);
  });
  $("player-list").addEventListener("click",e=>{
    const refresh=e.target.closest("[data-refresh-player]"),remove=e.target.closest("[data-remove-player]");
    if(refresh){const p=state.players.find(x=>playerKey(x)===refresh.dataset.refreshPlayer);if(p)fetchPlayer(p);}
    if(remove){
      const key=remove.dataset.removePlayer;
      state.players=state.players.filter(p=>playerKey(p)!==key);
      playerData.delete(key);
      // Keep the earlier snapshots, so removing and re-adding a player does not discard history.
      if(state.trackedPlayer===key)state.trackedPlayer="";
      save();renderPlayers();renderAuto();
    }
  });
  $("refresh-all").addEventListener("click",refreshAll);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&state.players.length){loadServerHistory();refreshAll();}});
  setInterval(()=>{if(!document.hidden&&state.players.length)refreshAll();},120000);
  if("serviceWorker" in navigator && location.protocol!=="file:")window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  renderPlayers();renderAuto();
  loadServerHistory().then(()=>{if(state.players.length)refreshAll();});
})();
