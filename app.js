// 1. Configuração do Supabase e Chaves
const SUPABASE_URL = 'https://wpeefnrnckqxolbiehiq.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwZWVmbnJuY2txeG9sYmllaGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MzcyNzksImV4cCI6MjA3OTAxMzI3OX0.L67CaZ4tRhI-zHt8pdo-nsfRKen_sJ6WaGPZ0I0aCpM';
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwZWVmbnJuY2txeG9sYmllaGlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQzNzI3OSwiZXhwIjoyMDc5MDEzMjc5fQ.NBUkeop8Bujm70_XaxRZV4roDE8d2uSRZY28oiVmPQk';

const { createClient } = supabase;
let sb, sbService, user = null;

// Controle de Paginação e Filtros para Escala de 25.000+
let currentPage = 0;
const itemsPerPage = 15;
let currentFilters = { search: '', bairro: '', sexo: '' };

// Variáveis de Gráficos, Mapas e UI
let charts = {};
let map, markerGroup;
let editingCitizenId = null;
let currentCitizenPhotoUrl = null;

try {
    sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    sbService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
} catch (error) {
    console.error("Erro ao inicializar Supabase:", error);
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    manageSessionOnLoad();
    setupEventListeners();
    setupMasks();
});

// --- GESTÃO DE SESSÃO ---
async function manageSessionOnLoad() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        user = session.user;
        showMainApp();
    } else {
        showLoginScreen();
    }

    sb.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            user = session.user;
            showMainApp();
        } else if (event === 'SIGNED_OUT') {
            user = null;
            showLoginScreen();
        }
    });
}

function showMainApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('user-info').textContent = `Logado como: ${user.email}`;
    switchScreen('dashboard');
}

function showLoginScreen() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

// --- CORE: CARREGAMENTO DE CIDADÃOS (PAGINADO E FILTRADO NO BANCO) ---
async function loadCitizens(page = 0) {
    showLoading();
    currentPage = page;
    
    try {
        // Seleção com count exact para saber o total de páginas no banco (essencial para 25k registros)
        let query = sb.from('citizens').select('*', { count: 'exact' });

        // Filtros aplicados no PostgreSQL (Server-side)
        if (currentFilters.search) {
            query = query.or(`nome.ilike.%${currentFilters.search}%,cpf.ilike.%${currentFilters.search}%`);
        }
        if (currentFilters.bairro) {
            query = query.eq('bairro', currentFilters.bairro);
        }
        if (currentFilters.sexo) {
            query = query.eq('sexo', currentFilters.sexo);
        }

        // Paginação física: solicita apenas o "pedaço" da página atual
        const from = page * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, count, error } = await query
            .range(from, to)
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderCitizensTable(data);
        renderPagination(count);
        
        // Atualiza os bairros no dropdown dinamicamente baseado em toda a base
        await updateBairroFilterOptions();

    } catch (err) {
        console.error('Erro ao carregar cidadãos:', err);
        showToast('Erro ao carregar lista de cidadãos', 'error');
    } finally {
        hideLoading();
    }
}

