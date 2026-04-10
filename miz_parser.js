/**
 * DCS MIZ PARSER — miz_parser.js  (méthodologie v7 révisée)
 * Ancrage sur ["groupId"] + getEnclosingBlock + split sur ["unitId"]
 *
 * window.parseMiz / secsToTime / secsToDelta / calcHdgDist / xy2ll / xy2dmm / formatFreq / conv
 */

(function (window) {

/* ══════════════════════════════════════════════════════════════
   1. TOOLKIT CONVERSIONS
══════════════════════════════════════════════════════════════ */
window.conv = {
  mToFt:    m   => m   * 3.28084, ftToM:   ft  => ft  / 3.28084,
  mToNm:    m   => m   / 1852,    nmToM:   nm  => nm  * 1852,
  mToKm:    m   => m   / 1000,    kmToM:   km  => km  * 1000,
  nmToKm:   nm  => nm  * 1.852,   kmToNm:  km  => km  / 1.852,
  msToKts:  ms  => ms  * 1.94384, ktsToMs: kts => kts / 1.94384,
  msToKmh:  ms  => ms  * 3.6,     kmhToMs: kmh => kmh / 3.6,
  ktsToKmh: kts => kts * 1.852,   kmhToKts:kmh => kmh / 1.852,
  kgToLbs:  kg  => kg  * 2.20462, lbsToKg: lbs => lbs / 2.20462,
  kgToGal:  kg  => kg  * 0.264172,galToKg: gal => gal / 0.264172,
};

/* ══════════════════════════════════════════════════════════════
   2. TEMPS / COORDONNÉES
══════════════════════════════════════════════════════════════ */
window.secsToTime = function (s) {
  if (!s || isNaN(s)) return '00:00:00Z';
  s = Math.floor(s);
  return `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}Z`;
};
window.secsToDelta = function (s) {
  s = Math.floor(s || 0);
  return `+${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
};
/** Secondes absolues → "HH:MM" (usage interne + exposé) */
window.secsAbsToHHMM = function(s) {
  s = ((Math.floor(s || 0) % 86400) + 86400) % 86400;
  return String(Math.floor(s/3600)).padStart(2,'0') + ':' + String(Math.floor((s%3600)/60)).padStart(2,'0');
};

window.calcHdgDist = function (x1, y1, x2, y2) {
  const dN = x2-x1, dE = y2-y1;
  const dist = Math.sqrt(dN*dN + dE*dE) / 1852.0;
  let hdg = Math.atan2(dE, dN) * 180 / Math.PI;
  if (hdg < 0) hdg += 360;
  return { hdg: String(Math.round(hdg)).padStart(3,'0') + '°', dist: dist.toFixed(1) };
};

const ORIGINS = {
  Caucasus:    { lat:41.84,  lon: 41.78  }, PersianGulf:{ lat:25.0,  lon: 55.0  },
  Syria:       { lat:35.5,   lon: 37.0   }, Sinai:      { lat:29.5,  lon: 33.0  },
  Nevada:      { lat:36.0,   lon:-116.5  }, Marianas:   { lat:14.0,  lon:145.0  },
  Kola:        { lat:68.0,   lon: 33.0   }, Falklands:  { lat:-51.5, lon:-58.5  },
};

function _ll(x, y, th) {
  const o = ORIGINS[th] || ORIGINS.Caucasus, R = 6378137;
  return { lat: o.lat + (x/R)*(180/Math.PI), lon: o.lon + (y/(R*Math.cos(o.lat*Math.PI/180)))*(180/Math.PI) };
}
window.xy2ll = function (x, y, th) {
  const {lat,lon} = _ll(x,y,th);
  const lH=lat>=0?'N':'S', nH=lon>=0?'E':'W', aL=Math.abs(lat), aO=Math.abs(lon);
  return `${lH}${Math.floor(aL)}°${((aL-Math.floor(aL))*60).toFixed(3)} ${nH}${Math.floor(aO)}°${((aO-Math.floor(aO))*60).toFixed(3)}`;
};
window.xy2dmm = function (x, y, th) {
  const {lat,lon} = _ll(x,y,th);
  const lH=lat>=0?'N':'S', nH=lon>=0?'E':'W', aL=Math.abs(lat), aO=Math.abs(lon);
  const ddm=`${lH}${Math.floor(aL)}°${((aL-Math.floor(aL))*60).toFixed(2)} ${nH}${Math.floor(aO)}°${((aO-Math.floor(aO))*60).toFixed(2)}`;
  const s=new String(ddm); s.ddm=ddm; s.lat=lat; s.lon=lon;
  const latD=Math.floor(aL), lonD=Math.floor(aO), latMF=(aL-latD)*60, lonMF=(aO-lonD)*60;
  s.dms=`${lH}${latD}°${Math.floor(latMF)}'${((latMF%1)*60).toFixed(1)}" ${nH}${lonD}°${Math.floor(lonMF)}'${((lonMF%1)*60).toFixed(1)}"`;
  return s;
};
window.formatFreq = function (value) {
  if (value == null || value === '') return '';
  const n = parseFloat(String(value).replace(/[^0-9.]/g,''));
  if (!Number.isFinite(n)) return String(value);
  return (n > 10000 ? n/1000000 : n).toFixed(2);
};

/* ══════════════════════════════════════════════════════════════
   3. MOTEUR BRACE-MATCHING (utilisé pour quelques extractions précises)
══════════════════════════════════════════════════════════════ */

/** Extrait le bloc { ... } incluant son brace ouvrant à startBrace. */
function extractBlock(str, startBrace) {
  let depth = 0, end = startBrace;
  for (let i = startBrace; i < str.length; i++) {
    if      (str[i] === '{') depth++;
    else if (str[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  return str.slice(startBrace + 1, end);
}

/**
 * Remonte depuis `index` pour trouver le { ouvrant de son bloc englobant,
 * puis extrait tout le bloc. Méthodologie v7 — fiable sur des structures imbriquées.
 */
function getEnclosingBlock(str, index) {
  let depth = 0;
  let startIdx = 0;
  for (let i = index; i >= 0; i--) {
    if      (str[i] === '}') depth++;
    else if (str[i] === '{') { depth--; if (depth < 0) { startIdx = i; break; } }
  }
  depth = 0;
  let endIdx = str.length;
  for (let i = startIdx; i < str.length; i++) {
    if      (str[i] === '{') depth++;
    else if (str[i] === '}') { depth--; if (depth === 0) { endIdx = i+1; break; } }
  }
  return str.substring(startIdx, endIdx);
}

/** Trouve le premier ["key"] = { ... } et retourne son contenu. */
function findLuaBlock(str, key) {
  const re = new RegExp(`\\["${key}"\\]\\s*=\\s*\\{`, 'g');
  const m  = re.exec(str);
  if (!m) return null;
  return extractBlock(str, str.indexOf('{', m.index));
}

/* ══════════════════════════════════════════════════════════════
   4. RADIO  — channels + modulations → MHz strings
   Structure : ["Radio"] = { [1]={channels={[1]=261,...}, modulations={[1]=5,...}}, [2]={} }
   [1]=UHF  [2]=VHF
   channels[i] = partie entière MHz, modulations[i] = centièmes
══════════════════════════════════════════════════════════════ */
function parseRadioChannels(unitContent) {
  const res = { channelsUHF:[], channelsVHF:[], freqUHF:null, freqVHF:null };

  /* Chercher le bloc ["Radio"] dans le contenu de l'unité */
  const radioBlock = findLuaBlock(unitContent, 'Radio');
  if (!radioBlock) {
    /* Fallback v7 : patterns [1]={channels=...} / [2]={channels=...} */
    const r1 = unitContent.match(/\[1\]\s*=\s*\{\s*\["channels"\]\s*=\s*\{([^}]+)\}/);
    if (r1) {
      [...r1[1].matchAll(/\[(\d+)\]\s*=\s*([\d.]+)/g)].forEach(m => {
        res.channelsUHF.push(parseFloat(m[2]).toFixed(3));
      });
      res.freqUHF = res.channelsUHF[0] || null;
    }
    const r2 = unitContent.match(/\[2\]\s*=\s*\{\s*\["channels"\]\s*=\s*\{([^}]+)\}/);
    if (r2) {
      [...r2[1].matchAll(/\[(\d+)\]\s*=\s*([\d.]+)/g)].forEach(m => {
        res.channelsVHF.push(parseFloat(m[2]).toFixed(3));
      });
      res.freqVHF = res.channelsVHF[0] || null;
    }
    return res;
  }

  /* Parcourir les radios [1] et [2] dans le bloc Radio */
  const radioRe = /\[(\d+)\]\s*=\s*\{/g;
  let rm;
  while ((rm = radioRe.exec(radioBlock)) !== null) {
    const rIdx    = parseInt(rm[1], 10);
    const rBrace  = radioBlock.indexOf('{', rm.index);
    const rContent= extractBlock(radioBlock, rBrace);

    const chBlock  = findLuaBlock(rContent, 'channels');
    const modBlock = findLuaBlock(rContent, 'modulations');
    if (!chBlock) continue;

    /* Lire les paires [N] = valeur scalaire */
    const chMap = new Map(), modMap = new Map();
    [...chBlock.matchAll(/\[(\d+)\]\s*=\s*([\d.]+)/g)].forEach(m => chMap.set(+m[1], +m[2]));
    if (modBlock) [...modBlock.matchAll(/\[(\d+)\]\s*=\s*([\d.]+)/g)].forEach(m => modMap.set(+m[1], +m[2]));

    const freqs = [...chMap.keys()].sort((a,b)=>a-b)
      .map(i => ((chMap.get(i)||0) + (modMap.get(i)||0)/100).toFixed(3));

    if (rIdx === 1) { res.channelsUHF = freqs; res.freqUHF = freqs[0]||null; }
    if (rIdx === 2) { res.channelsVHF = freqs; res.freqVHF = freqs[0]||null; }
  }
  return res;
}

/* ══════════════════════════════════════════════════════════════
   5. BEACON TACAN — activebeacon → channel + modeChannel
   Exemple DCS : ["activebeacon"] = { ["channel"] = 12, ["modeChannel"] = "X" }
   → tacan = "12X"
══════════════════════════════════════════════════════════════ */
function parseTacanBeacon(groupContent) {
  /* Chercher dans le groupe (ou ses unités) le bloc activebeacon */
  const beaconBlock = findLuaBlock(groupContent, 'activebeacon');
  if (!beaconBlock) {
    /* Fallback : chercher directement les clés */
    const ch  = groupContent.match(/\["channel"\]\s*=\s*(\d+)/);
    const mod = groupContent.match(/\["modeChannel"\]\s*=\s*"([^"]+)"/);
    if (ch) return ch[1] + (mod ? mod[1] : 'X');
    return '';
  }
  const ch  = beaconBlock.match(/\["channel"\]\s*=\s*(\d+)/);
  const mod = beaconBlock.match(/\["modeChannel"\]\s*=\s*"([^"]+)"/);
  if (!ch) return '';
  return ch[1] + (mod ? mod[1] : 'X');
}

/* ══════════════════════════════════════════════════════════════
   6. TANKER ORBIT POSITION
══════════════════════════════════════════════════════════════ */
function parseTankerOrbit(groupContent, theatre) {
  const orbit = { x:null, y:null, altFt:null, altM:null, speedKts:null, speedKmh:null, latLon:null };

  /* Chercher un WP avec action Orbit dans la route */
  const routeM = groupContent.match(/\["route"\]\s*=\s*\{([\s\S]*?)\n\s*\},\s*--\s*end of \["route"\]/);
  let routeContent = routeM ? routeM[1] : '';
  if (routeContent) {
    /* Identifier les WP contenant Orbit AVANT neutralisation des blocs task */
    const orbitTaskIndices = new Set();
    let searchPos = 0;
    while (true) {
      const ts = routeContent.indexOf('["task"] =', searchPos);
      if (ts === -1) break;
      const te = routeContent.indexOf('end of ["task"]', ts);
      if (te === -1) break;
      const taskBlock = routeContent.substring(ts, te + 15);
      if (/Orbit|Tanking|Refueling/i.test(taskBlock)) {
        orbitTaskIndices.add(ts);
      }
      searchPos = te + 15;
    }

    /* Neutraliser les blocs ["task"] pour eviter les faux splits */
    const rc = routeContent.replace(
      /\["task"\]\s*=[\s\S]*?end of \["task"\]/g,
      (match, offset) => {
        const marker = orbitTaskIndices.has(offset) ? '["_orbit_marker_"] = true' : '["_task_ref_"] = {}';
        return marker;
      }
    );

    const chunks = rc.split(/\n[ \t]*\[\d+\]\s*=\s*\{/);
    for (const chunk of chunks) {
      if (!/_orbit_marker_/.test(chunk)) continue;
      const xM = chunk.match(/\["x"\]\s*=\s*([-\d.]+)/);
      const yM = chunk.match(/\["y"\]\s*=\s*([-\d.]+)/);
      if (xM && yM) {
        orbit.x = parseFloat(xM[1]); orbit.y = parseFloat(yM[1]);
        orbit.latLon = String(window.xy2dmm(orbit.x, orbit.y, theatre));
        const aM = chunk.match(/\["alt"\]\s*=\s*([-\d.]+)/);
        const sM = chunk.match(/\["speed"\]\s*=\s*([-\d.]+)/);
        if (aM) { orbit.altM=Math.round(parseFloat(aM[1])); orbit.altFt=Math.round(parseFloat(aM[1])*3.28084); }
        if (sM) { orbit.speedKts=Math.round(parseFloat(sM[1])*1.94384); orbit.speedKmh=Math.round(parseFloat(sM[1])*3.6); }
        break;
      }
    }
  }
  return orbit;
}

/* ══════════════════════════════════════════════════════════════
   7. WAYPOINTS  (méthodologie v7 : split sur \n[N] = {)
══════════════════════════════════════════════════════════════ */
function parseGroupWaypoints(groupContent, startTime, task, theatre) {
  const wps = [];
  let toTime = '', toTime_abs = '', totTime = '', airdrome = null;

  const rcM = groupContent.match(/\["route"\]\s*=\s*\{([\s\S]*?)\n\s*\},\s*--\s*end of \["route"\]/);
  if (!rcM) return { wps, toTime, toTime_abs, totTime, airdrome };
  let rc = rcM[1];

  /* Neutraliser les blocs ["task"] */
  const tasksMap = []; let counter = 0;
  while (true) {
    const ts = rc.indexOf('["task"] =');
    if (ts === -1) break;
    const te = rc.indexOf('end of ["task"]', ts);
    if (te === -1) break;
    tasksMap.push(rc.substring(ts, te+15));
    rc = rc.substring(0, ts) + `["task_ref_${counter}"] = {}` + rc.substring(te+15);
    counter++;
  }

  const globAF = (typeof AIRFIELDS!=='undefined') ? AIRFIELDS
               : (typeof DCS_AIRFIELDS!=='undefined') ? DCS_AIRFIELDS : null;

  const chunks = rc.split(/\n[ \t]*\[\d+\]\s*=\s*\{/);
  chunks.shift();
  let wpIdx = 1;

  for (const chunk of chunks) {
    if (wps.length >= 25) break;
    const xM   = chunk.match(/\["x"\]\s*=\s*([-\d.]+)/);
    const yM   = chunk.match(/\["y"\]\s*=\s*([-\d.]+)/);
    const etaM = chunk.match(/\["ETA"\]\s*=\s*([0-9.+-eE]+)/);
    if (!(xM && yM)) continue;

    const actionM = chunk.match(/\["action"\]\s*=\s*"([^"]+)"/);
    const wpTypeM = chunk.match(/\["type"\]\s*=\s*"([^"]+)"/);
    const altM    = chunk.match(/\["alt"\]\s*=\s*([-\d.]+)/);
    const speedM  = chunk.match(/\["speed"\]\s*=\s*([-\d.]+)/);
    const aidM    = chunk.match(/\["airdromeId"\]\s*=\s*(\d+)/);
    const action  = actionM ? actionM[1] : (wpTypeM ? wpTypeM[1] : '');
    const eta = etaM ? parseFloat(etaM[1]) : null;
    const delta = (eta !== null)
    ? window.secsToDelta(Math.max(0, eta - startTime))
    : '';

    if (/TakeOff|From Parking|From Ground|Runway/.test(action)) {
      toTime = delta;                        /* delta brut conservé pour totTime */
      toTime_abs = secsAbsToHHMM(eta);       /* HH:MM absolu pour affichage T/O */
      if (aidM && globAF?.[theatre]?.[aidM[1]]) airdrome = globAF[theatre][aidM[1]];
    }

    if (action === task) totTime = delta;

    let descNote = action;
    const trM = chunk.match(/\["task_ref_(\d+)"\]/);
    if (trM && tasksMap[parseInt(trM[1])]) {
      [...tasksMap[parseInt(trM[1])].matchAll(/\["id"\]\s*=\s*"([^"]+)"/g)].forEach(m => {
        if (m[1] !== 'WrappedAction' && !descNote.includes(m[1])) descNote += ' / ' + m[1];
      });
    }

    const alt   = altM   ? parseFloat(altM[1])   : null;
    const speed = speedM ? parseFloat(speedM[1]) : null;
    wps.push({
      desc:     wpTypeM && wpTypeM[1]==='Turning Point' ? 'WP '+wpIdx : action.substring(0,18),
      note:     descNote,
      alt:      alt   !== null ? Math.round(alt   * 3.28084) : 0,
      altM:     alt   !== null ? Math.round(alt)              : 0,
      speed:    speed !== null ? Math.round(speed * 1.94384) : 0,
      speedKmh: speed !== null ? Math.round(speed * 3.6)     : 0,
      distNm:   0, /* calculé dans renderPreview */
      x: parseFloat(xM[1]), y: parseFloat(yM[1]),
      eta: delta,          /* delta depuis start_time, format +HH:MM:SS */
      eta_sec: eta !== null ? eta : null,       /* secondes absolues brutes du fichier mission */
      etaAbs: eta !== null ? window.secsToTime(eta) : '',
      tos: '', type: action,
    });
    wpIdx++;
  }
  return { wps, toTime, toTime_abs: toTime_abs || '', totTime, airdrome };
}

/* ══════════════════════════════════════════════════════════════
   8. PARSEUR PRINCIPAL
   Méthodologie v7 : ancrage sur ["groupId"] + getEnclosingBlock
══════════════════════════════════════════════════════════════ */
const SUP_KEYS   = ['awacs','tanker','refuel','jtac','fac','kc-135','kc135','il-','s-3b', 'a-50','e-3', 'e-2', 'c-'];
const SKIP_TYPES = ['Kub','ZU-','SA-','Ural','truck','Infantry','BMP','BTR','T-72','T-80','Abrams','Bradley','Tigr','Humvee','AAA'];
const SKIP_NAMES = new Set(['Blue','Red','Neutral','blue','red','neutrals','USA','France','Russia','Germany','Syria','Iran','Georgia','China']);
/* ── Exclusions logistique (véhicules non-combat) ── */
const EXCLUDE_LOGI = ['ural','kamaz','gaz','zil','apa','atz','fuel','truck',
                      'ambulan','fire','generator','farp','windsock',
                      'cow','sheep','horse','pig','chicken','dog','cat','bird',
                      'civilian'];

/**
 * Normalise un type d'unité DCS vers une catégorie de menace.
 * Adapté du script Python fourni.
 * @param {string} unitType  - type DCS brut ex: "SA-10 Grumble/5P85D"
 * @param {boolean} isShip   - true si catégorie ship
 * @returns {{ cat:string, label:string }|null}  null = pas une menace
 */
function normalizeSystem(unitType, isShip) {
  const u = (unitType||'').toLowerCase();
  if (EXCLUDE_LOGI.some(x => u.includes(x))) return null;

  /* ── NAVAL ── */
  if (isShip) {
    if (['carrier','cvn','kuznetsov','nimitz','stennis','forrestal','charles','garibaldi']
        .some(x => u.includes(x)))
      return { cat:'NAVAL_CVN', label:'Carrier (CVN/STOBAR)' };
    /* Label générique pour déduplication — le nom brut reste dans .type */
    return { cat:'NAVAL_SURFACE', label: 'Surface Combatant' };
  }

  /* ── SAM LONG PORTÉE ── */
  if (['s-75','volhov','snr_75','sa-2','guideline'].some(x=>u.includes(x)))
    return { cat:'SAM_LR', label:'SA-2 Guideline' };
  if (['s-300','sa-10','sa-20','5p85','s300','s-400','sa-21','s400'].some(x=>u.includes(x)))
    return { cat:'SAM_LR', label:'SA-10/20 Grumble' };
  if (['s-200','sa-5'].some(x=>u.includes(x)))
    return { cat:'SAM_LR', label:'SA-5 Gammon' };
  if (['patriot','mim-104'].some(x=>u.includes(x)))
    return { cat:'SAM_LR', label:'Patriot (MIM-104)' };
  if (['nasams'].some(x=>u.includes(x)))
    return { cat:'SAM_LR', label:'NASAMS' };

  /* ── SAM MOYENNE PORTÉE ── */
  if (['s-125','5p73','sa-3','snr s-125','p-19','neva'].some(x=>u.includes(x)))
    return { cat:'SAM_MR', label:'SA-3 Goa' };
  if (['kub','2p25','1s91','sa-6','gainful'].some(x=>u.includes(x)))
    return { cat:'SAM_MR', label:'SA-6 Gainful' };
  if (['hawk','mim-23'].some(x=>u.includes(x)))
    return { cat:'SAM_MR', label:'HAWK (MIM-23)' };
  if (['buk','9a310','9s18','9s470','sa-11','sa-17','gadfly'].some(x=>u.includes(x)))
    return { cat:'SAM_MR', label:'SA-11/17 Gadfly' };
  if (['sa-2 volga'].some(x=>u.includes(x)))
    return { cat:'SAM_MR', label:'SA-2 Volga' };

  /* ── SAM COURTE PORTÉE ── */
  if (['tor','sa-15','gauntlet','9k330'].some(x=>u.includes(x)))
    return { cat:'SAM_SR', label:'SA-15 Gauntlet (Tor)' };
  if (['osa','sa-8','gecko','9a33'].some(x=>u.includes(x)))
    return { cat:'SAM_SR', label:'SA-8 Gecko' };
  if (['strela','sa-9','sa-13','gaskin','gopher'].some(x=>u.includes(x)))
    return { cat:'SAM_SR', label:'SA-9/13 Gaskin/Gopher' };
  if (['igla','sa-18','grouse','manpads'].some(x=>u.includes(x)))
    return { cat:'SAM_SR', label:'SA-18 Grouse (MANPADS)' };
  if (['hq-7','csa-4'].some(x=>u.includes(x)))
    return { cat:'SAM_SR', label:'HQ-7 (CSA-4)' };
  if (['roland'].some(x=>u.includes(x)))
    return { cat:'SAM_SR', label:'Roland SAM' };
  if (['rapier'].some(x=>u.includes(x)))
    return { cat:'SAM_SR', label:'Rapier SAM' };
  if (['avenger','chaparral','linebacker','stinger'].some(x=>u.includes(x)))
    return { cat:'SAM_SR', label:'SHORAD (Avenger/Chaparral)' };
  if (['2k22','tunguska','sa-19','grison','9k22'].some(x=>u.includes(x)))
    return { cat:'SAM_SR', label:'SA-19 Grison (Tunguska)' };
  if (['pantsir','96k6','sa-22'].some(x=>u.includes(x)))
    return { cat:'SAM_SR', label:'SA-22 Greyhound (Pantsir)' };

  /* ── AAA ── */
  if (['zu-23','hl_zu','zu23'].some(x=>u.includes(x)))
    return { cat:'AAA', label:'ZU-23 AAA' };
  if (['zsu','shilka','zsu-23'].some(x=>u.includes(x)))
    return { cat:'AAA', label:'ZSU-23-4 Shilka' };
  if (['2s6','tunguska'].some(x=>u.includes(x)))  /* double usage AAA/SAM */
    return { cat:'AAA', label:'2S6 Tunguska' };
  if (['vulcan','m163'].some(x=>u.includes(x)))
    return { cat:'AAA', label:'M163 Vulcan' };
  if (['bofors','l/60','l60'].some(x=>u.includes(x)))
    return { cat:'AAA', label:'Bofors 40mm' };
  if (['flak','8.8','flak36','flak18'].some(x=>u.includes(x)))
    return { cat:'AAA', label:'Flak 88mm' };
  if (['ks-19','s-60','ks19'].some(x=>u.includes(x)))
    return { cat:'AAA', label:'Heavy AAA (KS-19/S-60)' };
  if (['gepard'].some(x=>u.includes(x)))
    return { cat:'AAA', label:'Gepard SPAAA' };
  if (['phalanx','ciws'].some(x=>u.includes(x)))
    return { cat:'AAA', label:'C-RAM Phalanx' };
  if (['m1939','37mm'].some(x=>u.includes(x)))
    return { cat:'AAA', label:'M1939 37mm AAA' };

  return null;
}

/* ══════════════════════════════════════════════════════════════
   v8 — Détection de catégorie DCS pour un groupe
   Basé sur la position du groupId dans le lua complet
══════════════════════════════════════════════════════════════ */

function detectDcsCategory(luaText, groupGlobalIndex) {
  const before = luaText.substring(0, groupGlobalIndex);

  const idxPlane = before.lastIndexOf('["plane"]');
  const idxHeli  = before.lastIndexOf('["helicopter"]');
  const idxVeh   = before.lastIndexOf('["vehicle"]');
  const idxShip  = before.lastIndexOf('["ship"]');

  const max = Math.max(idxPlane, idxHeli, idxVeh, idxShip);

  if (max === -1) return 'unknown';
  if (max === idxPlane) return 'plane';
  if (max === idxHeli)  return 'helicopter';
  if (max === idxVeh)   return 'vehicle';
  if (max === idxShip)  return 'ship';

  return 'unknown';
}


window.parseMiz = function (content, theatre, dictionary = {}) {

  const translate = s => (s && String(s).startsWith('DictKey')) ? (dictionary[s]||s) : s;

  const res = {
    theatre, date:'', time:'', sunrise:'', sunset:'', start_time:0,
    weather:{}, bullseye:{ blue:null, red:null },
    groups:[], support:[],
    threats:{
      sam_lr:[], sam_mr:[], sam_sr:[], aaa:[],
      naval_cvn:[], naval_surface:[],
      air:[]
    },
  };


  /* ── start_time : dernière occurrence (v12 fix) ── */
  const stAll = [...content.matchAll(/\["start_time"\]\s*=\s*([\d.]+)/g)];
  if (stAll.length) {
    res.start_time = parseFloat(stAll[stAll.length-1][1]);
    const t = Math.floor(res.start_time);
    res.time = `${String(Math.floor(t/3600)).padStart(2,'0')}:${String(Math.floor((t%3600)/60)).padStart(2,'0')}Z`;
  }

  /* ── Date ── */
  const dYear  = content.match(/\["date"\]\s*=\s*\{[\s\S]*?\["Year"\]\s*=\s*(\d+)/);
  const dMonth = content.match(/\["date"\]\s*=\s*\{[\s\S]*?\["Month"\]\s*=\s*(\d+)/);
  const dDay   = content.match(/\["date"\]\s*=\s*\{[\s\S]*?\["Day"\]\s*=\s*(\d+)/);
  if (dYear && dMonth && dDay)
    res.date = `${dDay[1].padStart(2,'0')}/${dMonth[1].padStart(2,'0')}/${dYear[1]}`;

  /* ── Lever/coucher ── */
  const sunr = content.match(/\["sunrise"\]\s*=\s*([\d.]+)/);
  const suns = content.match(/\["sunset"\]\s*=\s*([\d.]+)/);
  if (sunr) res.sunrise = window.secsToTime(parseFloat(sunr[1]));
  if (suns) res.sunset  = window.secsToTime(parseFloat(suns[1]));

  /* ── Météo ── */
  const wm = content.match(/\["weather"\]\s*=\s*\{([\s\S]*?)},\s*--\s*end of \["weather"\]/);
  if (wm) {
    const ws = wm[1];
    const tmp = ws.match(/\["temperature"\]\s*=\s*([-\d.]+)/);
    if (tmp) res.weather.temp = parseFloat(tmp[1]).toFixed(0)+'°C';
    const qnh = ws.match(/\["qnh"\]\s*=\s*([\d.]+)/);
    if (qnh) res.weather.qnh = parseFloat(qnh[1]).toFixed(0)+' mmHg';
    const vis = ws.match(/\["distance"\]\s*=\s*([\d.]+)/);
    if (vis) res.weather.vis = (parseFloat(vis[1])/1000).toFixed(0)+' km';
    let windTxt='';
    ['atGround','at2000','at8000'].forEach(lvl => {
      const lr = new RegExp(`\\["${lvl}"\\]\\s*=\\s*\\{[^}]*\\["speed"\\]\\s*=\\s*([\\d.]+)[^}]*\\["dir"\\]\\s*=\\s*([\\d.]+)`,'s');
      const m = ws.match(lr);
      if (m) { const lbl=lvl==='atGround'?'GND':(lvl==='at2000'?'2k':'8k'); windTxt+=`${lbl}: ${Math.round(parseFloat(m[2]))}°/${parseFloat(m[1]).toFixed(1)}m/s `; }
    });
    res.weather.wind = windTxt.trim();
    const cld = ws.match(/\["clouds"\]\s*=\s*\{([\s\S]*?)\}/);
    if (cld) {
      const dens=cld[1].match(/\["density"\]\s*=\s*([\d.]+)/);
      const base=cld[1].match(/\["base"\]\s*=\s*([\d.]+)/);
      res.weather.clouds = (dens && base && parseFloat(dens[1])>0)
        ? `Dens:${dens[1]} Base:${Math.round(parseFloat(base[1])*3.28084)}ft` : 'Clear';
    }
  }

  /* ── Bullseye : extrait depuis le bloc ["coalition"] → ["blue"/"red"] ──
     On cherche ["bullseye"] uniquement à l'intérieur du bloc de chaque
     coalition pour éviter les faux positifs inter-coalitions.            */
  (function extractBullseyes() {
    const coalStart = content.indexOf('["coalition"]');
    if (coalStart === -1) return;
    const coalBlock = extractBlock(content, content.indexOf('{', coalStart));

    for (const { key, side } of [{ key:'blue', side:'blue' }, { key:'red', side:'red' }]) {
      const cRe = new RegExp(`\\["${key}"\\]\\s*=\\s*\\{`);
      const cM  = cRe.exec(coalBlock);
      if (!cM) continue;
      const sideBlock = extractBlock(coalBlock, coalBlock.indexOf('{', cM.index));

      /* ["bullseye"] est un bloc direct dans le bloc coalition (pas dans country) */
      const bM = sideBlock.match(/\["bullseye"\]\s*=\s*\{([^}]*)\}/);
      if (!bM) continue;
      const inner = bM[1];
      const xM = inner.match(/\["x"\]\s*=\s*([-\d.]+)/);
      const yM = inner.match(/\["y"\]\s*=\s*([-\d.]+)/);
      if (xM && yM)
        res.bullseye[side] = { x: parseFloat(xM[1]), y: parseFloat(yM[1]) };
    }
  })();

  /* ════ EXTRACTION DES GROUPES ════
     Méthodologie v7 : on trouve toutes les occurrences de ["groupId"]
     et on remonte pour extraire le bloc englobant complet.
     Avantages :
       - pas de findIndexedBlocks qui descend dans les sous-blocs
       - le bloc groupe contient tout (units, route, task, callsign…)
       - on récupère la coalition depuis le texte autour
  ═════════════════════════════════════════════════════════════════ */

  /* Construire les blocs par coalition pour filtrer correctement */
  const coalitionStart = content.indexOf('["coalition"]');
  const coalitionContent = coalitionStart !== -1
    ? extractBlock(content, content.indexOf('{', coalitionStart))
    : content;

  const COAL_MAP = [
    { key:'blue',     name:'blue'    },
    { key:'red',      name:'red'     },
    { key:'neutrals', name:'neutral' },
  ];

  for (const { key: coalKey, name: coalName } of COAL_MAP) {
  /* Extraire le bloc de cette coalition */
  const cRe = new RegExp(`\\["${coalKey}"\\]\\s*=\\s*\\{`, 'g');
  const cM  = cRe.exec(coalitionContent);
  if (!cM) continue;
  const coalBlock = extractBlock(coalitionContent, coalitionContent.indexOf('{', cM.index));

  /* Trouver tous les groupIds dans cette coalition */
  const groupIdRe = /\["groupId"\]\s*=\s*\d+/g;
  let gm;
  const seen = new Set(); /* éviter les doublons */

  while ((gm = groupIdRe.exec(coalBlock)) !== null) {
    const gc = getEnclosingBlock(coalBlock, gm.index);

    /* v8 : retrouver l’index global et la catégorie DCS */
    /* v8 : catégorie DCS via position dans coalBlock (fiable, évite faux positifs) */
    const dcsCategory = detectDcsCategory(coalBlock, gm.index);

    /* Nom du groupe */
    const nameM = gc.match(/\["name"\]\s*=\s*"([^"]+)"/);
    if (!nameM) continue;
    const name = translate(nameM[1]);
    if (SKIP_NAMES.has(name)) continue;
    if (seen.has(name)) continue;
    seen.add(name);

    /* Fréquence groupe */
    const freqM = gc.match(/\["frequency"\]\s*=\s*([\d.]+)/);
    const freq  = freqM ? parseFloat(freqM[1]) : 0;
    if (freq < 100) continue;

    /* Bloc units via marqueur "end of" (v7) */
    const ucM = gc.match(/\["units"\]\s*=\s*\{([\s\S]*?)\n\s*\},\s*--\s*end of \["units"\]/);
    const uc  = ucM ? ucM[1] : '';
    if (!uc) continue;

    /* Type d'appareil */
    const typeM  = uc.match(/\["type"\]\s*=\s*"([^"]+)"/);
    const acType = typeM ? translate(typeM[1]) : '';
    if (SKIP_TYPES.some(s => acType.includes(s))) continue;

    /* ── Nombre d'unités : compter ["unitId"] (v7, fiable) ── */
    const numUnits = (uc.match(/\["unitId"\]/g) || []).length || 1;

    const taskM = gc.match(/\["task"\]\s*=\s*"([^"]+)"/);
    const task  = taskM ? translate(taskM[1]) : '';
    const isPlayer = uc.includes('"Player"') || uc.includes('"Instructor"');

    /* ── Membres : split sur unitId (v7) ── */
    const members = [];
    let isGroupPlayer = false; // Flag pour détecter si le groupe est pilotable par un humain
    const unitBlocks = uc.split(/\["unitId"\]\s*=\s*\d+/);
    unitBlocks.shift(); /* supprimer le fragment avant le premier unitId */
    unitBlocks.forEach(ub => {
      const unameM = ub.match(/\["name"\]\s*=\s*"([^"]+)"/);
      const uname  = unameM ? unameM[1] : '';
      /* --- DÉTECTION CLIENT / PLAYER (Correctif) --- */
      const skillMatch = ub.match(/\["skill"\]\s*=\s*"([^"]+)"/);
      if (skillMatch) {
        const skillVal = skillMatch[1].toLowerCase();
        if (skillVal === 'client' || skillVal === 'player') {
          isGroupPlayer = true;
        }
      }
      /* Callsign : priorité table {name}, puis [4], puis scalaire */
      const csM = ub.match(/\["callsign"\]\s*=\s*\{[\s\S]*?\["name"\]\s*=\s*"([^"]+)"/)
               || ub.match(/\["callsign"\]\s*=\s*\{[\s\S]*?\[4\]\s*=\s*"([^"]+)"/)
               || ub.match(/\["callsign"\]\s*=\s*"([^"]+)"/)
               || ub.match(/\["callsign"\]\s*=\s*(\d+)/);
      const finalCs = (csM && csM[1]) ? translate(csM[1]) : uname.split('_').pop() || '';
      const dlM = ub.match(/\["STN_L16"\]\s*=\s*"?([0-9A-Z]+)"?/);
      const acNumM = ub.match(/\["onboard_num"\]\s*=\s*"([^"]+)"/);
      members.push({ callsign: finalCs, tacan:'', dl: dlM ? dlM[1] : '', acNum: acNumM ? acNumM[1] : '' });
    });

    /* Callsign de groupe = premier membre (v7) */
    const csGrpM = uc.match(/\["name"\]\s*=\s*"([A-Za-z][A-Za-z0-9]*?)\d{2,}"/);
    const baseCs = csGrpM ? translate(csGrpM[1]) : name.replace(/^[A-Z0-9]+_/, '');
    const callsign = members[0]?.callsign || baseCs;

    /* ── Radio (première unité) ── */
    const firstUnitBlock = unitBlocks[0] || uc;
    const radios = parseRadioChannels(firstUnitBlock);

    /* ── TACAN beacon ── */
    const tacan = parseTacanBeacon(gc);

    /* ── Armement, fuel, countermeasures ── */
    const fuelM = uc.match(/\["fuel"\]\s*=\s*([\d.]+)/);
    const fuelKg = fuelM ? Math.round(parseFloat(fuelM[1])) : null;

    /* Chaff/flare/gun depuis payload de la première unité */
    let chaff=0, flare=0, gun=0;
    const payloadM = uc.match(/\["payload"\]\s*=\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/);
    if (payloadM) {
      const ps = payloadM[1];
      chaff = parseFloat((ps.match(/\["chaff"\]\s*=\s*([\d.]+)/) || [])[1] || 0);
      flare = parseFloat((ps.match(/\["flare"\]\s*=\s*([\d.]+)/) || [])[1] || 0);
      gun   = parseFloat((ps.match(/\["gun"\]\s*=\s*([\d.]+)/)   || [])[1] || 0);
    }
    /* Fallback direct */
    if (!chaff) chaff = parseFloat((uc.match(/\["chaff"\]\s*=\s*([\d.]+)/) || [])[1] || 0);
    if (!flare) flare = parseFloat((uc.match(/\["flare"\]\s*=\s*([\d.]+)/) || [])[1] || 0);
    if (!gun)   gun   = parseFloat((uc.match(/\["gun"\]\s*=\s*([\d.]+)/)   || [])[1] || 0);

    const weapons = [...new Set(
      (uc.match(/\["CLSID"\]\s*=\s*"([^"]+)"/g) || [])
        .map(w => w.match(/"([^"]+)"$/)?.[1]).filter(Boolean)
    )];

    /* ── Waypoints ── */
    const { wps, toTime, toTime_abs: entry_toTimeAbs, totTime, airdrome } = parseGroupWaypoints(gc, res.start_time, task, theatre);

    /* ── Position du groupe ── */
    const xm = gc.match(/\["x"\]\s*=\s*([-\d.]+)/);
    const ym = gc.match(/\["y"\]\s*=\s*([-\d.]+)/);

    /* ── Catégories ── */
    const isSup = SUP_KEYS.some(k =>
      name.toLowerCase().includes(k) ||
      acType.toLowerCase().includes(k) ||
      task.toLowerCase().includes(k)
    );
    const tankerOrbit = isSup ? parseTankerOrbit(gc, theatre) : null;

    /* ── Menaces aériennes : toutes coalitions, sans doublons ── */
    if (!isSup && !res.threats.air.some(t => t.name === name))
      res.threats.air.push({ name, type:acType, coalition:coalName, callsign });

    const entry = {
      name, callsign, acType,
      numUnits,
      task, freq, tacan,
      isPlayer: isGroupPlayer, isSup,
      weapons, waypoints: wps,
      toTime, toTime_abs: entry_toTimeAbs, totTime, airdrome,
      start_time: res.start_time,
      x: xm ? parseFloat(xm[1]) : 0,
      y: ym ? parseFloat(ym[1]) : 0,
      coalition: coalName,
      members,
      fuelKg, fuel: fuelKg !== null ? String(fuelKg) : '',
      chaff: Math.round(chaff), flare: Math.round(flare), gun: Math.round(gun),
      tankerOrbit,
      channelsUHF: radios.channelsUHF,
      channelsVHF: radios.channelsVHF,
      freqUHF: radios.freqUHF,
      freqVHF: radios.freqVHF,

      /* v8 : catégorie brute DCS */
      dcsCategory,
    };

      if (isSup) res.support.push(entry);
      else       res.groups.push(entry);
    } /* end while groupIdRe */
  } /* end for COAL_MAP */

  /* ── Pass 2 : Menaces sol/marine pour toutes coalitions ─────────────
     On cherche les groupId avec un type reconnu SAM/AAA/navire,
     sans filtrer sur la fréquence (les véhicules sol n'ont pas de radio).
  ─────────────────────────────────────────────────────────────────────── */
  for (const { key: coalKey, name: coalName } of COAL_MAP) {
    const cRe2 = new RegExp(`\\["${coalKey}"\\]\\s*=\\s*\\{`, 'g');
    const cM2  = cRe2.exec(coalitionContent);
    if (!cM2) continue;
    const coalBlock2 = extractBlock(coalitionContent, coalitionContent.indexOf('{', cM2.index));

    const gRe2 = /\["groupId"\]\s*=\s*\d+/g;
    const seen2 = new Set();
    let gm2;
    while ((gm2 = gRe2.exec(coalBlock2)) !== null) {
      const gc2   = getEnclosingBlock(coalBlock2, gm2.index);
      const nm2   = gc2.match(/\["name"\]\s*=\s*"([^"]+)"/);
      if (!nm2) continue;
      const gname = nm2[1];
      if (seen2.has(gname)) continue;
      seen2.add(gname);

      /* Ignorer les groupes déjà indexés comme PKG ou support */
      const alreadyAir = [...res.groups, ...res.support].some(e => e.name === gname);
      if (alreadyAir) continue;

      const ucM2 = gc2.match(/\["units"\]\s*=\s*\{([\s\S]*?)\n\s*\},\s*--\s*end of \["units"\]/);
      const uc2  = ucM2 ? ucM2[1] : gc2; /* fallback sur tout le bloc groupe */
      const tM2  = uc2.match(/\["type"\]\s*=\s*"([^"]+)"/);
      if (!tM2) continue;
      const type2 = tM2[1];

      const xm2 = gc2.match(/\["x"\]\s*=\s*([-\d.]+)/);
      const ym2 = gc2.match(/\["y"\]\s*=\s*([-\d.]+)/);
      const x2  = xm2 ? parseFloat(xm2[1]) : 0;
      const y2  = ym2 ? parseFloat(ym2[1]) : 0;
      const ll2 = String(window.xy2dmm(x2, y2, theatre));

      /* Détecter la catégorie DCS via la même logique que le pass1 */
      const gidx2   = content.indexOf(gm2[0]);
      const dcat2   = gidx2 !== -1 ? detectDcsCategory(content, gidx2) : 'unknown';
      const isShip2 = dcat2 === 'ship';
      const isAir2  = dcat2 === 'plane' || dcat2 === 'helicopter';

      /* Groupes air non indexés (freq<100) → threats.air (sans doublons) */
      if (isAir2 && !alreadyAir && !res.threats.air.some(t => t.name === gname)) {
        res.threats.air.push({ name:gname, type:type2, label:type2, coalition:coalName, callsign:'' });
      }
      /* Vehicules/navires → ne vont PAS dans threats.air */
      if (!isAir2 && !alreadyAir) {

      }
      const norm = !isAir2 ? normalizeSystem(type2, isShip2) : null;
      if (norm) {
        const entry2 = { name:gname, type:type2, label:norm.label, coalition:coalName, x:x2, y:y2, latLon:ll2 };
        const cat = norm.cat.toLowerCase();
        if      (cat === 'sam_lr')         res.threats.sam_lr.push(entry2);
        else if (cat === 'sam_mr')         res.threats.sam_mr.push(entry2);
        else if (cat === 'sam_sr')         res.threats.sam_sr.push(entry2);
        else if (cat === 'aaa')            res.threats.aaa.push(entry2);
        else if (cat === 'naval_cvn')      res.threats.naval_cvn.push(entry2);
        else if (cat === 'naval_surface')  res.threats.naval_surface.push(entry2);
      }
    }
  }

  /* ── Post-processing tanker orbit → position relative au bullseye ── */
  for (const entry of [...res.groups, ...res.support]) {
    if (!entry.tankerOrbit || entry.tankerOrbit.x === null) continue;
    const bull = res.bullseye[entry.coalition] || res.bullseye.blue;
    if (bull) {
      const hd = window.calcHdgDist(bull.x, bull.y, entry.tankerOrbit.x, entry.tankerOrbit.y);
      entry.tankerOrbit.hdgFromBull   = hd.hdg;
      entry.tankerOrbit.distNmFromBull= parseFloat(hd.dist).toFixed(1);
      entry.tankerOrbit.posFromBull   = `${hd.hdg} / ${parseFloat(hd.dist).toFixed(0)}nm from BE`;
    }
  }

  return res;
};

