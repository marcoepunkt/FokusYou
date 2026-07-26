(function(){
  "use strict";
  var KEY="fokusyou-v06";
  var OLD_KEYS=["fokusyou-v05","fokusyou-v04","fokusyou-v03"];
  var areas={health:["❤️","Gesundheit"],work:["💼","Arbeit"],finance:["💰","Finanzen"],family:["👨‍👩‍👧","Familie"],learning:["📚","Lernen"],leisure:["🎮","Freizeit"]};
  var goalTypes={
    money:{label:"Sparen",icon:"💰",unit:"€",area:"finance",step:50},
    reading:{label:"Lesen",icon:"📚",unit:"Bücher",area:"learning",step:1},
    sport:{label:"Sport",icon:"🏃",unit:"Einheiten",area:"health",step:1},
    learning:{label:"Lernen",icon:"🧠",unit:"Stunden",area:"learning",step:1},
    weight:{label:"Gewicht",icon:"⚖️",unit:"kg",area:"health",step:.5},
    custom:{label:"Freies Ziel",icon:"🎯",unit:"Schritte",area:"work",step:1}
  };
  function uid(){return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2)}
  function clone(o){return JSON.parse(JSON.stringify(o))}
  function esc(v){var d=document.createElement("div");d.textContent=String(v);return d.innerHTML}
  function fmt(v){return Number(v).toLocaleString("de-DE",{maximumFractionDigits:2})}
  function areaLabel(k){var a=areas[k]||areas.health;return a[0]+" "+a[1]}
  function todayISO(){return new Date().toISOString().slice(0,10)}
  function plusMonths(n){var d=new Date();d.setMonth(d.getMonth()+n);return d.toISOString().slice(0,10)}

  var defaults={
    xp:35,totalXp:35,focusPoints:0,successes:3,unlockedAchievements:[],activity:[1,0,2,1,0,0,0],focus:{title:"Heute bewusst vorankommen",note:"Wähle eine Aufgabe, die heute besonders wichtig ist."},
    completedGoals:0,
    routines:[
      {id:uid(),name:"Morgenroutine",area:"health",done:false,streak:3},
      {id:uid(),name:"20 Minuten Bewegung",area:"health",done:false,streak:5},
      {id:uid(),name:"Tagesplanung",area:"work",done:false,streak:2}
    ],
    goals:[
      {id:uid(),name:"1.000 € Rücklage",type:"money",area:"finance",start:0,value:250,target:1000,unit:"€",deadline:plusMonths(4),notes:"Eine finanzielle Reserve für mehr Sicherheit.",featured:true,milestones:[250,500,750,1000],rewarded:[]},
      {id:uid(),name:"12 Bücher lesen",type:"reading",area:"learning",start:0,value:2,target:12,unit:"Bücher",deadline:plusMonths(8),notes:"Mehr Zeit für neue Ideen und Wissen.",featured:false,milestones:[3,6,9,12],rewarded:[]}
    ],
    events:[{id:uid(),title:"Wochenplanung",time:"18:00"}],work:{running:false,startedAt:null,totalSeconds:0,days:0}
  };

  function migrate(raw){
    if(!raw)return clone(defaults);
    raw.focus=raw.focus||clone(defaults.focus);raw.completedGoals=raw.completedGoals||0;raw.totalXp=Number(raw.totalXp||raw.xp||0);raw.focusPoints=Number(raw.focusPoints||0);raw.unlockedAchievements=raw.unlockedAchievements||[];raw.activity=raw.activity||[0,0,0,0,0,0,0];raw.events=raw.events||[];raw.work=raw.work||clone(defaults.work);
    raw.goals=(raw.goals||[]).map(function(g,i){
      var type=g.type||((g.unit==="€")?"money":(String(g.unit).toLowerCase().includes("buch")?"reading":"custom"));
      var target=Number(g.target)||10,start=Number(g.start)||0,value=Number(g.value)||0;
      return Object.assign({id:g.id||uid(),name:g.name||"Neues Ziel",type:type,area:g.area||goalTypes[type].area,start:start,value:value,target:target,unit:g.unit||goalTypes[type].unit,deadline:g.deadline||plusMonths(6),notes:g.notes||"",featured:Boolean(g.featured)||(i===0),milestones:g.milestones||[.25,.5,.75,1].map(function(p){return +(target*p).toFixed(2)}),rewarded:g.rewarded||[]},g)
    });
    return raw
  }

  var state=null;
  try{
    state=JSON.parse(localStorage.getItem(KEY));
    if(!state){
      for(var i=0;i<OLD_KEYS.length;i++){var old=localStorage.getItem(OLD_KEYS[i]);if(old){state=JSON.parse(old);break}}
    }
  }catch(e){}
  state=migrate(state);
  var currentPage="today",currentFilter="all",timerInterval=null,dialogMode="routine",selectedGoalId=null;


  var achievements=[
    {id:"first-step",icon:"✨",title:"Erster Schritt",text:"Eine Routine abschließen",reward:15,test:function(){return state.successes>=1}},
    {id:"streak-5",icon:"🔥",title:"Im Flow",text:"Eine 5-Tage-Serie erreichen",reward:30,test:function(){return state.routines.some(function(r){return (r.streak||0)>=5})}},
    {id:"goal-half",icon:"🎯",title:"Halbzeit",text:"Ein Ziel auf 50 % bringen",reward:35,test:function(){return state.goals.some(function(g){return progress(g)>=50})}},
    {id:"level-2",icon:"⭐",title:"Aufgestiegen",text:"Level 2 erreichen",reward:25,test:function(){return levelInfo().level>=2}},
    {id:"goal-done",icon:"🏆",title:"Zielstürmer",text:"Ein Ziel vollständig erreichen",reward:75,test:function(){return (state.completedGoals||0)>=1}},
    {id:"collector",icon:"💎",title:"Sammler",text:"100 Fokus-Punkte sammeln",reward:50,test:function(){return state.focusPoints>=100}}
  ];
  function toast(message){var el=document.getElementById("rewardToast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(function(){el.classList.remove("show")},2400)}
  function reward(xp,points,message){xp=xp||0;points=points||0;state.xp+=xp;state.totalXp=(state.totalXp||0)+xp;state.focusPoints=(state.focusPoints||0)+points;if(message)toast(message+(xp?" · +"+xp+" XP":"")+(points?" · +"+points+" 💎":""))}
  function checkAchievements(){achievements.forEach(function(a){if(state.unlockedAchievements.indexOf(a.id)<0&&a.test()){state.unlockedAchievements.push(a.id);reward(a.reward,Math.ceil(a.reward/3),"🏅 Achievement: "+a.title)}})}
  function addActivity(amount){var d=(new Date().getDay()+6)%7;state.activity[d]=(state.activity[d]||0)+(amount||1)}

  function save(){localStorage.setItem(KEY,JSON.stringify(state))}
  function levelInfo(){return{level:Math.floor(state.xp/100)+1,current:state.xp%100}}
  function progress(g){return Math.max(0,Math.min(100,Math.round(((g.value-g.start)/(g.target-g.start))*100)))}
  function goalForecast(g){
    if(!g.deadline)return"Kein Enddatum";
    var end=new Date(g.deadline+"T23:59:59"),now=new Date();
    if(end<now)return progress(g)>=100?"Abgeschlossen":"Enddatum erreicht";
    var total=Math.max(1,end-new Date(todayISO())),remaining=end-now;
    var expected=Math.max(0,100-(remaining/total)*100);
    var diff=progress(g)-expected;
    return diff>=8?"Sehr gut im Plan":diff>=-8?"Im Plan":"Etwas hinter dem Plan"
  }
  function currentWorkSeconds(){var t=state.work.totalSeconds||0;if(state.work.running&&state.work.startedAt)t+=Math.floor((Date.now()-state.work.startedAt)/1000);return t}
  function timeText(sec){var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return[h,m,s].map(function(n){return String(n).padStart(2,"0")}).join(":")}

  function renderHeader(){
    var now=new Date(),hour=now.getHours(),titles={today:hour<11?"Guten Morgen":hour<18?"Guten Tag":"Guten Abend",goals:"Deine Ziele",calendar:"Kalender",work:"Arbeitszeiten",profile:"Dein Profil"};
    document.getElementById("pageTitle").textContent=titles[currentPage];
    document.getElementById("pageSubtitle").textContent=now.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"long"})
  }

  function render(){
    var li=levelInfo(),done=state.routines.filter(function(r){return r.done}).length,best=Math.max.apply(null,[0].concat(state.routines.map(function(r){return r.streak||0})));
    var goalAvg=state.goals.length?state.goals.reduce(function(s,g){return s+progress(g)},0)/state.goals.length:0;
    var score=Math.min(100,Math.round((done/Math.max(1,state.routines.length))*60+(goalAvg/100)*40));
    document.getElementById("level").textContent=li.level;document.getElementById("xp").textContent=state.xp;
    document.getElementById("xpBar").style.width=li.current+"%";document.getElementById("xpText").textContent="Noch "+(100-li.current)+" XP bis Level "+(li.level+1);
    document.getElementById("focusScore").textContent=score;document.getElementById("streak").textContent=best+" Tage";document.getElementById("successes").textContent=state.successes;
    document.getElementById("focusTitle").textContent=state.focus.title;document.getElementById("focusNote").textContent=state.focus.note;
    document.getElementById("profileLevel").textContent=li.level;document.getElementById("profileXp").textContent=state.xp;
    document.getElementById("profileGoals").textContent=state.goals.length;document.getElementById("profileRoutines").textContent=state.routines.length;
    document.getElementById("profileAchievements").textContent=state.unlockedAchievements.length;document.getElementById("profileStreak").textContent=best;document.getElementById("profilePoints").textContent=state.focusPoints;document.getElementById("profileTotalXp").textContent=state.totalXp;
    checkAchievements();renderAchievements();renderStats();renderFeaturedGoal();renderRoutines();renderGoals();renderEvents();renderWork();renderCalendarDate();save()
  }


  function renderAchievements(){var box=document.getElementById("achievementGrid");if(!box)return;box.innerHTML=achievements.map(function(a){var unlocked=state.unlockedAchievements.indexOf(a.id)>=0;return '<article class="achievement '+(unlocked?'unlocked':'')+'"><div class="achievement-icon">'+(unlocked?a.icon:'🔒')+'</div><strong>'+esc(a.title)+'</strong><small>'+esc(a.text)+'</small><span class="achievement-reward">'+(unlocked?'Freigeschaltet':'+'+a.reward+' XP')+'</span></article>'}).join("");document.getElementById("achievementCount").textContent=state.unlockedAchievements.length+" / "+achievements.length}
  function renderStats(){var box=document.getElementById("statsBars");if(!box)return;var labels=["Mo","Di","Mi","Do","Fr","Sa","So"],max=Math.max.apply(null,[1].concat(state.activity));box.innerHTML=labels.map(function(l,i){var v=state.activity[i]||0;return '<div><div class="stat-bar-head"><span>'+l+'</span><strong>'+v+' Aktionen</strong></div><div class="stat-track"><span style="width:'+Math.round(v/max*100)+'%"></span></div></div>'}).join("")}

  function renderFeaturedGoal(){
    var g=state.goals.find(function(x){return x.featured})||state.goals[0],bar=document.getElementById("featuredGoalBar");
    if(!g){document.getElementById("featuredGoalTitle").textContent="Noch kein Hauptziel gewählt";document.getElementById("featuredGoalMeta").textContent="Markiere ein Ziel als Hauptziel.";bar.style.width="0%";document.getElementById("featuredGoalProgress").textContent="0%";document.getElementById("featuredGoalForecast").textContent="Noch keine Prognose";return}
    document.getElementById("featuredGoalTitle").textContent=(goalTypes[g.type]||goalTypes.custom).icon+" "+g.name;
    document.getElementById("featuredGoalMeta").textContent=fmt(g.value)+" von "+fmt(g.target)+" "+g.unit+(g.deadline?" · bis "+new Date(g.deadline).toLocaleDateString("de-DE"):"");
    bar.style.width=progress(g)+"%";document.getElementById("featuredGoalProgress").textContent=progress(g)+"%";document.getElementById("featuredGoalForecast").textContent=goalForecast(g)
  }

  function renderRoutines(){
    var box=document.getElementById("todayRoutines");
    box.innerHTML=state.routines.length?state.routines.map(function(r){return'<article class="card item"><button class="check '+(r.done?'done':'')+'" data-routine="'+r.id+'">'+(r.done?'✓':'○')+'</button><div><div class="item-title">'+esc(r.name)+'</div><div class="item-meta">🔥 '+r.streak+' Tage Serie · +5 XP</div><span class="pill">'+areaLabel(r.area)+'</span></div><button class="plus" data-delete-routine="'+r.id+'">⋯</button></article>'}).join(""):'<div class="empty">Noch keine Routine angelegt.</div>'
  }

  function goalCard(g){
    var t=goalTypes[g.type]||goalTypes.custom,p=progress(g);
    return'<article class="card goal-card"><div class="goal-card-top"><div class="goal-type-icon">'+t.icon+'</div><div class="goal-main"><div class="goal-title-row"><div class="item-title">'+esc(g.name)+'</div>'+(g.featured?'<span class="star">★</span>':'')+'</div><div class="item-meta">'+fmt(g.value)+' / '+fmt(g.target)+' '+esc(g.unit)+' · '+p+'%</div><div class="progress"><span style="width:'+p+'%"></span></div><span class="pill">'+t.label+'</span> <span class="pill">'+goalForecast(g)+'</span></div></div><div class="goal-actions"><button class="secondary" data-goal-detail="'+g.id+'">Details</button><button class="primary" data-goal-add="'+g.id+'">+'+fmt(t.step)+'</button></div></article>'
  }

  function renderGoals(){
    var filtered=state.goals.filter(function(g){return currentFilter==="all"||g.type===currentFilter});
    document.getElementById("allGoals").innerHTML=filtered.length?filtered.map(goalCard).join(""):'<div class="empty">Für diesen Filter gibt es noch keine Ziele.</div>';
    document.getElementById("todayGoals").innerHTML=state.goals.length?state.goals.slice(0,2).map(goalCard).join(""):'<div class="empty">Noch kein Ziel angelegt.</div>';
    var avg=state.goals.length?Math.round(state.goals.reduce(function(s,g){return s+progress(g)},0)/state.goals.length):0;
    document.getElementById("goalSummaryCount").textContent=state.goals.length;document.getElementById("goalSummaryProgress").textContent=avg+"%";document.getElementById("goalSummaryDone").textContent=state.completedGoals||0
  }

  function renderEvents(){var box=document.getElementById("eventList");box.innerHTML=state.events.length?state.events.map(function(e){return'<article class="card item"><div style="font-size:1.5rem">📌</div><div><div class="item-title">'+esc(e.title)+'</div><div class="item-meta">Heute · '+esc(e.time)+' Uhr</div></div><button class="plus" data-delete-event="'+e.id+'">⋯</button></article>'}).join(""):'<div class="empty">Noch keine Termine vorhanden.</div>'}
  function renderCalendarDate(){var n=new Date();document.getElementById("calendarDay").textContent=String(n.getDate()).padStart(2,"0");document.getElementById("calendarMonth").textContent=n.toLocaleDateString("de-DE",{month:"short"}).replace(".","").toUpperCase();document.getElementById("calendarTitle").textContent=n.toLocaleDateString("de-DE",{weekday:"long"})}
  function renderWork(){var sec=currentWorkSeconds(),hours=sec/3600,overtime=Math.max(0,hours-40);document.getElementById("workTimer").textContent=timeText(sec);document.getElementById("workStatus").textContent=state.work.running?"Arbeitszeit läuft":"Noch nicht gestartet";document.getElementById("workToggle").textContent=state.work.running?"Arbeitszeit beenden":"Arbeitszeit starten";document.getElementById("weekHours").textContent=hours.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1});document.getElementById("workDays").textContent=state.work.days||0;document.getElementById("overtime").textContent=overtime.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1});document.getElementById("workProgress").style.width=Math.min(100,(hours/40)*100)+"%";document.getElementById("workProgressText").textContent=hours.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1})+" von 40 Stunden"}

  function navigate(page){currentPage=page;document.querySelectorAll(".page").forEach(function(p){p.classList.remove("active")});document.querySelectorAll(".nav-item").forEach(function(b){b.classList.remove("active")});document.getElementById("page-"+page).classList.add("active");var nav=document.querySelector('.nav-item[data-nav="'+page+'"]');if(nav)nav.classList.add("active");renderHeader();window.scrollTo(0,0)}

  document.addEventListener("click",function(e){
    var nav=e.target.closest("[data-nav]");if(nav){navigate(nav.getAttribute("data-nav"));return}
    var filter=e.target.closest("[data-filter]");if(filter){currentFilter=filter.dataset.filter;document.querySelectorAll(".filter").forEach(function(x){x.classList.remove("active")});filter.classList.add("active");renderGoals();return}
    var r=e.target.closest("[data-routine]");if(r){var routine=state.routines.find(function(x){return x.id===r.dataset.routine});if(routine){routine.done=!routine.done;if(routine.done){routine.streak++;state.successes++;addActivity(1);reward(5,2,"Routine erledigt")}else{routine.streak=Math.max(0,routine.streak-1);state.xp=Math.max(0,state.xp-5);state.totalXp=Math.max(0,state.totalXp-5);state.focusPoints=Math.max(0,state.focusPoints-2)}render()}return}
    var add=e.target.closest("[data-goal-add]");if(add){changeGoal(add.dataset.goalAdd,1);return}
    var detail=e.target.closest("[data-goal-detail]");if(detail){openGoalDetail(detail.dataset.goalDetail);return}
    var delR=e.target.closest("[data-delete-routine]");if(delR&&confirm("Routine wirklich löschen?")){state.routines=state.routines.filter(function(x){return x.id!==delR.dataset.deleteRoutine});render();return}
    var delE=e.target.closest("[data-delete-event]");if(delE&&confirm("Termin wirklich löschen?")){state.events=state.events.filter(function(x){return x.id!==delE.dataset.deleteEvent});render();return}
    var addItem=e.target.closest("[data-add]");if(addItem){openItemDialog(addItem.dataset.add);return}
  });

  function changeGoal(id,direction){
    var g=state.goals.find(function(x){return x.id===id});if(!g)return;
    var t=goalTypes[g.type]||goalTypes.custom,old=g.value;
    g.value=Math.max(g.start,Math.min(g.target,+(g.value+t.step*direction).toFixed(2)));
    if(direction>0&&g.value>old){state.successes++;addActivity(1);reward(2,1,"Ziel-Fortschritt");(g.milestones||[]).forEach(function(m){if(g.value>=m&&!g.rewarded.includes(m)){g.rewarded.push(m);reward(10,4,"Meilenstein erreicht")}});if(old<g.target&&g.value>=g.target){state.completedGoals=(state.completedGoals||0)+1;reward(25,15,"🏆 Ziel erreicht!")}}
    render();if(document.getElementById("goalDetailDialog").open)openGoalDetail(id)
  }

  function openGoalDetail(id){
    var g=state.goals.find(function(x){return x.id===id});if(!g)return;selectedGoalId=id;var t=goalTypes[g.type]||goalTypes.custom,p=progress(g);
    document.getElementById("detailType").textContent=t.icon+" "+t.label;document.getElementById("detailTitle").textContent=g.name;document.getElementById("detailValue").textContent=fmt(g.value)+" / "+fmt(g.target);document.getElementById("detailUnit").textContent=g.unit;
    document.getElementById("detailBar").style.width=p+"%";document.getElementById("detailPercent").textContent=p+"%";document.getElementById("detailForecast").textContent=goalForecast(g);document.getElementById("detailNotes").textContent=g.notes||"Keine Notiz vorhanden.";
    document.getElementById("milestoneList").innerHTML=(g.milestones||[]).map(function(m){var done=g.value>=m;return'<div class="milestone '+(done?'done':'')+'"><span>'+(done?'✓':'○')+' '+fmt(m)+' '+esc(g.unit)+'</span><strong>'+(done?'+10 XP':'offen')+'</strong></div>'}).join("");
    document.getElementById("goalDetailDialog").showModal()
  }

  var itemDialog=document.getElementById("itemDialog");
  function openItemDialog(type){
    dialogMode=type;document.getElementById("itemForm").reset();document.getElementById("dialogType").textContent=type==="routine"?"Routine":type==="goal"?"Ziel":"Termin";document.getElementById("dialogTitle").textContent=type==="routine"?"Neue Routine":type==="goal"?"Neues Ziel":"Neuer Termin";
    document.getElementById("goalFields").style.display=type==="goal"?"grid":"none";document.getElementById("goalTypeWrap").style.display=type==="goal"?"block":"none";document.getElementById("eventFields").style.display=type==="event"?"block":"none";document.getElementById("areaWrap").style.display=type==="event"?"none":"grid";
    document.getElementById("itemDeadline").value=plusMonths(6);itemDialog.showModal()
  }
  function syncGoalType(){var t=goalTypes[document.getElementById("goalType").value]||goalTypes.custom;document.getElementById("itemArea").value=t.area;document.getElementById("itemUnit").value=t.unit;document.getElementById("itemTarget").value=t.type==="money"?1000:t.type==="reading"?12:t.type==="weight"?10:10}
  document.getElementById("goalType").onchange=syncGoalType;
  document.getElementById("closeDialog").onclick=function(){itemDialog.close()};document.getElementById("cancelDialog").onclick=function(){itemDialog.close()};document.getElementById("addEventButton").onclick=function(){openItemDialog("event")};
  document.getElementById("itemForm").onsubmit=function(e){
    e.preventDefault();var name=document.getElementById("itemName").value.trim(),area=document.getElementById("itemArea").value;if(!name)return;
    if(dialogMode==="routine")state.routines.unshift({id:uid(),name:name,area:area,done:false,streak:0});
    else if(dialogMode==="goal"){
      var type=document.getElementById("goalType").value,start=Number(document.getElementById("itemStart").value)||0,target=Math.max(start+.1,Number(document.getElementById("itemTarget").value)||10),featured=document.getElementById("itemFeatured").checked;
      if(featured)state.goals.forEach(function(g){g.featured=false});
      state.goals.unshift({id:uid(),name:name,type:type,area:area,start:start,value:start,target:target,unit:document.getElementById("itemUnit").value.trim()||goalTypes[type].unit,deadline:document.getElementById("itemDeadline").value,notes:document.getElementById("itemNotes").value.trim(),featured:featured,milestones:[.25,.5,.75,1].map(function(p){return +(start+(target-start)*p).toFixed(2)}),rewarded:[]})
    }else state.events.push({id:uid(),title:name,time:document.getElementById("eventTime").value||"14:00"});
    itemDialog.close();if(dialogMode!=="event")reward(3,1,"Neu angelegt");render()
  };

  var focusDialog=document.getElementById("focusDialog");
  document.getElementById("changeFocusButton").onclick=function(){document.getElementById("focusInput").value=state.focus.title;document.getElementById("focusNoteInput").value=state.focus.note;focusDialog.showModal()};
  document.getElementById("closeFocusDialog").onclick=function(){focusDialog.close()};document.getElementById("cancelFocusDialog").onclick=function(){focusDialog.close()};
  document.getElementById("focusForm").onsubmit=function(e){e.preventDefault();state.focus.title=document.getElementById("focusInput").value.trim();state.focus.note=document.getElementById("focusNoteInput").value.trim();focusDialog.close();render()};

  document.getElementById("workToggle").onclick=function(){if(!state.work.running){state.work.running=true;state.work.startedAt=Date.now();state.work.days=Math.max(1,state.work.days||0)}else{state.work.totalSeconds=currentWorkSeconds();state.work.running=false;state.work.startedAt=null}render();clearInterval(timerInterval);if(state.work.running)timerInterval=setInterval(renderWork,1000)};
  document.getElementById("profileButton").onclick=function(){navigate("profile")};
  document.getElementById("scoreButton").onclick=function(){document.getElementById("infoTitle").textContent="Dein FokusScore";document.getElementById("infoText").textContent="Der FokusScore verbindet erledigte Routinen und den Fortschritt deiner Ziele zu einem Wert von 0 bis 100.";document.getElementById("infoDialog").showModal()};
  document.getElementById("closeInfoDialog").onclick=function(){document.getElementById("infoDialog").close()};
  document.getElementById("closeGoalDetail").onclick=function(){document.getElementById("goalDetailDialog").close()};
  document.getElementById("increaseGoal").onclick=function(){if(selectedGoalId)changeGoal(selectedGoalId,1)};
  document.getElementById("decreaseGoal").onclick=function(){if(selectedGoalId)changeGoal(selectedGoalId,-1)};

  navigate("today");render();if(state.work.running)timerInterval=setInterval(renderWork,1000)
})();