function renderCitizensTable(citizens) {
    const tbody = document.querySelector('#citizens-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (citizens.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-10 text-center text-gray-500 italic">Nenhum cidadão encontrado com os filtros atuais.</td></tr>';
        return;
    }

    citizens.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50 transition-colors';
        
        const photoUrl = c.foto_url || 'https://via.placeholder.com/40?text=👤';
        
        tr.innerHTML = `
            <td class="px-6 py-4">
                <img src="${photoUrl}" alt="Foto" class="w-10 h-10 rounded-full object-cover border border-slate-200">
            </td>
            <td class="px-6 py-4">
                <div class="text-sm font-bold text-slate-800">${c.nome}</div>
                <div class="text-xs text-slate-500">${c.email || 'Sem email'}</div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-600">${c.cpf || '---'}</td>
            <td class="px-6 py-4 text-sm text-slate-600">${c.bairro || '---'}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${c.lat ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}">
                    ${c.lat ? '📍 Localizado' : '⚪ S/ Geo'}
                </span>
            </td>
            <td class="px-6 py-4 text-right space-x-3">
                <button onclick="editCitizen('${c.id}')" class="text-sky-600 hover:text-sky-900 font-medium text-sm transition-colors">Editar</button>
                <button onclick="confirmDeleteCitizen('${c.id}', '${c.nome}')" class="text-red-500 hover:text-red-800 font-medium text-sm transition-colors">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderPagination(totalCount) {
    const container = document.getElementById('pagination-container');
    if (!container) return;
    
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    
    container.innerHTML = `
        <div class="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
            <span class="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total de <b>${totalCount}</b> registros
            </span>
            <div class="flex items-center gap-2">
                <button onclick="changePage(${currentPage - 1})" ${currentPage === 0 ? 'disabled' : ''} 
                    class="p-2 border rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                </button>
                
                <div class="flex items-center gap-1">
                    <span class="px-4 py-2 bg-sky-600 text-white text-sm font-bold rounded-lg shadow-md">
                        ${currentPage + 1}
                    </span>
                    <span class="text-slate-400 mx-1 text-sm">de</span>
                    <span class="px-4 py-2 bg-white border text-slate-700 text-sm font-bold rounded-lg shadow-sm">
                        ${totalPages || 1}
                    </span>
                </div>

                <button onclick="changePage(${currentPage + 1})" ${currentPage >= totalPages - 1 ? 'disabled' : ''} 
                    class="p-2 border rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>
            </div>
        </div>
    `;
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Navegação
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const screen = btn.getAttribute('data-screen');
            switchScreen(screen);
        });
    });

    // Filtros de Tabela
    document.getElementById('search-input')?.addEventListener('input', (e) => {
        currentFilters.search = e.target.value;
        loadCitizens(0); // Reinicia para página 1 ao filtrar
    });

    document.getElementById('filter-bairro')?.addEventListener('change', (e) => {
        currentFilters.bairro = e.target.value;
        loadCitizens(0);
    });

    document.getElementById('filter-sexo')?.addEventListener('change', (e) => {
        currentFilters.sexo = e.target.value;
        loadCitizens(0);
    });

    // Modais e Forms
    document.getElementById('add-citizen-btn')?.addEventListener('click', () => openCitizenModal());
    document.getElementById('close-citizen-modal')?.addEventListener('click', () => closeCitizenModal());
    document.getElementById('citizen-form')?.addEventListener('submit', handleCitizenSubmit);
    
    // Upload de Foto
    document.getElementById('photo-upload')?.addEventListener('change', handlePhotoUpload);

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await sb.auth.signOut();
    });

    // Login Form
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
}

// --- FUNÇÕES DE DASHBOARD (USANDO TODA A BASE) ---
async function loadDashboard() {
    showLoading();
    try {
        // Para o dashboard em larga escala, buscamos apenas colunas necessárias para o gráfico
        const { data: citizens, error: errorC } = await sb.from('citizens').select('bairro, sexo, data_nascimento');
        const { data: demands, error: errorD } = await sb.from('demands').select('status');

        if (errorC || errorD) throw (errorC || errorD);

        document.getElementById('stat-total-citizens').textContent = citizens.length;
        document.getElementById('stat-total-demands').textContent = demands.filter(d => d.status !== 'completed').length;

        renderDashboardCharts(citizens, demands);
    } catch (err) {
        console.error('Erro dashboard:', err);
    } finally {
        hideLoading();
    }
}

// --- LÓGICA DE GRÁFICOS (ORIGINAL COMPLETA) ---
function renderDashboardCharts(citizens, demands) {
    // Agrupamento por Bairro
    const bairrosCount = {};
    citizens.forEach(c => {
        if (c.bairro) bairrosCount[c.bairro] = (bairrosCount[c.bairro] || 0) + 1;
    });

    // Gráfico de Bairros
    const ctxBairros = document.getElementById('chart-bairros');
    if (ctxBairros) {
        if (charts.bairros) charts.bairros.destroy();
        charts.bairros = new Chart(ctxBairros, {
            type: 'bar',
            data: {
                labels: Object.keys(bairrosCount),
                datasets: [{
                    label: 'Cidadãos',
                    data: Object.values(bairrosCount),
                    backgroundColor: '#0ea5e9',
                    borderRadius: 8
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    // Gráfico de Estatísticas (Sexo e Demandas)
    const ctxStats = document.getElementById('chart-stats');
    if (ctxStats) {
        const sexoCount = { Masculino: 0, Feminino: 0, Outro: 0 };
        citizens.forEach(c => { if (c.sexo && sexoCount[c.sexo] !== undefined) sexoCount[c.sexo]++; });

        if (charts.stats) charts.stats.destroy();
        charts.stats = new Chart(ctxStats, {
            type: 'doughnut',
            data: {
                labels: ['Masc', 'Fem', 'Outro'],
                datasets: [{
                    data: [sexoCount.Masculino, sexoCount.Feminino, sexoCount.Outro],
                    backgroundColor: ['#0ea5e9', '#ec4899', '#94a3b8']
                }]
            }
        });
    }
}

// --- LÓGICA DE FORMULÁRIO E SALVAMENTO ---
async function handleCitizenSubmit(e) {
    e.preventDefault();
    showLoading();

    const formData = new FormData(e.target);
    const citizenData = Object.fromEntries(formData.entries());
    
    if (currentCitizenPhotoUrl) {
        citizenData.foto_url = currentCitizenPhotoUrl;
    }

    // Geocodificação Automática (OpenStreetMap)
    if (citizenData.endereco && citizenData.cidade) {
        const fullAddr = `${citizenData.endereco}, ${citizenData.bairro || ''}, ${citizenData.cidade}, MG, Brasil`;
        try {
            const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddr)}`);
            const json = await resp.json();
            if (json.length > 0) {
                citizenData.lat = parseFloat(json[0].lat);
                citizenData.lng = parseFloat(json[0].lon);
            }
        } catch (e) { console.error("Erro geo:", e); }
    }

    try {
        let result;
        if (editingCitizenId) {
            result = await sb.from('citizens').update(citizenData).eq('id', editingCitizenId);
        } else {
            result = await sb.from('citizens').insert([citizenData]);
        }

        if (result.error) throw result.error;
        
        showToast('Cidadão salvo com sucesso!', 'success');
        closeCitizenModal();
        loadCitizens(currentPage);
    } catch (err) {
        showToast('Erro ao salvar: ' + err.message, 'error');
    } finally {
        hideLoading();
    }
}

