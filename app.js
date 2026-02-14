// =================================================================
// GESTOR VALENTE - LÓGICA 2.0 (DARK MODE EDITION)
// =================================================================

// 1. CONFIGURAÇÃO SUPABASE
// -----------------------------------------------------------------
const SUPABASE_URL = 'https://aqxccienrpqhwdqzusnh.supabase.co'; 
// !!! COLOQUE SUA CHAVE ANON AQUI !!!
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeGNjaWVucnBxaHdkcXp1c25oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NDQ1MzgsImV4cCI6MjA4NjUyMDUzOH0.lV1TniRFOO3vSYc8Qze9ksNBSl7B7IXXyQNyvMWDWuE'; 

const { createClient } = supabase;
let sb, user = null;

// Configuração Global do Chart.js para Dark Mode
Chart.defaults.color = '#94a3b8'; // Slate 400 (Texto)
Chart.defaults.borderColor = '#334155'; // Slate 700 (Linhas)

try {
    sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
    });
} catch (error) {
    console.error("Erro Crítico: Supabase falhou.", error);
}

// 2. ESTADO GLOBAL
let allCidadaos = [], allDemandas = [], allLeaders = [];
const CITADAOS_PER_PAGE = 12;
let currentCidadaosOffset = 0;
let currentFilteredCidadaos = [];
let currentEditingId = null;
let viewingDemandaId = null;
let itemToDelete = { id: null, type: null };
let map = null, markers = [], charts = {};
let appInitialized = false;

// 3. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    initAuthListener();
    setupBasicEvents();
});

function initAuthListener() {
    sb.auth.onAuthStateChange((event, session) => {
        if (session) {
            user = session.user;
            toggleLoginScreen(false);
            if (!appInitialized) initMainSystem();
        } else {
            user = null;
            toggleLoginScreen(true);
            appInitialized = false;
        }
    });
}

function toggleLoginScreen(show) {
    const pLogin = document.getElementById('login-page');
    const pApp = document.getElementById('app-container');
    if (show) {
        if(pLogin) pLogin.classList.remove('hidden');
        if(pApp) pApp.classList.add('hidden');
    } else {
        if(pLogin) pLogin.classList.add('hidden');
        if(pApp) { pApp.classList.remove('hidden'); pApp.classList.add('flex'); }
    }
}

async function initMainSystem() {
    if (appInitialized) return;
    await new Promise(r => setTimeout(r, 100)); // Delay para garantir DOM
    setupSystemEvents();
    await loadDataFromSupabase();
    switchPage('dashboard-page');
    appInitialized = true;
}

// 4. DADOS
async function loadDataFromSupabase() {
    if (!user) return;
    try {
        // Cidadãos
        const { data: cData, error: cErr } = await sb.from('cidadaos').select('*');
        if (cErr) throw cErr;
        
        allCidadaos = (cData || []).map(c => ({
            ...c,
            name: c.name || c.nome || 'Sem Nome',
            type: c.type || 'Eleitor',
            bairro: c.bairro || 'N/A'
        })).sort((a, b) => a.name.localeCompare(b.name));

        // Demandas
        const { data: dData } = await sb.from('demandas').select('*').order('created_at', {ascending: false});
        allDemandas = (dData || []).map(d => ({
            ...d,
            title: d.title || 'Sem Título',
            status: d.status || 'pending'
        }));

        allLeaders = allCidadaos.filter(c => c.type === 'Liderança');
        updateAllUIs();
    } catch (e) {
        showToast("Erro de dados: " + e.message, 'error');
    }
}

function updateAllUIs() {
    updateDashboard();
    renderCidadaos();
    renderDemandasList();
    fillSelects();
}

// 5. EVENTOS (PROTEGIDOS)
function getEl(id) { return document.getElementById(id); }

function setupBasicEvents() {
    const form = getEl('login-form');
    if (form) form.onsubmit = handleLogin;
}

