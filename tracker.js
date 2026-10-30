"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const KEY = "bf6-winlost-v1";
  const PLATFORMS = {ea:"EA / PC",xbox:"XBOX",psn:"PLAYSTATION",steam:"STEAM"};
  // Remove only the obsolete BOT defaults. RockmasterR is deliberately retained.
  const FIXED_PLAYERS=[
    {name:"Strausbrot",platform:"xbox"},
    {name:"RockmasterR",platform:"ea"},
    {name:"Pathogeno",platform:"psn"}
  ];
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
  const dateTime = t => new Date(t).toLocaleString("de-DE",{timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
  const countFrom = value => {
    if(value===null||value===undefined)return null;
    const s=String(value).trim();
    if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(s))return null;
    const n=Number(s.replace(/\./g,""));
    return Number.isSafeInteger(n)&&n>=0?n:null;
  };
  // Strausbrot on Xbox and Strausbrot looked up through EA/PC are the
  // same confirmed account. Keep EA as its history/selection key.
  const playerKey = p => {
    const name=p.name.trim().toLowerCase();
    const platform=name==="strausbrot"&&p.platform==="xbox"?"ea":p.platform;
    return platform+":"+name;
  };
  const loadState = () => {
    let data={};
    try{data=JSON.parse(localStorage.getItem(KEY))||{}}catch{}
    const players=FIXED_PLAYERS.map(p=>({...p}));
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
    const canonicalSelected=previous.toLowerCase()==="xbox:strausbrot"?"ea:strausbrot":previous;
    const trackedPlayer=players.some(p=>playerKey(p)===canonicalSelected)?canonicalSelected:"";
    return {...data,players,trackedPlayer,snapshots,defaultBotsClearedV19:true};
  };
  const state=loadState();
  if(!state.kdTrends||typeof state.kdTrends!=="object"||Array.isArray(state.kdTrends))
    state.kdTrends={};
  const playerData=new Map();
  const pending=new Set();
  let serverHistory={schemaVersion:1,players:{}};
  function getPoints(key) {
    // Keep both sources: a recent local API read must not disappear just because
    // an older hourly server snapshot exists. All counters are actual API reads.
    const remote=serverHistory.players?.[key]?.points||[];
    const local=state.snapshots[key]||[];
    // Keep pre-migration Xbox snapshots available for the canonical EA key.
    const legacy=key==="ea:strausbrot"?(state.snapshots["xbox:strausbrot"]||[]):[];
    return [...remote,...local,...legacy]
      .filter(p=>Number.isFinite(p?.ts)&&p.ts>0&&p.ts<=Date.now()+60000&&
        p?.values&&Number.isSafeInteger(p.values.wins)&&
        Number.isSafeInteger(p.values.losses))
      .map(p=>({...p,series:p.series||"rapid-royale|"}))
      .sort((a,b)=>a.ts-b.ts);
  }
  async function loadServerHistory(){
    try{
      const response=await fetch("./data/rapid-history.json",{cache:"no-store"});
      if(response.ok){
        const data=await response.json();
        if(data?.schemaVersion===1&&data.players&&typeof data.players==="object")
          serverHistory=data;
      }
    }catch(error){console.warn("BF6-Verlauf konnte nicht geladen werden",error);}
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
  function kdValue(stats){
    const direct=num(stats?.kd);
    if(direct!==null&&direct>=0)return Math.round(direct*100)/100;
    const kills=countFrom(stats?.kills),deaths=countFrom(stats?.deaths);
    return kills!==null&&deaths!==null&&deaths>0?
      Math.round(kills/deaths*100)/100:null;
  }
  function kdFromSnapshot(point){
    const kills=point?.values?.kills,deaths=point?.values?.deaths;
    if(!Number.isSafeInteger(kills)||!Number.isSafeInteger(deaths)||
       kills<0||deaths<=0)return null;
    return Math.round(kills/deaths*100)/100;
  }
  function kdTrendFromHistory(key,current){
    if(current===null)return null;
    const points=getPoints(key);
    const latest=points.at(-1);
    // Never compare a fresh API result with a different/stale history value.
    if(!latest||kdFromSnapshot(latest)!==current)return null;
    // Prior *different* displayed K/D within the SAME Rapid-Royale series.
    // This survives page reloads and works on other devices using server history.
    for(let i=points.length-2;i>=0;i--){
      const point=points[i];
      if(point.series!==latest.series)continue;
      const previous=kdFromSnapshot(point);
      if(previous===null||previous===current)continue;
      // Resets or incomparable counters must not create a false trend.
      if(point.values.kills>latest.values.kills||
         point.values.deaths>latest.values.deaths)return null;
      return current>previous?"up":"down";
    }
    return null;
  }
  function updateKdTrend(player,stats){
    const current=kdValue(stats);
    if(current===null)return;
    const key=playerKey(player);
    const prior=state.kdTrends[key];
    const fromHistory=kdTrendFromHistory(key,current);
    if(!prior||!Number.isFinite(prior.current)){
      // Import an older real API measurement instead of starting neutral.
      state.kdTrends[key]={current,previous:null,direction:fromHistory,at:Date.now()};
      save();return;
    }
    if(prior.current===current){
      // Repair earlier neutral initialization once stored data becomes available.
      if(!prior.direction&&fromHistory){
        state.kdTrends[key]={...prior,direction:fromHistory};
        save();
      }
      return;
    }
    state.kdTrends[key]={current,previous:prior.current,
      direction:fromHistory||(current>prior.current?"up":"down"),at:Date.now()};
    save();
  }
  function diffCounts(now,then,key){
    const current=now?.values[key],before=then?.values[key];
    if(!Number.isSafeInteger(current)||!Number.isSafeInteger(before)||current<before)return null;
    return current-before;
  }
  const DAY_MS=24*60*60*1000;
  const BERLIN_PARTS=new Intl.DateTimeFormat("en-GB",{
    timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",
    day:"2-digit",hour:"2-digit",hourCycle:"h23"
  });
  function berlinParts(timestamp){
    const out={};
    for(const p of BERLIN_PARTS.formatToParts(new Date(timestamp)))
      if(["year","month","day","hour"].includes(p.type))out[p.type]=Number(p.value);
    return out;
  }
  function atBerlinSeven(dateUTC){
    const year=dateUTC.getUTCFullYear(),month=dateUTC.getUTCMonth(),day=dateUTC.getUTCDate();
    const guess=Date.UTC(year,month,day,7);
    const p=berlinParts(guess);
    const guessBerlinAsUTC=Date.UTC(p.year,p.month-1,p.day,p.hour);
    return guess+(guess-guessBerlinAsUTC);
  }
  function dailyWindow(now=Date.now()){
    const p=berlinParts(now);
    let dateUTC=Date.UTC(p.year,p.month-1,p.day);
    if(p.hour<7)dateUTC-=DAY_MS;
    // Build *both* ends at 07:00 Europe/Berlin, including DST changes.
    return {start:atBerlinSeven(new Date(dateUTC)),
      end:atBerlinSeven(new Date(dateUTC+DAY_MS))};
  }
  function periodWindow(days,now){
    return days===1?dailyWindow(now):{start:now-days*DAY_MS,end:now};
  }
  const BASELINE_TOLERANCE_MS=6*60*60*1000;
  const STALE_MS=3*60*60*1000;
  function periodStats(key,days,now=Date.now()){
    // Use a recent measurement before the reset where possible, so results
    // between 07:00 and the first late morning snapshot are not dropped.
    const window=periodWindow(days,now);
    const points=getPoints(key).filter(p=>p.ts<=now);
    const inWindow=points.filter(p=>p.ts>=window.start&&p.ts<=Math.min(now,window.end));
    const latest=inWindow.at(-1);
    if(!latest)return null;
    const matching=inWindow.filter(p=>p.series===latest.series);
    const before=points.filter(p=>p.ts<window.start&&
      p.series===latest.series&&window.start-p.ts<=BASELINE_TOLERANCE_MS).at(-1);
    const baseline=before||matching[0];
    if(!baseline||baseline.ts>=latest.ts)return null;
    const wins=diffCounts(latest,baseline,"wins"),losses=diffCounts(latest,baseline,"losses");
    const kills=diffCounts(latest,baseline,"kills"),deaths=diffCounts(latest,baseline,"deaths");
    if([wins,losses,kills,deaths].every(x=>x===null))return null;
    const matches=wins!==null&&losses!==null?wins+losses:null;
    const winrate=matches&&matches>0?100*wins/matches:null;
    const kd=kills!==null&&deaths!==null?(deaths===0?(kills===0?null:kills):kills/deaths):null;
    return {wins,losses,kills,deaths,winrate,kd,from:baseline.ts,to:latest.ts,
      coverage:before?"approximate":"partial",
      windowStart:window.start,windowEnd:window.end,
      stale:now-latest.ts>STALE_MS};
  }
  function unchangedSince(key){
    const points=getPoints(key),latest=points.at(-1);
    if(!latest)return null;
    const fields=["wins","losses","kills","deaths"];
    let from=latest.ts;
    for(let i=points.length-2;i>=0;i--){
      const p=points[i];
      if(p.series!==latest.series)continue;
      if(fields.some(k=>p.values[k]!==latest.values[k]))break;
      from=p.ts;
    }
    return from;
  }
  function drawPeriod(prefix,data,days,now,key){
    for(const metric of ["wins","losses","kills","deaths"])
      $(prefix+"-"+metric).textContent=data?.[metric]==null?"–":data[metric].toLocaleString("de-DE");
    $(prefix+"-winrate").textContent=data?.winrate==null?"–":fmt(data.winrate)+"%";
    $(prefix+"-kd").textContent=data?.kd==null?"–":fmt(data.kd);
    const window=periodWindow(days,now);
    $(prefix+"-window").textContent=dateTime(window.start)+" – "+dateTime(window.end);
    const points=getPoints(key);
    const latest=points.at(-1);
    const lastInWindow=points.filter(p=>p.ts>=window.start&&p.ts<=now).at(-1);
    const messages=[];
    if(!lastInWindow)messages.push("Noch kein Messwert im Zeitraum");
    else if(!data)messages.push("Noch keine vergleichbaren Messwerte");
    else if(data.coverage==="approximate")
      messages.push("≈ Startmessung "+dateTime(data.from)+" (vor Zeitfenster)");
    else if(days===1&&data.from-window.start>2*60*60*1000)
      messages.push("Teilzeitraum ab "+dateTime(data.from));
    if(latest&&now-latest.ts>STALE_MS)
      messages.push("VERALTET · Stand "+dateTime(latest.ts));
    else if(latest&&days===1){
      const since=unchangedSince(key);
      if(since&&now-since>18*60*60*1000)
        messages.push("API-Zähler unverändert seit "+dateTime(since));
    }
    $(prefix+"-coverage").textContent=messages.join(" · ");
  }
  function renderPeriods(){
    const current=activePlayer(),key=current?playerKey(current):"";
    const now=Date.now();
    drawPeriod("day",key?periodStats(key,1,now):null,1,now,key);
    drawPeriod("week",key?periodStats(key,7,now):null,7,now,key);
    $("period-player").textContent=current?current.name:"";
  }

  function renderAuto(){
    const current=activePlayer(),key=current?playerKey(current):"";
    if(state.trackedPlayer!==key){state.trackedPlayer=key;save();}
    const select=$("tracked-player");
    select.innerHTML=current?state.players.map(p=>'<option value="'+safe(playerKey(p))+'">'+safe(p.name)+' · '+safe(playerKey(p)==="ea:strausbrot"?"XBOX":PLATFORMS[p.platform])+'</option>').join(""):'<option value="">Spieler wählen</option>';
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
    $("auto-status").textContent=pending.has(key)?"Lädt …":
      d?.message||(last?"Stand: "+dateTime(last.ts):"Noch keine Daten");
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
      const platformLabel=key==="ea:strausbrot"?"XBOX · EA-ID":PLATFORMS[p.platform];
      const trend=state.kdTrends[key];
      const shownKd=kdValue(stats);
      // Prefer observed historical changes over device-only trend state.
      // In particular, a neutral first-run state must NOT hide existing history.
      const historical=kdTrendFromHistory(key,shownKd);
      const sameKd=shownKd!==null&&trend&&shownKd===trend.current;
      const direction=historical||(sameKd?trend.direction:null);
      const arrow=direction==="up"?
        '<span class="kd-trend up" role="img" aria-label="K/D gestiegen" title="K/D gestiegen"></span>':
        direction==="down"?
        '<span class="kd-trend down" role="img" aria-label="K/D gesunken" title="K/D gesunken"></span>':"";
      return '<article class="player-card"><div class="player-title"><div><strong>'+safe(p.name)+'</strong><small>'+safe(platformLabel)+'</small></div><div class="player-actions"><button type="button" data-refresh-player="'+safe(key)+'" '+(loading?'disabled':'')+'>'+(loading?'LÄDT…':'↻ LADEN')+'</button></div></div><div class="player-metrics">'+vals.map(([label,value])=>'<div class="player-metric"><small>'+label+'</small><b>'+safe(value===null||value===undefined?"–":value)+(label==="K/D"?arrow:"")+'</b></div>').join("")+'</div><p class="player-status">'+safe(loading?'API wird abgefragt…':d?.message||"Noch nicht abgerufen")+'</p></article>';
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
        return fetch("https://api.gametools.network/bf6/stats/?"+query.toString(),{cache:"no-store",signal:controller.signal,headers:{"Accept":"application/json"}});
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
      updateKdTrend(p,rapid.parsed.stats);
      playerData.set(key,{stats:rapid.parsed.stats,message:"Aktualisiert "+new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})});
      $("api-feedback").textContent="Aktualisiert";
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
  $("player-list").addEventListener("click",e=>{
    const refresh=e.target.closest("[data-refresh-player]");
    if(refresh){
      const p=state.players.find(x=>playerKey(x)===refresh.dataset.refreshPlayer);
      if(p)fetchPlayer(p);
    }
  });
  $("refresh-all").addEventListener("click",refreshAll);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&state.players.length){loadServerHistory();refreshAll();}});
  setInterval(()=>{if(!document.hidden&&state.players.length)refreshAll();},120000);
  if("serviceWorker" in navigator && location.protocol!=="file:")window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  renderPlayers();renderAuto();
  loadServerHistory().then(()=>{if(state.players.length)refreshAll();});
})();
