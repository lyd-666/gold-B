const DATA_URL = "./gold_data.json";
const $ = (id) => document.getElementById(id);

function safeGet(obj, path){
  try{ return path.split(".").reduce((a,k)=> (a && a[k]!==undefined ? a[k] : undefined), obj); }
  catch(e){ return undefined; }
}
function normalizeSignal(s){
  const v = (s || "NEUTRAL").toString().toUpperCase();
  return ["GREEN","YELLOW","RED","NEUTRAL"].includes(v) ? v : "NEUTRAL";
}
function signalClass(s){
  s = normalizeSignal(s);
  if(s==="GREEN") return "green";
  if(s==="YELLOW") return "yellow";
  if(s==="RED") return "red";
  return "neutral";
}
function setText(el, v){ el.textContent = (v===undefined||v===null||v==="") ? "—" : String(v); }

function renderHeader(d){
  setText($("hdrTitle"), safeGet(d,"meta.title") || "Gold Pre-market Plan");
  setText($("hdrSymbol"), `SYMBOL: ${safeGet(d,"meta.symbol") ?? "—"}`);
  setText($("hdrDate"), `DATE: ${safeGet(d,"meta.trade_date") ?? "—"}`);
  setText($("hdrUpdated"), `UPDATED: ${safeGet(d,"meta.updated_at") ?? "—"}`);
  setText($("debugBox"), `Data: ${DATA_URL}`);
}
function renderTraffic(d){
  const tl = normalizeSignal(safeGet(d,"status.traffic_light"));
  $("tlDot").className = `dot ${signalClass(tl)}`;
  setText($("tlLabel"), tl);
  setText($("tlNote"), safeGet(d,"status.traffic_light_note"));
}
function renderListInto(ulId, emptyId, arr, limit=12){
  const ul = $(ulId); ul.innerHTML = "";
  if(Array.isArray(arr) && arr.length){
    $(emptyId).style.display="none";
    arr.slice(0,limit).forEach(x=>{
      const li=document.createElement("li"); li.textContent=x; ul.appendChild(li);
    });
  }else{
    $(emptyId).style.display="block";
  }
}
function renderSummary(d){
  renderListInto("summaryList","summaryEmpty", safeGet(d,"summary.bullets"), 8);
}
function renderPlan(d){
  setText($("planBase"), safeGet(d,"plan.base_case"));
  setText($("planAlt"), safeGet(d,"plan.alternate_case"));
  renderListInto("planWatch","planWatchEmpty", safeGet(d,"plan.watchlist"), 12);
  renderListInto("planRules","planRulesEmpty", safeGet(d,"plan.rules"), 12);
}

let radarChart = null;
function renderRadar(d){
  const labels = safeGet(d,"radar.labels");
  const values = safeGet(d,"radar.values");
  const max = safeGet(d,"radar.max");

  const ok = Array.isArray(labels) && Array.isArray(values) && labels.length && labels.length===values.length;
  const data = {
    labels: ok ? labels : ["—"],
    datasets: [{
      label:"Radar",
      data: ok ? values : [0],
      fill:true,
      backgroundColor:"rgba(59,214,127,.18)",
      borderColor:"rgba(59,214,127,.95)",
      pointBackgroundColor:"rgba(59,214,127,.95)",
      borderWidth:2
    }]
  };
  const options = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false} },
    scales:{ r:{
      angleLines:{color:"rgba(255,255,255,.12)"},
      grid:{color:"rgba(255,255,255,.10)"},
      pointLabels:{color:"rgba(255,255,255,.72)", font:{size:12}},
      ticks:{color:"rgba(255,255,255,.45)", backdropColor:"transparent"},
      suggestedMin:0,
      suggestedMax:(typeof max==="number" ? max : 100)
    }}
  };

  const ctx = $("radarChart");
  if(radarChart){ radarChart.data=data; radarChart.options=options; radarChart.update(); }
  else{ radarChart = new Chart(ctx, { type:"radar", data, options }); }
}

