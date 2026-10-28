'use strict';
const SUPABASE_URL='https://fvdjuavvandzshepwjkb.supabase.co';
const SUPABASE_KEY='sb_publishable_8VG6wR9BkVhmLfZGnD-d1g_Fw6rK_sk';
const $=id=>document.getElementById(id), money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const dateLabel=s=>s?new Date(s+'T12:00:00').toLocaleDateString('de-DE'):'–';
const state={session:null,spaces:[],space:null,accounts:[],categories:[],transactions:[],recurring:[],bills:[],notes:[],period:{from:'',to:''},tab:'dashboard'};
let client;let editingRecurringId=null;let bookingTarget=null;
let messageTimer;function message(msg,ok=false){clearTimeout(messageTimer);$('globalMsg').textContent=msg;$('globalMsg').className='message'+(ok?' good':'');if(ok)messageTimer=setTimeout(()=>{$('globalMsg').classList.add('hidden')},3500);else window.scrollTo({top:0,behavior:'smooth'})}
function clearMessage(){$('globalMsg').classList.add('hidden')}
function showError(err){console.error(err);message(err?.message||String(err))}
async function run(task){clearMessage();try{await task()}catch(e){showError(e)}}
async function query(table,options={}){let q=client.from('finance_'+table).select('*');if(options.space!==false&&state.space)q=q.eq('space_id',state.space.id);let {data,error}=await q;if(error)throw error;return data||[]}
async function insert(table,rows){let {error}=await client.from('finance_'+table).insert(rows);if(error)throw error}
async function update(table,id,values){let {error}=await client.from('finance_'+table).update(values).eq('id',id).eq('space_id',state.space.id);if(error)throw error}
async function remove(table,id){if(!confirm('Eintrag wirklich löschen?'))return;let {error}=await client.from('finance_'+table).delete().eq('id',id).eq('space_id',state.space.id);if(error)throw error;await load();message('Eintrag gelöscht.',true)}
function getForm(form){return Object.fromEntries(new FormData(form).entries())}
function signed(type,n){return type==='expense'?-Math.abs(Number(n)):Math.abs(Number(n))}
function balance(a){return Number(a.opening_balance)+state.transactions.filter(t=>t.account_id===a.id&&t.booked_on>=a.opening_date&&t.booked_on<=today()).reduce((s,t)=>s+Number(t.amount),0)}
function accountName(id){return state.accounts.find(a=>a.id===id)?.name||'Konto gelöscht'}
function categoryName(id){return state.categories.find(c=>c.id===id)?.name||''}
function day(y,m,d){return `${y}-${String(m).padStart(2,'0')}-${String(Math.min(d,new Date(y,m,0).getDate())).padStart(2,'0')}`}
function nextMonth(y,m){return m===12?[y+1,1]:[y,m+1]}
function monthBefore(y,m){return m===1?[y-1,12]:[y,m-1]}
function nextDay(s){let d=new Date(s+'T12:00:00');d.setDate(d.getDate()+1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function prevDay(s){let d=new Date(s+'T12:00:00');d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function period(){let mode=$('periodMode').value,month=$('periodMonth').value||today().slice(0,7),[y,m]=month.split('-').map(Number);let from,to;
 if(mode==='calendar'){from=day(y,m,1);to=day(y,m,31)}
 else if(mode==='salary'){let d=Math.min(31,Math.max(1,Number($('salaryDay').value)||30));let [ny,nm]=nextMonth(y,m);from=day(y,m,d);to=prevDay(day(ny,nm,d))}
 else{from=$('periodFrom').value||today();to=$('periodTo').value||today()}
 state.period={from,to};$('periodInfo').textContent=`Ausgewählt: ${dateLabel(from)} bis ${dateLabel(to)} · Gehalts-Stichtag ist nur die Auswertungsgrenze, tatsächliche Buchungen behalten ihr eigenes Datum.`;
 if(mode!=='custom'){$('periodFrom').value=from;$('periodTo').value=to}
 return state.period;
}
function dueOccurrences(r,from,to){let results=[];if(!r.active)return results;let [y,m]=from.slice(0,7).split('-').map(Number);for(let i=0;i<48;i++){let stamp=day(y,m,Number(r.due_day));let startMonth=r.starts_on.slice(0,7);let diff=(y-Number(startMonth.slice(0,4)))*12+(m-Number(startMonth.slice(5,7)));let frequency=r.frequency==='yearly'?12:r.frequency==='quarterly'?3:1;
 if(diff>=0&&diff%frequency===0&&stamp>=r.starts_on&&(!r.ends_on||stamp<=r.ends_on)&&stamp>=from&&stamp<=to)results.push({...r,due:stamp});
 [y,m]=nextMonth(y,m);if(day(y,m,1)>to)break;
 }return results}
function scheduled(){const {from,to}=period();return state.recurring.flatMap(r=>dueOccurrences(r,from,to)).sort((a,b)=>a.due.localeCompare(b.due))}
function recurringReference(r,date){return 'recurring:'+r.id+':'+date}
function linkedBooking(r,date){return state.transactions.find(t=>t.import_reference===recurringReference(r,date))||state.transactions.find(t=>!t.import_reference&&t.booked_on===date&&t.title.trim().toLowerCase()===r.title.trim().toLowerCase()&&t.account_id===r.account_id&&(isSalary(r)||Math.abs(Number(t.amount)-signed(r.entry_type,r.amount))<0.01))}
function confirmed(r,date){return !!linkedBooking(r,date)}

function isSalary(r){return r.entry_type==='income'&&/gehalt|lohn|salary/i.test(r.title)}
function plannedRows(){
 const now=today(),from='2026-10-28';
 const [y,m]=now.slice(0,7).split('-').map(Number);const [ny,nm]=nextMonth(y,m);
 const to=day(ny,nm,31);
 return state.recurring.flatMap(r=>dueOccurrences(r,from,to)).sort((a,b)=>a.due.localeCompare(b.due));
}
function renderPlannedBookings(){
 const box=$('plannedBookings');if(!box)return;
 const rows=plannedRows();
 box.innerHTML=rows.length?'<div class="scroll"><table><thead><tr><th>Fällig</th><th>Zahlung</th><th>Konto</th><th>Betrag</th><th>Status / Aktion</th></tr></thead><tbody>'+rows.map(r=>{
  const linked=linkedBooking(r,r.due),salary=isSalary(r),future=r.due>today();
  const status=linked?'<span class="positive">✓ Gebucht</span>':future?'<span class="muted">Geplant</span>':salary?'<span class="muted">Gehalt bestätigen</span>':'<span class="muted">Noch nicht gebucht</span>';
  const action=linked?'':` <button data-book-rec="${esc(r.id)}" data-date="${esc(r.due)}">${salary?'Gehalt bestätigen':'Buchung prüfen'}</button>`;
  return `<tr><td>${dateLabel(r.due)}</td><td>${esc(r.title)}</td><td>${esc(accountName(r.account_id))}</td><td class="num">${money(signed(r.entry_type,r.amount))}</td><td>${status}${action}</td></tr>`;
 }).join('')+'</tbody></table></div>':'<p class="muted">Keine regelmäßigen Zahlungen für den aktuellen Zeitraum angelegt.</p>';
}
let autoPosting=false;
async function postDueFixedCosts(){
 if(autoPosting||!state.space)return;autoPosting=true;
 try{
  const now=today();const rows=state.recurring.flatMap(r=>dueOccurrences(r,'2026-10-28',now))
   .filter(r=>r.entry_type==='expense'&&r.account_id&&!linkedBooking(r,r.due));
  for(const r of rows){
   // Read latest server data before each insertion; do not overwrite existing records.
   const {data,error}=await client.from('finance_transactions').select('id,booked_on,title,account_id,amount,import_reference').eq('space_id',state.space.id).eq('account_id',r.account_id).eq('booked_on',r.due);
   if(error)throw error;
   const reference=recurringReference(r,r.due);
   const exists=(data||[]).some(t=>t.import_reference===reference||(t.title.trim().toLowerCase()===r.title.trim().toLowerCase()&&Math.abs(Number(t.amount)-signed(r.entry_type,r.amount))<.01));
   if(exists)continue;
   await insert('transactions',{space_id:state.space.id,account_id:r.account_id,booked_on:r.due,title:r.title,amount:signed('expense',r.amount),transaction_type:'expense',import_reference:reference});
  }
  if(rows.length){const values=await Promise.all(['accounts','categories','transactions','recurring','bills','notes'].map(n=>query(n)));['accounts','categories','transactions','recurring','bills','notes'].forEach((n,i)=>state[n]=values[i]);}
 }finally{autoPosting=false;}
}

function latestPayday(now){
 const salaryIds=new Set(state.recurring.filter(r=>r.entry_type==='income'&&/gehalt|lohn|salary/i.test(r.title)).map(r=>r.id));
 const paid=state.transactions.filter(t=>t.booked_on<=now&&Number(t.amount)>0&&t.transaction_type==='income'&&(Array.from(salaryIds).some(id=>String(t.import_reference||'').startsWith('recurring:'+id+':'))||/gehalt|lohn|salary/i.test(t.title))).sort((a,b)=>b.booked_on.localeCompare(a.booked_on));
 if(paid.length)return paid[0].booked_on;
 const rec=state.recurring.filter(r=>r.entry_type==='income'&&/gehalt|lohn|salary/i.test(r.title));
 const [y,m]=now.slice(0,7).split('-').map(Number);let d=Number(rec[0]?.due_day||$('salaryDay').value||30);let candidate=day(y,m,d);if(candidate>now){const [py,pm]=monthBefore(y,m);candidate=day(py,pm,d)}return candidate;
}
function nextSalaryBoundary(now){const rec=state.recurring.find(r=>r.entry_type==='income'&&/gehalt|lohn|salary/i.test(r.title));let d=Number(rec?.due_day||$('salaryDay').value||30);let [y,m]=now.slice(0,7).split('-').map(Number);let candidate=day(y,m,d);if(candidate<=now){[y,m]=nextMonth(y,m);candidate=day(y,m,d)}return candidate}
function render(){period();const now=today();const payday=latestPayday(now);const inPeriod=state.transactions.filter(t=>t.booked_on>=payday&&t.booked_on<=now);const total=state.accounts.reduce((s,a)=>s+balance(a),0);const checking=state.accounts.filter(a=>a.account_type==='checking').reduce((sum,a)=>sum+balance(a),0);const savings=state.accounts.filter(a=>a.account_type==='savings').reduce((sum,a)=>sum+balance(a),0);$('mChecking').textContent=money(checking);$('mSavings').textContent=money(savings);$('dashboardPeriodInfo').textContent='Seit dem letzten Gehalt: '+dateLabel(payday)+' bis '+dateLabel(now);const income=inPeriod.filter(t=>Number(t.amount)>0&&t.transaction_type!=='transfer').reduce((s,t)=>s+Number(t.amount),0);const expense=inPeriod.filter(t=>Number(t.amount)<0&&t.transaction_type!=='transfer').reduce((s,t)=>s+Math.abs(Number(t.amount)),0);const due=scheduled();const forecastTo=nextSalaryBoundary(now);const pending=state.recurring.flatMap(r=>dueOccurrences(r,now,forecastTo)).filter(r=>!confirmed(r,r.due));$('mBalance').textContent=money(total);$('mExpense').textContent=money(expense);$('mForecast').textContent=money(total+pending.reduce((s,r)=>s+signed(r.entry_type,r.amount),0));
 $('accountSummary').innerHTML=state.accounts.length?state.accounts.map(a=>`<p><b>${esc(a.name)}</b> <span style="float:right">${money(balance(a))}</span></p>`).join(''):'<p class="muted">Noch kein Konto angelegt. Beginne bei „Konten & Sparbücher“.</p>';
 const dashboardDue=state.recurring.flatMap(r=>dueOccurrences(r,payday,forecastTo)).sort((a,b)=>a.due.localeCompare(b.due));$('dueSummary').innerHTML=dashboardDue.length?dashboardDue.map(r=>`<p><span class="pill">${dateLabel(r.due)}</span> ${esc(r.title)} · <b>${money(signed(r.entry_type,r.amount))}</b> ${confirmed(r,r.due)?'<span class="positive">✓ Gebucht</span>':'<span class="muted">Geplant</span>'}</p>`).join(''):'<p class="muted">Keine geplanten Zahlungen im Zeitraum.</p>';
 $('dashboardTransactions').innerHTML=txHtml(inPeriod.slice().sort((a,b)=>b.booked_on.localeCompare(a.booked_on)).slice(0,10),false);
 renderPendingDashboard(now,forecastTo);
 const options=state.accounts.map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('');document.querySelectorAll('select[data-accounts]').forEach(s=>{let old=s.value;s.innerHTML=options||'<option value="">Zuerst Konto anlegen</option>';if(state.accounts.some(a=>a.id===old))s.value=old});
 $('accountsTable').innerHTML='<div class="scroll"><table><thead><tr><th>Konto</th><th>Typ</th><th>Start</th><th>Stichtag</th><th>Aktueller Stand</th></tr></thead><tbody>'+state.accounts.map(a=>`<tr><td>${esc(a.name)}</td><td>${esc(a.account_type)}</td><td>${money(a.opening_balance)}</td><td>${dateLabel(a.opening_date)}</td><td>${money(balance(a))}</td></tr>`).join('')+'</tbody></table></div>';
 $('recTable').innerHTML=due.length?'<div class="scroll"><table><thead><tr><th>Fällig</th><th>Name</th><th>Betrag</th><th>Status</th><th></th></tr></thead><tbody>'+due.map(r=>`<tr><td>${dateLabel(r.due)}</td><td>${esc(r.title)}</td><td>${money(signed(r.entry_type,r.amount))}</td><td>${confirmed(r,r.due)?'✓ Gebucht':'Geplant'}</td><td>${confirmed(r,r.due)?'':`<button data-book-rec="${r.id}" data-date="${r.due}">Als gebucht erfassen</button>`}</td></tr>`).join('')+'</tbody></table></div>':'<p class="muted">Keine geplanten Zahlungen im Zeitraum.</p>';
 $('recManage').innerHTML=state.recurring.length?'<div class="scroll"><table><thead><tr><th>Bezeichnung</th><th>Art</th><th>Planbetrag</th><th>Rhythmus</th><th>Tag</th><th>Status</th><th>Aktion</th></tr></thead><tbody>'+state.recurring.slice().sort((a,b)=>a.title.localeCompare(b.title,'de')).map(r=>`<tr><td>${esc(r.title)}</td><td>${r.entry_type==='income'?'Einnahme':'Ausgabe'}</td><td>${money(r.amount)}</td><td>${r.frequency==='monthly'?'Monatlich':r.frequency==='quarterly'?'Vierteljährlich':'Jährlich'}</td><td>${r.due_day}.</td><td>${r.active?'Aktiv':'Pausiert'}</td><td><button data-edit-rec="${r.id}">Bearbeiten</button> <button data-toggle-rec="${r.id}">${r.active?'Pausieren':'Aktivieren'}</button> <button class="danger" data-delete-rec="${r.id}">Löschen</button></td></tr>`).join('')+'</tbody></table></div>':'<p class="muted">Noch keine regelmäßigen Zahlungen.</p>';
 $('billsTable').innerHTML='<div class="scroll"><table><thead><tr><th>Rechnung</th><th>Betrag</th><th>Fällig</th><th>Status</th><th></th></tr></thead><tbody>'+state.bills.map(b=>`<tr><td>${esc(b.title)}</td><td>${money(b.amount)}</td><td>${dateLabel(b.due_on)}</td><td>${b.status==='paid'?'Bezahlt':'Offen'}</td><td>${b.status==='open'?`<button data-pay-bill="${b.id}">Als bezahlt markieren</button>`:''} <button data-delete="bills" data-id="${b.id}" class="danger">Löschen</button></td></tr>`).join('')+'</tbody></table></div><small>„Bezahlt“ markieren ändert den Kontostand nicht. Die tatsächliche Abbuchung zusätzlich unter Buchungen erfassen.</small>';
 $('notesList').innerHTML=state.notes.filter(n=>!String(n.title).startsWith('__finance_v2__')).map(n=>`<div class="panel"><b>${esc(n.title)}</b><p style="white-space:pre-wrap">${esc(n.body)}</p><button data-delete="notes" data-id="${n.id}" class="danger">Löschen</button></div>`).join('')||'<p class="muted">Noch keine Notizen.</p>';
 $('spaceList').innerHTML=state.spaces.map(s=>`<p><span class="pill">${s.kind==='private'?'Privat':'Gemeinsam'}</span> ${esc(s.name)} ${s.id===state.space.id?'✓ Aktiv':''}</p>`).join('');renderTx();renderExtras();
}
function txHtml(rows,allowDelete=true){return '<div class="scroll"><table><thead><tr><th>Datum</th><th>Bezeichnung</th><th>Kategorie</th><th>Konto</th><th>Betrag</th>'+(allowDelete?'<th></th>':'')+'</tr></thead><tbody>'+rows.map(t=>`<tr><td>${dateLabel(t.booked_on)}</td><td>${esc(t.title)}</td><td>${esc(categoryName(t.category_id)||t.transaction_type)}</td><td>${esc(accountName(t.account_id))}</td><td class="num ${Number(t.amount)>=0?'positive':'negative'}">${money(t.amount)}</td>${allowDelete?`<td>${t.transaction_type==='transfer'?'':`<button data-edit-tx="${t.id}">Bearbeiten</button> `}<button class="danger" data-delete="transactions" data-id="${t.id}">Löschen</button></td>`:''}</tr>`).join('')+'</tbody></table></div>'}
function renderBookings(){
 const search=$('bookingsSearch').value.trim().toLocaleLowerCase('de'),category=$('bookingsCategory').value.trim().toLocaleLowerCase('de'),type=$('bookingsType').value,limit=$('bookingsLimit').value,sort=$('bookingsSort').value;
 const from=$('bookingsFrom').value,to=$('bookingsTo').value;
 $('bookingsFromWrap').classList.toggle('hidden',limit!=='custom');$('bookingsToWrap').classList.toggle('hidden',limit!=='custom');
 let rows=state.transactions.filter(t=>(type==='all'||t.transaction_type===type)&&(!search||String(t.title||'').toLocaleLowerCase('de').includes(search))&&(!category||categoryName(t.category_id).toLocaleLowerCase('de').includes(category))&&(limit!=='custom'||(!from||t.booked_on>=from)&&(!to||t.booked_on<=to)));
 const cmp=(a,b)=>String(a||'').localeCompare(String(b||''),'de',{sensitivity:'base'});
 rows.sort((a,b)=>sort==='dateAsc'?cmp(a.booked_on,b.booked_on):sort==='title'?cmp(a.title,b.title)||cmp(b.booked_on,a.booked_on):sort==='category'?cmp(categoryName(a.category_id),categoryName(b.category_id))||cmp(b.booked_on,a.booked_on):sort==='amountDesc'?Math.abs(Number(b.amount))-Math.abs(Number(a.amount)):cmp(b.booked_on,a.booked_on));
 const shown=limit==='all'||limit==='custom'?rows:rows.slice(0,Number(limit));
 const expenses=shown.reduce((s,t)=>s+(Number(t.amount)<0&&t.transaction_type!=='transfer'?Math.abs(Number(t.amount)):0),0);
 const incomes=shown.reduce((s,t)=>s+(Number(t.amount)>0&&t.transaction_type!=='transfer'?Number(t.amount):0),0);
 const net=shown.reduce((s,t)=>s+(t.transaction_type==='transfer'?0:Number(t.amount)),0);
 $('bookingsTotals').innerHTML=`<div class="bookings-total"><span>Ausgaben · Auswahl</span><b class="negative">${money(expenses)}</b></div><div class="bookings-total"><span>Einnahmen · Auswahl</span><b class="positive">${money(incomes)}</b></div><div class="bookings-total"><span>Gesamtbetrag · Saldo</span><b class="${net<0?'negative':'positive'}">${money(net)}</b></div>`;
 $('bookingsCount').textContent=`${shown.length} von ${rows.length} passenden Buchungen angezeigt · Summe bezieht sich auf die angezeigten Buchungen`;
 $('bookingsTable').innerHTML=shown.length?txHtml(shown):'<p class="muted">Keine Buchungen für diese Auswahl gefunden.</p>';
 renderPlannedBookings();
}
let editingTxId=null;
async function resolveTxCategory(name,type){
 name=name.trim();if(!name)return null;
 const kind=type==='income'?'income':'expense';
 const existing=state.categories.find(c=>c.name.toLowerCase()===name.toLowerCase()&&c.category_type===kind);
 if(existing)return existing.id;
 let {data,error}=await client.from('finance_categories').insert({space_id:state.space.id,name,category_type:kind}).select('id').single();
 if(error&&error.code==='23505'){
  const found=await client.from('finance_categories').select('id').eq('space_id',state.space.id).eq('name',name).eq('category_type',kind).maybeSingle();
  if(found.error)throw found.error;
  if(!found.data)throw Error('Kategorie nicht gefunden. Bitte aktualisieren.');
  return found.data.id;
 }
 if(error)throw error;
 return data.id;
}
$('editTxCancel').onclick=()=>$('editTxDialog').close();
$('editTxForm').onsubmit=e=>{e.preventDefault();run(async()=>{
 const tx=state.transactions.find(t=>t.id===editingTxId);
 if(!tx||tx.transaction_type==='transfer')throw Error('Diese Buchung kann nicht einzeln bearbeitet werden.');
 const x=getForm(e.target),amount=Number(x.amount);
 if(!(amount>0)||!Number.isFinite(amount))throw Error('Bitte einen gültigen Betrag eingeben.');
 const category_id=await resolveTxCategory(x.category,x.transaction_type);
 await update('transactions',editingTxId,{booked_on:x.booked_on,account_id:x.account_id,transaction_type:x.transaction_type,title:x.title,note:x.note||null,amount:signed(x.transaction_type,amount),category_id});
 $('editTxDialog').close();editingTxId=null;await load();message('Buchung aktualisiert.',true);
})};
['bookingsSearch','bookingsCategory','bookingsType','bookingsLimit','bookingsSort','bookingsFrom','bookingsTo'].forEach(id=>$(id).addEventListener('input',renderBookings));
function filteredTx(){let rows=state.transactions.slice();if($('filterPeriod').value==='selected')rows=rows.filter(t=>t.booked_on>=state.period.from&&t.booked_on<=state.period.to);if($('filterPeriod').value==='custom'){const from=$('filterFrom').value,to=$('filterTo').value;rows=rows.filter(t=>(!from||t.booked_on>=from)&&(!to||t.booked_on<=to));}const search=$('filterSearch').value.trim().toLowerCase(),cat=$('filterCategory').value.trim().toLowerCase(),type=$('filterType').value,amount=$('filterAmount').value;rows=rows.filter(t=>(!search||[t.title,t.note,categoryName(t.category_id),accountName(t.account_id)].join(' ').toLowerCase().includes(search))&&(!cat||categoryName(t.category_id).toLowerCase().includes(cat))&&(type==='all'||t.transaction_type===type)&&(amount==='all'||(amount==='under100'?Math.abs(Number(t.amount))<100:Math.abs(Number(t.amount))>=100)));const sort=$('filterSort').value;rows.sort((a,b)=>sort==='az'?a.title.localeCompare(b.title):sort==='za'?b.title.localeCompare(a.title):sort==='low'?Math.abs(Number(a.amount))-Math.abs(Number(b.amount)):sort==='high'?Math.abs(Number(b.amount))-Math.abs(Number(a.amount)):b.booked_on.localeCompare(a.booked_on));return rows}
function renderTx(){let rows=filteredTx();$('txCount').textContent=`${rows.length} Buchungen · Summe ${money(rows.reduce((s,t)=>s+Number(t.amount),0))}`;$('txTable').innerHTML=txHtml(rows);renderBookings()}
async function load(){let {data:spaces,error}=await client.from('finance_spaces').select('*').order('created_at');if(error)throw error;state.spaces=spaces||[];state.space=state.spaces.find(s=>s.kind==='private'&&s.created_by===state.session.user.id)||state.spaces[0];if(!state.space)throw Error('Kein Finanzbereich vorhanden. Bitte Supabase SQL-Einrichtung überprüfen.');const names=['accounts','categories','transactions','recurring','bills','notes'];let values=await Promise.all(names.map(name=>query(name)));names.forEach((n,i)=>state[n]=values[i]);try{await postDueFixedCosts()}catch(err){console.warn("Fixkosten-Abgleich fehlgeschlagen",err);message("Fixkosten konnten nicht automatisch abgeglichen werden: "+err.message)}render()}
async function init(){if(!window.supabase?.createClient){$('loginMsg').textContent='Supabase-Bibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen.';$('loginMsg').classList.remove('hidden');return}client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}});let {data:{session},error}=await client.auth.getSession();if(error)console.warn(error);if(session)await enter(session);client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){state.session=null;$('auth').classList.remove('hidden')}})}
async function enter(session){state.session=session;$('auth').classList.add('hidden');$('userLabel').textContent='Fabian';await load()}
$('loginForm').onsubmit=async e=>{e.preventDefault();let btn=e.target.querySelector('button');btn.disabled=true;$('loginMsg').classList.add('hidden');try{if(!client)throw Error('Supabase nicht verfügbar');const username=$('email').value.trim();
 if(!/^[a-zA-Z0-9_-]{2,40}$/.test(username))throw Error('Bitte einen gültigen Benutzernamen eingeben.');
 if(username.toLowerCase()!=='fabian')throw Error('Diese Finanz-App ist ausschließlich für Fabian freigegeben.');
 const {data:lookup,error:lookupError}=await client.rpc('app_login_email',{p_username:username});
 if(lookupError)throw Error('Benutzername-Anmeldung noch nicht eingerichtet. Bitte zuerst den SQL-Code in Supabase ausführen.');
 if(!lookup)throw Error('Benutzername oder Passwort nicht korrekt.');
 let {data,error}=await client.auth.signInWithPassword({email:lookup,password:$('password').value});if(error)throw error;await enter(data.session);$('password').value=''}catch(err){$('loginMsg').textContent='Anmeldung fehlgeschlagen: '+err.message;$('loginMsg').classList.remove('hidden')}finally{btn.disabled=false}};