function setupSystemEvents() {
    // Nav
    const btnLogout = getEl('logout-btn');
    if(btnLogout) btnLogout.onclick = async () => { await sb.auth.signOut(); window.location.reload(); };
    
    const nav = getEl('sidebar-nav');
    if(nav) nav.onclick = (e) => {
        const a = e.target.closest('a');
        if(a) { e.preventDefault(); switchPage(a.getAttribute('href').substring(1) + '-page'); }
    };

    // Filtros Cidadão
    const sInput = getEl('search-input'); if(sInput) sInput.oninput = renderCidadaos;
    ['f-tipo', 'f-bairro', 'f-sexo'].forEach(id => { const el = getEl(id); if(el) el.onchange = renderCidadaos; });
    const btnClean = getEl('btn-limpar-filtros'); if(btnClean) btnClean.onclick = clearFilters;

    // Ações Cidadão
    const btnNewC = getEl('btn-novo-cidadao'); if(btnNewC) btnNewC.onclick = () => openCidadaoModal();
    const btnMapC = getEl('btn-mapa-geral'); if(btnMapC) btnMapC.onclick = () => openMap();
    const btnLoad = getEl('btn-load-more'); if(btnLoad) btnLoad.onclick = renderMoreCidadaos;
    const formC = getEl('form-cidadao'); if(formC) formC.onsubmit = handleCidadaoSave;
    
    // Dinamicos
    const cep = getEl('c-cep'); if(cep) cep.onblur = fetchAddress;
    const sons = getEl('c-sons'); if(sons) sons.oninput = () => updateKids('filho');
    const daut = getEl('c-daughters'); if(daut) daut.oninput = () => updateKids('filha');

    // Demandas
    const btnNewD = getEl('btn-nova-demanda-geral'); if(btnNewD) btnNewD.onclick = () => openDemandaModal();
    const formD = getEl('form-demanda'); if(formD) formD.onsubmit = handleDemandaSave;
    ['df-status', 'df-lider'].forEach(id => { const el = getEl(id); if(el) el.onchange = renderDemandasList; });
    
    const btnNote = getEl('btn-add-note'); if(btnNote) btnNote.onclick = handleAddNote;
    const statD = getEl('det-dem-status'); if(statD) statD.onchange = handleStatusChange;
    const delD = getEl('btn-del-demanda'); if(delD) delD.onclick = () => requestDelete(viewingDemandaId, 'demanda');

    // Confirm
    const btnConf = getEl('btn-conf-delete'); if(btnConf) btnConf.onclick = processDelete;
    const btnCanc = getEl('cancel-delete-btn'); if(btnCanc) btnCanc.onclick = () => closeModal('modal-confirm');

    // Fechar Modais
    document.querySelectorAll('.close-modal').forEach(b => {
        b.onclick = () => {
            const m = b.closest('[id^="modal-"]');
            if(m) m.classList.add('hidden');
        };
    });
}

// 6. LÓGICA PRINCIPAL (LOGIN, NAV, DASH)
async function handleLogin(e) {
    e.preventDefault();
    const email = getEl('email-address').value;
    const pass = getEl('password').value;
    const btn = getEl('login-btn');
    const txt = btn.innerText;
    btn.disabled = true; btn.innerText = '...';
    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    if(error) { alert("Erro: " + error.message); btn.disabled = false; btn.innerText = txt; }
}

function switchPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    const p = getEl(id);
    if(p) { p.classList.remove('hidden'); p.classList.add('flex', 'flex-col'); }
    if(id === 'dashboard-page') updateDashboard();
    
    // Atualiza menu ativo
    document.querySelectorAll('#sidebar-nav a').forEach(a => {
        a.classList.remove('nav-link-active', 'bg-slate-800');
        // Corrige seleção para o tema escuro
        if(a.getAttribute('href') === '#' + id.replace('-page','')) {
            a.classList.add('nav-link-active');
            a.classList.add('bg-slate-800/80');
        } else {
            a.classList.remove('bg-slate-800/80');
        }
    });
}

function updateDashboard() {
    if(getEl('dash-total-cidadaos')) getEl('dash-total-cidadaos').innerText = allCidadaos.length;
    if(getEl('dash-total-demandas')) getEl('dash-total-demandas').innerText = allDemandas.length;
    if(getEl('dash-pendentes')) getEl('dash-pendentes').innerText = allDemandas.filter(d=>d.status==='pending').length;
    if(getEl('dash-concluidas')) getEl('dash-concluidas').innerText = allDemandas.filter(d=>d.status==='completed').length;
    
    initCharts();
    renderLists();
}