/**
 * Génère le texte de menaces surface structuré par catégorie.
 * @param {object} threats  - res.threats du parseMiz
 * @param {string} enemyCoal - 'blue' | 'red' | null
 * @returns {string} texte multi-lignes pour affichage
 */
window.buildThreatSurface = function(threats, enemyCoal) {
  const f = arr => [...new Set(
    (arr||[]).filter(t => !enemyCoal || t.coalition === enemyCoal).map(t => t.label || t.type)
  )];
  const line = arr => f(arr).join(', ');
  const lr = line(threats.sam_lr),  mr  = line(threats.sam_mr);
  const sr = line(threats.sam_sr),  aa  = line(threats.aaa);
  const cvn = line(threats.naval_cvn), nav = line(threats.naval_surface);
  const lines = [];
  if (lr)  lines.push('SAM LR: ' + lr);
  if (mr)  lines.push('SAM MR: ' + mr);
  if (sr)  lines.push('SAM SR: ' + sr);
  if (aa)  lines.push('AAA: ' + aa);
  if (cvn) lines.push('Porte-Avions: ' + cvn);
  if (nav) lines.push('Navires: ' + nav);
  return lines.join('\n');
};

/**
 * Génère la liste des menaces aériennes ennemies (dédupliquées par type).
 * @param {object} threats  - res.threats
 * @param {string} enemyCoal
 * @returns {string} une ligne par type d'appareil
 */
window.buildThreatAir = function(threats, enemyCoal) {
  const NON_AIR = /kub|zu-|sa-[0-9]|buk|tor |osa |shilka|zsu|flak|phalanx|patriot|hawk|roland|rapier|stinger|ship|boat|frigate|destroyer|carrier|truck|vehicle|infantry|cow|sheep|horse|civilian/i;
  const types = [...new Set(
    (threats.air||[])
      .filter(t => !enemyCoal || t.coalition === enemyCoal)
      .map(t => t.type || t.label || t.name)
      .filter(t => t && !NON_AIR.test(t))
  )];
  return types.join('\n');
};

})(window);
