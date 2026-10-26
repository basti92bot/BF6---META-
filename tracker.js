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
  if(!state.roundTests||typeof state.roundTests!=="object"||Array.isArray(state.roundTests))
    state.roundTests={};
  const playerData=new Map();
  const pending=new Set();
  let serverHistory={schemaVersion:1,players:{}};
  function getPoints(key) {
    // Keep both sources: a recent local API read must not disappear just because
    // an older hourly server snapshot exists. All counters are actual API reads.
    const remote=serverHistory.players?.[key]?.points||[];
    const local=state.snapshots[key]||[];
    return [...remote,...local]
      .filter(p=>Number.isFinite(p?.ts)&&p.ts>0&&p.ts<=Date.now()+60000&&
        p?.values&&Number.isSafeInteger(p.values.wins)&&
        Number.isSafeInteger(p.values.losses))
      .map(p=>({...p,series:p.series||"rapid-royale|"}))
      .sort((a,b)=>a.ts-b.ts);
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
  function recordSnapshot(player,stats,mode){
    const point=parseSnapshot(stats);
    if(!point)return;
    const label=mode?.modeTitle||"Rapid Royale";
    const normalized=label.toLowerCase().replace(/[\s_-]+/g,"-");
    const season=mode?.seasonal?"|season": "|";
    point.series=normalized+season;
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
    const last=points.at(-1);
    if(!last)return null;
    const valid=points.filter(p=>p.ts<last.ts&&p.series===last.series);
    const target=last.ts-days*86400000;
    // Prefer the closest real observation near the requested time window.
    const nearby=valid.filter(p=>Math.abs(p.ts-target)<=maxGap)
      .sort((a,b)=>Math.abs(a.ts-target)-Math.abs(b.ts-target))[0];
    // If no ~24h comparison exists, provide an explicitly marked *different*
    // observation span rather than empty cards or inventing hourly matches.
    const partial=days===1&&!nearby?valid.find(p=>p.ts>=last.ts-7*86400000):null;
    const earlier=nearby||partial;
    if(!earlier)return null;
    const wins=diffCounts(last,earlier,"wins"),losses=diffCounts(last,earlier,"losses");
    const kills=diffCounts(last,earlier,"kills"),deaths=diffCounts(last,earlier,"deaths");
    if([wins,losses,kills,deaths].every(x=>x===null))return null;
    const matches=wins!==null&&losses!==null?wins+losses:null;
    const winrate=matches&&matches>0?100*wins/matches:null;
    const kd=kills!==null&&deaths!==null?(deaths===0?(kills===0?null:kills):kills/deaths):null;
    return {wins,losses,kills,deaths,winrate,kd,from:earlier.ts,to:last.ts,
      coverage:nearby?"approximate":"available"};
  }
  function drawPeriod(prefix,data){
    for(const key of ["wins","losses","kills","deaths"]){
      $(prefix+"-"+key).textContent=data?.[key]===null||data?.[key]===undefined?"–":data[key].toLocaleString("de-DE");
    }
    $(prefix+"-winrate").textContent=data?.winrate===null||data?.winrate===undefined?"–":fmt(data.winrate)+"%";
    $(prefix+"-kd").textContent=data?.kd===null||data?.kd===undefined?"–":fmt(data.kd);
    const hours=data?(data.to-data.from)/3600000:null;
    $(prefix+"-window").textContent=data?
      (data.coverage==="available"?"Nur vorhandener Messzeitraum, nicht 24h: ":"Gemessener Zeitraum: ")+
      dateTime(data.from)+" – "+dateTime(data.to)+" ("+fmt(hours)+" Std.)":
      "Noch keine passenden Vergleichsdaten";
  }
  function renderPeriods(){
    const current=activePlayer();
    const key=current?playerKey(current):"";
    const day=key?periodStats(key,1,6*3600000):null;
    const week=key?periodStats(key,7,18*3600000):null;
    drawPeriod("day",day);drawPeriod("week",week);
    $("day-title").textContent=day?.coverage==="available"?"VERFÜGBARER VERLAUF":"LETZTE 24 STUNDEN";
    $("period-player").textContent=current?"SPIELER: "+current.name:"SPIELER AUSWÄHLEN";
    const points=getPoints(key);
    const remote=!!serverHistory.players?.[key]?.points?.length;
    const last=points.at(-1);
    const delayed=last&&Date.now()-last.ts>3*3600000;
    if(!week&&points.length){
      const elapsed=(last.ts-points[0].ts)/86400000;
      $("week-window").textContent="Noch kein 7-Tage-Vergleich (aufgezeichnet: "+
        fmt(Math.max(0,elapsed))+" Tage)";
    }
    if(!day&&points.length===1)
      $("day-window").textContent="Erster Messstand: "+dateTime(points[0].ts)+" · zweiter fehlt";
    $("period-note").textContent=!current?"Zuerst einen Spieler auswählen."
      :!points.length?"Für "+current.name+" wurde noch kein erfolgreicher Verlaufsstand gespeichert."
      :(remote?"Server- und lokale API-Messungen":"Lokale API-Messungen")+
        " für "+current.name+" seit "+dateTime(points[0].ts)+
        ". Letzter Messstand: "+dateTime(last.ts)+
        (delayed?" (älter als 3 Stunden).":"")+
        (day?.coverage==="available"?" Ein vollständiger 24-Stunden-Vergleich fehlt noch; oben steht der tatsächliche Messzeitraum.":"")+
        " Striche bedeuten fehlende Vergleichsdaten, nicht null Spiele.";
  }

  function testDiff(start,end){
    if(!start||!end||start.mode!==end.mode||start.seasonal!==end.seasonal)return null;
    const values={};
    for(const field of ["wins","losses","kills","deaths"]){
      const a=start.values?.[field],b=end.values?.[field];
      values[field]=Number.isSafeInteger(a)&&Number.isSafeInteger(b)&&b>=a?b-a:null;
    }
    const matches=values.wins!==null&&values.losses!==null?values.wins+values.losses:null;
    values.winrate=matches===null||matches===0?null:100*values.wins/matches;
    values.kd=values.kills===null||values.deaths===null?null:
      values.deaths===0?(values.kills===0?null:values.kills):values.kills/values.deaths;
    return {values,matches};
  }
  function renderRoundTest(){
    const p=activePlayer(),key=p?playerKey(p):"";
    const test=state.roundTests[key];
    const waiting=!!p&&pending.has(key);
    $("round-test-start").disabled=!p||waiting;
    $("round-test-start").textContent=test?"↻ NEUEN STARTWERT LADEN":"1 · STARTWERT LADEN";
    $("round-test-check").disabled=!p||!test||waiting;
    const comparison=test?.end?testDiff(test.start,test.end):null;
    for(const field of ["wins","losses","kills","deaths"])
      $("test-"+field).textContent=comparison?.values[field]===null||
        comparison?.values[field]===undefined?"–":
        comparison.values[field].toLocaleString("de-DE");
    $("test-winrate").textContent=comparison?.values.winrate==null?"–":fmt(comparison.values.winrate)+"%";
    $("test-kd").textContent=comparison?.values.kd==null?"–":fmt(comparison.values.kd);
    if(!p){$("round-test-status").textContent="Zuerst einen Spieler auswählen.";return;}
    if(waiting){$("round-test-status").textContent="API-Abruf läuft für "+p.name+"…";return;}
    if(!test){$("round-test-status").textContent="Jetzt STARTWERT LADEN antippen, anschließend zwei Rapid-Royale-Runden spielen.";return;}
    if(test.note){$("round-test-status").textContent=test.note;return;}
    if(!test.end){$("round-test-status").textContent="Start gespeichert: "+dateTime(test.start.ts)+
      " · "+p.name+". Nach zwei Runden auf PRÜFEN tippen.";return;}
    if(!comparison||comparison.matches===null){
      $("round-test-status").textContent="API-Werte oder Saison sind nicht vergleichbar. Bitte Test neu starten.";
      return;
    }
    const n=comparison.matches,summary=n===2?"2 Matches erkannt ✓":n===0?
      "Noch kein neues Match in der API":n===1?
      "Bisher erst 1 Match in der API":n+" Matches seit Testbeginn in der API";
    $("round-test-status").textContent=summary+" · "+dateTime(test.start.ts)+" – "+
      dateTime(test.end.ts)+".";
  }
  async function performRoundTest(action){
    const player=activePlayer();if(!player)return;
    const key=playerKey(player);
    if(pending.has(key)){$("round-test-status").textContent="API-Abruf läuft bereits. Danach erneut antippen.";return;}
    $("round-test-status").textContent="Lade echte Rapid-Royale-Zähler für "+player.name+"…";
    const received=await fetchPlayer(player);
    if(!received){$("round-test-status").textContent="API-Abruf fehlgeschlagen. Siehe Spieler-Details. Der bisherige Test bleibt erhalten.";return;}
    const point=parseSnapshot(received.stats);
    if(!point||!Number.isSafeInteger(point.values.wins)||!Number.isSafeInteger(point.values.losses)){
      $("round-test-status").textContent="Für den Test fehlen auswertbare Rapid-Royale-Wins/Losses.";
      return;
    }
    const current={...point,mode:received.mode,seasonal:received.seasonal};
    if(action==="start"){
      state.roundTests[key]={start:current};
    }else{
      const previous=state.roundTests[key];
      if(!previous?.start){$("round-test-status").textContent="Zuerst Startwert laden.";return;}
      if(previous.start.mode!==current.mode||previous.start.seasonal!==current.seasonal){
        $("round-test-status").textContent="Anderer Modus oder Saison – bitte einen neuen Startwert laden.";
        return;
      }
      state.roundTests[key]={...previous,end:current};
    }
    save();renderRoundTest();
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
    renderRoundTest();
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
        return null;
      }
      recordSnapshot(p,rapid.parsed.stats,rapid);
      const suffix=rapid.seasonal?" · nur Saisonwerte":"";
      const fallback=usedPlatform!==p.platform?" · über "+(usedPlatform==="ea"?"EA/PC":usedPlatform.toUpperCase())+" gefunden":"";
      playerData.set(key,{stats:rapid.parsed.stats,message:rapid.modeTitle+suffix+fallback+" · GameTools.Network · "+new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})});
      $("api-feedback").textContent="Rapid-Royale-Statistiken geladen. Verlauf lokal gespeichert.";
      return {stats:rapid.parsed.stats,mode:rapid.modeTitle,seasonal:rapid.seasonal};
    }catch(err){
      const message=err.status===404?err.message
        :err.name==="AbortError"?"Zeitüberschreitung. Erneut laden."
        :err instanceof TypeError?"API-Verbindung fehlgeschlagen. Netzwerk oder Browser-CORS prüfen."
        :err.message||"Unbekannter API-Fehler.";
      playerData.set(key,{stats:{},message});
      $("api-feedback").textContent="Rapid-Royale-Statistiken für "+p.name+" konnten nicht geladen werden.";
      return null;
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
  $("round-test-start").addEventListener("click",()=>performRoundTest("start"));
  $("round-test-check").addEventListener("click",()=>performRoundTest("check"));
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&state.players.length){loadServerHistory();refreshAll();}});
  setInterval(()=>{if(!document.hidden&&state.players.length)refreshAll();},120000);
  if("serviceWorker" in navigator && location.protocol!=="file:")window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  renderPlayers();renderAuto();
  loadServerHistory().then(()=>{if(state.players.length)refreshAll();});
})();
