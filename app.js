/* ======================================================
   Planning LBM1-S1 — logique de l'application
   ====================================================== */

const WEEKS = window.SCHEDULE; // [{dates:[5], days:{date:{day_name, events[]}}}, ...]

function classify(text){
  const t = text.toUpperCase();
  if (t.includes('UL1SV001')) return 'bio';
  if (t.includes('UL1CI001')) return 'chimie';
  if (t.includes('UL1MA011')) return 'maths';
  if (t.includes('UL1SXMT1')) return 'modele';
  if (t.includes('UL1SXMT0')) return 'stats';
  if (t.includes('UL1IN001')) return 'info';
  if (t.includes('FÉRIÉ') || t.includes('FERIE')) return 'ferie';
  if (t.includes('VACANCES')) return 'vacances';
  if (t.includes('EXAMEN')) return 'examen';
  if (t.includes('ARRÊT') || t.includes('ARRET')) return 'arret';
  return 'autre';
}

function todayStr(){
  const d = new Date();
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function fmtDateLabel(dstr){
  if(!dstr) return '';
  const [y,m,d] = dstr.split('-').map(Number);
  const dt = new Date(y, m-1, d);
  return dt.toLocaleDateString('fr-FR', { day:'2-digit', month:'short' });
}

function isoWeekNumber(dstr){
  const [y,m,d] = dstr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m-1, d));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(),0,4));
  const diff = (date - firstThursday) / 86400000;
  return 1 + Math.round(diff/7);
}

let currentWeek = 0;

function findWeekIndexContaining(dateStr){
  return WEEKS.findIndex(w => w.dates.includes(dateStr));
}

function findDefaultWeek(){
  const t = todayStr();
  let idx = findWeekIndexContaining(t);
  if (idx !== -1) return idx;
  for (let i=0;i<WEEKS.length;i++){
    const validDates = WEEKS[i].dates.filter(Boolean);
    if (validDates.length && validDates[validDates.length-1] >= t) return i;
  }
  return 0;
}

function renderEvent(ev){
  const type = ev.type || classify(ev.text);
  const lines = ev.lines && ev.lines.length ? ev.lines : ev.text.split('\n').map(s=>s.trim()).filter(Boolean);
  const code = lines[0] || '';
  const title = lines.length > 1 ? lines[1] : '';
  const prof = lines.length > 2 ? lines.slice(2).join(' ') : '';
  const hasCode = /^UL1/.test(code);

  const wrap = document.createElement('div');
  wrap.className = `event-row tag-${type}`;
  wrap.innerHTML = `
    <div class="event-time">${ev.start}<b>${ev.end}</b></div>
    <div class="event-tab"></div>
    <div class="event-main">
      ${hasCode ? `<span class="event-code">${code}</span>` : ''}
      <div class="event-title">${hasCode ? (title || code) : code}</div>
      ${prof ? `<div class="event-prof">${prof}</div>` : ''}
    </div>
  `;
  return wrap;
}

function renderWeek(idx){
  currentWeek = Math.max(0, Math.min(WEEKS.length-1, idx));
  const week = WEEKS[currentWeek];
  const container = document.getElementById('days-container');
  container.innerHTML = '';

  const validDates = week.dates.filter(Boolean);
  document.getElementById('week-range').textContent =
    `${fmtDateLabel(validDates[0])} — ${fmtDateLabel(validDates[validDates.length-1])}`;
  document.getElementById('week-number').textContent =
    `Semaine ${isoWeekNumber(validDates[0])} · ${new Date(validDates[0]).getFullYear()}`;

  const t = todayStr();

  week.dates.forEach(dateStr => {
    if (!dateStr) return;
    const dayInfo = week.days[dateStr];
    const card = document.createElement('section');
    card.className = 'day-card';
    if (dateStr === t) { card.classList.add('is-today'); card.id = 'today-card'; }
    if (!dayInfo || !dayInfo.events.length) card.classList.add('is-empty');

    const dayName = dayInfo ? dayInfo.day_name : new Date(dateStr).toLocaleDateString('fr-FR', {weekday:'long'});

    const head = document.createElement('div');
    head.className = 'day-head';
    head.innerHTML = `
      <span class="day-name">${dayName}</span>
      <span class="day-date">${fmtDateLabel(dateStr)}</span>
      ${dateStr === t ? '<span class="today-tag">Aujourd\'hui</span>' : ''}
    `;
    card.appendChild(head);

    const body = document.createElement('div');
    body.className = 'day-body';
    if (dayInfo && dayInfo.events.length){
      dayInfo.events.forEach(ev => body.appendChild(renderEvent(ev)));
    } else {
      body.innerHTML = `<div class="no-class">Aucun cours prévu</div>`;
    }
    card.appendChild(body);
    container.appendChild(card);
  });

  document.getElementById('prev-week').disabled = currentWeek === 0;
  document.getElementById('next-week').disabled = currentWeek === WEEKS.length - 1;
}