// iOS Password AutoFill can emit an input/change event after Face ID.
// Auto-submit only when both fields were autofilled, never on normal typing.
let autofillAttempted=false;
function tryAutofillLogin(event){
 if(autofillAttempted||!$('auth')||$('auth').classList.contains('hidden'))return;
 const both=$('email').value.trim().length>0&&$('password').value.length>0;
 const replacement=event?.inputType==='insertReplacementText'||event?.inputType==='insertFromAutoFill';
 if(both&&replacement){autofillAttempted=true;document.activeElement?.blur();$('loginForm').requestSubmit();}
}
$('email').addEventListener('input',tryAutofillLogin);
$('password').addEventListener('input',tryAutofillLogin);
// Datenschutz: sofortige Sperre beim Wechsel in den Hintergrund.
// Sitzungen werden absichtlich nicht im Browser gespeichert.
let backgroundLock=false;
function lockFinanceView(){
 if(!state.session)return;
 backgroundLock=true;
 $('auth').classList.remove('hidden');
 $('password').value='';
 state.session=null;
 state.accounts=[];state.transactions=[];state.recurring=[];
 state.bills=[];state.notes=[];state.spaces=[];state.space=null;
 if(client)client.auth.signOut({scope:'local'}).catch(err=>console.warn('Abmeldung:',err));
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')lockFinanceView()});
window.addEventListener('pagehide',lockFinanceView);
$('logoutBtn').onclick=()=>run(async()=>{lockFinanceView();location.reload()});$('refreshBtn').onclick=()=>run(async()=>{await load();message('Daten aktualisiert.',true)});
document.querySelectorAll('#menu button').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;document.querySelectorAll('#menu button').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id===state.tab));$('pageTitle').textContent=b.textContent.replace(/^[^\p{L}]+/u,'').trim();window.scrollTo(0,0)});
['periodMode','periodMonth','salaryDay','periodFrom','periodTo'].forEach(id=>$(id).addEventListener('change',()=>{if(id==='periodFrom'||id==='periodTo')$('periodMode').value='custom';render()}));['filterSearch','filterCategory','filterType','filterAmount','filterSort','filterPeriod','filterFrom','filterTo'].forEach(id=>$(id).addEventListener('input',()=>{const custom=$('filterPeriod').value==='custom';$('filterFromWrap').classList.toggle('hidden',!custom);$('filterToWrap').classList.toggle('hidden',!custom);renderTx()}));
$('accountForm').onsubmit=e=>{e.preventDefault();run(async()=>{let x=getForm(e.target);x.opening_balance=Number(x.opening_balance);await insert('accounts',{...x,space_id:state.space.id});e.target.reset();e.target.elements.opening_date.value=today();await load();message('Konto angelegt.',true)})};
$('txForm').onsubmit=e=>{e.preventDefault();run(async()=>{let x=getForm(e.target);let category=x.category?.trim();delete x.category;let category_id=null;if(category){let type=x.transaction_type==='income'?'income':'expense';let existing=state.categories.find(c=>c.name.toLowerCase()===category.toLowerCase()&&c.category_type===type);if(existing)category_id=existing.id;else{
 // A category may already exist in Supabase even if the local list is stale.
 // Handle uniqueness conflicts by fetching the existing row, never by deleting it.
 let {data,error}=await client.from('finance_categories').insert({space_id:state.space.id,name:category,category_type:type}).select('id').single();
 if(error&&error.code==='23505'){
  const found=await client.from('finance_categories').select('id').eq('space_id',state.space.id).eq('name',category).eq('category_type',type).maybeSingle();
  if(found.error)throw found.error;
  if(!found.data)throw Error('Kategorie existiert bereits, konnte aber nicht gelesen werden. Bitte aktualisieren.');
  category_id=found.data.id;
 }else if(error)throw error;
 else category_id=data.id;
 }}let {amount,...rest}=x;await insert('transactions',{...rest,amount:signed(x.transaction_type,amount),category_id,space_id:state.space.id});e.target.reset();e.target.elements.booked_on.value=today();await load();message('Buchung gespeichert.',true)})};