function initCharts() {
    Object.values(charts).forEach(c => { if(c) c.destroy(); });
    
    // Bairros
    const bMap = allCidadaos.reduce((a,c)=>{ a[c.bairro||'N/A'] = (a[c.bairro||'N/A']||0)+1; return a; }, {});
    const sortedB = Object.entries(bMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
    const ctxB = getEl('chart-bairros');
    if(ctxB) charts.bairros = new Chart(ctxB, { type: 'bar', data: { labels: sortedB.map(i=>i[0]), datasets: [{ label: 'Cidadãos', data: sortedB.map(i=>i[1]), backgroundColor: '#3b82f6', borderRadius: 4 }] }, options: { indexAxis: 'y', maintainAspectRatio: false } });

    // Tipos
    const tMap = allCidadaos.reduce((a,c)=>{ a[c.type||'Outro'] = (a[c.type||'Outro']||0)+1; return a; }, {});
    const ctxT = getEl('chart-tipos');
    if(ctxT) charts.tipos = new Chart(ctxT, { type: 'pie', data: { labels: Object.keys(tMap), datasets: [{ data: Object.values(tMap), backgroundColor: ['#3b82f6','#8b5cf6','#10b981'] }] }, options: { maintainAspectRatio: false } });

    // Status
    const sMap = allDemandas.reduce((a,d)=>{ a[d.status] = (a[d.status]||0)+1; return a; }, {});
    const ctxS = getEl('chart-status');
    if(ctxS) charts.status = new Chart(ctxS, { type: 'doughnut', data: { labels: ['Pendente','Andamento','Concluída'], datasets: [{ data: [sMap.pending||0, sMap.inprogress||0, sMap.completed||0], backgroundColor: ['#f59e0b','#3b82f6','#10b981'] }] }, options: { maintainAspectRatio: false } });
}

// 7. CIDADÃOS
function renderCidadaos() {
    const term = getEl('search-input') ? getEl('search-input').value.toLowerCase() : '';
    const type = getEl('f-tipo') ? getEl('f-tipo').value : '';
    const bairro = getEl('f-bairro') ? getEl('f-bairro').value : '';
    const sexo = getEl('f-sexo') ? getEl('f-sexo').value : '';

    currentFilteredCidadaos = allCidadaos.filter(c => {
        const mSearch = !term || c.name.toLowerCase().includes(term) || (c.cpf && c.cpf.includes(term));
        const mType = !type || c.type === type;
        const mBairro = !bairro || c.bairro === bairro;
        const mSexo = !sexo || c.sexo === sexo;
        return mSearch && mType && mBairro && mSexo;
    });

    currentCidadaosOffset = 0;
    const grid = getEl('grid-cidadaos');
    if(grid) grid.innerHTML = '';
    renderMoreCidadaos();
}

function renderMoreCidadaos() {
    const grid = getEl('grid-cidadaos');
    if(!grid) return;
    
    const batch = currentFilteredCidadaos.slice(currentCidadaosOffset, currentCidadaosOffset + CITADAOS_PER_PAGE);
    
    if(currentFilteredCidadaos.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-slate-500 py-10">Nenhum registo encontrado.</div>';
        const btn = getEl('load-more-container'); if(btn) btn.classList.add('hidden');
        return;
    }

    batch.forEach(c => {
        const div = document.createElement('div');
        div.className = 'bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-700 flex flex-col hover:border-blue-500 transition-colors';
        div.innerHTML = `
            <div class="flex items-center gap-4 mb-4">
                <div class="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-lg">${getInitials(c.name)}</div>
                <div class="overflow-hidden flex-1"><h3 class="font-bold text-white truncate">${c.name}</h3><span class="text-[10px] uppercase font-bold text-blue-400 bg-blue-900/30 px-2 py-1 rounded-full">${c.type}</span></div>
            </div>
            <div class="flex-1 space-y-1 text-xs text-slate-400 mb-4">
                <p class="truncate">📍 ${c.bairro}</p><p>📞 ${c.phone||'-'}</p>
            </div>
            <div class="pt-4 border-t border-slate-700 flex gap-2">
                <button class="btn-ver flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded text-xs font-bold text-slate-300 transition-colors">Ver</button>
                <button class="btn-edit flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold text-white transition-colors">Editar</button>
            </div>`;
        div.querySelector('.btn-ver').onclick = () => openDetails(c.id);
        div.querySelector('.btn-edit').onclick = () => openCidadaoModal(c.id);
        grid.appendChild(div);
    });

    currentCidadaosOffset += batch.length;
    const btn = getEl('load-more-container');
    if(btn) currentCidadaosOffset < currentFilteredCidadaos.length ? btn.classList.remove('hidden') : btn.classList.add('hidden');
}

// 8. CRUD CIDADÃO
function openCidadaoModal(id = null) {
    currentEditingId = id;
    getEl('form-cidadao').reset();
    getEl('filhos-container').innerHTML = '';
    getEl('modal-cidadao-title').innerText = id ? 'Editar Cidadão' : 'Novo Cadastro';
    
    if(id) {
        const c = allCidadaos.find(x => x.id === id);
        if(c) {
            getEl('c-name').value = c.name;
            getEl('c-cpf').value = c.cpf || '';
            getEl('c-rg').value = c.rg || '';
            getEl('c-dob').value = c.dob || '';
            getEl('c-sexo').value = c.sexo || 'Masculino';
            getEl('c-tipo').value = c.type || 'Eleitor';
            getEl('c-lider').value = c.leader || '';
            getEl('c-phone').value = c.phone || '';
            getEl('c-email').value = c.email || '';
            getEl('c-cep').value = c.cep || '';
            getEl('c-logra').value = c.logradouro || '';
            getEl('c-num').value = c.numero || '';
            getEl('c-bairro').value = c.bairro || '';
            getEl('c-sons').value = c.sons || 0;
            getEl('c-daughters').value = c.daughters || 0;
            if(getEl('c-wpp')) getEl('c-wpp').checked = c.whatsapp || false;
            updateKids('filho'); updateKids('filha');
        }
    }
    const m = getEl('modal-cidadao'); if(m) m.classList.remove('hidden');
}

async function handleCidadaoSave(e) {
    e.preventDefault();
    const btn = getEl('save-btn');
    const txt = btn.innerText;
    btn.disabled = true; btn.innerText = '...';

    try {
        const val = (id) => getEl(id) ? getEl(id).value : null;
        let lat = null, lon = null;
        
        // Geo
        const lg = val('c-logra'), br = val('c-bairro');
        if(lg && br) {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(lg + ',' + br + ',Macapá')}&format=json&limit=1`);
                const d = await res.json();
                if(d.length) { lat = parseFloat(d[0].lat); lon = parseFloat(d[0].lon); }
            } catch(geo) {}
        }

        const payload = {
            name: val('c-name'), cpf: val('c-cpf'), rg: val('c-rg'), dob: val('c-dob') || null,
            sexo: val('c-sexo'), type: val('c-tipo'), phone: val('c-phone'), 
            whatsapp: getEl('c-wpp') ? getEl('c-wpp').checked : false,
            email: val('c-email'), cep: val('c-cep'), logradouro: val('c-logra'), bairro: val('c-bairro'),
            numero: val('c-num'), leader: val('c-lider') || null, 
            sons: parseInt(val('c-sons'))||0, daughters: parseInt(val('c-daughters'))||0,
            latitude: lat, longitude: lon, user_id: user.id
        };

        const { error } = currentEditingId 
            ? await sb.from('cidadaos').update(payload).eq('id', currentEditingId)
            : await sb.from('cidadaos').insert(payload);

        if(error) throw error;
        
        showToast("Salvo com sucesso!", "success");
        closeModal('modal-cidadao');
        await loadDataFromSupabase();
    } catch(e) { showToast(e.message, 'error'); }
    finally { btn.disabled = false; btn.innerText = txt; }
}

// 9. AUXILIARES
function fetchAddress() {
    const cep = getEl('c-cep').value.replace(/\D/g,'');
    if(cep.length === 8) {
        fetch(`https://viacep.com.br/ws/${cep}/json/`).then(r=>r.json()).then(d=>{
            if(!d.erro) {
                getEl('c-logra').value = d.logradouro;
                getEl('c-bairro').value = d.bairro;
                getEl('c-num').focus();
            }
        });
    }
}

