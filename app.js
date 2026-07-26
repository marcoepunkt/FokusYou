(function(){
  "use strict";

  var KEY="fokusyou-v04";
  var areas={
    health:["❤️","Gesundheit"],work:["💼","Arbeit"],finance:["💰","Finanzen"],
    family:["👨‍👩‍👧","Familie"],learning:["📚","Lernen"],leisure:["🎮","Freizeit"]
  };

  function uid(){return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2)}
  function clone(obj){return JSON.parse(JSON.stringify(obj))}
  function esc(v){var d=document.createElement("div");d.textContent=String(v);return d.innerHTML}
  function fmt(v){return Number(v).toLocaleString("de-DE")}
  function areaLabel(k){var a=areas[k]||areas.health;return a[0]+" "+a[1]}

  var defaults={
    xp:35,successes:3,
    focus:{title:"Heute bewusst vorankommen",note:"Wähle eine Aufgabe, die heute besonders wichtig ist."},
    lastAchievement:{title:"Dein erster Schritt",text:"Du hast FokusYou gestartet."},
    completedGoals:0,
    routines:[
      {id:uid(),name:"Morgenroutine",area:"health",done:false,streak:3},
      {id:uid(),name:"20 Minuten Bewegung",area:"health",done:false,streak:5},
      {id:uid(),name:"Tagesplanung",area:"work",done:false,streak:2}
    ],
    goals:[
      {id:uid(),name:"12 Bücher lesen",area:"learning",value:2,target:12,unit:"Bücher"},
      {id:uid(),name:"1.000 € Rücklage",area:"finance",value:250,target:1000,unit:"€"}
    ],
    events:[{id:uid(),title:"Wochenplanung",time:"18:00"}],
    work:{running:false,startedAt:null,totalSeconds:0,days:0}
  };

  var state;
  try{state=JSON.parse(localStorage.getItem(KEY))||clone(defaults)}catch(e){state=clone(defaults)}
  var currentPage="today",timerInterval=null,dialogMode="routine";

  function save(){localStorage.setItem(KEY,JSON.stringify(state))}
  function levelInfo(){return{level:Math.floor(state.xp/100)+1,current:state.xp%100}}
  function currentWorkSeconds(){
    var total=state.work.totalSeconds||0;
    if(state.work.running&&state.work.startedAt)total+=Math.floor((Date.now()-state.work.startedAt)/1000);
    return total
  }
  function timeText(sec){
    var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
    return[h,m,s].map(function(n){return String(n).padStart(2,"0")}).join(":")
  }

  function renderHeader(){
    var now=new Date(),hour=now.getHours();
    var titles={today:hour<11?"Guten Morgen":hour<18?"Guten Tag":"Guten Abend",goals:"Deine Ziele",calendar:"Kalender",work:"Arbeitszeiten",profile:"Dein Profil"};
    document.getElementById("pageTitle").textContent=titles[currentPage];
    document.getElementById("pageSubtitle").textContent=now.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"long"})
  }

  function render(){
    var info=levelInfo(),done=state.routines.filter(function(r){return r.done}).length;
    var best=Math.max.apply(null,[0].concat(state.routines.map(function(r){return r.streak||0})));
    var goalAvg=state.goals.length?state.goals.reduce(function(sum,g){return sum+Math.min(1,g.value/g.target)},0)/state.goals.length:0;
    var score=Math.min(100,Math.round((done/Math.max(1,state.routines.length))*60+goalAvg*40));

    document.getElementById("level").textContent=info.level;
    document.getElementById("xp").textContent=state.xp;
    document.getElementById("xpBar").style.width=info.current+"%";
    document.getElementById("xpText").textContent="Noch "+(100-info.current)+" XP bis Level "+(info.level+1);
    document.getElementById("focusScore").textContent=score;
    document.getElementById("streak").textContent=best+" Tage";
    document.getElementById("successes").textContent=state.successes;
    document.getElementById("focusTitle").textContent=state.focus.title;
    document.getElementById("focusNote").textContent=state.focus.note;
    document.getElementById("lastAchievement").textContent=state.lastAchievement.title;
    document.getElementById("achievementText").textContent=state.lastAchievement.text;

    document.getElementById("profileLevel").textContent=info.level;
    document.getElementById("profileXp").textContent=state.xp;
    document.getElementById("profileGoals").textContent=state.goals.length;
    document.getElementById("profileRoutines").textContent=state.routines.length;
    document.getElementById("profileAchievements").textContent=state.successes;
    document.getElementById("profileStreak").textContent=best;

    renderRoutines();renderGoals();renderBalance();renderEvents();renderWork();renderCalendarDate();
    save()
  }

  function renderRoutines(){
    var box=document.getElementById("todayRoutines");
    if(!state.routines.length){box.innerHTML='<div class="empty">Noch keine Routine angelegt.</div>';return}
    box.innerHTML=state.routines.map(function(r){
      return '<article class="card item"><button class="check '+(r.done?'done':'')+'" data-routine="'+r.id+'">'+(r.done?'✓':'○')+'</button>'+
      '<div><div class="item-title">'+esc(r.name)+'</div><div class="item-meta">🔥 '+r.streak+' Tage Serie · +5 XP</div><span class="pill">'+areaLabel(r.area)+'</span></div>'+
      '<button class="plus" data-delete-routine="'+r.id+'">⋯</button></article>'
    }).join("")
  }

  function goalHtml(g){
    var p=Math.min(100,Math.round((g.value/g.target)*100));
    return '<article class="card item"><div style="font-size:1.5rem">🎯</div><div><div class="item-title">'+esc(g.name)+'</div>'+
    '<div class="item-meta">'+fmt(g.value)+' / '+fmt(g.target)+' '+esc(g.unit)+' · '+p+'%</div><div class="progress"><span style="width:'+p+'%"></span></div>'+
    '<span class="pill">'+areaLabel(g.area)+'</span></div><button class="plus" data-goal="'+g.id+'">+1</button></article>'
  }

  function renderGoals(){
    var html=state.goals.length?state.goals.map(goalHtml).join(""):'<div class="empty">Noch kein Ziel angelegt.</div>';
    document.getElementById("allGoals").innerHTML=html;
    document.getElementById("todayGoals").innerHTML=state.goals.length?state.goals.slice(0,2).map(goalHtml).join(""):'<div class="empty">Noch kein Ziel angelegt.</div>';
    var avg=state.goals.length?Math.round(state.goals.reduce(function(s,g){return s+Math.min(100,(g.value/g.target)*100)},0)/state.goals.length):0;
    document.getElementById("goalSummaryCount").textContent=state.goals.length;
    document.getElementById("goalSummaryProgress").textContent=avg+"%";
    document.getElementById("goalSummaryDone").textContent=state.completedGoals||0
  }

  function renderBalance(){
    var scores={health:0,work:0,finance:0,family:0,learning:0,leisure:0};
    state.routines.forEach(function(r){if(r.done)scores[r.area]=Math.min(100,(scores[r.area]||0)+30)});
    state.goals.forEach(function(g){scores[g.area]=Math.max(scores[g.area]||0,Math.round(Math.min(1,g.value/g.target)*100))});
    document.getElementById("balanceGrid").innerHTML=Object.keys(areas).map(function(k){
      return '<article class="card balance-card"><div class="balance-row"><strong>'+areaLabel(k)+'</strong><span>'+scores[k]+'%</span></div><div class="progress"><span style="width:'+scores[k]+'%"></span></div></article>'
    }).join("")
  }

  function renderEvents(){
    var box=document.getElementById("eventList");
    box.innerHTML=state.events.length?state.events.map(function(e){
      return '<article class="card item"><div style="font-size:1.5rem">📌</div><div><div class="item-title">'+esc(e.title)+'</div><div class="item-meta">Heute · '+esc(e.time)+' Uhr</div></div><button class="plus" data-delete-event="'+e.id+'">⋯</button></article>'
    }).join(""):'<div class="empty">Noch keine Termine vorhanden.</div>'
  }

  function renderCalendarDate(){
    var now=new Date();
    document.getElementById("calendarDay").textContent=String(now.getDate()).padStart(2,"0");
    document.getElementById("calendarMonth").textContent=now.toLocaleDateString("de-DE",{month:"short"}).replace(".","").toUpperCase();
    document.getElementById("calendarTitle").textContent=now.toLocaleDateString("de-DE",{weekday:"long"})
  }

  function renderWork(){
    var sec=currentWorkSeconds(),hours=sec/3600,overtime=Math.max(0,hours-40);
    document.getElementById("workTimer").textContent=timeText(sec);
    document.getElementById("workStatus").textContent=state.work.running?"Arbeitszeit läuft":"Noch nicht gestartet";
    document.getElementById("workToggle").textContent=state.work.running?"Arbeitszeit beenden":"Arbeitszeit starten";
    document.getElementById("weekHours").textContent=hours.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1});
    document.getElementById("workDays").textContent=state.work.days||0;
    document.getElementById("overtime").textContent=overtime.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1});
    document.getElementById("workProgress").style.width=Math.min(100,(hours/40)*100)+"%";
    document.getElementById("workProgressText").textContent=hours.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1})+" von 40 Stunden"
  }

  function navigate(page){
    currentPage=page;
    document.querySelectorAll(".page").forEach(function(p){p.classList.remove("active")});
    document.querySelectorAll(".nav-item").forEach(function(b){b.classList.remove("active")});
    document.getElementById("page-"+page).classList.add("active");
    var nav=document.querySelector('.nav-item[data-nav="'+page+'"]');if(nav)nav.classList.add("active");
    renderHeader();window.scrollTo(0,0)
  }

  document.addEventListener("click",function(e){
    var nav=e.target.closest("[data-nav]");
    if(nav){navigate(nav.getAttribute("data-nav"));return}

    var r=e.target.closest("[data-routine]");
    if(r){
      var routine=state.routines.find(function(x){return x.id===r.getAttribute("data-routine")});
      if(routine){
        routine.done=!routine.done;
        if(routine.done){routine.streak++;state.xp+=5;state.successes++;state.lastAchievement={title:"Routine erledigt",text:routine.name+" bringt dich deinem Ziel näher."}}
        else{routine.streak=Math.max(0,routine.streak-1);state.xp=Math.max(0,state.xp-5);state.successes=Math.max(0,state.successes-1)}
        render()
      }return
    }

    var g=e.target.closest("[data-goal]");
    if(g){
      var goal=state.goals.find(function(x){return x.id===g.getAttribute("data-goal")});
      if(goal&&goal.value<goal.target){
        goal.value++;state.xp+=2;state.successes++;
        if(goal.value>=goal.target){state.xp+=25;state.completedGoals++;state.lastAchievement={title:"Ziel erreicht",text:goal.name+" ist abgeschlossen."};alert("🏆 Ziel erreicht! 25 Bonus-XP.")}
        render()
      }return
    }

    var delR=e.target.closest("[data-delete-routine]");
    if(delR&&confirm("Routine wirklich löschen?")){state.routines=state.routines.filter(function(x){return x.id!==delR.getAttribute("data-delete-routine")});render();return}

    var delE=e.target.closest("[data-delete-event]");
    if(delE&&confirm("Termin wirklich löschen?")){state.events=state.events.filter(function(x){return x.id!==delE.getAttribute("data-delete-event")});render();return}

    var add=e.target.closest("[data-add]");
    if(add){openItemDialog(add.getAttribute("data-add"));return}

    var info=e.target.closest("[data-info]");
    if(info){openInfo(info.getAttribute("data-info"));return}
  });

  var itemDialog=document.getElementById("itemDialog");
  function openItemDialog(type){
    dialogMode=type;document.getElementById("itemForm").reset();
    document.getElementById("dialogType").textContent=type==="routine"?"Routine":type==="goal"?"Ziel":"Termin";
    document.getElementById("dialogTitle").textContent=type==="routine"?"Neue Routine":type==="goal"?"Neues Ziel":"Neuer Termin";
    document.getElementById("goalFields").style.display=type==="goal"?"grid":"none";
    document.getElementById("eventFields").style.display=type==="event"?"block":"none";
    document.getElementById("itemArea").parentElement.style.display=type==="event"?"none":"grid";
    itemDialog.showModal()
  }

  document.getElementById("closeDialog").onclick=function(){itemDialog.close()};
  document.getElementById("cancelDialog").onclick=function(){itemDialog.close()};
  document.getElementById("addEventButton").onclick=function(){openItemDialog("event")};

  document.getElementById("itemForm").onsubmit=function(e){
    e.preventDefault();
    var name=document.getElementById("itemName").value.trim(),area=document.getElementById("itemArea").value;
    if(!name)return;
    if(dialogMode==="routine")state.routines.unshift({id:uid(),name:name,area:area,done:false,streak:0});
    else if(dialogMode==="goal")state.goals.unshift({id:uid(),name:name,area:area,value:0,target:Math.max(1,Number(document.getElementById("itemTarget").value)||1),unit:document.getElementById("itemUnit").value.trim()||"Schritte"});
    else state.events.push({id:uid(),title:name,time:document.getElementById("eventTime").value||"14:00"});
    itemDialog.close();render()
  };

  var focusDialog=document.getElementById("focusDialog");
  document.getElementById("changeFocusButton").onclick=function(){
    document.getElementById("focusInput").value=state.focus.title;
    document.getElementById("focusNoteInput").value=state.focus.note;
    focusDialog.showModal()
  };
  document.getElementById("closeFocusDialog").onclick=function(){focusDialog.close()};
  document.getElementById("cancelFocusDialog").onclick=function(){focusDialog.close()};
  document.getElementById("focusForm").onsubmit=function(e){
    e.preventDefault();state.focus.title=document.getElementById("focusInput").value.trim();state.focus.note=document.getElementById("focusNoteInput").value.trim();focusDialog.close();render()
  };

  document.getElementById("workToggle").onclick=function(){
    if(!state.work.running){state.work.running=true;state.work.startedAt=Date.now();state.work.days=Math.max(1,state.work.days||0)}
    else{state.work.totalSeconds=currentWorkSeconds();state.work.running=false;state.work.startedAt=null}
    render();clearInterval(timerInterval);if(state.work.running)timerInterval=setInterval(renderWork,1000)
  };

  document.getElementById("profileButton").onclick=function(){navigate("profile")};
  document.getElementById("scoreButton").onclick=function(){openInfo("score")};

  var infoDialog=document.getElementById("infoDialog");
  function openInfo(type){
    var content={
      score:["Dein FokusScore","Der FokusScore verbindet erledigte Routinen und deinen Fortschritt bei Zielen zu einem Wert von 0 bis 100."],
      friends:["Freunde & gemeinsame Ziele","Hier kannst du später Freunde hinzufügen, gemeinsame Ziele starten und Fortschritte teilen."],
      ranking:["Ranglisten","Später vergleichst du Wochen-XP, Level und Serien mit deinen Freunden – freiwillig und mit Privatsphäre-Einstellungen."],
      badges:["Abzeichen","Besondere Meilensteine werden später als Abzeichen gesammelt."],
      settings:["Einstellungen","Hier folgen Profilname, Farben, Benachrichtigungen und Datenschutz."]
    };
    var item=content[type]||["Demnächst","Dieses Modul folgt in einer späteren Version."];
    document.getElementById("infoTitle").textContent=item[0];
    document.getElementById("infoText").textContent=item[1];
    infoDialog.showModal()
  }
  document.getElementById("closeInfoDialog").onclick=function(){infoDialog.close()};

  navigate("today");render();
  if(state.work.running)timerInterval=setInterval(renderWork,1000)
})();