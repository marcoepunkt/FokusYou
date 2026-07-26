(function(){
  "use strict";

  var KEY = "fokusyou-v03";
  var areas = {
    health:["❤️","Gesundheit"], work:["💼","Arbeit"], finance:["💰","Finanzen"],
    family:["👨‍👩‍👧","Familie"], learning:["📚","Lernen"], leisure:["🎮","Freizeit"]
  };

  function uid(){ return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2); }
  function clone(obj){ return JSON.parse(JSON.stringify(obj)); }

  var defaults = {
    xp:35, successes:3,
    routines:[
      {id:uid(),name:"Morgenroutine",area:"health",done:false,streak:3},
      {id:uid(),name:"20 Minuten Bewegung",area:"health",done:false,streak:5},
      {id:uid(),name:"Tagesplanung",area:"work",done:false,streak:2}
    ],
    goals:[
      {id:uid(),name:"12 Bücher lesen",area:"learning",value:2,target:12,unit:"Bücher"},
      {id:uid(),name:"1.000 € Rücklage",area:"finance",value:250,target:1000,unit:"€"}
    ],
    events:[], work:{running:false,startedAt:null,totalSeconds:0,days:0}
  };

  var state;
  try { state = JSON.parse(localStorage.getItem(KEY)) || clone(defaults); }
  catch(e){ state = clone(defaults); }

  function save(){ localStorage.setItem(KEY,JSON.stringify(state)); }
  function esc(v){ var d=document.createElement("div"); d.textContent=String(v); return d.innerHTML; }
  function areaLabel(key){ var a=areas[key]||areas.health; return a[0]+" "+a[1]; }
  function fmt(v){ return Number(v).toLocaleString("de-DE"); }

  function renderHeader(page){
    var now=new Date(), hour=now.getHours();
    var titles={
      today: hour<11?"Guten Morgen":hour<18?"Guten Tag":"Guten Abend",
      goals:"Deine Ziele", calendar:"Kalender", work:"Arbeitszeiten"
    };
    document.getElementById("pageTitle").textContent=titles[page];
    document.getElementById("pageSubtitle").textContent=now.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"long"});
  }

  function render(){
    var done=state.routines.filter(function(r){return r.done;}).length;
    var level=Math.floor(state.xp/100)+1, current=state.xp%100;
    var best=Math.max.apply(null,[0].concat(state.routines.map(function(r){return r.streak||0;})));
    var score=Math.min(100,Math.round((done/Math.max(1,state.routines.length))*60 + Math.min(40,state.goals.reduce(function(sum,g){return sum+(g.value/g.target)*10;},0))));

    document.getElementById("level").textContent=level;
    document.getElementById("xp").textContent=state.xp;
    document.getElementById("xpBar").style.width=current+"%";
    document.getElementById("xpText").textContent="Noch "+(100-current)+" XP bis Level "+(level+1);
    document.getElementById("focusScore").textContent=score;
    document.getElementById("streak").textContent=best;
    document.getElementById("successes").textContent=state.successes;
    document.getElementById("todayCount").textContent=done+"/"+state.routines.length;

    renderRoutines();
    renderGoals();
    renderEvents();
    renderWork();
    save();
  }

  function renderRoutines(){
    var box=document.getElementById("todayRoutines");
    if(!state.routines.length){box.innerHTML='<div class="empty">Noch keine Routine angelegt.</div>';return;}
    box.innerHTML=state.routines.map(function(r){
      return '<article class="card item"><button class="check '+(r.done?'done':'')+'" data-routine="'+r.id+'">'+(r.done?'✓':'○')+'</button>'+
      '<div><div class="item-title">'+esc(r.name)+'</div><div class="item-meta">🔥 '+r.streak+' Tage Serie · +5 XP</div><span class="pill">'+areaLabel(r.area)+'</span></div>'+
      '<button class="plus" data-delete-routine="'+r.id+'">⋯</button></article>';
    }).join("");
  }

  function goalHtml(g){
    var p=Math.min(100,Math.round((g.value/g.target)*100));
    return '<article class="card item"><div style="font-size:1.5rem">🎯</div><div><div class="item-title">'+esc(g.name)+'</div>'+
    '<div class="item-meta">'+fmt(g.value)+' / '+fmt(g.target)+' '+esc(g.unit)+' · '+p+'%</div>'+
    '<div class="progress"><span style="width:'+p+'%"></span></div><span class="pill">'+areaLabel(g.area)+'</span></div>'+
    '<button class="plus" data-goal="'+g.id+'">+1</button></article>';
  }

  function renderGoals(){
    var html=state.goals.length?state.goals.map(goalHtml).join(""):'<div class="empty">Noch kein Ziel angelegt.</div>';
    document.getElementById("allGoals").innerHTML=html;
    document.getElementById("todayGoals").innerHTML=state.goals.length?state.goals.slice(0,2).map(goalHtml).join(""):'<div class="empty">Noch kein Ziel angelegt.</div>';
  }

  function renderEvents(){
    var box=document.getElementById("eventList");
    box.innerHTML=state.events.length?state.events.map(function(e){
      return '<article class="card item"><div style="font-size:1.5rem">📌</div><div><div class="item-title">'+esc(e.title)+'</div><div class="item-meta">'+esc(e.time)+'</div></div></article>';
    }).join(""):'<div class="empty">Noch keine Termine vorhanden.</div>';
  }

  var timerInterval=null;
  function currentSeconds(){
    var total=state.work.totalSeconds||0;
    if(state.work.running&&state.work.startedAt) total+=Math.floor((Date.now()-state.work.startedAt)/1000);
    return total;
  }
  function timeText(sec){
    var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
    return [h,m,s].map(function(n){return String(n).padStart(2,"0");}).join(":");
  }
  function renderWork(){
    document.getElementById("workTimer").textContent=timeText(currentSeconds());
    document.getElementById("workStatus").textContent=state.work.running?"Arbeitszeit läuft":"Noch nicht gestartet";
    document.getElementById("workToggle").textContent=state.work.running?"Arbeitszeit beenden":"Arbeitszeit starten";
    document.getElementById("weekHours").textContent=(currentSeconds()/3600).toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1});
    document.getElementById("workDays").textContent=state.work.days||0;
  }

  function navigate(page){
    document.querySelectorAll(".page").forEach(function(p){p.classList.remove("active");});
    document.querySelectorAll(".nav-item").forEach(function(b){b.classList.remove("active");});
    document.getElementById("page-"+page).classList.add("active");
    var nav=document.querySelector('.nav-item[data-nav="'+page+'"]'); if(nav)nav.classList.add("active");
    renderHeader(page); window.scrollTo(0,0);
  }

  document.addEventListener("click",function(e){
    var nav=e.target.closest("[data-nav]");
    if(nav){navigate(nav.getAttribute("data-nav"));return;}

    var r=e.target.closest("[data-routine]");
    if(r){
      var routine=state.routines.find(function(x){return x.id===r.getAttribute("data-routine");});
      if(routine){
        routine.done=!routine.done;
        if(routine.done){routine.streak++;state.xp+=5;state.successes++;}
        else{routine.streak=Math.max(0,routine.streak-1);state.xp=Math.max(0,state.xp-5);state.successes=Math.max(0,state.successes-1);}
        render();
      } return;
    }

    var g=e.target.closest("[data-goal]");
    if(g){
      var goal=state.goals.find(function(x){return x.id===g.getAttribute("data-goal");});
      if(goal&&goal.value<goal.target){goal.value++;state.xp+=2;state.successes++;if(goal.value>=goal.target){state.xp+=25;alert("🏆 Ziel erreicht! 25 Bonus-XP.");}render();}
      return;
    }

    var del=e.target.closest("[data-delete-routine]");
    if(del&&confirm("Routine wirklich löschen?")){state.routines=state.routines.filter(function(x){return x.id!==del.getAttribute("data-delete-routine");});render();return;}

    var add=e.target.closest("[data-add]");
    if(add)openDialog(add.getAttribute("data-add"));
  });

  var mode="routine", dialog=document.getElementById("itemDialog");
  function openDialog(type){
    mode=type;document.getElementById("itemForm").reset();
    document.getElementById("dialogType").textContent=type==="routine"?"Routine":"Ziel";
    document.getElementById("dialogTitle").textContent=type==="routine"?"Neue Routine":"Neues Ziel";
    document.getElementById("goalFields").style.display=type==="routine"?"none":"grid";
    dialog.showModal();
  }
  document.getElementById("closeDialog").onclick=function(){dialog.close();};
  document.getElementById("cancelDialog").onclick=function(){dialog.close();};
  document.getElementById("itemForm").onsubmit=function(e){
    e.preventDefault();
    var name=document.getElementById("itemName").value.trim(),area=document.getElementById("itemArea").value;
    if(!name)return;
    if(mode==="routine")state.routines.unshift({id:uid(),name:name,area:area,done:false,streak:0});
    else state.goals.unshift({id:uid(),name:name,area:area,value:0,target:Math.max(1,Number(document.getElementById("itemTarget").value)||1),unit:document.getElementById("itemUnit").value.trim()||"Schritte"});
    dialog.close();render();
  };

  document.getElementById("addDemoEvent").onclick=function(){
    state.events.push({title:"Beispieltermin",time:"Heute · 14:00 Uhr"});render();
  };

  document.getElementById("workToggle").onclick=function(){
    if(!state.work.running){state.work.running=true;state.work.startedAt=Date.now();state.work.days=Math.max(1,state.work.days||0);}
    else{state.work.totalSeconds=currentSeconds();state.work.running=false;state.work.startedAt=null;}
    render();
    clearInterval(timerInterval);
    if(state.work.running)timerInterval=setInterval(renderWork,1000);
  };

  document.getElementById("profileButton").onclick=function(){alert("Profil, Freunde, gemeinsame Ziele und Ranglisten folgen in einer späteren Version.");};

  navigate("today");
  render();
  if(state.work.running)timerInterval=setInterval(renderWork,1000);
})();