function updateKids(type) {
    const id = type==='filho'?'c-sons':'c-daughters';
    const qtd = parseInt(getEl(id).value)||0;
    const cont = getEl('filhos-container');
    const divId = 'div-'+type;
    let d = document.getElementById(divId);
    if(!d) { d = document.createElement('div'); d.id = divId; cont.appendChild(d); }
    
    let h = qtd > 0 ? `<p class="text-[10px] font-bold text-slate-500 mt-2 uppercase">${type}s</p>` : '';
    for(let i=0; i<qtd; i++) h += `<div class="grid grid-cols-2 gap-2 mt-1"><input placeholder="Nome" class="p-2 bg-slate-900 border border-slate-600 rounded text-xs text-white"><input type="date" class="p-2 bg-slate-900 border border-slate-600 rounded text-xs text-white"></div>`;
    d.innerHTML = h;
}

// 10. DEMANDAS
function openDemandaModal() {
    const sel = getEl('demanda-cidadao-select');
    sel.innerHTML = '<option value="">Selecione...</option>' + allCidadaos.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    getEl('form-demanda').reset();
    const m = getEl('modal-demanda'); if(m) m.classList.remove('hidden');
}

async function handleDemandaSave(e) {
    e.preventDefault();
    const payload = {
        cidadao_id: getEl('demanda-cidadao-select').value,
        title: getEl('demanda-title').value,
        description: getEl('demanda-description').value,
        status: 'pending', user_id: user.id
    };
    const { error } = await sb.from('demandas').insert(payload);
    if(!error) { showToast("Demanda criada!"); closeModal('modal-demanda'); await loadDataFromSupabase(); }
    else showToast(error.message, 'error');
}