document.getElementById('prev-week').addEventListener('click', () => renderWeek(currentWeek - 1));
document.getElementById('next-week').addEventListener('click', () => renderWeek(currentWeek + 1));
document.getElementById('today-jump').addEventListener('click', () => {
  const idx = findWeekIndexContaining(todayStr());
  if (idx === -1){
    showToast("Pas de cours aujourd'hui dans le planning — direction la semaine la plus proche.");
    renderWeek(findDefaultWeek());
  } else {
    renderWeek(idx);
    setTimeout(() => {
      const el = document.getElementById('today-card');
      if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
    }, 60);
  }
});

function showToast(msg, ms=3200){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.hidden = true; }, ms);
}

renderWeek(findDefaultWeek());

/* ======================================================
   Rappels / notifications
   ====================================================== */
const remindBtn = document.getElementById('remind-btn');
const REMINDER_KEY = 'planning-reminders-enabled';
const LAST_ANNOUNCE_KEY = 'planning-last-announced';

function remindersEnabled(){ return localStorage.getItem(REMINDER_KEY) === '1'; }

function updateRemindBtn(){
  if (remindersEnabled() && Notification.permission === 'granted'){
    remindBtn.textContent = '🔔 Rappels activés';
    remindBtn.classList.add('active');
  } else {
    remindBtn.textContent = '🔔 Activer les rappels';
    remindBtn.classList.remove('active');
  }
}

function todaysEvents(){
  const t = todayStr();
  const idx = findWeekIndexContaining(t);
  if (idx === -1) return null;
  const day = WEEKS[idx].days[t];
  return day ? day.events : [];
}

async function announceToday(force){
  if (!remindersEnabled() || Notification.permission !== 'granted') return;
  const t = todayStr();
  if (!force && localStorage.getItem(LAST_ANNOUNCE_KEY) === t) return;
  const events = todaysEvents();
  if (events === null) return;
  localStorage.setItem(LAST_ANNOUNCE_KEY, t);
  let title, body;
  if (!events.length){
    title = "Aucun cours aujourd'hui";
    body = "Le planning LBM1-S1 ne prévoit rien pour aujourd'hui. Bonne journée !";
  } else {
    title = `📚 ${events.length} cours aujourd'hui`;
    body = events.map(e => `${e.start} — ${(e.text.split('\n')[1] || e.text.split('\n')[0]).trim()}`).join('\n');
  }
  if ('serviceWorker' in navigator){
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'daily-schedule' });
  } else {
    new Notification(title, { body, icon: 'icons/icon-192.png' });
  }
}

function scheduleTodayEventReminders(){
  // Best-effort: only fires while this tab stays open in the browser.
  if (!remindersEnabled() || Notification.permission !== 'granted') return;
  const events = todaysEvents();
  if (!events) return;
  const now = new Date();
  events.forEach(ev => {
    const [h,m] = ev.start.split(':').map(Number);
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    const fireAt = target.getTime() - 15*60000; // 15 min before
    const delay = fireAt - now.getTime();
    if (delay > 0 && delay < 24*3600*1000){
      setTimeout(async () => {
        const title = '⏰ Cours dans 15 min';
        const body = (ev.text.split('\n')[1] || ev.text.split('\n')[0]).trim();
        if ('serviceWorker' in navigator){
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification(title, { body, icon:'icons/icon-192.png' });
        } else {
          new Notification(title, { body });
        }
      }, delay);
    }
  });
}

async function tryPeriodicSync(){
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  if ('periodicSync' in reg){
    try{
      const status = await navigator.permissions.query({ name:'periodic-background-sync' });
      if (status.state === 'granted'){
        await reg.periodicSync.register('daily-schedule-check', { minInterval: 24*60*60*1000 });
      }
    } catch(e){ /* not supported on this browser — silent fallback */ }
  }
}

remindBtn.addEventListener('click', async () => {
  if (!('Notification' in window)){
    showToast("Ton navigateur ne supporte pas les notifications.");
    return;
  }
  if (remindersEnabled()){
    localStorage.setItem(REMINDER_KEY, '0');
    updateRemindBtn();
    showToast('Rappels désactivés.');
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm === 'granted'){
    localStorage.setItem(REMINDER_KEY, '1');
    updateRemindBtn();
    showToast('Rappels activés — ouvre l\'appli chaque jour pour recevoir le résumé.');
    announceToday(true);
    scheduleTodayEventReminders();
    tryPeriodicSync();
  } else {
    showToast('Permission refusée — les rappels resteront désactivés.');
  }
});

updateRemindBtn();
if (remindersEnabled() && Notification.permission === 'granted'){
  announceToday(false);
  scheduleTodayEventReminders();
  tryPeriodicSync();
}

/* Re-check when the app regains focus (covers the "open once a day" case) */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible'){
    announceToday(false);
  }
});

/* ======================================================
   Service worker
   ====================================================== */
if ('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  });
}
