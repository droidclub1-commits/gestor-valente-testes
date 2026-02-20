const SUPABASE_URL = 'https://aqxccienrpqhwdqzusnh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeGNjaWVucnBxaHdkcXp1c25oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NDQ1MzgsImV4cCI6MjA4NjUyMDUzOH0.lV1TniRFOO3vSYc8Qze9ksNBSl7B7IXXyQNyvMWDWuE';
const { createClient } = supabase;
let sb, user = null, userRole = null; // userRole: 'admin' | 'cadastrador'
try {
    sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
    });
} catch (error) {
    console.error("Erro ao inicializar:", error);
    alert("Erro crítico de conexão.");
}
let allCidadaos = [], allDemandas = [], allLeaders = [];
// userRole carregado após login ('admin' ou 'cadastrador')
// Paginação server-side — controlada por CIDADAOS_PAGE_SIZE e cidadaosServerOffset
let currentEditingId = null;
let currentCidadaoIdForDemanda = null;
let currentCidadaoIdForDetails = null;
let currentEditingDemandaId = null;
let viewingDemandaId = null;
let appInitialized = false;
let logoBtn, logoutBtn, sidebarNav, addCidadaoBtn, addDemandaGeralBtn,
    closeModalBtn, cancelBtn, saveBtn, closeDetailsModalBtn, closeDemandaModalBtn,
    cancelDemandaBtn, closeDemandaDetailsBtn, closeMapBtn, cidadaoModal,
    modalContent, cidadaoDetailsModal, demandaModal, demandaDetailsModal,
    mapModal, confirmationModal, cidadaoForm, demandaForm, addNoteForm,
    searchInput, filterType, filterBairro, filterLeader, filterSexo,
    filterFaixaEtaria, clearFiltersBtn, generateReportBtn, viewMapBtn,
    demandaFilterStatus, demandaFilterLeader, demandaClearFiltersBtn,
    cidadaosGrid, allDemandasList, cidadaoLeaderSelect, demandaCidadaoSelect,
    cancelDeleteBtn, confirmDeleteBtn, cidadaoName, cidadaoEmail, cidadaoDob,
    cidadaoSexo, cidadaoType, cidadaoCPF, cidadaoRG, cidadaoVoterId,
    cidadaoPhone, cidadaoWhatsapp, cidadaoProfissao, cidadaoLocalTrabalho,
    cidadaoCEP, cidadaoLogradouro, cidadaoNumero, cidadaoComplemento,
    cidadaoBairro, cidadaoCidade, cidadaoEstado, cidadaoSons, cidadaoDaughters,
    childrenDetailsContainer, cidadaoPhotoUrl, cidadaoPhotoUpload, fileNameDisplay,
    loadMoreBtn, cidadaoLat, cidadaoLong,
    itemToDelete = { id: null, type: null }, 
    map = null, markers = [], cidadaosChart = null, demandasChart = null, 
    cidadaosBairroChart = null, cidadaosSexoChart = null, cidadaosFaixaEtariaChart = null; 