$('transferForm').onsubmit=e=>{e.preventDefault();run(async()=>{let x=getForm(e.target);if(x.from===x.to)throw Error('Bitte zwei unterschiedliche Konten wählen.');let group=crypto.randomUUID(),amt=Number(x.amount);await insert('transactions',[{space_id:state.space.id,account_id:x.from,booked_on:x.date,title:x.title,amount:-amt,transaction_type:'transfer',transfer_group:group},{space_id:state.space.id,account_id:x.to,booked_on:x.date,title:x.title,amount:amt,transaction_type:'transfer',transfer_group:group}]);e.target.reset();e.target.elements.date.value=today();await load();message('Umbuchung erfasst.',true)})};
function resetRecurringForm(){editingRecurringId=null;$('recForm').reset();$('recForm').elements.starts_on.value=today();$('recSaveBtn').textContent='Regelmäßige Zahlung speichern';$('recCancelBtn').classList.add('hidden')}
$('recCancelBtn').onclick=resetRecurringForm;
$('recForm').onsubmit=e=>{e.preventDefault();run(async()=>{let x=getForm(e.target);x.amount=Number(x.amount);x.due_day=Number(x.due_day);x.latest_due_day=x.latest_due_day?Number(x.latest_due_day):null;x.ends_on=x.ends_on||null;if(editingRecurringId)await update('recurring',editingRecurringId,x);else await insert('recurring',{...x,space_id:state.space.id});resetRecurringForm();await load();message('Regelmäßige Zahlung gespeichert.',true)})};
$('bookingCancel').onclick=()=>$('bookingDialog').close();
$('bookingForm').onsubmit=e=>{e.preventDefault();run(async()=>{if(!bookingTarget)throw Error('Keine geplante Zahlung ausgewählt.');let {id,due}=bookingTarget,r=state.recurring.find(x=>x.id===id);if(!r)throw Error('Zahlung nicht gefunden.');if(confirmed(r,due))throw Error('Diese Zahlung wurde bereits bestätigt.');let x=getForm(e.target),amount=Number(x.amount);if(!(amount>0))throw Error('Bitte gültigen Betrag eingeben.');await insert('transactions',{space_id:state.space.id,account_id:x.account_id,booked_on:x.booked_on,title:r.title,amount:signed(r.entry_type,amount),transaction_type:r.entry_type,import_reference:recurringReference(r,due)});$('bookingDialog').close();bookingTarget=null;await load();message('Tatsächliche Zahlung gebucht.',true)})};
$('billForm').onsubmit=e=>{e.preventDefault();run(async()=>{let x=getForm(e.target);x.amount=Number(x.amount);x.due_on=x.due_on||null;await insert('bills',{...x,space_id:state.space.id});e.target.reset();await load();message('Rechnung gespeichert.',true)})};
$('noteForm').onsubmit=e=>{e.preventDefault();run(async()=>{await insert('notes',{...getForm(e.target),space_id:state.space.id});e.target.reset();await load();message('Notiz gespeichert.',true)})};
document.addEventListener('click',e=>{let b=e.target.closest('button');if(!b)return;if(b.dataset.delete)run(()=>remove(b.dataset.delete,b.dataset.id));if(b.dataset.editTx){
 const tx=state.transactions.find(t=>t.id===b.dataset.editTx);if(!tx)return;
 if(tx.transaction_type==='transfer')return message('Umbuchungen bestehen aus zwei Buchungen und können nicht einzeln bearbeitet werden.');
 editingTxId=tx.id;const f=$('editTxForm');
 f.elements.booked_on.value=tx.booked_on;f.elements.account_id.value=tx.account_id;
 f.elements.transaction_type.value=tx.transaction_type;f.elements.title.value=tx.title;
 f.elements.category.value=categoryName(tx.category_id);f.elements.amount.value=Math.abs(Number(tx.amount));f.elements.note.value=tx.note||'';
 $('editTxDialog').showModal();
}if(b.dataset.payBill)run(async()=>{await update('bills',b.dataset.payBill,{status:'paid',paid_on:today()});await load();message('Rechnung als bezahlt markiert. Kontobuchung ggf. separat erfassen.',true)});
if(b.dataset.editRec){let r=state.recurring.find(x=>x.id===b.dataset.editRec);if(!r)return;editingRecurringId=r.id;for(let [k,v] of Object.entries(r)){let el=$('recForm').elements.namedItem(k);if(el)el.value=v??'';}$('recSaveBtn').textContent='Änderungen speichern';$('recCancelBtn').classList.remove('hidden');$('recForm').scrollIntoView({behavior:'smooth',block:'start'})}
if(b.dataset.toggleRec)run(async()=>{let r=state.recurring.find(x=>x.id===b.dataset.toggleRec);await update('recurring',r.id,{active:!r.active});await load();message(r.active?'Zahlung pausiert.':'Zahlung aktiviert.',true)});
if(b.dataset.deleteRec)run(async()=>{if(!confirm('Regelmäßige Zahlung wirklich löschen? Bereits gebuchte Umsätze bleiben bestehen.'))return;let {error}=await client.from('finance_recurring').delete().eq('id',b.dataset.deleteRec).eq('space_id',state.space.id);if(error)throw error;if(editingRecurringId===b.dataset.deleteRec)resetRecurringForm();await load();message('Regelmäßige Zahlung gelöscht. Bereits gebuchte Umsätze bleiben bestehen.',true)});
if(b.dataset.bookRec){let r=state.recurring.find(x=>x.id===b.dataset.bookRec),date=b.dataset.date;if(!r?.account_id)return showError(Error('Bitte bei der regelmäßigen Zahlung ein Konto hinterlegen.'));if(confirmed(r,date))return showError(Error('Diese Zahlung wurde bereits gebucht.'));bookingTarget={id:r.id,due:date};$('bookingTitle').textContent=r.title+' · geplant für '+dateLabel(date);let f=$('bookingForm');f.elements.booked_on.value=date;f.elements.amount.value=Number(r.amount);f.elements.account_id.value=r.account_id;$('bookingDialog').showModal()}
});
function download(name,content,type){let blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$('csvBtn').onclick=()=>{let rows=filteredTx();let csv=[['Datum','Bezeichnung','Kategorie','Konto','Art','Betrag','Notiz'],...rows.map(t=>[t.booked_on,t.title,categoryName(t.category_id),accountName(t.account_id),t.transaction_type,Number(t.amount).toFixed(2).replace('.',','),t.note||''])].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');download('finanzen-buchungen.csv','\ufeff'+csv,'text/csv;charset=utf-8')};
$('printBtn').onclick=()=>{const old=state.tab;document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id==='analysis'));window.print();document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id===old))};$('printOverview').onclick=()=>{document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id==='dashboard'));window.print()};
$('backupBtn').onclick=()=>{let obj={exported_at:new Date().toISOString(),space:state.space,accounts:state.accounts,categories:state.categories,transactions:state.transactions,recurring:state.recurring,bills:state.bills,notes:state.notes};download('meine-finanzen-backup-'+today()+'.json',JSON.stringify(obj,null,2),'application/json')};
$('importBtn').onclick=()=>$('csvFile').click();
$('csvFile').onchange=e=>run(async()=>{let file=e.target.files[0];if(!file)return;let txt=await file.text();let lines=txt.replace(/^\ufeff/,'').trim().split(/\r?\n/);let delimiter=(lines[0].match(/;/g)||[]).length>=(lines[0].match(/,/g)||[]).length?';':',';function parse(line){let out=[],v='',quote=false;for(let i=0;i<line.length;i++){let c=line[i];if(c==='"'){if(quote&&line[i+1]==='"'){v+='"';i++}else quote=!quote}else if(c===delimiter&&!quote){out.push(v);v=''}else v+=c}out.push(v);return out}let head=parse(lines.shift()).map(x=>x.toLowerCase().trim());let idx=(...names)=>names.map(n=>head.indexOf(n)).find(n=>n>=0)??-1;let dateI=idx('datum','date','buchungstag'),titleI=idx('bezeichnung','verwendungszweck','beschreibung','name'),amountI=idx('betrag','amount','umsatz');if([dateI,titleI,amountI].some(i=>i<0))throw Error('CSV benötigt Spalten Datum, Bezeichnung und Betrag.');let account=state.accounts.find(a=>a.account_type==='checking')||state.accounts[0];if(!account)throw Error('Bitte zuerst ein Konto anlegen.');let rows=[];for(let line of lines){if(!line.trim())continue;let p=parse(line),raw=p[dateI],date=/^\d{2}\.\d{2}\.\d{4}$/.test(raw)?raw.split('.').reverse().join('-'):raw;let amt=Number(String(p[amountI]).replace(/\s|€/g,'').replace(/\.(?=\d{3}(?:,|$))/g,'').replace(',','.'));if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(amt)||amt===0)continue;rows.push({space_id:state.space.id,account_id:account.id,booked_on:date,title:p[titleI]||'Import',amount:amt,transaction_type:amt>0?'income':'expense',import_reference:'csv:'+date+':'+(p[titleI]||'')+':'+amt+':'+rows.length})}if(!rows.length)throw Error('Keine gültigen Buchungen erkannt.');if(!confirm(`${rows.length} Buchungen in ${account.name} importieren? Bitte Dubletten vorher prüfen.`))return;await insert('transactions',rows);await load();message(`${rows.length} Buchungen importiert.`,true);e.target.value='' });
$('periodMonth').value=today().slice(0,7);$('periodFrom').value=today();$('periodTo').value=today();document.querySelectorAll('input[type=date][name]').forEach(el=>{if(['booked_on','date','opening_date','starts_on'].includes(el.name))el.value=today()});
init().catch(err=>{$('loginMsg').textContent=err.message;$('loginMsg').classList.remove('hidden')});


