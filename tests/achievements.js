// console.assert 는 Node에서 실패해도 종료 코드를 바꾸지 않으므로 실패를 센다
let __fails=0; const __ca=console.assert; console.assert=(c,...m)=>{ if(!c){ __fails++; console.error('ASSERT FAIL:',...m);} };
process.on('exit',()=>{ if(__fails){ console.error(__fails+' assertion(s) failed'); process.exitCode=1; } else console.log('OK'); });
global.window=global; global.performance={now:()=>Date.now()}; let store={}; global.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v;}};
global.document={createElement:()=>({getContext:()=>({fillRect(){} }), width:0,height:0}), body:{style:{}}};
const d=require('path').resolve(__dirname,'..','src')+'/';
for (const f of ['i18n','config','sprites','board','rules','meta','run','achievements']) require(d+f+'.js');
const C=MD.CONFIG, B=MD.board;
// v2 save migrates to v3 and keeps data
store['merge-dungeon-save']=JSON.stringify({version:2,coins:77,bestFloor:6,runs:4,relics:{bigheart:1},hero:'rogue',stats:{potionsUsed:4,totalCoins:90,bossKills:1,bestCombo:4,floors:[3,6]},heroBest:{rogue:6},codex:{reaper:1},daily:{},seenTutorial:true});
const m=MD.meta.load();
console.assert(m.version===3&&m.coins===77&&m.relics.bigheart===1&&m.achievements&&m.title===null&&m.stats.kills===0,'v2→v3 migration');
console.assert(MD.ach.LIST.length===40,'40 achievements, got '+MD.ach.LIST.length);
console.assert(new Set(MD.ach.LIST.map(a=>a.id)).size===40,'unique ids');
console.assert(MD.ach.LIST.filter(a=>a.tier!=='bronze').every(a=>a.title),'every silver/gold has a title');
// retroactive credit from the migrated save
let fresh=MD.ach.check(null).map(a=>a.id);
console.log('retroactive:',fresh.join(','));
console.assert(fresh.includes('floor3')&&fresh.includes('first_boss')&&fresh.includes('first_evolve')&&fresh.includes('first_relic'),'retroactive unlocks');
console.assert(MD.meta.get().coins===77+10*fresh.filter(id=>MD.ach.byId(id).tier==='bronze').length,'bronze reward coins');
console.assert(MD.ach.check(null).length===0,'no double unlock');
// title equip
console.assert(!MD.ach.equip('floor3'),'bronze has no title'); console.assert(!MD.ach.equip('floor10'),'locked title refused');
// in-run feats
const run=MD.run.newRun('knight'); run.grid=B.emptyGrid(4);
run.grid[0][0]=B.makeTile('weapon',4); run.grid[0][2]=B.makeTile('monster',1); run.grid[1][0]=B.makeTile('weapon',2); run.grid[1][2]=B.makeTile('monster',1); run.grid[2][0]=B.makeTile('weapon',2); run.grid[2][2]=B.makeTile('monster',2);
MD.run.move(run,'right');
const got=(run.feats||[]);
console.log('in-run feats:',got.join(','),'| multi',run.stats.maxMulti);
console.assert(got.includes('first_blood')&&got.includes('multi3')&&got.includes('lv4_weapon'),'kill/multi/weapon feats');
console.assert(run.toasts.some(t=>t.kind==='feat'),'feat toast queued');
console.assert(MD.ach.equip('multi3')&&MD.ach.titleText()==='Sweeper','equip title'); MD.ach.equip('multi3'); console.assert(MD.ach.titleText()==='','unequip');
// untouched5 needs damage 0; no_potion8 needs inRun
const r2=MD.run.newRun('knight'); r2.stats.floor=8; MD.ach.check(r2); console.assert(MD.meta.get().achievements.untouched5&&MD.meta.get().achievements.no_potion8,'run-only feats');
// full sim keeps working and never throws
let total=0; for(let i=0;i<200;i++){ const run=MD.run.newRun(C.HEROES[i%5].id); let n=0; while(run.phase!=='dead'&&n<3000){n++; if(run.phase==='choose'){MD.run.choose(run,0); if(run.evolved) run.evolved.t0=0; continue;} if(run.phase==='branch'){MD.run.chooseBranch(run,i%3);continue;} if(run.phase==='altar'){MD.run.chooseAltar(run,i%3)||MD.run.chooseAltar(run,2);continue;} if(run.cutscene) run.cutscene=null; MD.run.move(run,['left','right','up','down'][Math.floor(Math.random()*4)]);} total+=(run.feats||[]).length; }
const s=MD.meta.get(); console.log('after 200 sim runs: unlocked',MD.ach.count(),'/40 · lifetime kills',s.stats.kills,'· mimics',s.stats.mimics);
console.log('still locked:',MD.ach.LIST.filter(a=>!s.achievements[a.id]).map(a=>a.id).join(','));