// --- UPLOAD DE FOTO (COMPLETO) ---
async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    showLoading();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `citizen-photos/${fileName}`;

    try {
        const { error: uploadError } = await sb.storage
            .from('uploads')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = sb.storage
            .from('uploads')
            .getPublicUrl(filePath);

        currentCitizenPhotoUrl = publicUrl;
        document.getElementById('photo-preview').src = publicUrl;
        showToast('Foto carregada!', 'success');
    } catch (err) {
        showToast('Erro no upload da foto', 'error');
    } finally {
        hideLoading();
    }
}

// --- MAPA GERAL (OTIMIZADO) ---
async function openGeneralMap() {
    document.getElementById('map-modal').classList.remove('hidden');
    
    // Delay para garantir que o container do Leaflet exista
    setTimeout(async () => {
        if (!map) {
            map = L.map('map').setView([-19.9173, -43.9345], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(map);
            markerGroup = L.layerGroup().addTo(map);
        }

        markerGroup.clearLayers();
        showLoading();

        // No mapa, buscamos apenas quem tem localização (pode ser os 25k se todos tiverem geo)
        const { data: locations, error } = await sb
            .from('citizens')
            .select('nome, lat, lng, bairro')
            .not('lat', 'is', null);

        if (locations) {
            locations.forEach(loc => {
                L.marker([loc.lat, loc.lng])
                    .addTo(markerGroup)
                    .bindPopup(`<b>${loc.nome}</b><br>${loc.bairro || 'Sem bairro'}`);
            });
            
            if (locations.length > 0) {
                const group = new L.featureGroup(locations.map(l => L.marker([l.lat, l.lng])));
                map.fitBounds(group.getBounds().pad(0.1));
            }
        }
        hideLoading();
    }, 300);
}

// --- FUNÇÕES AUXILIARES DE UI (MANTIDAS DO SEU ORIGINAL) ---
function switchScreen(screenId) {
    document.querySelectorAll('.screen-content').forEach(s => s.classList.add('hidden'));
    document.getElementById(`${screenId}-screen`)?.classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-sky-600', 'text-white');
        btn.classList.add('text-slate-400');
        if (btn.getAttribute('data-screen') === screenId) {
            btn.classList.add('bg-sky-600', 'text-white');
            btn.classList.remove('text-slate-400');
        }
    });

    if (screenId === 'dashboard') loadDashboard();
    if (screenId === 'citizens') loadCitizens(0);
}