// Additional features use structured records in the existing private finance_notes table.
// No new SQL schema and no browser-only financial storage are required.
const EXTRA_PREFIX='__finance_v2__';
const extraRecords=(kind)=>state.notes.filter(n=>n.title===EXTRA_PREFIX+kind).map(n=>{try{return {...JSON.parse(n.body),id:n.id}}catch{return null}}).filter(Boolean);
const monthTx=m=>state.transactions.filter(t=>t.booked_on?.startsWith(m)&&t.transaction_type!=='transfer');
const txCategory=t=>categoryName(t.category_id)||'Sonstiges';
const sumBy=(rows,pred)=>rows.filter(pred).reduce((s,t)=>s+Math.abs(Number(t.amount)),0);
function progress(n,max){let pct=max>0?Math.min(100,Math.max(0,n/max*100)):0;return `<div class="finance-progress"><i class="${n>max?'over':''}" style="width:${pct}%"></i></div>`}
function renderExtras(){
 for(const id of ['calendarMonth','statsMonth','budgetMonth'])if(!$(id).value)$(id).value=today().slice(0,7);
 renderCalendar();renderStatistics();renderBudgets();renderGoals();
}
function renderCalendar(){const m=$('calendarMonth').value;if(!/^\d{4}-\d{2}$/.test(m))return;const [y,mo]=m.split('-').map(Number);const days=new Date(y,mo,0).getDate(),start=(new Date(y,mo-1,1).getDay()+6)%7;const from=m+'-01',to=day(y,mo,31);const booked=state.transactions.filter(t=>t.booked_on>=from&&t.booked_on<=to);const plans=state.recurring.flatMap(r=>dueOccurrences(r,from,to));const bills=state.bills.filter(b=>b.due_on>=from&&b.due_on<=to&&b.status!=='paid');let html=['Mo','Di','Mi','Do','Fr','Sa','So'].map(x=>`<div class="finance-day-head">${x}</div>`).join('');for(let i=0;i<start;i++)html+='<div class="finance-day empty"></div>';for(let d=1;d<=days;d++){const date=day(y,mo,d);const tx=booked.filter(t=>t.booked_on===date),due=plans.filter(r=>r.due===date),bill=bills.filter(b=>b.due_on===date);const total=tx.reduce((s,t)=>s+Number(t.amount),0);html+=`<button type="button" class="finance-day ${tx.length+due.length+bill.length?'has-events':''} ${date===today()?'today':''}" data-fin-day="${date}"><b>${d}</b>${tx.length?`<small>${esc(money(total))}</small>`:''}${due.length?`<small>◷ ${due.length} geplant</small>`:''}${bill.length?`<small>▤ ${bill.length} Rechnung</small>`:''}</button>`} $('calendarGrid').innerHTML=html;
 const selected=$('calendarGrid').dataset.selected||today();const date=selected.startsWith(m)?selected:from;const tx=booked.filter(t=>t.booked_on===date),due=plans.filter(r=>r.due===date),bill=bills.filter(b=>b.due_on===date);$('calendarDetails').innerHTML=`<h3>${dateLabel(date)}</h3>`+(tx.map(t=>`<div class="finance-item">${esc(t.title)} · <b>${money(t.amount)}</b> <small>Gebucht</small></div>`).join('')+due.map(r=>`<div class="finance-item">${esc(r.title)} · <b>${money(signed(r.entry_type,r.amount))}</b> <small>${confirmed(r,r.due)?'Gebucht':'Geplant'}</small></div>`).join('')+bill.map(b=>`<div class="finance-item">${esc(b.title)} · <b>${money(b.amount)}</b> <small>Rechnung offen</small></div>`).join('')||'<p class="muted">Keine Einträge an diesem Tag.</p>');
}
function renderStatistics(){const m=$('statsMonth').value,rows=monthTx(m);$('statsIncome').textContent=money(sumBy(rows,t=>Number(t.amount)>0));$('statsExpense').textContent=money(sumBy(rows,t=>Number(t.amount)<0));let sums={};rows.filter(t=>Number(t.amount)<0).forEach(t=>{const c=txCategory(t);sums[c]=(sums[c]||0)+Math.abs(Number(t.amount))});const entries=Object.entries(sums).sort((a,b)=>b[1]-a[1]);const max=entries[0]?.[1]||1;
 const palette=['#2879c5','#25a36c','#ef8243','#9a65df','#f3bb38','#81959d'];
 const grand=entries.reduce((s,e)=>s+e[1],0);
 let acc=0;
 const slices=entries.map((e,i)=>{const start=acc;acc+=e[1]/grand*100;return `${palette[i%palette.length]} ${start.toFixed(2)}% ${acc.toFixed(2)}%`});
 $('statsDonut').style.background=grand>0?`conic-gradient(${slices.join(',')})`:'conic-gradient(#dfe8e2 0 100%)';
 $('statsDonutAmount').textContent=money(grand);
 $('statsCategories').innerHTML=entries.map(([name,n])=>`<div class="finance-item"><div class="finance-item-head"><b>${esc(name)}</b><span>${money(n)}</span></div>${progress(n,max)}</div>`).join('')||'<p class="muted">Für diesen Monat gibt es noch keine Ausgaben.</p>';const [year,month]=m.split('-').map(Number);let trends=[];for(let i=5;i>=0;i--){const d=new Date(year,month-1-i,1);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;const r=monthTx(key);trends.push({label:d.toLocaleDateString('de-DE',{month:'short',year:'2-digit'}),inc:sumBy(r,t=>Number(t.amount)>0),out:sumBy(r,t=>Number(t.amount)<0)})}const top=Math.max(1,...trends.flatMap(t=>[t.inc,t.out]));$('statsTrend').innerHTML=trends.map(t=>`<div class="finance-chart-row"><b>${esc(t.label)}</b><div class="finance-chart-bars"><div title="Einnahmen ${money(t.inc)}" style="width:${t.inc/top*100}%"></div><div class="out" title="Ausgaben ${money(t.out)}" style="width:${t.out/top*100}%"></div><small>+ ${money(t.inc)} / − ${money(t.out)}</small></div></div>`).join('')+'<small>Grün: Einnahmen · Orange: Ausgaben</small>'}