function renderMarket(d){
  const rows = safeGet(d, "market.rows");
  const tbody = $("marketTbody");
  tbody.innerHTML = "";

  if(Array.isArray(rows) && rows.length){
    $("marketEmpty").style.display = "none";
    const last = rows.slice(-30).reverse();
    last.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r?.date ?? "—"}</td>
        <td>${r?.open ?? "—"}</td>
        <td>${r?.high ?? "—"}</td>
        <td>${r?.low ?? "—"}</td>
        <td>${r?.close ?? "—"}</td>
        <td>${r?.volume ?? ""}</td>
      `;
      tbody.appendChild(tr);
    });
  }else{
    $("marketEmpty").style.display = "block";
  }
}

function renderDrivers(d){
  const list = safeGet(d,"drivers");
  const tbody = $("driversTbody"); tbody.innerHTML="";
  if(Array.isArray(list) && list.length){
    $("driversEmpty").style.display="none";
    list.slice(0,16).forEach(it=>{
      const tr=document.createElement("tr");
      const name=document.createElement("td"); name.textContent=it?.name ?? "—";
      const sig=normalizeSignal(it?.signal);
      const sigTd=document.createElement("td");
      sigTd.innerHTML=`<span class="signal-pill"><span class="dot ${signalClass(sig)}"></span>${sig}</span>`;
      const note=document.createElement("td"); note.textContent=it?.note ?? "—";
      tr.appendChild(name); tr.appendChild(sigTd); tr.appendChild(note);
      tbody.appendChild(tr);
    });
  }else{
    $("driversEmpty").style.display="block";
  }
}
function renderRisks(d){
  const list = safeGet(d,"risks");
  const tbody = $("risksTbody"); tbody.innerHTML="";
  if(Array.isArray(list) && list.length){
    $("risksEmpty").style.display="none";
    list.slice(0,16).forEach(it=>{
      const tr=document.createElement("tr");
      const r=document.createElement("td"); r.textContent=it?.risk ?? "—";
      const m=document.createElement("td"); m.textContent=it?.mitigation ?? "—";
      tr.appendChild(r); tr.appendChild(m); tbody.appendChild(tr);
    });
  }else{
    $("risksEmpty").style.display="block";
  }
}
function renderProvenance(d){
  renderListInto("srcList","srcEmpty", safeGet(d,"provenance.sources"), 10);
  setText($("disclaimer"), safeGet(d,"provenance.disclaimer"));
}
function renderLinks(d){
  const links = safeGet(d,"links");
  const ul=$("linksList"); ul.innerHTML="";
  if(Array.isArray(links) && links.length){
    $("linksEmpty").style.display="none";
    links.slice(0,12).forEach(x=>{
      const li=document.createElement("li");
      const a=document.createElement("a");
      a.href=x?.url ?? "#"; a.target="_blank"; a.rel="noopener";
      a.textContent=x?.label ?? (x?.url ?? "—");
      li.appendChild(a); ul.appendChild(li);
    });
  }else{
    $("linksEmpty").style.display="block";
  }
}
function showError(msg){
  const box=$("errBox"); box.style.display="block"; box.textContent=msg;
}
function hideError(){ $("errBox").style.display="none"; $("errBox").textContent=""; }

async function loadJson(){
  const res = await fetch(DATA_URL, { cache:"no-store" });
  if(!res.ok) throw new Error(`加载失败：${DATA_URL} (${res.status})`);
  return await res.json();
}
function bindPdf(){
  $("btnExport").addEventListener("click", ()=>{
    hideError();
    const opt = {
      margin:[10,10,10,10],
      filename:"gold-pre-market-plan.pdf",
      image:{type:"jpeg", quality:0.95},
      html2canvas:{scale:2, useCORS:true},
      jsPDF:{unit:"mm", format:"a4", orientation:"portrait"}
    };
    html2pdf().set(opt).from($("appRoot")).save();
  });
}

function renderAll(d){
  renderHeader(d);
  renderTraffic(d);
  renderSummary(d);
  renderPlan(d);
  renderRadar(d);
  renderMarket(d);
  renderDrivers(d);
  renderRisks(d);
  renderProvenance(d);
  renderLinks(d);
}

(async function main(){
  bindPdf();
  try{
    const d = await loadJson();
    renderAll(d);
  }catch(e){
    showError(`无法加载 gold_data.json。请确认文件与 index.html 同级，并通过 GitHub Pages 或 http.server 访问。\n\n${e.message}`);
    console.error(e);
  }
})();