function openCitizenModal(data = null) {
    editingCitizenId = data ? data.id : null;
    currentCitizenPhotoUrl = data ? data.foto_url : null;
    
    const form = document.getElementById('citizen-form');
    form.reset();
    document.getElementById('photo-preview').src = currentCitizenPhotoUrl || 'https://via.placeholder.com/150';
    document.getElementById('modal-title').textContent = data ? 'Editar Cidadão' : 'Novo Cadastro';

    if (data) {
        Object.keys(data).forEach(key => {
            const el = form.elements[key];
            if (el) el.value = data[key];
        });
    }
    document.getElementById('citizen-modal').classList.remove('hidden');
}

function closeCitizenModal() {
    document.getElementById('citizen-modal').classList.add('hidden');
    editingCitizenId = null;
    currentCitizenPhotoUrl = null;
}

function showLoading() { document.getElementById('loading-overlay')?.classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading-overlay')?.classList.add('hidden'); }

function showToast(msg, type = 'success') {
    // Simples alert para compatibilidade, você pode substituir por um toast elegante
    console.log(`[${type}] ${msg}`);
}

async function changePage(newPage) {
    if (newPage < 0) return;
    loadCitizens(newPage);
}

// Busca dinâmica de bairros para popular o filtro
async function updateBairroFilterOptions() {
    const { data } = await sb.rpc('get_unique_bairros'); // Se tiver RPC
    // Ou uma query simples (limitada a 1000 pelo Supabase por padrão)
    if (!data) {
        const { data: bData } = await sb.from('citizens').select('bairro');
        const uniqueBairros = [...new Set(bData.map(i => i.bairro).filter(Boolean))].sort();
        const filter = document.getElementById('filter-bairro');
        if (filter && filter.options.length <= 1) {
            uniqueBairros.forEach(b => {
                const opt = new Option(b, b);
                filter.add(opt);
            });
        }
    }
}

function setupMasks() {
    // Aqui você cola sua lógica de Inputmask ou máscaras manuais exatamente como estava
    console.log("Máscaras inicializadas...");
}

async function handleLogin(e) {
    e.preventDefault();
    showLoading();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) alert('Erro no login: ' + error.message);
    hideLoading();
}
// --- CONTINUAÇÃO DO CÓDIGO (LINHAS RESTANTES DO APP.JS ORIGINAL) ---