function renderBudgets(){const rows=monthTx($('budgetMonth').value);$('budgetList').innerHTML=extraRecords('budget').map(b=>{const spent=sumBy(rows,t=>Number(t.amount)<0&&txCategory(t).toLocaleLowerCase('de')===String(b.category).toLocaleLowerCase('de'));return `<div class="finance-item"><div class="finance-item-head"><b>${esc(b.category)}</b><span>${money(spent)} / ${money(b.limit)}</span></div>${progress(spent,Number(b.limit))}<small>${spent>Number(b.limit)?'Budget überschritten':'Noch frei: '+money(Number(b.limit)-spent)}</small><div class="actions"><button class="danger" data-extra-delete="${esc(b.id)}">Entfernen</button></div></div>`}).join('')||'<p class="muted">Noch keine Budgets angelegt.</p>'}
function renderGoals(){$('goalList').innerHTML=extraRecords('goal').map(g=>`<div class="finance-item"><div class="finance-item-head"><b>${esc(g.title)}</b><span>${money(g.saved)} / ${money(g.target)}</span></div>${progress(Number(g.saved),Number(g.target))}<small>${Math.round(Math.min(100,Number(g.saved)/Number(g.target)*100))}% erreicht</small><div class="actions"><button data-goal-add="${esc(g.id)}">Betrag hinzufügen</button><button class="danger" data-extra-delete="${esc(g.id)}">Entfernen</button></div></div>`).join('')||'<p class="muted">Noch keine Sparziele angelegt.</p>'}
for(const id of ['calendarMonth','statsMonth','budgetMonth'])$(id).addEventListener('change',renderExtras);
$('calendarGrid').addEventListener('click',e=>{const b=e.target.closest('[data-fin-day]');if(b){$('calendarGrid').dataset.selected=b.dataset.finDay;renderCalendar()}});
$('budgetForm').addEventListener('submit',e=>{e.preventDefault();run(async()=>{const f=getForm(e.target);if(extraRecords('budget').some(b=>b.category.toLowerCase()===f.category.trim().toLowerCase()))throw Error('Für diese Kategorie gibt es bereits ein Budget. Bitte erst das alte entfernen.');await insert('notes',{title:EXTRA_PREFIX+'budget',body:JSON.stringify({category:f.category.trim(),limit:Number(f.limit)}),space_id:state.space.id});e.target.reset();await load();message('Budget gespeichert.',true)})});
$('goalForm').addEventListener('submit',e=>{e.preventDefault();run(async()=>{const f=getForm(e.target);await insert('notes',{title:EXTRA_PREFIX+'goal',body:JSON.stringify({title:f.title.trim(),target:Number(f.target),saved:Number(f.saved)}),space_id:state.space.id});e.target.reset();await load();message('Sparziel gespeichert.',true)})});
document.addEventListener('click',e=>{const del=e.target.closest('[data-extra-delete]');if(del){run(async()=>{if(!confirm('Diesen Eintrag wirklich entfernen?'))return;const {error}=await client.from('finance_notes').delete().eq('id',del.dataset.extraDelete).eq('space_id',state.space.id);if(error)throw error;await load()})}const add=e.target.closest('[data-goal-add]');if(add){run(async()=>{const g=extraRecords('goal').find(g=>String(g.id)===add.dataset.goalAdd);if(!g)return;const raw=prompt('Wie viel Euro zum Sparziel hinzufügen?','50');if(raw===null)return;const amount=Number(raw.replace(',','.'));if(!Number.isFinite(amount)||amount<=0)throw Error('Bitte einen gültigen positiven Betrag eingeben.');await update('notes',g.id,{body:JSON.stringify({title:g.title,target:g.target,saved:Number(g.saved)+amount})});await load();message('Sparziel aktualisiert. Kontostände bleiben unverändert.',true)})}});