function renderDemandasList() {
    const list = getEl('list-all-demandas'); if(!list) return;
    const st = getEl('df-status').value;
    const ld = getEl('df-lider').value;
    list.innerHTML = '';
    
    const f = allDemandas.filter(d => {
        const c = allCidadaos.find(x => x.id === d.cidadao_id);
        return (!st || d.status === st) && (!ld || (c && c.leader === ld));
    });

    if(!f.length) list.innerHTML = '<p class="text-center text-slate-500 py-10">Nada encontrado.</p>';
    
    f.forEach(d => {
        const c = allCidadaos.find(x => x.id === d.cidadao_id);
        const div = document.createElement('div');
        div.className = 'bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700 flex justify-between items-center cursor-pointer hover:border-blue-500 transition-colors';
        const stInfo = getStatusInfo(d.status);
        div.innerHTML = `<div><h4 class="font-bold text-white">${d.title}</h4><p class="text-xs text-slate-400">${c?c.name:'?'}</p></div><span class="${stInfo.classes}">${stInfo.text}</span>`;
        div.onclick = () => openDemandaDetails(d.id);
        list.appendChild(div);
    });
}

// 11. DETALHES & MAPA
async function openDemandaDetails(id) {
    viewingDemandaId = id;
    const d = allDemandas.find(x => x.id === id);
    const c = allCidadaos.find(x => x.id === d.cidadao_id);
    
    getEl('det-dem-title').innerText = d.title;
    getEl('det-dem-cidadao').innerText = c ? c.name : '?';
    getEl('det-dem-desc').innerText = d.description || '';
    getEl('det-dem-status').value = d.status;
    
    await loadNotes(id);
    const m = getEl('modal-demanda-detalhes'); if(m) m.classList.remove('hidden');
}

async function handleStatusChange(e) {
    await sb.from('demandas').update({ status: e.target.value }).eq('id', viewingDemandaId);
    await sb.from('notes').insert({ text: `Mudou status para ${e.target.value}`, demanda_id: viewingDemandaId, user_id: user.id });
    showToast("Atualizado!"); await loadDataFromSupabase(); await loadNotes(viewingDemandaId);
}

async function loadNotes(id) {
    const l = getEl('demanda-notes-list'); l.innerHTML = '...';
    const { data } = await sb.from('notes').select('*').eq('demanda_id', id).order('created_at');
    l.innerHTML = '';
    (data||[]).forEach(n => l.innerHTML += `<div class="bg-slate-800 p-2 rounded border border-slate-600 mb-2 text-xs text-slate-300"><p>${n.text}</p></div>`);
}

async function handleAddNote() {
    const i = getEl('new-note-text');
    if(!i.value) return;
    await sb.from('notes').insert({ text: i.value, demanda_id: viewingDemandaId, user_id: user.id });
    i.value = ''; await loadNotes(viewingDemandaId);
}

function openDetails(id) {
    const c = allCidadaos.find(x => x.id === id);
    getEl('detalhes-content').innerHTML = `
        <div class="flex items-center gap-4 mb-4"><div class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">${getInitials(c.name)}</div><div><h2 class="text-xl font-bold text-white">${c.name}</h2><p class="text-blue-400 text-sm font-bold uppercase">${c.type}</p></div></div>
        <div class="grid grid-cols-2 gap-4 text-sm text-slate-300"><p><strong>Tel:</strong> ${c.phone||'-'}</p><p><strong>Email:</strong> ${c.email||'-'}</p><p><strong>End:</strong> ${c.logradouro}, ${c.numero}</p><p><strong>Bairro:</strong> ${c.bairro}</p><p><strong>Filhos:</strong> ${c.sons+c.daughters}</p></div>`;
    getEl('btn-ver-mapa-unid').onclick = () => { closeModal('modal-detalhes'); openMap(c); };
    getEl('modal-detalhes').classList.remove('hidden');
}