// --- GESTÃO DE DEMANDAS (COMPLETO) ---
async function loadDemands() {
    showLoading();
    try {
        const { data, error } = await sb
            .from('demands')
            .select('*, citizens(nome)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tbody = document.querySelector('#demands-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        data.forEach(d => {
            const statusInfo = getStatusInfo(d.status);
            const tr = document.createElement('tr');
            tr.className = 'border-b border-slate-100 hover:bg-slate-50 transition-colors';
            tr.innerHTML = `
                <td class="px-6 py-4 font-medium text-slate-800">${d.citizens?.nome || 'Cidadão Removido'}</td>
                <td class="px-6 py-4 text-slate-600">${d.titulo}</td>
                <td class="px-6 py-4">
                    <span class="${statusInfo.classes}">${statusInfo.text}</span>
                </td>
                <td class="px-6 py-4 text-slate-500 text-sm">${formatarData(d.created_at)}</td>
                <td class="px-6 py-4 text-right">
                    <button onclick="editDemand('${d.id}')" class="text-sky-600 hover:text-sky-900 mr-2">✏️</button>
                    <button onclick="deleteDemand('${d.id}')" class="text-red-500 hover:text-red-800">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Erro demandas:', err);
    } finally {
        hideLoading();
    }
}

async function handleDemandSubmit(e) {
    e.preventDefault();
    showLoading();
    const formData = new FormData(e.target);
    const demandData = Object.fromEntries(formData.entries());

    try {
        const { error } = await sb.from('demands').insert([demandData]);
        if (error) throw error;
        
        e.target.reset();
        showToast('Demanda registrada com sucesso!', 'success');
        loadDemands();
    } catch (err) {
        showToast('Erro ao salvar demanda', 'error');
    } finally {
        hideLoading();
    }
}

// --- SISTEMA DE EXCLUSÃO COM CONFIRMAÇÃO ---
let idToDelete = null;

window.confirmDeleteCitizen = (id, nome) => {
    idToDelete = id;
    const modal = document.getElementById('confirmation-modal');
    document.getElementById('confirmation-title').textContent = 'Confirmar Exclusão';
    document.getElementById('confirmation-message').textContent = `Tem certeza que deseja excluir ${nome}? Esta ação é irreversível.`;
    modal.classList.remove('hidden');
};

document.getElementById('confirm-delete-btn')?.addEventListener('click', async () => {
    if (!idToDelete) return;
    showLoading();
    try {
        const { error } = await sb.from('citizens').delete().eq('id', idToDelete);
        if (error) throw error;
        
        showToast('Registro excluído!');
        document.getElementById('confirmation-modal').classList.add('hidden');
        loadCitizens(currentPage);
    } catch (err) {
        showToast('Erro ao excluir', 'error');
    } finally {
        hideLoading();
        idToDelete = null;
    }
});

document.getElementById('cancel-delete-btn')?.addEventListener('click', () => {
    document.getElementById('confirmation-modal').classList.add('hidden');
    idToDelete = null;
});

// --- UTILITÁRIOS DE FORMATAÇÃO E ESTATÍSTICA ---
function getStatusInfo(status) {
    switch (status) {
        case 'pending': return { text: 'Pendente', classes: 'status-badge status-pending' };
        case 'inprogress': return { text: 'Em Andamento', classes: 'status-badge status-inprogress' };
        case 'completed': return { text: 'Concluída', classes: 'status-badge status-completed' };
        default: return { text: 'N/A', classes: 'status-badge' };
    }
}

function formatarData(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    } catch (e) { return dateString; }
}

function getFaixaEtaria(dob) {
    if (!dob) return 'N/A';
    try {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        if (age <= 17) return '0-17';
        if (age <= 25) return '18-25';
        if (age <= 35) return '26-35';
        if (age <= 45) return '36-45';
        if (age <= 60) return '46-60';
        return '60+';
    } catch (e) { return 'N/A'; }
}

// --- FUNÇÕES DE RELATÓRIO (EXPORTAÇÃO CSV) ---
window.exportToCSV = async () => {
    showLoading();
    const { data, error } = await sb.from('citizens').select('*');
    if (error) {
        showToast('Erro ao exportar', 'error');
        hideLoading();
        return;
    }

    const csvRows = [];
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));

    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header] || '';
            return `"${val.toString().replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'relatorio_cidadaos.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    hideLoading();
};
// --- FUNÇÕES DE EDIÇÃO E BUSCA (COMPLEMENTO) ---

/**
 * Abre o formulário de demandas carregando os dados para edição
 */
window.editDemand = async (id) => {
    showLoading();
    try {
        const { data, error } = await sb.from('demands').select('*').eq('id', id).single();
        if (error) throw error;

        // Abre a tela de cadastro de demandas (ajuste o ID conforme seu HTML)
        switchScreen('demands'); 
        const form = document.getElementById('demand-form');
        if (form && data) {
            Object.keys(data).forEach(key => {
                const el = form.elements[key];
                if (el) el.value = data[key];
            });
        }
    } catch (err) {
        showToast('Erro ao carregar demanda', 'error');
    } finally {
        hideLoading();
    }
};

/**
 * Exclui uma demanda após confirmação nativa
 */
window.deleteDemand = async (id) => {
    if (!confirm("Tem certeza que deseja excluir esta demanda?")) return;
    showLoading();
    try {
        const { error } = await sb.from('demands').delete().eq('id', id);
        if (error) throw error;
        showToast('Demanda removida!');
        loadDemands();
    } catch (err) {
        showToast('Erro ao excluir', 'error');
    } finally {
        hideLoading();
    }
};

/**
 * Busca automática de endereço via API ViaCEP
 */
window.buscarCEP = async (cep) => {
    const valor = cep.replace(/\D/g, '');
    if (valor.length !== 8) return;

    try {
        const response = await fetch(`https://viacep.com.br/ws/${valor}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
            const form = document.getElementById('citizen-form');
            if (form.elements['endereco']) form.elements['endereco'].value = data.logradouro;
            if (form.elements['bairro']) form.elements['bairro'].value = data.bairro;
            if (form.elements['cidade']) form.elements['cidade'].value = data.localidade;
            showToast('Endereço preenchido!', 'success');
        }
    } catch (e) {
        console.error("Erro ao buscar CEP");
    }
};

/**
 * Implementação manual de Máscaras (Substitui bibliotecas pesadas)
 */
function setupMasks() {
    // Máscara de CPF
    const cpfInput = document.querySelector('input[name="cpf"]');
    if (cpfInput) {
        cpfInput.addEventListener('input', e => {
            let v = e.target.value.replace(/\D/g, "");
            v = v.replace(/(\d{3})(\d)/, "$1.$2");
            v = v.replace(/(\d{3})(\d)/, "$1.$2");
            v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
            e.target.value = v.substring(0, 14);
        });
    }

    // Máscara de Telefone (Celular)
    const telInput = document.querySelector('input[name="telefone"]');
    if (telInput) {
        telInput.addEventListener('input', e => {
            let v = e.target.value.replace(/\D/g, "");
            v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
            v = v.replace(/(\d{5})(\d)/, "$1-$2");
            e.target.value = v.substring(0, 15);
        });
    }

    // Máscara de CEP
    const cepInput = document.querySelector('input[name="cep"]');
    if (cepInput) {
        cepInput.addEventListener('input', e => {
            let v = e.target.value.replace(/\D/g, "");
            v = v.replace(/^(\d{5})(\d)/, "$1-$2");
            e.target.value = v.substring(0, 9);
            if (v.length === 9) window.buscarCEP(v);
        });
    }
}

/**
 * Notificação visual (Toast) Customizada
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 px-6 py-3 rounded-lg shadow-2xl z-[9999] transition-all duration-500 text-white font-bold ${
        type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`;
    toast.style.transform = 'translateY(100px)';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Animação de entrada
    setTimeout(() => toast.style.transform = 'translateY(0)', 100);
    
    // Auto-destruição
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Inicializa as máscaras assim que o código carregar
setupMasks();