for(const [id,delta] of [['calendarPrev',-1],['calendarNext',1]]){
 document.getElementById(id).addEventListener('click',()=>{
  const el=document.getElementById('calendarMonth');
  const value=el.value||today().slice(0,7);
  const [y,m]=value.split('-').map(Number);
  const d=new Date(y,m-1+delta,1);
  el.value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  renderExtras();
 });
}

// Dashboard: open, not yet confirmed recurring expenses. Read-only, no automatic bookings.
function pendingDashboardItems(now,until){
 return state.recurring.filter(r=>r.entry_type==='expense').flatMap(r=>dueOccurrences(r,now,until))
  .filter(r=>!confirmed(r,r.due)).sort((a,b)=>a.due.localeCompare(b.due));
}
function renderPendingDashboard(now,until){
 const rows=pendingDashboardItems(now,until);
 const total=rows.reduce((sum,r)=>sum+Number(r.amount||0),0);
 const all=state.recurring.filter(r=>r.entry_type==='expense').flatMap(r=>dueOccurrences(r,now,until));
 const paid=all.length-rows.length;
 const ratio=all.length?Math.max(0,Math.min(100,Math.round(paid/all.length*100))):100;
 $('mPendingCount').textContent=rows.length+' offen';
 $('mPendingAmount').textContent=money(total)+' noch geplant';
 $('pendingDonut').style.background=`conic-gradient(#16815f 0% ${ratio}%,#dce9df ${ratio}% 100%)`;
 $('pendingDonutText').textContent=ratio+'%';
 $('pendingDetailsInfo').textContent='Offene geplante Ausgaben von '+dateLabel(now)+' bis '+dateLabel(until)+' · '+money(total)+' insgesamt. Der Kontostand wird dadurch nicht verändert.';
 $('pendingDetailsList').innerHTML=rows.length?rows.map(r=>`<div class="pending-row"><div><b>${esc(r.title)}</b><small>${dateLabel(r.due)} · ${esc(accountName(r.account_id))}</small></div><strong class="negative">${money(-Math.abs(Number(r.amount)))}</strong></div>`).join(''):'<p class="positive">Keine offenen Fixkosten in diesem Zeitraum.</p>';
}
$('pendingMetric').addEventListener('click',()=>{const panel=$('pendingDetails');panel.hidden=!panel.hidden;if(!panel.hidden)panel.scrollIntoView({behavior:'smooth',block:'nearest'})});
$('pendingClose').addEventListener('click',()=>{$('pendingDetails').hidden=true});
$('pendingManage').addEventListener('click',()=>{const btn=document.querySelector('#menu button[data-tab="recurring"]');if(btn)btn.click()});
