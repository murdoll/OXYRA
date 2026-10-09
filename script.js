(() => {
  "use strict";
  // Fictional sample data only; this dashboard is not connected to live hospital systems.
  const hospitals = [
    {id:"H-001",name:"Central Hospital",area:"Central District",stock:4820,demand:940,lead:4,icon:"✚",color:"blue"},
    {id:"H-002",name:"Children's Hospital",area:"North District",stock:3650,demand:710,lead:3,icon:"✳",color:"teal"},
    {id:"H-003",name:"Regional Hospital",area:"West District",stock:2180,demand:760,lead:4,icon:"⌂",color:"violet"},
    {id:"H-004",name:"Westside Medical Center",area:"West District",stock:1740,demand:620,lead:3,icon:"✚",color:"amber"},
    {id:"H-005",name:"North District Clinic",area:"North District",stock:3280,demand:490,lead:5,icon:"＋",color:"teal"},
    {id:"H-006",name:"Eastside Hospital",area:"East District",stock:2750,demand:570,lead:4,icon:"✚",color:"blue"}
  ];
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const fmt = n => new Intl.NumberFormat("en-GB").format(Math.round(n));
  const coverage = h => h.stock / h.demand;
  const statusOf = h => coverage(h) < h.lead ? "critical" : coverage(h) < h.lead + 1.5 ? "watch" : "stable";
  const statusLabel = s => ({stable:"Stable",watch:"Watch",critical:"Critical"}[s]);
  let forecastDays = 7, toastTimer;

  function renderMetrics(){
    const stock=hospitals.reduce((s,h)=>s+h.stock,0), demand=hospitals.reduce((s,h)=>s+h.demand,0);
    const risk=hospitals.filter(h=>statusOf(h)==="critical").length;
    const readiness=Math.round(hospitals.reduce((s,h)=>s+Math.min(coverage(h),h.lead+3)/(h.lead+3),0)/hospitals.length*100);
    $("#metricHospitals").textContent=String(hospitals.length).padStart(2,"0");
    $("#navHospitalCount").textContent=String(hospitals.length).padStart(2,"0");
    $("#metricStock").textContent=fmt(stock); $("#metricCoverage").textContent=(stock/demand).toFixed(1);
    $("#metricRisk").textContent=String(risk).padStart(2,"0");
    $("#readinessValue").textContent=`${readiness}%`; $("#readinessBar").style.width=`${readiness}%`;
  }
  function renderHospitals(){
    const q=$("#hospitalSearch").value.trim().toLowerCase(), filter=$("#riskFilter").value;
    const rows=hospitals.filter(h=>`${h.name} ${h.id} ${h.area}`.toLowerCase().includes(q)&&(filter==="all"||statusOf(h)===filter));
    $("#hospitalTableBody").innerHTML=rows.map(h=>{
      const status=statusOf(h), days=coverage(h), fill=Math.min(100,days/(h.lead+3)*100);
      return `<tr><td><div class="hospital-cell"><span class="hospital-avatar ${h.color}">${h.icon}</span><span class="hospital-name"><strong>${h.name}</strong><small>${h.id} · ${h.area}</small></span></div></td>
      <td><span class="stock-number">${fmt(h.stock)}</span><span class="stock-unit">m³</span></td><td><span class="stock-number">${fmt(h.demand)}</span><span class="stock-unit">m³/day</span></td>
      <td><div class="coverage-cell"><strong>${days.toFixed(1)}d</strong><span class="coverage-track"><span class="coverage-fill ${status}" style="display:block;width:${fill}%"></span></span></div></td>
      <td><span class="status-badge ${status}"><i class="status-dot"></i>${statusLabel(status)}</span></td><td><button class="details-button" data-hospital-id="${h.id}" aria-label="View ${h.name} details" title="View details">↗</button></td></tr>`;
    }).join("");
    $("#emptyState").hidden=rows.length>0;
    $("#tableResultCount").textContent=`Showing ${rows.length} of ${hospitals.length} sites`;
  }
  function renderAlerts(){
    let alerts=hospitals.map(h=>({...h,status:statusOf(h),days:coverage(h)})).filter(h=>h.status!=="stable").sort((a,b)=>a.days-b.days).map(h=>({
      type:h.status,symbol:h.status==="critical"?"!":"↗",title:`${h.name} · ${statusLabel(h.status)}`,
      description:h.status==="critical"?`Estimated coverage ${h.days.toFixed(1)} days, below the ${h.lead}-day sample lead time.`:`Estimated coverage is ${h.days.toFixed(1)} days. Review replenishment timing.`
    }));
    if(!alerts.length) alerts=[{type:"info",symbol:"✓",title:"No priority alerts",description:"All sample sites are above the modeled watch threshold."}];
    alerts=alerts.slice(0,4);
    $("#alertsList").innerHTML=alerts.map(a=>`<div class="alert-item"><span class="alert-symbol ${a.type}">${a.symbol}</span><div class="alert-copy"><strong>${a.title}</strong><p>${a.description}</p></div><span class="alert-time">DEMO</span></div>`).join("");
    const count=alerts.filter(a=>a.type!=="info").length;
    $("#navAlertCount").textContent=count; $("#alertCountPill").textContent=String(count).padStart(2,"0");
  }
  function renderChart(){
    const total=hospitals.reduce((s,h)=>s+h.demand,0);
    const labels=forecastDays===7?["Today","Tue","Wed","Thu","Fri","Sat","Sun"]:forecastDays===30?["1","5","10","15","20","25","30"]:["Wk 1","Wk 3","Wk 5","Wk 7","Wk 9","Wk 11","Wk 13"];
    const values=labels.map((_,i)=>Math.round(total*(.91+i/(labels.length-1)*(forecastDays===90?.17:forecastDays===30?.10:.06)+Math.sin((i+1)*1.37)*.045+Math.cos((i+2)*.61)*.025)));
    const max=Math.ceil(Math.max(...values)/500)*500;
    const grid=[1,.75,.5,.25].map(f=>`<div class="chart-gridline"><span>${fmt(max*f)}</span></div>`).join("");
    const bars=values.map((v,i)=>`<div class="chart-bar-wrap"><div class="chart-bar" style="height:${Math.max(9,v/max*100)}%" data-value="${fmt(v)} m³" aria-label="${labels[i]}: ${fmt(v)} cubic metres"></div></div>`).join("");
    $("#forecastChart").innerHTML=`${grid}<div class="chart-bars">${bars}</div><div class="chart-x-labels">${labels.map(l=>`<span>${l}</span>`).join("")}</div>`;
    $("#forecastRangeLabel").textContent=`Next ${forecastDays} days`;
  }
  function showDetails(id){
    const h=hospitals.find(x=>x.id===id); if(!h)return;
    const s=statusOf(h), days=coverage(h);
    $("#hospitalDetailContent").innerHTML=`<div class="detail-heading"><span class="hospital-avatar ${h.color}" style="width:44px;height:44px;font-size:18px">${h.icon}</span><div><h2>${h.name}</h2><p>${h.id} · ${h.area}</p></div></div>
      <div class="detail-grid"><div class="detail-stat"><span>Available oxygen</span><strong>${fmt(h.stock)} m³</strong></div><div class="detail-stat"><span>Modeled daily demand</span><strong>${fmt(h.demand)} m³</strong></div><div class="detail-stat"><span>Estimated coverage</span><strong>${days.toFixed(1)} days</strong></div><div class="detail-stat"><span>Sample lead time</span><strong>${h.lead} days</strong></div></div>
      <p style="margin:16px 0 0"><span class="status-badge ${s}"><i class="status-dot"></i>${statusLabel(s)}</span></p><p class="demo-detail-note">Demonstration only. These figures are fictional and must not be used for clinical decisions, real supply planning, or emergency response.</p>`;
    const dialog=$("#hospitalDialog"); if(typeof dialog.showModal==="function")dialog.showModal();else showToast(`${h.name}: ${days.toFixed(1)} days estimated coverage.`);
  }
  function showToast(message){
    const toast=$("#toast");toast.textContent=message;toast.classList.add("show");clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>toast.classList.remove("show"),2600);
  }
  function updateDate(){
    const now=new Date();$("#currentDate").textContent=new Intl.DateTimeFormat("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"}).format(now);
    const hour=now.getHours(), greeting=hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
    $("h1").innerHTML=`${greeting}<span class="heading-period">.</span>`;
  }
  function refresh(){
    const b=$("#refreshDashboard");b.classList.remove("is-spinning");void b.offsetWidth;b.classList.add("is-spinning");
    renderMetrics();renderHospitals();renderAlerts();renderChart();showToast("Demo dashboard refreshed.");
  }
  document.addEventListener("DOMContentLoaded",()=>{
    updateDate();renderMetrics();renderHospitals();renderAlerts();renderChart();
    $("#hospitalSearch").addEventListener("input",renderHospitals);$("#riskFilter").addEventListener("change",renderHospitals);
    $$(".range-button").forEach(b=>b.addEventListener("click",()=>{forecastDays=Number(b.dataset.forecastDays);$$(".range-button").forEach(x=>x.classList.toggle("active",x===b));renderChart();}));
    $("#refreshDashboard").addEventListener("click",refresh);
    $("#hospitalTableBody").addEventListener("click",e=>{const b=e.target.closest("[data-hospital-id]");if(b)showDetails(b.dataset.hospitalId);});
    $$(".nav-link").forEach(a=>a.addEventListener("click",()=>{$$(".nav-link").forEach(x=>x.classList.toggle("active",x===a));$("#sidebar").classList.remove("open");}));
    $("#mobileMenu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
    $("#hospitalDialog").addEventListener("click",e=>{if(e.target===$("#hospitalDialog"))$("#hospitalDialog").close();});
  });
})();