function openMap(one = null) {
    getEl('modal-mapa').classList.remove('hidden');
    setTimeout(() => {
        if(!map) { map = L.map('map').setView([-0.039,-51.181], 13); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map); }
        markers.forEach(m=>m.remove()); markers = [];
        const t = one ? [one] : allCidadaos;
        const b = [];
        t.forEach(c => {
            if(c.latitude) {
                const m = L.marker([c.latitude, c.longitude]).addTo(map).bindPopup(c.name);
                markers.push(m); b.push([c.latitude, c.longitude]);
            }
        });
        map.invalidateSize();
        if(b.length) map.fitBounds(b, { padding: [50,50] });
    }, 300);
}

// 12. EXCLUSÃO
function requestDelete(id, type) {
    itemToDelete = { id, type };
    const m = getEl('modal-confirm'); if(m) m.classList.remove('hidden');
}

async function processDelete() {
    const { id, type } = itemToDelete;
    const t = type === 'cidadao' ? 'cidadaos' : 'demandas';
    await sb.from(t).delete().eq('id', id);
    showToast("Excluído!"); closeModal('modal-confirm'); if(type==='demanda') closeModal('modal-demanda-detalhes');
    await loadDataFromSupabase();
}

// 13. UTILITÁRIOS
function clearFilters() {
    getEl('search-input').value = ''; 
    ['f-tipo','f-bairro','f-sexo'].forEach(id=>getEl(id).value='');
    renderCidadaos();
}

function closeModal(id) { const m = getEl(id); if(m) m.classList.add('hidden'); }

function fillSelects() {
    const l = getEl('c-lider'); l.innerHTML = '<option value="">Nenhuma</option>' + allLeaders.map(i=>`<option value="${i.id}">${i.name}</option>`).join('');
    const df = getEl('df-lider'); df.innerHTML = '<option value="">Todas</option>' + allLeaders.map(i=>`<option value="${i.id}">${i.name}</option>`).join('');
    
    const bs = [...new Set(allCidadaos.map(c=>c.bairro).filter(Boolean))].sort();
    const fb = getEl('f-bairro'); fb.innerHTML = '<option value="">Todos</option>' + bs.map(b=>`<option value="${b}">${b}</option>`).join('');
}

function renderLists() {
    const l1 = getEl('list-aniversariantes'); l1.innerHTML = '';
    const m = new Date().getMonth();
    allCidadaos.filter(c=>c.dob && new Date(c.dob).getMonth()===m).forEach(c => {
        l1.innerHTML += `<div class="flex justify-between p-2 bg-slate-900 rounded border border-slate-700 mb-1"><span class="text-xs font-bold text-slate-300">${c.name}</span><span class="text-blue-500 text-xs font-bold">${new Date(c.dob).getDate()}</span></div>`;
    });

    const l2 = getEl('list-demandas-recentes'); l2.innerHTML = '';
    allDemandas.slice(0,5).forEach(d => {
        const c = allCidadaos.find(x=>x.id===d.cidadao_id);
        l2.innerHTML += `<div class="p-2 bg-slate-900 rounded border border-slate-700 mb-1 cursor-pointer hover:border-blue-500 transition-colors" onclick="openDemandaDetails('${d.id}')"><p class="text-xs font-bold text-white">${d.title}</p><p class="text-[10px] text-slate-500">${c?c.name:'?'}</p></div>`;
    });
}

function getInitials(n) { return n ? n.split(' ').map(x=>x[0]).join('').substring(0,2).toUpperCase() : '?'; }

function getStatusInfo(status) {
    switch (status) {
        case 'pending': return { text: 'Pendente', classes: 'status-badge status-pending' };
        case 'inprogress': return { text: 'Em Andamento', classes: 'status-badge status-inprogress' };
        case 'completed': return { text: 'Concluída', classes: 'status-badge status-completed' };
        default: return { text: 'N/A', classes: 'status-badge', color: '#6B7280' };
    }
}

function showToast(m, t='info') {
    const c = getEl('toast-container');
    const d = document.createElement('div');
    d.className = `p-3 rounded shadow text-white text-sm mb-2 ${t==='error'?'bg-red-600':'bg-emerald-600'}`;
    d.innerText = m; c.appendChild(d);
    setTimeout(()=>d.remove(), 3000);
}