document.addEventListener('DOMContentLoaded', () => {
    const loginPage = document.getElementById('login-page');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const emailInput = document.getElementById('email-address');
    const passwordInput = document.getElementById('password');
    sb.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
            user = session.user;
            loginPage.classList.add('hidden');
            appContainer.style.display = 'flex';
            if (!appInitialized) {
                 await initializeMainApp(); 
            }
        } else if (event === 'SIGNED_OUT') {
            user = null;
            loginPage.classList.remove('hidden');
            appContainer.style.display = 'none';
            appInitialized = false;
        } else if (event === 'INITIAL_SESSION' && !session) {
            user = null;
            appInitialized = false;
        }
    });
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<div class="spinner"></div>';
        try {
            const { error } = await sb.auth.signInWithPassword({
                email: email,
                password: password,
            });
            if (error) throw error;
        } catch (error) {
            console.error(error.message);
            showToast("Credenciais inválidas.", "error");
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Entrar';
        }
    });
    async function manageSessionOnLoad() {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
            user = session.user;
            loginPage.classList.add('hidden');
            appContainer.style.display = 'flex';
            await initializeMainApp(); 
        } else {
            user = null;
            loginPage.classList.remove('hidden');
            appContainer.style.display = 'none';
        }
    }
    manageSessionOnLoad();
    async function initializeMainApp() {
        if (appInitialized) return;
        await new Promise(resolve => setTimeout(resolve, 50)); 
        logoBtn = document.getElementById('logo-btn'); 
        logoutBtn = document.getElementById('logout-btn');
        sidebarNav = document.getElementById('sidebar-nav');
        addCidadaoBtn = document.getElementById('add-cidadao-btn');
        addDemandaGeralBtn = document.getElementById('add-demanda-geral-btn');
        closeModalBtn = document.getElementById('close-modal-btn');
        cancelBtn = document.getElementById('cancel-btn');
        saveBtn = document.getElementById('save-btn');
        closeDetailsModalBtn = document.getElementById('close-details-modal-btn');
        closeDemandaModalBtn = document.getElementById('close-demanda-modal-btn');
        cancelDemandaBtn = document.getElementById('cancel-demanda-btn');
        closeDemandaDetailsBtn = document.getElementById('close-demanda-details-btn');
        closeMapBtn = document.getElementById('close-map-btn');
        cidadaoModal = document.getElementById('cidadao-modal');
        modalContent = document.getElementById('modal-content');
        cidadaoDetailsModal = document.getElementById('cidadao-details-modal');
        demandaModal = document.getElementById('demanda-modal');
        demandaDetailsModal = document.getElementById('demanda-details-modal');
        mapModal = document.getElementById('map-modal');
        confirmationModal = document.getElementById('confirmation-modal');
        cidadaoForm = document.getElementById('cidadao-form');
        demandaForm = document.getElementById('demanda-form');
        addNoteForm = document.getElementById('add-note-form');
        searchInput = document.getElementById('search-input');
        filterType = document.getElementById('filter-type');
        filterBairro = document.getElementById('filter-bairro');
        filterLeader = document.getElementById('filter-leader');
        filterSexo = document.getElementById('filter-sexo');
        filterFaixaEtaria = document.getElementById('filter-faixa-etaria');
        clearFiltersBtn = document.getElementById('clear-filters-btn');
        generateReportBtn = document.getElementById('generate-report-btn');
        viewMapBtn = document.getElementById('view-map-btn');
        demandaFilterStatus = document.getElementById('demanda-filter-status');
        demandaFilterLeader = document.getElementById('demanda-filter-leader');
        demandaClearFiltersBtn = document.getElementById('demanda-clear-filters-btn');
        cidadaosGrid = document.getElementById('cidadaos-grid');
        loadMoreBtn = document.getElementById('load-more-btn');
        allDemandasList = document.getElementById('all-demandas-list');
        cidadaoLeaderSelect = document.getElementById('cidadao-leader');
        demandaCidadaoSelect = document.getElementById('demanda-cidadao-select');
        cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        cidadaoName = document.getElementById('cidadao-name');
        cidadaoEmail = document.getElementById('cidadao-email');
        cidadaoDob = document.getElementById('cidadao-dob');
        cidadaoSexo = document.getElementById('cidadao-sexo');
        cidadaoType = document.getElementById('cidadao-type');
        cidadaoCPF = document.getElementById('cidadao-cpf');
        cidadaoRG = document.getElementById('cidadao-rg');
        cidadaoVoterId = document.getElementById('cidadao-voterid');
        cidadaoPhone = document.getElementById('cidadao-phone');
        cidadaoWhatsapp = document.getElementById('cidadao-whatsapp');
        cidadaoProfissao = document.getElementById('cidadao-profissao');
        cidadaoLocalTrabalho = document.getElementById('cidadao-local-trabalho');
        cidadaoCEP = document.getElementById('cidadao-cep');
        cidadaoLogradouro = document.getElementById('cidadao-logradouro');
        cidadaoNumero = document.getElementById('cidadao-numero');
        cidadaoComplemento = document.getElementById('cidadao-complemento');
        cidadaoBairro = document.getElementById('cidadao-bairro');
        cidadaoCidade = document.getElementById('cidadao-cidade');
        cidadaoEstado = document.getElementById('cidadao-estado');
        cidadaoSons = document.getElementById('cidadao-sons');
        cidadaoDaughters = document.getElementById('cidadao-daughters');
        childrenDetailsContainer = document.getElementById('children-details-container');
        cidadaoPhotoUrl = document.getElementById('cidadao-photo-url');
        cidadaoPhotoUpload = document.getElementById('cidadao-photo-upload');
        fileNameDisplay = document.getElementById('file-name-display');
        cidadaoLat = document.getElementById('cidadao-lat');
        cidadaoLong = document.getElementById('cidadao-long');
        if (!logoutBtn || !cidadaoForm) {
            appInitialized = false; 
            return; 
        }
        if (logoBtn) {
            logoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                switchPage('dashboard-page');
            });
        }
        // Remove listener antigo antes de adicionar novo (evita duplicatas)
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        logoutBtn = newLogoutBtn;
        logoutBtn.addEventListener('click', async () => {
            try {
                logoutBtn.disabled = true;
                await sb.auth.signOut();
                appInitialized = false;
                // Reseta estado global
                allCidadaos = []; allDemandas = []; allLeaders = [];
                totalCidadaosCount = 0; cidadaosServerOffset = 0;
                userRole = null;
            } catch (error) {
                logoutBtn.disabled = false;
                showToast("Erro ao terminar sessão.", "error");
            }
        });
        sidebarNav.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link) {
                e.preventDefault();
                const page = link.getAttribute('href').substring(1);
                if (page === 'mapa') {
                    openMapModal();
                } else {
                    switchPage(page + '-page');
                }
            }
        });
        addCidadaoBtn.addEventListener('click', () => openCidadaoModal());
        addDemandaGeralBtn.addEventListener('click', () => openDemandaModal());
        viewMapBtn.addEventListener('click', () => openMapModal());
        closeModalBtn.addEventListener('click', closeCidadaoModal);
        cancelBtn.addEventListener('click', closeCidadaoModal);
        closeDetailsModalBtn.addEventListener('click', closeDetailsModal);
        closeDemandaModalBtn.addEventListener('click', closeDemandaModal);
        cancelDemandaBtn.addEventListener('click', closeDemandaModal);
        closeDemandaDetailsBtn.addEventListener('click', closeDemandaDetailsModal);
        closeMapBtn.addEventListener('click', closeMapModal);
        cidadaoForm.addEventListener('submit', handleCidadaoFormSubmit);
        demandaForm.addEventListener('submit', handleDemandaFormSubmit);
        addNoteForm.addEventListener('submit', handleAddNoteSubmit);
        // PERFORMANCE: debounce de 350ms — evita query a cada tecla digitada
        let searchDebounce;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => renderCidadaos(), 350);
        });
        filterType.addEventListener('change', () => renderCidadaos());
        filterBairro.addEventListener('change', () => renderCidadaos());
        filterLeader.addEventListener('change', () => renderCidadaos());
        filterSexo.addEventListener('change', () => renderCidadaos());
        filterFaixaEtaria.addEventListener('change', () => renderCidadaos());
        clearFiltersBtn.addEventListener('click', clearCidadaoFilters);
        loadMoreBtn.addEventListener('click', renderMoreCidadaos);
        demandaFilterStatus.addEventListener('change', () => renderAllDemandas());
        demandaFilterLeader.addEventListener('change', () => renderAllDemandas());
        demandaClearFiltersBtn.addEventListener('click', clearDemandaFilters);
        generateReportBtn.addEventListener('click', generatePrintReport);
        const excelReportBtn = document.getElementById('generate-excel-btn');
        if (excelReportBtn) excelReportBtn.addEventListener('click', generateExcelReport);
        cancelDeleteBtn.addEventListener('click', closeConfirmationModal);
        confirmDeleteBtn.addEventListener('click', handleDeleteConfirmation);
        cidadaoCEP.addEventListener('blur', handleCEPBlur);
        cidadaoPhotoUpload.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                fileNameDisplay.textContent = e.target.files[0].name;
                cidadaoPhotoUrl.value = '';
            } else {
                fileNameDisplay.textContent = 'Nenhum ficheiro selecionado';
            }
        });
        cidadaoSons.addEventListener('input', () => updateChildrenInputs('filho'));
        cidadaoDaughters.addEventListener('input', () => updateChildrenInputs('filha'));
        try {
             await loadInitialData(); 
             appInitialized = true; 
             switchPage('dashboard-page');
        } catch (e) {
             console.error(e);
             showToast("Erro fatal de dados. Por favor, faça login novamente.", "error");
             await sb.auth.signOut(); 
        }
    }
    // ── PERFORMANCE: controle de estado de busca server-side ──────────────────
    let serverSearchState = { search: '', type: '', bairro: '', leader: '', sexo: '', faixaEtaria: '' };
    const CIDADAOS_PAGE_SIZE = 12;
    let totalCidadaosCount = 0;
    let cidadaosServerOffset = 0;

    async function loadInitialData() {
        if (!user) return;
        try {
            // ── Busca o perfil do utilizador (admin ou cadastrador) ──────
            const { data: profileData, error: profileError } = await sb
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            if (profileError || !profileData) {
                await sb.auth.signOut();
                showToast('Acesso negado. O seu utilizador não tem perfil atribuído.', 'error');
                throw new Error('Perfil não encontrado.');
            }
            userRole = profileData.role;
            applyRoleUI();

            // Carrega apenas lideranças para popular selects
            const { data: leadersData, error: leadersError } = await sb
                .from('cidadaos')
                .select('id, name, type')
                .eq('type', 'Liderança')
                .order('name', { ascending: true });
            if (leadersError) throw leadersError;
            allLeaders = leadersData;

            // Carrega demandas com JOIN no cidadao para trazer nome e leader
            // Isso evita depender de allCidadaos (que só tem a página atual)
            const { data: demandasData, error: demandasError } = await sb
                .from('demandas')
                .select('*, cidadao:cidadaos(id, name, leader)')
                .order('created_at', { ascending: false });
            if (demandasError) throw demandasError;
            allDemandas = demandasData;

            // Carrega bairros distintos para o filtro
            await loadBairrosDistintos();

            updateLeaderSelects();
            updateBairroFilter();

            // Primeira página de cidadãos (server-side)
            await loadCidadaosPage(true);

            renderAllDemandas();
            await updateDashboard();
            return true;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    // ── Ajusta interface conforme o perfil do utilizador ────────────────
    function applyRoleUI() {
        if (userRole === 'cadastrador') {
            // Esconde funcionalidades exclusivas do admin
            const els = [
                document.getElementById('generate-report-btn'), // relatório global
                document.getElementById('generate-excel-btn'),  // excel global
                document.getElementById('view-map-btn'),        // mapa global
            ];
            els.forEach(el => { if (el) el.classList.add('hidden'); });
            // Esconde link "Mapa" na sidebar
            document.querySelectorAll('#sidebar-nav a').forEach(a => {
                if (a.getAttribute('href') === '#mapa') a.parentElement.classList.add('hidden');
            });
            // Botão delete nos cards é ocultado em buildCidadaoCard via userRole
        }
    }

    async function loadBairrosDistintos() {
        try {
            const { data, error } = await sb
                .from('cidadaos')
                .select('bairro')
                .not('bairro', 'is', null)
                .order('bairro', { ascending: true });
            if (error) throw error;
            const bairrosUnicos = [...new Set(data.map(c => c.bairro).filter(Boolean))];
            // Guarda para o filtro sem precisar de allCidadaos
            window._bairrosDisponiveis = bairrosUnicos;
        } catch (e) {
            console.warn('Não foi possível carregar bairros:', e);
            window._bairrosDisponiveis = [];
        }
    }

    // ── PERFORMANCE: busca paginada no servidor ────────────────────────────────
    async function loadCidadaosPage(reset = false) {
        if (!cidadaosGrid) return;
        if (reset) {
            cidadaosServerOffset = 0;
            cidadaosGrid.innerHTML = '';
            allCidadaos = []; // limpa cache local
        }

        const s = serverSearchState;
        let query = sb.from('cidadaos').select('*', { count: 'exact' });

        // Filtros aplicados no servidor
        if (s.search) {
            query = query.or(`name.ilike.%${s.search}%,email.ilike.%${s.search}%,cpf.ilike.%${s.search}%`);
        }
        if (s.type)    query = query.eq('type', s.type);
        if (s.bairro)  query = query.eq('bairro', s.bairro);
        if (s.leader)  query = query.eq('leader', s.leader);
        if (s.sexo)    query = query.eq('sexo', s.sexo);

        // Faixa etária: calcula intervalo de datas no servidor
        if (s.faixaEtaria && s.faixaEtaria !== 'N/A') {
            const hoje = new Date();
            const faixas = {
                '0-17':  [0, 17], '18-25': [18, 25], '26-35': [26, 35],
                '36-50': [36, 50], '51-65': [51, 65], '66+':   [66, 150]
            };
            const [minAge, maxAge] = faixas[s.faixaEtaria] || [0, 150];
            const maxDate = new Date(hoje); maxDate.setFullYear(hoje.getFullYear() - minAge);
            const minDate = new Date(hoje); minDate.setFullYear(hoje.getFullYear() - maxAge - 1);
            query = query.gte('dob', minDate.toISOString().split('T')[0])
                         .lte('dob', maxDate.toISOString().split('T')[0]);
        }

        query = query
            .order('name', { ascending: true })
            .range(cidadaosServerOffset, cidadaosServerOffset + CIDADAOS_PAGE_SIZE - 1);

        const { data, error, count } = await query;
        if (error) { console.error(error); showToast('Erro ao carregar cidadãos.', 'error'); return; }

        totalCidadaosCount = count ?? totalCidadaosCount;
        allCidadaos = reset ? data : [...allCidadaos, ...data];
        cidadaosServerOffset += data.length;

        // Renderiza somente o batch novo
        if (reset) cidadaosGrid.innerHTML = '';
        if (allCidadaos.length === 0) {
            cidadaosGrid.innerHTML = '<p class="text-gray-500 col-span-full text-center">Nenhum cidadão encontrado.</p>';
        } else {
            data.forEach(cidadao => cidadaosGrid.appendChild(buildCidadaoCard(cidadao)));
        }

        const loadMoreContainer = document.getElementById('load-more-container');
        if (cidadaosServerOffset < totalCidadaosCount) {
            loadMoreContainer.classList.remove('hidden');
        } else {
            loadMoreContainer.classList.add('hidden');
        }

        // Atualiza contador no topo
        const countEl = document.getElementById('cidadaos-count');
        if (countEl) countEl.textContent = `${totalCidadaosCount} encontrado(s)`;
    }
    async function handleCidadaoFormSubmit(e) {
    e.preventDefault();
    if (!user) {
        showToast("Sessão expirada. Faça login novamente.", "error");
        return;
    }
    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner"></div>';
    const cpf = cidadaoCPF.value.trim();
    const voterid = cidadaoVoterId.value.trim();
    try {
        let photoUrl = cidadaoPhotoUrl.value;
        const file = cidadaoPhotoUpload.files[0];
        if (file) {
            const filePath = `${user.id}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await sb.storage
                .from('fotos-cidadaos') 
                .upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data } = sb.storage
                .from('fotos-cidadaos')
                .getPublicUrl(filePath);
            photoUrl = data.publicUrl;
        }
        let lat = null, long = null;
        const address = `${cidadaoLogradouro.value}, ${cidadaoBairro.value}, ${cidadaoCidade.value}, ${cidadaoEstado.value}`;
        if (cidadaoLogradouro.value && cidadaoCidade.value) {
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
                const data = await response.json();
                if (data && data.length > 0) {
                    lat = parseFloat(data[0].lat);
                    long = parseFloat(data[0].lon);
                }
            } catch (geocodeError) {
                console.error(geocodeError);
            }
        }
        const cidadaoData = {
            name: cidadaoName.value,
            email: cidadaoEmail.value,
            dob: cidadaoDob.value || null,
            sexo: cidadaoSexo.value,
            type: cidadaoType.value,
            leader: cidadaoLeaderSelect.value || null,
            cpf: cpf,
            rg: cidadaoRG.value,
            voterid: voterid,
            phone: cidadaoPhone.value,
            whatsapp: cidadaoWhatsapp.checked,
            profissao: cidadaoProfissao.value,
            cep: cidadaoCEP.value,
            logradouro: cidadaoLogradouro.value,
            numero: cidadaoNumero.value,
            complemento: cidadaoComplemento.value,
            bairro: cidadaoBairro.value,
            cidade: cidadaoCidade.value,
            estado: cidadaoEstado.value,
            sons: parseInt(cidadaoSons.value, 10) || 0,
            daughters: parseInt(cidadaoDaughters.value, 10) || 0,
            children: getChildrenData(),
            localtrabalho: cidadaoLocalTrabalho.value,
            photourl: photoUrl || null,
            latitude: lat,
            longitude: long, 
            updated_at: new Date().toISOString(), 
            user_id: user.id 
        };
        if (currentEditingId) {
            const { error } = await sb
                .from('cidadaos')
                .update(cidadaoData)
                .eq('id', currentEditingId);
            if (error) throw error;
            showToast("Atualizado com sucesso!", "success");
        } else {
            delete cidadaoData.updated_at; 
            const { error } = await sb
                .from('cidadaos')
                .insert(cidadaoData);
            if (error) throw error;
            showToast("Adicionado com sucesso!", "success");
        }
        closeCidadaoModal();
        // Recarrega página e lista de bairros em paralelo (pode ter bairro novo)
        await Promise.all([
            renderCidadaos(),
            loadBairrosDistintos().then(() => updateBairroFilter())
        ]);
        // Atualiza os selects de lideranças se o tipo mudou
        if (cidadaoType.value === 'Liderança') {
            const { data } = await sb.from('cidadaos').select('id, name, type').eq('type', 'Liderança').order('name');
            if (data) { allLeaders = data; updateLeaderSelects(); }
        }
    } catch (error) {
        console.error(error);
        let msg = "Erro ao salvar.";
        if (error.message.includes('duplicate key value violates unique constraint "cidadaos_cpf_key"')) {
            msg = "Este CPF já está cadastrado.";
        } else if (error.message.includes('duplicate key value violates unique constraint "cidadaos_voterid_key"')) {
            msg = "Este Título já está cadastrado.";
        }
        showToast(msg, "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Salvar';
    }
}
    async function handleDemandaFormSubmit(e) {
        e.preventDefault();
        if (!user) {
            showToast("Sessão expirada.", "error");
            return;
        }
        const saveBtn = document.getElementById('save-demanda-btn');
        saveBtn.disabled = true;
        try {
            const demandaData = {
                cidadao_id: document.getElementById('demanda-cidadao-select').value,
                title: document.getElementById('demanda-title').value,
                description: document.getElementById('demanda-description').value,
                status: 'pending',
                user_id: user.id
            };
            const { error } = await sb.from('demandas').insert(demandaData);
            if (error) throw error;
            showToast("Demanda adicionada!", "success");
            closeDemandaModal();
            // Recarrega demandas com JOIN para manter nome do solicitante
            const { data: novasDemandas } = await sb
                .from('demandas')
                .select('*, cidadao:cidadaos(id, name, leader)')
                .order('created_at', { ascending: false });
            if (novasDemandas) { allDemandas = novasDemandas; renderAllDemandas(); await updateDashboard(); }
        } catch (error) {
            console.error(error);
            showToast("Erro ao salvar.", "error");
        } finally {
            saveBtn.disabled = false;
        }
    }
    async function openDemandaDetailsModal(demandaId) {
        viewingDemandaId = demandaId;
        const demanda = allDemandas.find(d => d.id === demandaId);
        if (!demanda) return;
        const nomeSolicitante = demanda.cidadao ? demanda.cidadao.name : (allCidadaos.find(c => c.id === demanda.cidadao_id)?.name || 'Desconhecido');
        document.getElementById('details-demanda-title').textContent = demanda.title;
        document.getElementById('details-demanda-cidadao').textContent = `Solicitante: ${nomeSolicitante}`;
        document.getElementById('details-demanda-description').textContent = demanda.description || 'Sem descrição.';
        const statusSelect = document.getElementById('details-demanda-status');
        statusSelect.value = demanda.status;
        statusSelect.onchange = null; 
        statusSelect.onchange = (e) => updateDemandaStatus(demandaId, e.target.value);
        document.getElementById('delete-demanda-btn').onclick = () => requestDelete(demandaId, 'demanda');
        await loadDemandaNotes(demandaId); 
        demandaDetailsModal.classList.remove('hidden');
    }
    async function updateDemandaStatus(demandaId, newStatus) {
        if (!user) return;
        try {
            const { error } = await sb
                .from('demandas')
                .update({ 
                    status: newStatus, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', demandaId);
            if (error) throw error;
            const { error: noteError } = await sb
                .from('notes')
                .insert({
                    text: `Status alterado para: ${getStatusInfo(newStatus).text}`,
                    author: "Sistema",
                    demanda_id: demandaId,
                    user_id: user.id
                });
            if (noteError) throw noteError;
            showToast("Status atualizado!", "success");
            // PERFORMANCE: atualiza apenas o objeto local da demanda
            const idx = allDemandas.findIndex(d => d.id === demandaId);
            if (idx !== -1) { allDemandas[idx].status = newStatus; allDemandas[idx].updated_at = new Date().toISOString(); }
            renderAllDemandas();
            await loadDemandaNotes(demandaId);
        } catch (error) {
            console.error(error);
            showToast("Erro ao atualizar status.", "error");
        }
    }
    async function loadDemandaNotes(demandaId) {
        if (!user) return;
        const notesListEl = document.getElementById('demanda-notes-list');
        notesListEl.innerHTML = '<p class="text-sm text-gray-500">A carregar...</p>';
        try {
            const { data: notes, error } = await sb
                .from('notes')
                .select('*')
                .eq('demanda_id', demandaId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            if (!notes || notes.length === 0) {
                notesListEl.innerHTML = '<p class="text-sm text-gray-500">Nenhum registo.</p>';
                return;
            }
            notesListEl.innerHTML = '';
            notes.forEach(note => {
                const noteEl = document.createElement('div');
                noteEl.className = 'p-3 bg-gray-100 rounded-lg';
                noteEl.innerHTML = `<p class="text-sm text-gray-800">${note.text}</p><p class="text-xs text-gray-500 text-right">${note.author || 'Utilizador'} - ${new Date(note.created_at).toLocaleString('pt-BR')}</p>`;
                notesListEl.appendChild(noteEl);
            });
            notesListEl.scrollTop = notesListEl.scrollHeight;
        } catch (error) {
            console.error(error);
            notesListEl.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar.</p>';
        }
    }
    async function handleAddNoteSubmit(e) {
        e.preventDefault();
        if (!user || !viewingDemandaId) return;
        const newNoteText = document.getElementById('new-note-text');
        const text = newNoteText.value.trim();
        if (!text) return;
        try {
            const { error } = await sb
                .from('notes')
                .insert({
                    text: text,
                    author: user.email || "Utilizador",
                    demanda_id: viewingDemandaId,
                    user_id: user.id
                });
            if (error) throw error;
            newNoteText.value = ''; 
            await loadDemandaNotes(viewingDemandaId); 
        } catch (error) {
            console.error(error);
            showToast("Erro ao salvar.", "error");
        }
    }
    async function handleDeleteConfirmation() {
        const { id, type } = itemToDelete;
        if (!id || !type || !user) return;
        const btn = document.getElementById('confirm-delete-btn');
        btn.disabled = true;
        try {
            if (type === 'cidadao') {
                const { error } = await sb
                    .from('cidadaos')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                showToast("Cidadão excluído.", "success");
            } else if (type === 'demanda') {
                 const { error } = await sb
                    .from('demandas')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                closeDemandaDetailsModal(); 
                showToast("Demanda excluída.", "success");
            }
            // PERFORMANCE: remove do cache local e re-renderiza sem ir ao servidor
            if (type === 'cidadao') {
                allCidadaos = allCidadaos.filter(c => c.id !== id);
                await renderCidadaos();
            } else {
                allDemandas = allDemandas.filter(d => d.id !== id);
                renderAllDemandas();
            }
            await updateDashboard();
        } catch (error) {
            console.error(error);
            showToast(`Erro ao excluir.`, "error");
        } finally {
            btn.disabled = false;
            closeConfirmationModal();
        }
    }
    function getFilteredCidadaos() {
        const searchTerm = searchInput.value.toLowerCase();
        const type = filterType.value;
        const bairro = filterBairro.value;
        const leader = filterLeader.value;
        const sexo = filterSexo.value;
        const faixaEtaria = filterFaixaEtaria.value;
        const filtered = allCidadaos.filter(cidadao => {
            const nameMatch = searchInput.value && cidadao.name.toLowerCase().includes(searchTerm);
            const emailMatch = (cidadao.email || '').toLowerCase().includes(searchTerm);
            const cpfMatch = (cidadao.cpf || '').includes(searchTerm);
            const typeMatch = !type || cidadao.type === type;
            const bairroMatch = !bairro || cidadao.bairro === bairro;
            const leaderMatch = !leader || cidadao.leader === leader;
            const sexoMatch = !sexo || (cidadao.sexo || 'Não Informar') === sexo;
            const ageMatch = !faixaEtaria || getFaixaEtaria(cidadao.dob) === faixaEtaria;
            const generalMatch = !searchTerm || nameMatch || emailMatch || cpfMatch;
            return generalMatch && typeMatch && bairroMatch && leaderMatch && sexoMatch && ageMatch;
        });
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        return filtered;
    }
    // ── PERFORMANCE: card construído como elemento DOM (sem innerHTML com dados de usuário) ─
    function buildCidadaoCard(cidadao) {
        const card = document.createElement('div');
        card.className = 'bg-white p-5 rounded-lg shadow-md flex flex-col transition-shadow hover:shadow-lg';
        const initials = getInitials(cidadao.name);
        const photoUrl = cidadao.photourl;
        card.innerHTML = `
            <div class="flex items-center gap-4 mb-4">
                ${photoUrl
                    ? `<img src="${photoUrl}" alt="" class="w-16 h-16 rounded-full object-cover bg-gray-200" onerror="this.src='https://placehold.co/100x100/E2E8F0/64748B?text=${encodeURIComponent(initials)}'">`
                    : `<div class="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold">${initials}</div>`}
                <div class="flex-1 min-w-0"><h3 class="text-lg font-bold text-gray-800 truncate"></h3><p class="text-sm text-gray-600 card-type"></p></div>
            </div>
            <div class="space-y-2 text-sm text-gray-700 mb-4 flex-1">
                <p class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0 1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><span class="truncate email-cell"></span></p>
                <p class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span class="phone-cell"></span></p>
                <p class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span class="bairro-cell"></span></p>
            </div>
            <div class="border-t pt-4 flex gap-2">
                <button class="btn-view-details flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium">Ver Detalhes</button>
                <button class="btn-edit flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium">Editar</button>
                <button class="btn-add-demanda bg-purple-500 hover:bg-purple-600 text-white py-2 px-3 rounded-lg text-sm font-medium">Demanda</button>
                <button class="btn-delete bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-lg text-sm font-medium"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
            </div>`;
        // textContent para prevenir XSS
        card.querySelector('h3').textContent = cidadao.name;
        card.querySelector('.card-type').textContent = cidadao.type;
        card.querySelector('.email-cell').textContent = cidadao.email || 'N/A';
        card.querySelector('.phone-cell').textContent = cidadao.phone || 'Não informado';
        card.querySelector('.bairro-cell').textContent = cidadao.bairro || 'Não informado';
        card.querySelector('.btn-view-details').addEventListener('click', () => openDetailsModal(cidadao.id));
        card.querySelector('.btn-edit').addEventListener('click', () => openCidadaoModal(cidadao.id));
        card.querySelector('.btn-add-demanda').addEventListener('click', () => openDemandaModal(cidadao.id));
        const deleteBtn = card.querySelector('.btn-delete');
        if (userRole === 'cadastrador') {
            deleteBtn.classList.add('hidden'); // cadastrador não pode excluir
        } else {
            deleteBtn.addEventListener('click', () => requestDelete(cidadao.id, 'cidadao'));
        }
        return card;
    }

    // renderCidadaos dispara busca no servidor com os filtros atuais
    function renderCidadaos() {
        serverSearchState = {
            search:      searchInput.value.toLowerCase().trim(),
            type:        filterType.value,
            bairro:      filterBairro.value,
            leader:      filterLeader.value,
            sexo:        filterSexo.value,
            faixaEtaria: filterFaixaEtaria.value
        };
        loadCidadaosPage(true);
    }

    // "Carregar mais" — próxima página server-side
    function renderMoreCidadaos() {
        loadCidadaosPage(false);
    }
    function renderAllDemandas() {
        if (!allDemandasList) return;
        const statusFilter = demandaFilterStatus.value;
        const leaderFilter = demandaFilterLeader.value;
        const filteredDemandas = allDemandas.filter(demanda => {
            const statusMatch = !statusFilter || demanda.status === statusFilter;
            // Usa o JOIN (demanda.cidadao) em vez de allCidadaos.find
            const leaderMatch = !leaderFilter || (demanda.cidadao && demanda.cidadao.leader === leaderFilter);
            return statusMatch && leaderMatch;
        });
        allDemandasList.innerHTML = '';
        if (filteredDemandas.length === 0) {
            allDemandasList.innerHTML = '<p class="text-gray-500 text-center">Nenhuma demanda encontrada.</p>';
            return;
        }
        filteredDemandas.forEach(demanda => {
            // Nome do solicitante vem do JOIN, não de allCidadaos
            const nomeSolicitante = demanda.cidadao ? demanda.cidadao.name : 'Desconhecido';
            const statusInfo = getStatusInfo(demanda.status);
            const item = document.createElement('div');
            item.className = 'bg-white p-4 rounded-lg shadow-sm border flex justify-between items-center cursor-pointer hover:shadow-md';
            const titleEl = document.createElement('h3');
            titleEl.className = 'text-lg font-semibold text-gray-800';
            titleEl.textContent = demanda.title;
            const solicitanteEl = document.createElement('p');
            solicitanteEl.className = 'text-sm text-gray-600';
            solicitanteEl.innerHTML = 'Solicitante: <span class="font-medium text-blue-600"></span>';
            solicitanteEl.querySelector('span').textContent = nomeSolicitante;
            const dataEl = document.createElement('p');
            dataEl.className = 'text-sm text-gray-500';
            dataEl.textContent = `Data: ${demanda.created_at ? new Date(demanda.created_at).toLocaleDateString('pt-BR') : 'N/A'}`;
            const infoDiv = document.createElement('div');
            infoDiv.className = 'flex-1';
            infoDiv.appendChild(titleEl);
            infoDiv.appendChild(solicitanteEl);
            infoDiv.appendChild(dataEl);
            const statusDiv = document.createElement('div');
            const statusSpan = document.createElement('span');
            statusSpan.className = statusInfo.classes;
            statusSpan.textContent = statusInfo.text;
            statusDiv.appendChild(statusSpan);
            item.appendChild(infoDiv);
            item.appendChild(statusDiv);
            item.addEventListener('click', () => openDemandaDetailsModal(demanda.id));
            allDemandasList.appendChild(item);
        });
    }
    function updateLeaderSelects() {
        const selects = [cidadaoLeaderSelect, filterLeader, demandaFilterLeader];
        selects.forEach(select => {
            if (!select) return;
            const currentValue = select.value;
            select.innerHTML = `<option value="">${select.id === 'cidadao-leader' ? 'Nenhuma' : 'Filtrar por Liderança'}</option>`;
            allLeaders.forEach(leader => {
                const option = document.createElement('option');
                option.value = leader.id;
                option.textContent = leader.name;
                select.appendChild(option);
            });
            select.value = currentValue;
        });
    }
    function updateBairroFilter() {
        if (!filterBairro) return;
        const currentValue = filterBairro.value;
        // PERFORMANCE: usa lista de bairros carregada uma única vez no servidor
        const bairros = window._bairrosDisponiveis || [];
        filterBairro.innerHTML = '<option value="">Filtrar por Bairro</option>';
        bairros.forEach(bairro => {
            const option = document.createElement('option');
            option.value = bairro;
            option.textContent = bairro;
            filterBairro.appendChild(option);
        });
        filterBairro.value = currentValue;
    }
    function clearCidadaoFilters() {
        searchInput.value = '';
        filterType.value = '';
        filterBairro.value = '';
        filterLeader.value = '';
        filterSexo.value = '';
        filterFaixaEtaria.value = '';
        renderCidadaos();
    }
    function clearDemandaFilters() {
        demandaFilterStatus.value = '';
        demandaFilterLeader.value = '';
        renderAllDemandas();
    }
    async function updateDashboard() {
        const totalEl = document.getElementById('dashboard-total-cidadaos');
        // Admin vê totais globais; cadastrador vê só os seus (RLS já filtra automaticamente)
        if (userRole === 'admin' && totalCidadaosCount > 0) {
            totalEl.textContent = totalCidadaosCount;
        } else {
            const { count } = await sb.from('cidadaos').select('*', { count: 'exact', head: true });
            totalCidadaosCount = count || 0;
            totalEl.textContent = totalCidadaosCount;
        }
        document.getElementById('dashboard-total-demandas').textContent = allDemandas.length;
        await updateAniversariantes();
        updateDemandasRecentes();
        updateCidadaosPorTipoChart();
        updateDemandasPorStatusChart();
        updateCidadaosPorBairroChart();
        updateCidadaosPorSexoChart();
        updateCidadaosPorFaixaEtariaChart();
    }
    async function updateAniversariantes() {
        const listEl = document.getElementById('aniversariantes-list');
        if (!listEl) return;
        listEl.innerHTML = '<p class="text-sm text-gray-400">A carregar...</p>';
        try {
            const now = new Date();
            const mes = now.getMonth() + 1; // 1-12

            // dob é armazenado como 'YYYY-MM-DD' — extrai o mês com SUBSTRING
            // gte/lte no formato '-MM-' seria ambíguo; usamos gte/lte no campo do mês
            // Filtramos todos os dob onde SUBSTRING(dob, 6, 2) = mes (posição do mês no formato ISO)
            // Busca só id, name e dob — leve, sem dados pesados
            // Filtragem por mês feita no cliente pois dob é tipo DATE no Postgres
            // (ilike não funciona em DATE, e EXTRACT requer RPC)
            const { data, error } = await sb
                .from('cidadaos')
                .select('id, name, dob')
                .not('dob', 'is', null);
            if (error) throw error;

            const aniversariantes = (data || [])
                .filter(c => {
                    const dobMes = parseInt(c.dob.split('-')[1], 10);
                    return dobMes === mes;
                })
                .sort((a, b) => parseInt(a.dob.split('-')[2]) - parseInt(b.dob.split('-')[2]));
            listEl.innerHTML = '';
            if (!aniversariantes || aniversariantes.length === 0) {
                listEl.innerHTML = '<p class="text-sm text-gray-500">Nenhum aniversariante este mês.</p>';
                return;
            }
            aniversariantes.forEach(c => {
                const parts = c.dob.split('-');
                const dia = parts[2];
                const item = document.createElement('div');
                item.className = 'flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'font-medium text-gray-700';
                nameSpan.textContent = c.name;
                const diaSpan = document.createElement('span');
                diaSpan.className = 'font-bold text-blue-600';
                diaSpan.textContent = dia;
                item.appendChild(nameSpan);
                item.appendChild(diaSpan);
                item.addEventListener('click', () => { openDetailsModal(c.id); });
                listEl.appendChild(item);
            });
        } catch(e) {
            console.error(e);
            listEl.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar.</p>';
        }
    }
    function updateDemandasRecentes() {
        const listEl = document.getElementById('demandas-recentes-list');
        if (!listEl) return;
        const recentes = allDemandas.slice(0, 5);
        listEl.innerHTML = '';
        if (recentes.length === 0) {
            listEl.innerHTML = '<p class="text-sm text-gray-500">Nenhuma demanda recente.</p>';
            return;
        }
        recentes.forEach(d => {
            const nomeSolicitante = d.cidadao ? d.cidadao.name : (allCidadaos.find(c => c.id === d.cidadao_id)?.name || 'Desconhecido');
            const statusInfo = getStatusInfo(d.status);
            const item = document.createElement('div');
            item.className = 'p-2 rounded-lg hover:bg-gray-50 border-b last:border-b-0 cursor-pointer';
            const topDiv = document.createElement('div');
            topDiv.className = 'flex justify-between items-center mb-1';
            const titleSpan = document.createElement('span');
            titleSpan.className = 'font-semibold text-gray-800';
            titleSpan.textContent = d.title;
            const statusSpan = document.createElement('span');
            statusSpan.className = statusInfo.classes + ' !py-0.5 !px-2';
            statusSpan.textContent = statusInfo.text;
            topDiv.appendChild(titleSpan);
            topDiv.appendChild(statusSpan);
            const infoP = document.createElement('p');
            infoP.className = 'text-sm text-gray-600';
            infoP.textContent = `${nomeSolicitante} - ${d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : 'N/A'}`;
            item.appendChild(topDiv);
            item.appendChild(infoP);
            item.addEventListener('click', () => { openDemandaDetailsModal(d.id); });
            listEl.appendChild(item);
        });
    }
    async function updateCidadaosPorTipoChart() {
        const ctx = document.getElementById('cidadaos-por-tipo-chart');
        if (!ctx) return;
        try {
            // Busca todos os tipos existentes no banco — sem hardcode, pega qualquer tipo cadastrado
            const { data, error } = await sb
                .from('cidadaos')
                .select('type')
                .not('type', 'is', null);
            if (error) throw error;

            // Agrupa por tipo no cliente
            const contagem = (data || []).reduce((acc, c) => {
                acc[c.type] = (acc[c.type] || 0) + 1;
                return acc;
            }, {});

            const labels = Object.keys(contagem);
            const values = Object.values(contagem);
            const cores = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6B7280'];

            if (cidadaosChart) cidadaosChart.destroy();
            cidadaosChart = new Chart(ctx, {
                type: 'pie',
                data: { labels, datasets: [{ label: 'Cidadãos por Tipo', data: values, backgroundColor: cores.slice(0, labels.length) }] },
                options: { responsive: true, maintainAspectRatio: false }
            });
        } catch(e) { console.warn('Chart tipo:', e); }
    }
    function updateDemandasPorStatusChart() {
        const ctx = document.getElementById('demandas-por-status-chart');
        if (!ctx) return;
        const data = allDemandas.reduce((acc, d) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {});
        const labels = Object.keys(data).map(s => getStatusInfo(s).text);
        const values = Object.values(data);
        const colors = Object.keys(data).map(s => getStatusInfo(s).color);
        if (demandasChart) demandasChart.destroy();
        demandasChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: labels, datasets: [{ label: 'Demandas por Status', data: values, backgroundColor: colors, }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    async function updateCidadaosPorBairroChart() {
        const ctx = document.getElementById('cidadaos-por-bairro-chart');
        if (!ctx) return;
        // PERFORMANCE: usa dados do servidor para gráfico preciso com 25k registros
        try {
            const { data, error } = await sb.rpc('count_by_bairro');
            // Se a RPC não existir, usa bairros já disponíveis
            if (error || !data) {
                // Fallback: agrupa os bairros disponíveis (pode não ser 100% preciso sem RPC)
                const bairros = window._bairrosDisponiveis || [];
                if (cidadaosBairroChart) cidadaosBairroChart.destroy();
                cidadaosBairroChart = new Chart(ctx, {
                    type: 'bar',
                    data: { labels: bairros.slice(0, 10), datasets: [{ label: 'Bairros', data: new Array(Math.min(bairros.length,10)).fill(0), backgroundColor: '#10B981' }] },
                    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true } } }
                });
                return;
            }
            const labels = data.map(r => r.bairro || 'N/A');
            const values = data.map(r => r.total);
            if (cidadaosBairroChart) cidadaosBairroChart.destroy();
            cidadaosBairroChart = new Chart(ctx, {
                type: 'bar',
                data: { labels, datasets: [{ label: 'Cidadãos por Bairro (Top 10)', data: values, backgroundColor: '#10B981' }] },
                options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }
            });
        } catch(e) { console.warn('Chart bairro:', e); }
    }
    function updateCidadaosPorSexoChart() {
        const ctx = document.getElementById('cidadaos-por-sexo-chart');
        if (!ctx) return;
        const data = allCidadaos.reduce((acc, c) => { const sexo = c.sexo || 'Não Informar'; acc[sexo] = (acc[sexo] || 0) + 1; return acc; }, {});
        const labels = Object.keys(data);
        const values = Object.values(data);
        if (cidadaosSexoChart) cidadaosSexoChart.destroy();
        cidadaosSexoChart = new Chart(ctx, {
            type: 'pie',
            data: { labels: labels, datasets: [{ label: 'Cidadãos por Sexo', data: values, backgroundColor: ['#3B82F6', '#EC4899', '#F59E0B', '#6B7280'], }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    function updateCidadaosPorFaixaEtariaChart() {
        const ctx = document.getElementById('cidadaos-por-faixa-etaria-chart');
        if (!ctx) return;
        const faixas = { '0-17': 0, '18-25': 0, '26-35': 0, '36-50': 0, '51-65': 0, '66+': 0, 'N/A': 0 };
        allCidadaos.forEach(c => { const faixa = getFaixaEtaria(c.dob); faixas[faixa]++; });
        const labels = Object.keys(faixas);
        const values = Object.values(faixas);
        if (cidadaosFaixaEtariaChart) cidadaosFaixaEtariaChart.destroy();
        cidadaosFaixaEtariaChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: labels, datasets: [{ label: 'Cidadãos por Faixa Etária', data: values, backgroundColor: '#8B5CF6', }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });
    }
    async function openCidadaoModal(cidadaoId = null) {
        currentEditingId = cidadaoId;
        cidadaoForm.reset();
        fileNameDisplay.textContent = 'Nenhum ficheiro selecionado';
        childrenDetailsContainer.innerHTML = '';
        const titleEl = document.getElementById('cidadao-modal-title');
        if (cidadaoId) {
            titleEl.textContent = 'Editar Cidadão';
            const cidadao = allCidadaos.find(c => c.id === cidadaoId);
            if (cidadao) {
                cidadaoName.value = cidadao.name || '';
                cidadaoEmail.value = cidadao.email || '';
                cidadaoDob.value = cidadao.dob || '';
                cidadaoSexo.value = cidadao.sexo || 'Não Informar';
                cidadaoType.value = cidadao.type || 'Cidadão Comum';
                cidadaoLeaderSelect.value = cidadao.leader || '';
                cidadaoCPF.value = cidadao.cpf || '';
                cidadaoRG.value = cidadao.rg || '';
                cidadaoVoterId.value = cidadao.voterid || '';
                cidadaoPhone.value = cidadao.phone || '';
                cidadaoWhatsapp.checked = cidadao.whatsapp || false;
                cidadaoProfissao.value = cidadao.profissao || '';
                cidadaoLocalTrabalho.value = cidadao.localtrabalho || '';
                cidadaoPhotoUrl.value = cidadao.photourl || '';
                cidadaoLat.value = cidadao.latitude || ''; 
                cidadaoLong.value = cidadao.longitude || ''; 
                cidadaoCEP.value = cidadao.cep || '';
                cidadaoLogradouro.value = cidadao.logradouro || '';
                cidadaoNumero.value = cidadao.numero || '';
                cidadaoComplemento.value = cidadao.complemento || '';
                cidadaoBairro.value = cidadao.bairro || '';
                cidadaoCidade.value = cidadao.cidade || '';
                cidadaoEstado.value = cidadao.estado || '';
                cidadaoSons.value = cidadao.sons || 0;
                cidadaoDaughters.value = cidadao.daughters || 0;
                updateChildrenInputs('filho', cidadao.children);
                updateChildrenInputs('filha', cidadao.children);
            }
        } else {
            titleEl.textContent = 'Adicionar Novo Cidadão';
        }
        cidadaoModal.classList.remove('hidden');
        setTimeout(() => { modalContent.classList.remove('scale-95', 'opacity-0'); }, 10);
    }
    function closeCidadaoModal() {
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { cidadaoModal.classList.add('hidden'); }, 300);
    }
    function updateChildrenInputs(type, childrenData = null) {
        const count = (type === 'filho' ? cidadaoSons.value : cidadaoDaughters.value) || 0;
        const containerId = type === 'filho' ? 'sons-inputs' : 'daughters-inputs';
        const label = type === 'filho' ? 'Filho' : 'Filha';
        let container = document.getElementById(containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'space-y-3 p-4 bg-gray-50 rounded-lg';
            childrenDetailsContainer.appendChild(container);
        }
        container.innerHTML = '';
        if (count > 0) {
            container.innerHTML += `<h4 class="font-medium text-gray-700">${label}s:</h4>`;
        }
        for (let i = 0; i < count; i++) {
            const existingChild = (childrenData || []).find(c => c.type === type && c.index === i);
            container.innerHTML += `<div class="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label class="block text-xs font-medium text-gray-600">${label} ${i + 1} - Nome</label><input type="text" data-type="${type}" data-index="${i}" data-field="name" class="w-full border border-gray-300 p-2 rounded-lg mt-1" value="${existingChild?.name || ''}"></div><div><label class="block text-xs font-medium text-gray-600">${label} ${i + 1} - Data Nasc.</label><input type="date" data-type="${type}" data-index="${i}" data-field="dob" class="w-full border border-gray-300 p-2 rounded-lg mt-1" value="${existingChild?.dob || ''}"></div></div>`;
        }
    }
    function getChildrenData() {
        const children = [];
        const inputs = childrenDetailsContainer.querySelectorAll('input[data-type]');
        inputs.forEach(input => {
            const type = input.dataset.type;
            const index = parseInt(input.dataset.index, 10);
            const field = input.dataset.field;
            const value = input.value;
            let child = children.find(c => c.type === type && c.index === index);
            if (!child) {
                child = { type, index };
                children.push(child);
            }
            child[field] = value;
        });
        return children.filter(c => c.name && c.dob);
    }
    async function handleCEPBlur(e) {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                if (!response.ok) throw new Error('CEP não encontrado');
                const data = await response.json();
                if (data.erro) {
                    showToast("CEP não encontrado.", "warning");
                } else {
                    cidadaoLogradouro.value = data.logradouro;
                    cidadaoBairro.value = data.bairro;
                    cidadaoCidade.value = data.localidade;
                    cidadaoEstado.value = data.uf;
                    cidadaoNumero.focus();
                }
            } catch (error) {
                console.error(error);
                showToast("Erro ao consultar o CEP.", "error");
            }
        }
    }
    async function openDetailsModal(cidadaoId) {
        currentCidadaoIdForDetails = cidadaoId;
        // Tenta achar no cache local primeiro; se não estiver (paginação), busca no servidor
        let cidadao = allCidadaos.find(c => c.id === cidadaoId);
        if (!cidadao) {
            const { data, error } = await sb
                .from('cidadaos')
                .select('*')
                .eq('id', cidadaoId)
                .single();
            if (error || !data) return;
            cidadao = data;
        }
        const detailsModal = document.getElementById('cidadao-details-modal');
        const content = detailsModal.querySelector('.transform');
        const photoEl = document.getElementById('details-photo');
        if (cidadao.photourl) { 
            photoEl.innerHTML = `<img src="${cidadao.photourl}" alt="${cidadao.name}" class="w-24 h-24 rounded-full object-cover bg-gray-200" onerror="this.src='https://placehold.co/100x100/E2E8F0/64748B?text=${getInitials(cidadao.name)}'">`;
        } else {
            photoEl.innerHTML = `<div class="w-24 h-24 rounded-full bg-blue-500 text-white flex items-center justify-center text-4xl font-bold">${getInitials(cidadao.name)}</div>`;
        }
        document.getElementById('details-name').textContent = cidadao.name;
        document.getElementById('details-type').textContent = cidadao.type;
        document.getElementById('details-email').textContent = cidadao.email || 'Não informado';
        document.getElementById('details-phone').textContent = cidadao.phone ? `${cidadao.phone} ${cidadao.whatsapp ? '(WhatsApp)' : ''}` : 'Não informado';
        const addressParts = [cidadao.logradouro, cidadao.numero, cidadao.complemento, cidadao.bairro, cidadao.cidade, cidadao.estado, cidadao.cep].filter(Boolean);
        document.getElementById('details-address').textContent = addressParts.join(', ') || 'Não informado';
        document.getElementById('details-cpf').textContent = cidadao.cpf || 'Não informado';
        document.getElementById('details-rg').textContent = cidadao.rg || 'Não informado';
        document.getElementById('details-voterid').textContent = cidadao.voterid || 'Não informado';
        document.getElementById('details-dob').textContent = cidadao.dob ? formatarData(cidadao.dob) : 'Não informado';
        document.getElementById('details-sexo').textContent = cidadao.sexo || 'Não Informar';
        document.getElementById('details-profissao').textContent = cidadao.profissao || 'Não informado';
        document.getElementById('details-local-trabalho').textContent = cidadao.localtrabalho || 'Não informado';
        const leader = allLeaders.find(l => l.id === cidadao.leader);
        document.getElementById('details-leader').textContent = leader ? leader.name : 'Nenhuma';
        const childrenEl = document.getElementById('details-children');
        const totalFilhos = (cidadao.sons || 0) + (cidadao.daughters || 0);
        childrenEl.innerHTML = `<strong>Família:</strong> ${totalFilhos} filho(s)`;
        if (cidadao.children && cidadao.children.length > 0) {
            const childrenList = cidadao.children.map(c => `<li class="text-sm ml-4">${c.name} (${formatarData(c.dob)})</li>`).join('');
            childrenEl.innerHTML += `<ul class="list-disc list-inside">${childrenList}</ul>`;
        }
        document.getElementById('details-view-map-btn').onclick = () => {
            closeDetailsModal();
            openMapModal([cidadao]);
        };
        document.getElementById('details-share-location-btn').onclick = () => shareLocation(cidadao);
        detailsModal.classList.remove('hidden');
        setTimeout(() => { content.classList.remove('scale-95', 'opacity-0'); }, 10);
    }
    function closeDetailsModal() {
        const detailsModal = document.getElementById('cidadao-details-modal');
        const content = detailsModal.querySelector('.transform');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            detailsModal.classList.add('hidden');
            currentCidadaoIdForDetails = null;
        }, 300);
    }
    function shareLocation(cidadao) {
        if (!cidadao.logradouro || !cidadao.cidade) {
            showToast("Endereço incompleto.", "warning");
            return;
        }
        const address = `${cidadao.logradouro}, ${cidadao.numero || 'S/N'}, ${cidadao.bairro}, ${cidadao.cidade}, ${cidadao.estado}`;
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        const text = `Olá! Aqui está a localização de ${cidadao.name}:\n${address}\n\nVer no mapa:\n${url}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    }
    async function openDemandaModal(cidadaoId = null) {
        currentEditingDemandaId = null;
        demandaForm.reset();
        currentCidadaoIdForDemanda = cidadaoId;
        const searchEl = document.getElementById('demanda-cidadao-search');
        const demandaCidadaoSelect = document.getElementById('demanda-cidadao-select');
        searchEl.value = '';
        demandaCidadaoSelect.innerHTML = '<option value="" disabled selected>Digite o nome para buscar...</option>';

        // Se veio com um cidadão específico (botão "Demanda" no card), pré-carrega ele
        if (cidadaoId) {
            const cidadao = allCidadaos.find(c => c.id === cidadaoId);
            if (cidadao) {
                const opt = document.createElement('option');
                opt.value = cidadao.id;
                opt.textContent = cidadao.name;
                demandaCidadaoSelect.appendChild(opt);
                demandaCidadaoSelect.value = cidadaoId;
            }
        }

        // PERFORMANCE: busca cidadãos dinamicamente conforme o usuário digita (não carrega 25k)
        let demandaSearchDebounce;
        searchEl.oninput = () => {
            clearTimeout(demandaSearchDebounce);
            demandaSearchDebounce = setTimeout(async () => {
                const term = searchEl.value.trim();
                if (term.length < 2) return;
                const { data } = await sb
                    .from('cidadaos')
                    .select('id, name')
                    .ilike('name', `%${term}%`)
                    .order('name')
                    .limit(20);
                if (!data) return;
                const currentVal = demandaCidadaoSelect.value;
                demandaCidadaoSelect.innerHTML = '<option value="" disabled>Selecione...</option>';
                data.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    demandaCidadaoSelect.appendChild(opt);
                });
                if (currentVal) demandaCidadaoSelect.value = currentVal;
            }, 300);
        };

        demandaModal.classList.remove('hidden');
    }
    function closeDemandaModal() {
        demandaModal.classList.add('hidden');
    }
    function closeDemandaDetailsModal() {
        demandaDetailsModal.classList.add('hidden');
        viewingDemandaId = null;
    }
    function requestDelete(itemId, type) {
        itemToDelete = { id: itemId, type: type };
        const modal = document.getElementById('confirmation-modal');
        const title = document.getElementById('confirmation-title');
        const message = document.getElementById('confirmation-message');
        if (type === 'cidadao') {
            const cidadao = allCidadaos.find(c => c.id === itemId);
            title.textContent = 'Excluir Cidadão';
            message.textContent = `Tem a certeza que quer excluir "${cidadao.name}"?`;
        } else if (type === 'demanda') {
            const demanda = allDemandas.find(d => d.id === itemId);
            title.textContent = 'Excluir Demanda';
            message.textContent = `Tem a certeza que quer excluir "${demanda.title}"?`;
        }
        modal.classList.remove('hidden');
    }
    function closeConfirmationModal() {
        document.getElementById('confirmation-modal').classList.add('hidden');
        itemToDelete = { id: null, type: null };
    }
    function initializeMap() {
    if (map) { map.remove(); }
    map = L.map('map').setView([-0.03964, -51.18182], 13); 
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    markers = [];
}
async function openMapModal(cidadaosToPlot = null) {
    mapModal.classList.remove('hidden');
    if (!map) {
        initializeMap();
        await new Promise(resolve => setTimeout(resolve, 200));
    } else {
        markers.forEach(m => { try { m.remove(); } catch(e) {} });
        markers = [];
        // Remove cluster anterior se existir
        if (map._clusterGroup) { map.removeLayer(map._clusterGroup); map._clusterGroup = null; }
    }
    if (map) map.invalidateSize();

    // PERFORMANCE: se não recebeu lista específica, busca só cidadãos com coordenadas do servidor
    let cidadaos = cidadaosToPlot;
    if (!cidadaos) {
        const { data } = await sb
            .from('cidadaos')
            .select('id, name, type, latitude, longitude, logradouro, numero')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .limit(5000); // limite razoável para o mapa
        cidadaos = data || [];
    }

    const bounds = [];
    // PERFORMANCE: usa MarkerClusterGroup se disponível, senão marcadores normais
    const useCluster = typeof L.markerClusterGroup === 'function';
    const clusterGroup = useCluster ? L.markerClusterGroup({ chunkedLoading: true }) : null;
    if (clusterGroup) { map._clusterGroup = clusterGroup; }

    for (const cidadao of cidadaos) {
        if (cidadao.latitude && cidadao.longitude) {
            try {
                const latLng = [parseFloat(cidadao.latitude), parseFloat(cidadao.longitude)];
                const marker = L.marker(latLng);
                const popupEl = document.createElement('div');
                const nameEl = document.createElement('strong');
                nameEl.textContent = cidadao.name;
                const typeEl = document.createElement('span');
                typeEl.textContent = ' — ' + cidadao.type;
                popupEl.appendChild(nameEl);
                popupEl.appendChild(typeEl);
                marker.bindPopup(popupEl);
                if (clusterGroup) { clusterGroup.addLayer(marker); } else { marker.addTo(map); }
                markers.push(marker);
                bounds.push(latLng);
            } catch (error) { console.warn(error); }
        }
    }
    if (clusterGroup) map.addLayer(clusterGroup);

    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
    } else {
        map.setView([-0.03964, -51.18182], 13);
    }
}
function closeMapModal() {
    mapModal.classList.add('hidden');
}
    async function generatePrintReport() {
        // Busca TODOS os cidadãos com os filtros ativos — não apenas a página atual
        showToast("A gerar relatório...", "info");
        const s = serverSearchState;
        let query = sb.from('cidadaos').select('name, type, phone, whatsapp, email, logradouro, numero, complemento, bairro, cidade, estado, cep');
        if (s.search)  query = query.or(`name.ilike.%${s.search}%,email.ilike.%${s.search}%,cpf.ilike.%${s.search}%`);
        if (s.type)    query = query.eq('type', s.type);
        if (s.bairro)  query = query.eq('bairro', s.bairro);
        if (s.leader)  query = query.eq('leader', s.leader);
        if (s.sexo)    query = query.eq('sexo', s.sexo);
        query = query.order('name', { ascending: true });

        const { data, error } = await query;
        if (error || !data || data.length === 0) {
            showToast("Nenhum cidadão encontrado.", "warning");
            return;
        }
        const reportWindow = window.open('', '', 'width=800,height=600');
        reportWindow.document.write('<html><head><title>Relatório</title>');
        reportWindow.document.write(`<style> body { font-family: Arial, sans-serif; margin: 20px; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; } h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; } @media print { button { display: none; } } </style>`);
        reportWindow.document.write('</head><body>');
        reportWindow.document.write('<h1>Relatório de Cidadãos</h1>');
        reportWindow.document.write(`<p>Total: ${data.length}</p>`);
        reportWindow.document.write('<button onclick="window.print()">Imprimir</button>');
        reportWindow.document.write('<table>');
        reportWindow.document.write(`<thead><tr><th>Nome</th><th>Tipo</th><th>Telefone</th><th>Email</th><th>Endereço</th></tr></thead><tbody>`);
        data.forEach(cidadao => {
            const addressParts = [cidadao.logradouro, cidadao.numero, cidadao.complemento, cidadao.bairro, cidadao.cidade, cidadao.estado, cidadao.cep].filter(Boolean);
            const endereco = addressParts.join(', ') || 'Não informado';
            // Escapa HTML para evitar XSS no relatório
            const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            reportWindow.document.write(`<tr><td>${esc(cidadao.name)}</td><td>${esc(cidadao.type)}</td><td>${esc(cidadao.phone)} ${cidadao.whatsapp ? '(W)' : ''}</td><td>${esc(cidadao.email)}</td><td>${esc(endereco)}</td></tr>`);
        });
        reportWindow.document.write('</tbody></table></body></html>');
        reportWindow.document.close();
    }
    async function generateExcelReport() {
        showToast("A gerar Excel...", "info");
        const s = serverSearchState;
        let query = sb.from('cidadaos').select(
            'name, cpf, rg, voterid, dob, sexo, type, phone, whatsapp, email, profissao, localtrabalho, logradouro, numero, complemento, bairro, cidade, estado, cep'
        );
        if (s.search)  query = query.or(`name.ilike.%${s.search}%,email.ilike.%${s.search}%,cpf.ilike.%${s.search}%`);
        if (s.type)    query = query.eq('type', s.type);
        if (s.bairro)  query = query.eq('bairro', s.bairro);
        if (s.leader)  query = query.eq('leader', s.leader);
        if (s.sexo)    query = query.eq('sexo', s.sexo);
        query = query.order('name', { ascending: true });

        const { data, error } = await query;
        if (error || !data || data.length === 0) {
            showToast("Nenhum cidadão encontrado.", "warning");
            return;
        }

        // Cabeçalhos do Excel
        const headers = [
            'Nome', 'CPF', 'RG', 'Título de Eleitor', 'Data Nasc.', 'Sexo', 'Tipo',
            'Telefone', 'WhatsApp', 'Email', 'Profissão', 'Local de Trabalho',
            'Logradouro', 'Número', 'Complemento', 'Bairro', 'Cidade', 'Estado', 'CEP'
        ];

        const rows = data.map(c => [
            c.name || '',
            c.cpf || '',
            c.rg || '',
            c.voterid || '',
            c.dob ? formatarData(c.dob) : '',
            c.sexo || '',
            c.type || '',
            c.phone || '',
            c.whatsapp ? 'Sim' : 'Não',
            c.email || '',
            c.profissao || '',
            c.localtrabalho || '',
            c.logradouro || '',
            c.numero || '',
            c.complemento || '',
            c.bairro || '',
            c.cidade || '',
            c.estado || '',
            c.cep || ''
        ]);

        // Gera CSV compatível com Excel (separador ponto-e-vírgula para pt-BR)
        const esc = v => {
            const s = String(v);
            return (s.includes(';') || s.includes('"') || s.includes('\n'))
                ? ('"' + s.replace(/"/g, '""') + '"') : s;
        };
        const csvLines = [
            headers.map(esc).join(';'),
            ...rows.map(r => r.map(esc).join(';'))
        ];
        const csvContent = '\uFEFF' + csvLines.join('\r\n'); // BOM para Excel reconhecer UTF-8

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        a.download = `cidadaos_${hoje}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Excel gerado — ${data.length} cidadão(s).`, "success");
    }

    function switchPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
            page.classList.remove('flex', 'flex-col');
        });
        const newPage = document.getElementById(pageId);
        if (newPage) {
            newPage.classList.remove('hidden');
            if(pageId === 'dashboard-page' || pageId === 'cidadaos-page' || pageId === 'demandas-page') {
                newPage.classList.add('flex', 'flex-col');
            }
        }
        document.querySelectorAll('#sidebar-nav a').forEach(link => {
            link.classList.remove('bg-slate-900', 'font-semibold');
            if (link.getAttribute('href') === `#${pageId.replace('-page', '')}`) {
                link.classList.add('bg-slate-900', 'font-semibold');
            }
        });
        if (pageId === 'dashboard-page') {
            updateDashboard();
        }
    }
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        let bgColor, textColor, icon;
        switch (type) {
            case 'success': bgColor = 'bg-green-500'; textColor = 'text-white'; icon = '✓'; break;
            case 'error': bgColor = 'bg-red-500'; textColor = 'text-white'; icon = '✖'; break;
            case 'warning': bgColor = 'bg-yellow-400'; textColor = 'text-black'; icon = '!' ; break;
            default: bgColor = 'bg-blue-500'; textColor = 'text-white'; icon = 'ℹ'; break;
        }
        toast.className = `p-4 rounded-lg shadow-lg flex items-center gap-3 ${bgColor} ${textColor} transform translate-x-full opacity-0 transition-all duration-300 ease-out`;
        toast.innerHTML = `<span class="font-bold text-lg">${icon}</span> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.classList.remove('translate-x-full', 'opacity-0'); }, 10);
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => { toast.remove(); }, 300);
        }, 3000);
    }
    function getInitials(name) {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return (name[0]).toUpperCase();
    }
    function getStatusInfo(status) {
        switch (status) {
            case 'pending': return { text: 'Pendente', classes: 'status-badge status-pending', color: '#F59E0B' };
            case 'inprogress': return { text: 'Em Andamento', classes: 'status-badge status-inprogress', color: '#3B82F6' };
            case 'completed': return { text: 'Concluída', classes: 'status-badge status-completed', color: '#10B981' };
            default: return { text: 'N/A', classes: 'status-badge', color: '#6B7280' };
        }
    }
    function formatarData(dateString) {
        if (!dateString) return 'N/A';
        try {
            const parts = dateString.split('-');
            if (parts.length !== 3) return dateString;
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        } catch (e) { return dateString; }
    }
    function getFaixaEtaria(dob) {
        if (!dob) return 'N/A';
        try {
            const birthDate = new Date(dob);
            if (isNaN(birthDate.getTime())) return 'N/A';
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
            if (age <= 17) return '0-17';
            if (age <= 25) return '18-25';
            if (age <= 35) return '26-35';
            if (age <= 50) return '36-50';
            if (age <= 65) return '51-65';
            if (age >= 66) return '66+';
            return 'N/A';
        } catch (e) { return 'N/A'; }
    }
});