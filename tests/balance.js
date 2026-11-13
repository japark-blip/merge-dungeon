// 실력 표현 측정: 같은 게임을 (1) 무작위 (2) 고정 순환 연타 (3) 1수 앞을 보는 탐욕 (4) 2수 앞을 보는 플레이어가 하면 얼마나 차이 나는가
global.window=global; global.performance={now:()=>Date.now()}; global.localStorage={getItem:()=>null,setItem:()=>{}};
global.document={createElement:()=>({getContext:()=>({fillRect(){} }), width:0,height:0}), body:{style:{}}};
const d=require('path').resolve(__dirname,'..','src')+'/';
for (const f of ['i18n','config','sprites','board','rules','meta','run','achievements']) require(d+f+'.js');
MD.meta.load().seenTutorial=true; MD.ach.check=()=>[];   // 업적은 측정에서 제외
const B=MD.board, R=MD.rules, C=MD.CONFIG, DIRS=['left','right','up','down'];
// 한 수의 즉시 가치: 처치 +3, 피해 -2/pt, 무기 머지 +lv, 몬스터 머지 -lv, 빈 칸 +0.3, 회복 +1
function evalSlide(run, dir){ const s=B.slide(run.grid,dir,{hero:run.hero}); if(!s.moved) return null; let v=0;
  for(const e of s.events){ if(e.kind==='kill'||e.kind==='bosskill') v+=3+(e.kind==='bosskill'?10:0); else if(e.kind==='damage') v-=2*e.amount+ (e.wound?0:0); else if(e.kind==='merge') v+= e.type==='weapon'? e.lv*0.6 : e.type==='monster'? -e.lv*0.8 : 0.3; else if(e.kind==='heal') v+= run.stats.hp<run.stats.maxHp?1.5:-0.5; else if(e.kind==='bank') v+=0.5; }
  v+=0.3*B.emptyCells(s.grid).length; return {v, grid:s.grid}; }
function pick(run, depth){ let best=null,bv=-1e9; for(const dir of DIRS){ const a=evalSlide(run,dir); if(!a) continue; let v=a.v;
    if(depth>1){ let b2=-1e9; const fake={grid:a.grid,hero:run.hero,stats:run.stats}; for(const d2 of DIRS){ const x=evalSlide(fake,d2); if(x&&x.v>b2) b2=x.v; } v+= (b2>-1e8? 0.7*b2 : -20); }
    if(v>bv){bv=v;best=dir;} } return best||DIRS[0]; }
function play(policy, N){ const floors=[], moves=[], kills=[], tsec=[]; let stuck=0;
  for(let i=0;i<N;i++){ const run=MD.run.newRun('knight'); let n=0;
    while(run.phase!=='dead'&&n<6000){ n++;
      if(run.phase==='choose'){ MD.run.choose(run, policy==='random'||policy==='mash'? Math.floor(Math.random()*3) : 0); if(run.evolved) run.evolved.t0=0; continue; }
      if(run.phase==='branch'){ MD.run.chooseBranch(run,0); continue; }
      if(run.phase==='altar'){ MD.run.chooseAltar(run,2); continue; }
      if(run.cutscene) run.cutscene=null; if(run.evolved) run.evolved.t0=0;
      const dir = policy==='random'? DIRS[Math.floor(Math.random()*4)] : policy==='mash'? DIRS[n%4] : pick(run, policy==='look2'?2:1);
      if(!MD.run.move(run,dir)) { if(policy!=='random') { const alt=DIRS.find(d=>B.slide(run.grid,d,{hero:run.hero}).moved); if(alt) MD.run.move(run,alt); } }
    }
    if(run.phase!=='dead') stuck++; else { floors.push(run.result.floor); moves.push(run.result.moves); kills.push(run.result.kills); } }
  floors.sort((a,b)=>a-b); const q=p=>floors[Math.floor(floors.length*p)]; const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
  return {policy, n:floors.length, stuck, p25:q(.25), median:q(.5), p75:q(.75), p95:q(.95), max:floors[floors.length-1], avgFloor:+avg(floors).toFixed(2), avgMoves:Math.round(avg(moves)), avgKills:+avg(kills).toFixed(1)}; }
const out=[]; for(const p of ['random','mash','greedy','look2']) out.push(play(p, p==='look2'?250:400));
console.table(out);
// 한 턴의 선택 폭: 4방향 중 결과가 실제로 다른 방향이 몇 개인가 + 이벤트가 생기는 턴의 비율
let turns=0, eventTurns=0, distinct=0, forced=0; for(let i=0;i<150;i++){ const run=MD.run.newRun('knight'); let n=0; while(run.phase!=='dead'&&n<3000){ n++; if(run.phase==='choose'){MD.run.choose(run,0); if(run.evolved) run.evolved.t0=0; continue;} if(run.phase==='branch'){MD.run.chooseBranch(run,0);continue;} if(run.phase==='altar'){MD.run.chooseAltar(run,2);continue;} if(run.cutscene) run.cutscene=null;
   const opts=DIRS.map(d=>evalSlide(run,d)).filter(Boolean); const meaningful=opts.filter(o=>Math.abs(o.v-0.3*B.emptyCells(o.grid).length)>0.01).length; turns++; if(meaningful>0) eventTurns++; distinct+=opts.length; if(opts.length<=1) forced++;
   MD.run.move(run,pick(run,1)); } }
console.log('turns',turns,'| 뭔가 일어날 수 있는 턴',(eventTurns/turns*100).toFixed(0)+'%','| 평균 가능한 방향',(distinct/turns).toFixed(2),'| 선택지 1개 이하',(forced/turns*100).toFixed(1)+'%');
// 숙련 플레이어(2수 앞)는 어디서, 왜 죽는가 + 특성 선택이 결과를 얼마나 바꾸는가
function detail(perkPolicy, N){ const hist={}, why={hp:0,full:0}; const fl=[];
  for(let i=0;i<N;i++){ const run=MD.run.newRun('knight'); let n=0;
    while(run.phase!=='dead'&&n<6000){ n++;
      if(run.phase==='choose'){ let k=0; if(perkPolicy==='random') k=Math.floor(Math.random()*run.choices.length); else if(perkPolicy==='survival'){ const pref=['hide','vigor','vampire','alchemist','mercy','ward']; const j=run.choices.findIndex(p=>pref.includes(p.id)); k=j>=0?j:0; } else if(perkPolicy==='offense'){ const pref=['sharp','forge','armory','hunter']; const j=run.choices.findIndex(p=>pref.includes(p.id)); k=j>=0?j:0; }
        MD.run.choose(run,k); if(run.evolved) run.evolved.t0=0; continue; }
      if(run.phase==='branch'){ MD.run.chooseBranch(run,0); continue; } if(run.phase==='altar'){ MD.run.chooseAltar(run,2); continue; }
      if(run.cutscene) run.cutscene=null; if(run.evolved) run.evolved.t0=0;
      const dir=pick(run,2); if(!MD.run.move(run,dir)){ const alt=DIRS.find(d=>B.slide(run.grid,d,{hero:run.hero}).moved); if(alt) MD.run.move(run,alt); } }
    if(run.phase==='dead'){ hist[run.result.floor]=(hist[run.result.floor]||0)+1; why[run.result.reason]++; fl.push(run.result.floor); } }
  fl.sort((a,b)=>a-b); return {perkPolicy, median:fl[Math.floor(fl.length/2)], avg:+(fl.reduce((x,y)=>x+y,0)/fl.length).toFixed(2), deathBy:why, hist}; }
for(const p of ['random','survival','offense']) console.log(JSON.stringify(detail(p,200)));
