// 1. Configuração do Supabase e Chaves
const SUPABASE_URL = 'https://wpeefnrnckqxolbiehiq.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwZWVmbnJuY2txeG9sYmllaGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MzcyNzksImV4cCI6MjA3OTAxMzI3OX0.L67CaZ4tRhI-zHt8pdo-nsfRKen_sJ6WaGPZ0I0aCpM';
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwZWVmbnJuY2txeG9sYmllaGlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQzNzI3OSwiZXhwIjoyMDc5MDEzMjc5fQ.NBUkeop8Bujm70_XaxRZV4roDE8d2uSRZY28oiVmPQk';

const { createClient } = supabase;
let sb, sbService, user = null;

try {
    // Cliente Público (sb): USADO PARA AUTH E CRUD RESTRITO.
    sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            persistSession: true, 
            autoRefreshToken: true
        }
    });

    // Cliente de Serviço (sbService): CORREÇÃO FINAL - Usa chave de storage ÚNICA para isolamento
    sbService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
        auth: {
            storageKey: 'sb-service-temp-storage', // CHAVE ÚNICA PARA ISOLAMENTO
            persistSession: false, 
            storage: { // Objeto de armazenamento dummy/nulo
                getItem: () => null, 
                setItem: () => {}, 
                removeItem: () => {}
            }
        }
    });

} catch (error) {
    console.error("Erro ao inicializar o Supabase:", error);
    alert("Erro crítico ao conectar. Verifique a configuração do Supabase.");
}

// 2. Variáveis Globais da Aplicação
let allCidadaos = [], allDemandas = [], allLeaders = [];
const CITADAOS_PER_PAGE = 12;
let currentCidadaosOffset = 0;
let currentFilteredCidadaos = [];
let currentEditingId = null;
let currentCidadaoIdForDemanda = null;
let currentCidadaoIdForDetails = null;
let currentEditingDemandaId = null;
let viewingDemandaId = null;

// 3. Variáveis de UI e Estado (Declaração Corrigida)
let appInitialized = false;

// CORREÇÃO: Variáveis globais sem vírgula no final.
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
    loadMoreBtn, cidadaoLat, cidadaoLong, // NOVAS VARIÁVEIS ADICIONADAS AQUI
    itemToDelete = { id: null, type: null }, 
    map = null, markers = [], cidadaosChart = null, demandasChart = null, 
    cidadaosBairroChart = null, cidadaosSexoChart = null, cidadaosFaixaEtariaChart = null; // FINALIZADO CORRETAMENTE

// 4. Funções e Lógica de Setup

document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA DE LOGIN ---
    const loginPage = document.getElementById('login-page');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const emailInput = document.getElementById('email-address');
    const passwordInput = document.getElementById('password');

    // ----------------------------------------------------------------------------------
    // CORREÇÃO DE ERRO RESIDUAL (TypeError: Cannot read properties of null)
    // ----------------------------------------------------------------------------------
    sb.auth.onAuthStateChange(async (event, session) => {
        // CORREÇÃO CRÍTICA: Se a sessão for nula, o 'session.user' não será lido, evitando o TypeError.
        if (session && session.user) {
            user = session.user;
            loginPage.classList.add('hidden');
            appContainer.style.display = 'flex';
            
            if (!appInitialized) {
                 await initializeMainApp(); 
            }
        } else if (event === 'SIGNED_OUT') {
            // Ação de Logout (limpa o estado)
            user = null;
            loginPage.classList.remove('hidden');
            appContainer.style.display = 'none';
            appInitialized = false;
        } else if (event === 'INITIAL_SESSION' && !session) {
            // Trata o caso de sessão inicial vazia (após F5 sem login)
            user = null;
            appInitialized = false;
        }
    });
    // ----------------------------------------------------------------------------------

    // Evento de submit do formulário de login
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
            console.error("Erro no login:", error.message);
            showToast("Email ou palavra-passe inválidos.", "error");
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Entrar';
        }
    });

    // --- NOVO: FUNÇÃO PARA GERIR O ESTADO DE SESSÃO AO INICIAR (SOLUÇÃO PARA O F5) ---
    async function manageSessionOnLoad() {
        // 1. Verifica a sessão existente (mais estável que depender apenas do onAuthStateChange)
        const { data: { session } } = await sb.auth.getSession();
        
        if (session) {
            user = session.user;
            loginPage.classList.add('hidden');
            appContainer.style.display = 'flex';
            await initializeMainApp(); // Inicialização completa
        } else {
            user = null;
            loginPage.classList.remove('hidden');
            appContainer.style.display = 'none';
        }
    }
    
    // CHAMADA PRINCIPAL: INICIA A VERIFICAÇÃO DE SESSÃO ASSIM QUE O DOM CARREGA
    manageSessionOnLoad();

    // --- FIM DA LÓGICA DE LOGIN ---
    
    /**
     * Inicializa os componentes principais da aplicação (depois do login)
     */
    async function initializeMainApp() {
        if (appInitialized) return;
        
        // CORREÇÃO DE RACE CONDITION: Pequena pausa para garantir que o DOM esteja renderizado
        await new Promise(resolve => setTimeout(resolve, 50)); 
        
        // Captura de Elementos (IDÊNTICO)
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
        
        // NOVO: Verificação de elementos essenciais
        if (!logoutBtn || !cidadaoForm) {
            console.error("ERRO CRÍTICO: Elementos essenciais da UI (Logout/Form) não encontrados após a pausa de inicialização.");
            appInitialized = false; // Permite uma nova tentativa na próxima carga
            return; 
        }

        // --- LISTENERS PRINCIPAIS ---

        // Logo (ir para Dashboard)
        if (logoBtn) {
            logoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                switchPage('dashboard-page');
            });
        }

        // Logout
        logoutBtn.addEventListener('click', async () => {
            try {
                await sb.auth.signOut();
                appInitialized = false; // Resetar flag
            } catch (error) {
                console.error("Erro ao sair:", error);
                showToast("Erro ao terminar sessão.", "error");
            }
        });

        // Navegação (Idêntico)
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

        // Abrir modais (Idêntico)
        addCidadaoBtn.addEventListener('click', () => openCidadaoModal());
        addDemandaGeralBtn.addEventListener('click', () => openDemandaModal());
        viewMapBtn.addEventListener('click', () => openMapModal());
        
        // Fechar Modais (Idêntico)
        closeModalBtn.addEventListener('click', closeCidadaoModal);
        cancelBtn.addEventListener('click', closeCidadaoModal);
        closeDetailsModalBtn.addEventListener('click', closeDetailsModal);
        closeDemandaModalBtn.addEventListener('click', closeDemandaModal);
        cancelDemandaBtn.addEventListener('click', closeDemandaModal);
        closeDemandaDetailsBtn.addEventListener('click', closeDemandaDetailsModal);
        closeMapBtn.addEventListener('click', closeMapModal);

        // Submissão de Formulários (Idêntico)
        cidadaoForm.addEventListener('submit', handleCidadaoFormSubmit);
        demandaForm.addEventListener('submit', handleDemandaFormSubmit);
        addNoteForm.addEventListener('submit', handleAddNoteSubmit);

        // Filtros e Pesquisa (Idêntico)
        searchInput.addEventListener('input', () => renderCidadaos());
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

        // Inicializar os dados (BLOCO CRÍTICO)
        try {
             await loadInitialData(); // Função que busca dados e atualiza a UI
             appInitialized = true; // SÓ AQUI GARANTIMOS QUE ESTÁ TUDO PRONTO
             switchPage('dashboard-page');
        } catch (e) {
             console.error("ERRO FATAL NA CARGA DE DADOS INICIAL.", e);
             showToast("Erro fatal de dados. Por favor, faça login novamente.", "error");
             await sb.auth.signOut(); // FORÇA LOGOFF PARA LIMPAR ESTADO
        }
    }

    /**
     * Carrega todos os dados iniciais do Supabase
     * AGORA USA O CLIENTE DE SERVIÇO PARA GARANTIR ESTABILIDADE NA LEITURA GLOBAL
     */
    async function loadInitialData() {
        if (!user) return;

        try {
            // 1. Carregar Cidadãos USANDO O CLIENTE DE SERVIÇO (sbService)
            const { data: cidadaosData, error: cidadaosError } = await sbService
                .from('cidadaos')
                .select('*')
                .order('name', { ascending: true }); 
            
            if (cidadaosError) throw cidadaosError;
            allCidadaos = cidadaosData;
            
            // 2. Carregar Demandas USANDO O CLIENTE DE SERVIÇO (sbService)
            const { data: demandasData, error: demandasError } = await sbService
                .from('demandas')
                .select('*')
                .order('created_at', { ascending: false });

            if (demandasError) throw demandasError;
            allDemandas = demandasData;
            
            // 3. Atualizar UI
            allLeaders = allCidadaos
                .filter(c => c.type === 'Liderança')
                .sort((a, b) => a.name.localeCompare(b.name));
            
            updateLeaderSelects();
            renderCidadaos();
            renderAllDemandas();
            updateDashboard();
            updateBairroFilter();
            
            // Retorna sucesso para o bloco initializeMainApp
            return true;

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            // Propaga o erro para ser capturado no initializeMainApp
            throw error; 
        }
    }


    /**
     * OTIMIZADO: Trata da submissão do formulário de cidadão (com geocodificação)
     * CONTINUA USANDO O CLIENTE PÚBLICO (sb) PARA REGRAS DE SEGURANÇA (RLS)
     */
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

        // 1. Upload da Foto
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
        
        // NOVO: 2. Geocodificar e Obter Lat/Long
        let lat = null, long = null;
        const address = `${cidadaoLogradouro.value}, ${cidadaoBairro.value}, ${cidadaoCidade.value}, ${cidadaoEstado.value}`;
        
        // Só tenta geocodificar se tiver endereço completo
        if (cidadaoLogradouro.value && cidadaoCidade.value) {
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
                const data = await response.json();
                if (data && data.length > 0) {
                    lat = parseFloat(data[0].lat);
                    long = parseFloat(data[0].lon);
                } else {
                    console.warn("Geocodificação falhou para o endereço:", address);
                    showToast("Endereço não encontrado no mapa. O ponto não será exibido.", "warning");
                }
            } catch (geocodeError) {
                console.error("Erro na Geocodificação:", geocodeError);
                showToast("Erro ao geolocalizar o endereço.", "error");
            }
        }
        
        // 3. Montar objeto do Cidadão (INCLUINDO LAT/LONG)
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
            
            // NOVOS CAMPOS SALVOS
            latitude: lat,
            longitude: long, 
            
            updated_at: new Date().toISOString(), 
            user_id: user.id 
        };

        // 4. Salvar no Supabase (USA CLIENTE PÚBLICO (sb) PARA ATIVAR RLS)
        if (currentEditingId) {
            // Editar
            const { error } = await sb
                .from('cidadaos')
                .update(cidadaoData)
                .eq('id', currentEditingId);
            if (error) throw error;
            showToast("Cidadão atualizado com sucesso!", "success");
        } else {
            // Criar
            delete cidadaoData.updated_at; 
            
            const { error } = await sb
                .from('cidadaos')
                .insert(cidadaoData);
            if (error) throw error;
            showToast("Cidadão adicionado com sucesso!", "success");
        }

        closeCidadaoModal();
        await loadInitialData(); // Recarregar todos os dados

    } catch (error) {
        console.error("Erro ao salvar cidadão:", error);
        let msg = "Erro ao salvar cidadão. Tente novamente.";
        if (error.message.includes('duplicate key value violates unique constraint "cidadaos_cpf_key"')) {
            msg = "Este CPF já está cadastrado.";
        } else if (error.message.includes('duplicate key value violates unique constraint "cidadaos_voterid_key"')) {
            msg = "Este Título de Eleitor já está cadastrado.";
        }
        showToast(msg, "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Salvar';
    }
}
    
    /**
     * Trata da submissão do formulário de demanda
     */
    async function handleDemandaFormSubmit(e) {
        e.preventDefault();
        if (!user) {
            showToast("Sessão expirada. Faça login novamente.", "error");
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
            
            showToast("Demanda adicionada com sucesso!", "success");
            closeDemandaModal();
            await loadInitialData(); // Recarregar dados

        } catch (error) {
            console.error("Erro ao salvar demanda:", error);
            showToast("Erro ao salvar demanda. Tente novamente.", "error");
        } finally {
            saveBtn.disabled = false;
        }
    }

    /**
     * Abre o modal de Detalhes da Demanda
     */
    async function openDemandaDetailsModal(demandaId) {
        viewingDemandaId = demandaId;
        const demanda = allDemandas.find(d => d.id === demandaId);
        if (!demanda) return;

        const solicitante = allCidadaos.find(c => c.id === demanda.cidadao_id); // Coluna mudou

        document.getElementById('details-demanda-title').textContent = demanda.title;
        document.getElementById('details-demanda-cidadao').textContent = `Solicitante: ${solicitante ? solicitante.name : 'Desconhecido'}`;
        document.getElementById('details-demanda-description').textContent = demanda.description || 'Sem descrição.';
        
        const statusSelect = document.getElementById('details-demanda-status');
        statusSelect.value = demanda.status;
        statusSelect.onchange = null; 
        statusSelect.onchange = (e) => updateDemandaStatus(demandaId, e.target.value);
        
        document.getElementById('delete-demanda-btn').onclick = () => requestDelete(demandaId, 'demanda');

        // Carregar Notas
        await loadDemandaNotes(demandaId); // Agora é async

        demandaDetailsModal.classList.remove('hidden');
    }

    /**
     * Atualiza o status de uma demanda
     */
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
            
            // Adicionar uma nota automática
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
            await loadInitialData(); // Recarrega tudo
            await loadDemandaNotes(demandaId); // Recarrega notas do modal

        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            showToast("Erro ao atualizar status.", "error");
        }
    }


    /**
     * Carrega as notas de acompanhamento de uma demanda
     */
    async function loadDemandaNotes(demandaId) {
        if (!user) return;

        const notesListEl = document.getElementById('demanda-notes-list');
        notesListEl.innerHTML = '<p class="text-sm text-gray-500">A carregar notas...</p>';
        
        try {
            const { data: notes, error } = await sb
                .from('notes')
                .select('*')
                .eq('demanda_id', demandaId)
                .order('created_at', { ascending: true });
            
            if (error) throw error;

            if (!notes || notes.length === 0) {
                notesListEl.innerHTML = '<p class="text-sm text-gray-500">Nenhum acompanhamento registado.</p>';
                return;
            }

            notesListEl.innerHTML = '';
            notes.forEach(note => {
                const noteEl = document.createElement('div');
                noteEl.className = 'p-3 bg-gray-100 rounded-lg';
                noteEl.innerHTML = `
                    <p class="text-sm text-gray-800">${note.text}</p>
                    <p class="text-xs text-gray-500 text-right">
                        ${note.author || 'Utilizador'} - ${new Date(note.created_at).toLocaleString('pt-BR')}
                    </O>
                `;
                notesListEl.appendChild(noteEl);
            });
            notesListEl.scrollTop = notesListEl.scrollHeight;

        } catch (error) {
            console.error("Erro ao carregar notas:", error);
            notesListEl.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar notas.</p>';
        }
    }

    /**
     * Trata da submissão do formulário de nova nota
     */
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
            
            newNoteText.value = ''; // Limpar campo
            await loadDemandaNotes(viewingDemandaId); // Recarregar notas

        } catch (error) {
            console.error("Erro ao adicionar nota:", error);
            showToast("Erro ao salvar nota.", "error");
        }
    }


    /**
     * Executa a exclusão após confirmação
     */
    async function handleDeleteConfirmation() {
        const { id, type } = itemToDelete;
        if (!id || !type || !user) return;

        const btn = document.getElementById('confirm-delete-btn');
        btn.disabled = true;

        try {
            if (type === 'cidadao') {
                // Graças ao "ON DELETE CASCADE", só precisamos apagar o cidadão.
                // O banco de dados apagará as demandas e notas associadas.
                const { error } = await sb
                    .from('cidadaos')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                showToast("Cidadão e suas demandas foram excluídos.", "success");

            } else if (type === 'demanda') {
                // Graças ao "ON DELETE CASCADE", só precisamos apagar a demanda.
                // O banco de dados apagará as notas associadas.
                 const { error } = await sb
                    .from('demandas')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                
                closeDemandaDetailsModal(); // Fechar modal se estiver aberto
                showToast("Demanda excluída com sucesso.", "success");
            }
            
            await loadInitialData(); // Recarregar tudo

        } catch (error) {
            console.error(`Erro ao excluir ${type}:`, error);
            showToast(`Erro ao excluir ${type}.`, "error");
        } finally {
            btn.disabled = false;
            closeConfirmationModal();
        }
    }


    // -------------------------------------------------------------------------
    //  RESTO DO SEU CÓDIGO (LÓGICA DE UI, FILTROS, GRÁFICOS)
    // -------------------------------------------------------------------------
    
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

            // Corrige a lógica de busca para incluir email e cpf, mas só se houver termo de busca.
            const generalMatch = !searchTerm || nameMatch || emailMatch || cpfMatch;

            return generalMatch && typeMatch && bairroMatch && leaderMatch && sexoMatch && ageMatch;
        });
        
        // A ordenação já é feita na query do Supabase, mas podemos manter
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        return filtered;
    }

    function renderCidadaos() {
        if (!cidadaosGrid) return;
        currentFilteredCidadaos = getFilteredCidadaos();
        currentCidadaosOffset = 0;
        cidadaosGrid.innerHTML = ''; 
        const loadMoreContainer = document.getElementById('load-more-container');
        loadMoreContainer.classList.add('hidden');
        if (currentFilteredCidadaos.length === 0) {
            cidadaosGrid.innerHTML = '<p class="text-gray-500 col-span-full text-center">Nenhum cidadão encontrado.</p>';
            return;
        }
        renderMoreCidadaos();
    }
    
    function renderMoreCidadaos() {
        if (!cidadaosGrid) return;
        const start = currentCidadaosOffset;
        const end = start + CITADAOS_PER_PAGE;
        const batch = currentFilteredCidadaos.slice(start, end);
        batch.forEach(cidadao => {
            const card = document.createElement('div');
            card.className = 'bg-white p-5 rounded-lg shadow-md flex flex-col transition-shadow hover:shadow-lg';
            const initials = getInitials(cidadao.name);
            const photoUrl = cidadao.photourl;
            card.innerHTML = `
                <div class="flex items-center gap-4 mb-4">
                    ${photoUrl ? 
                        `<img src="${photoUrl}" alt="${cidadao.name}" class="w-16 h-16 rounded-full object-cover bg-gray-200" onerror="this.src='https://placehold.co/100x100/E2E8F0/64748B?text=${initials}'">` : 
                        `<div class="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold">${initials}</div>`
                    }
                    <div class="flex-1">
                        <h3 class="text-lg font-bold text-gray-800 truncate">${cidadao.name}</h3>
                        <p class="text-sm text-gray-600">${cidadao.type}</p>
                    </div>
                </div>
                <div class="space-y-2 text-sm text-gray-700 mb-4 flex-1">
                    <p class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0 1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><span class="truncate">${cidadao.email || 'N/A'}</span></p>
                    <p class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${cidadao.phone || 'Não informado'}</p>
                    <p class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>${cidadao.bairro || 'Não informado'}</p>
                </div>
                <div class="border-t pt-4 flex gap-2">
                    <button class="btn-view-details flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium">Ver Detalhes</button>
                    <button class="btn-edit flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium">Editar</button>
                    <button class="btn-add-demanda bg-purple-500 hover:bg-purple-600 text-white py-2 px-3 rounded-lg text-sm font-medium">Demanda</button>
                    <button class="btn-delete bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-lg text-sm font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                </div>
            `;
            card.querySelector('.btn-view-details').addEventListener('click', () => openDetailsModal(cidadao.id));
            card.querySelector('.btn-edit').addEventListener('click', () => openCidadaoModal(cidadao.id));
            card.querySelector('.btn-add-demanda').addEventListener('click', () => openDemandaModal(cidadao.id));
            card.querySelector('.btn-delete').addEventListener('click', () => requestDelete(cidadao.id, 'cidadao'));
            cidadaosGrid.appendChild(card);
        });
        currentCidadaosOffset = end;
        const loadMoreContainer = document.getElementById('load-more-container');
        if (currentCidadaosOffset < currentFilteredCidadaos.length) {
            loadMoreContainer.classList.remove('hidden');
        } else {
            loadMoreContainer.classList.add('hidden');
        }
    }
    
    function renderAllDemandas() {
        if (!allDemandasList) return;
        const statusFilter = demandaFilterStatus.value;
        const leaderFilter = demandaFilterLeader.value;
        const filteredDemandas = allDemandas.filter(demanda => {
            const statusMatch = !statusFilter || demanda.status === statusFilter;
            const solicitante = allCidadaos.find(c => c.id === demanda.cidadao_id); // Coluna mudou
            const leaderMatch = !leaderFilter || (solicitante && solicitante.leader === leaderFilter);
            return statusMatch && leaderMatch;
        });
        allDemandasList.innerHTML = '';
        if (filteredDemandas.length === 0) {
            allDemandasList.innerHTML = '<p class="text-gray-500 text-center">Nenhuma demanda encontrada.</p>';
            return;
        }
        // A ordenação já é feita na query do Supabase
        // filteredDemandas.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        filteredDemandas.forEach(demanda => {
            const solicitante = allCidadaos.find(c => c.id === demanda.cidadao_id); // Coluna mudou
            const statusInfo = getStatusInfo(demanda.status);
            const item = document.createElement('div');
            item.className = 'bg-white p-4 rounded-lg shadow-sm border flex justify-between items-center cursor-pointer hover:shadow-md';
            item.innerHTML = `
                <div class="flex-1">
                    <h3 class="text-lg font-semibold text-gray-800">${demanda.title}</h3>
                    <p class="text-sm text-gray-600">
                        Solicitante: <span class="font-medium text-blue-600">${solicitante ? solicitante.name : 'Desconhecido'}</span>
                    </p>
                    <p class="text-sm text-gray-500">
                        Data: ${demanda.created_at ? new Date(demanda.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                    </p>
                </div>
                <div>
                    <span class="${statusInfo.classes}">${statusInfo.text}</span>
                </div>
            `;
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
        const bairros = [...new Set(allCidadaos.map(c => c.bairro).filter(Boolean))];
        bairros.sort();
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

    // --- LÓGICA DO DASHBOARD ---
    function updateDashboard() {
        document.getElementById('dashboard-total-cidadaos').textContent = allCidadaos.length;
        document.getElementById('dashboard-total-demandas').textContent = allDemandas.length;
        updateAniversariantes();
        updateDemandasRecentes();
        updateCidadaosPorTipoChart();
        updateDemandasPorStatusChart();
        updateCidadaosPorBairroChart();
        updateCidadaosPorSexoChart();
        updateCidadaosPorFaixaEtariaChart();
    }

    function updateAniversariantes() {
        const listEl = document.getElementById('aniversariantes-list');
        if (!listEl) return;
        const currentMonth = new Date().getMonth();
        const aniversariantes = allCidadaos.filter(c => {
            if (!c.dob) return false;
            // DOB é 'YYYY-MM-DD'
            const dobDate = new Date(c.dob + 'T12:00:00'); // Adicionar tempo para evitar problemas de fuso
            return dobDate.getMonth() === currentMonth;
        });
        aniversariantes.sort((a, b) => new Date(a.dob).getDate() - new Date(b.dob).getDate());
        listEl.innerHTML = '';
        if (aniversariantes.length === 0) {
            listEl.innerHTML = '<p class="text-sm text-gray-500">Nenhum aniversariante este mês.</p>';
            return;
        }
        aniversariantes.forEach(c => {
            const parts = c.dob.split('-');
            const dia = parts[2];
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer';
            item.innerHTML = `
                <span class="font-medium text-gray-700">${c.name}</span>
                <span class="font-bold text-blue-600">${dia}</span>
            `;
            item.addEventListener('click', () => { openDetailsModal(c.id); });
            listEl.appendChild(item);
        });
    }

    function updateDemandasRecentes() {
        const listEl = document.getElementById('demandas-recentes-list');
        if (!listEl) return;
        // Já vem ordenado do Supabase
        const recentes = allDemandas.slice(0, 5);
        listEl.innerHTML = '';
        if (recentes.length === 0) {
            listEl.innerHTML = '<p class="text-sm text-gray-500">Nenhuma demanda recente.</p>';
            return;
        }
        recentes.forEach(d => {
            const solicitante = allCidadaos.find(c => c.id === d.cidadao_id); // Coluna mudou
            const statusInfo = getStatusInfo(d.status);
            const item = document.createElement('div');
            item.className = 'p-2 rounded-lg hover:bg-gray-50 border-b last:border-b-0 cursor-pointer';
            item.innerHTML = `
                <div class="flex justify-between items-center mb-1">
                    <span class="font-semibold text-gray-800">${d.title}</span>
                    <span class="${statusInfo.classes} !py-0.5 !px-2">${statusInfo.text}</span>
                </div>
                <p class="text-sm text-gray-600">
                    ${solicitante ? solicitante.name : 'Desconhecido'} - 
                    ${d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                </p>
            `;
            item.addEventListener('click', () => { openDemandaDetailsModal(d.id); });
            listEl.appendChild(item);
        });
    }

    // --- GRÁFICOS (IDÊNTICOS) ---
    function updateCidadaosPorTipoChart() {
        const ctx = document.getElementById('cidadaos-por-tipo-chart');
        if (!ctx) return;
        const data = allCidadaos.reduce((acc, c) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc; }, {});
        const labels = Object.keys(data);
        const values = Object.values(data);
        if (cidadaosChart) cidadaosChart.destroy();
        cidadaosChart = new Chart(ctx, {
            type: 'pie',
            data: { labels: labels, datasets: [{ label: 'Cidadãos por Tipo', data: values, backgroundColor: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#6B7280'], }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
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
    function updateCidadaosPorBairroChart() {
        const ctx = document.getElementById('cidadaos-por-bairro-chart');
        if (!ctx) return;
        const data = allCidadaos.reduce((acc, c) => { const bairro = c.bairro || 'Não informado'; acc[bairro] = (acc[bairro] || 0) + 1; return acc; }, {});
        const sortedData = Object.entries(data).sort(([,a],[,b]) => b-a).slice(0, 10);
        const labels = sortedData.map(item => item[0]);
        const values = sortedData.map(item => item[1]);
        if (cidadaosBairroChart) cidadaosBairroChart.destroy();
        cidadaosBairroChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: labels, datasets: [{ label: 'Cidadãos por Bairro (Top 10)', data: values, backgroundColor: '#10B981', }] },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }
        });
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

    // --- LÓGICA DO FORMULÁRIO CIDADÃO (CORRIGIDO) ---
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

                // --- CAMPOS CORRIGIDOS E MAPA ---
                cidadaoLocalTrabalho.value = cidadao.localtrabalho || '';
                cidadaoPhotoUrl.value = cidadao.photourl || '';
                cidadaoLat.value = cidadao.latitude || ''; // NOVO: Mapear Lat
                cidadaoLong.value = cidadao.longitude || ''; // NOVO: Mapear Long
                // --- FIM DOS NOVOS CAMPOS ---

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
            container.innerHTML += `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-medium text-gray-600">${label} ${i + 1} - Nome</label>
                        <input type="text" data-type="${type}" data-index="${i}" data-field="name" class="w-full border border-gray-300 p-2 rounded-lg mt-1" value="${existingChild?.name || ''}">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600">${label} ${i + 1} - Data Nasc.</label>
                        <input type="date" data-type="${type}" data-index="${i}" data-field="dob" class="w-full border border-gray-300 p-2 rounded-lg mt-1" value="${existingChild?.dob || ''}">
                    </div>
                </div>
            `;
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
                console.error("Erro ao buscar CEP:", error);
                showToast("Erro ao consultar o CEP.", "error");
            }
        }
    }

    // --- LÓGICA DE DETALHES DO CIDADÃO (CORRIGIDO) ---
    function openDetailsModal(cidadaoId) {
        currentCidadaoIdForDetails = cidadaoId;
        const cidadao = allCidadaos.find(c => c.id === cidadaoId);
        if (!cidadao) return;

        const detailsModal = document.getElementById('cidadao-details-modal');
        const content = detailsModal.querySelector('.transform');
        const photoEl = document.getElementById('details-photo');
        
        // --- CAMPOS CORRIGIDOS E MAPA ---
        if (cidadao.photourl) { 
            photoEl.innerHTML = `<img src="${cidadao.photourl}" alt="${cidadao.name}" class="w-24 h-24 rounded-full object-cover bg-gray-200" onerror="this.src='https://placehold.co/100x100/E2E8F0/64748B?text=${getInitials(cidadao.name)}'">`;
        } else {
            photoEl.innerHTML = `<div class="w-24 h-24 rounded-full bg-blue-500 text-white flex items-center justify-center text-4xl font-bold">${getInitials(cidadao.name)}</div>`;
        }
        // --- FIM DOS NOVOS CAMPOS ---

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
        
        // --- CAMPO CORRIGIDO ---
        document.getElementById('details-local-trabalho').textContent = cidadao.localtrabalho || 'Não informado';
        // --- FIM DO CAMPO CORRIGIDO ---
        
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
            showToast("Endereço incompleto para partilhar.", "warning");
            return;
        }
        const address = `${cidadao.logradouro}, ${cidadao.numero || 'S/N'}, ${cidadao.bairro}, ${cidadao.cidade}, ${cidadao.estado}`;
        const url = `https://www.google.com/maps/search/?api=1&query=$${encodeURIComponent(address)}`;
        const text = `Olá! Aqui está a localização de ${cidadao.name}:\n${address}\n\nVer no mapa:\n${url}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    }

    // --- LÓGICA DE DEMANDAS ---
    function openDemandaModal(cidadaoId = null) {
        currentEditingDemandaId = null;
        demandaForm.reset();

        // 1. Limpar o campo de busca
        const searchInput = document.getElementById('demanda-cidadao-search');
        searchInput.value = ''; // Limpa buscas anteriores

        // 2. Popular a lista de cidadãos (como antes)
        const demandaCidadaoSelect = document.getElementById('demanda-cidadao-select');
        demandaCidadaoSelect.innerHTML = '<option value="" disabled selected>Selecione um cidadão...</option>';
        
        allCidadaos.sort((a,b) => a.name.localeCompare(b.name)).forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.name;
            demandaCidadaoSelect.appendChild(option);
        });
        
        if (cidadaoId) {
            demandaCidadaoSelect.value = cidadaoId;
            document.getElementById('demanda-modal-title').textContent = "Nova Demanda";
        } else {
            document.getElementById('demanda-modal-title').textContent = "Nova Demanda";
        }
        
        currentCidadaoIdForDemanda = cidadaoId;
        
        // 3. Adicionar a lógica de filtro
        const filterOptions = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const options = demandaCidadaoSelect.options;

            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                const optionText = option.text.toLowerCase();
                
                // Ignora a primeira opção "Selecione..."
                if (option.value === "") {
                    option.style.display = ''; // Garante que "Selecione..." esteja sempre visível
                    continue;
                }

                if (optionText.includes(searchTerm)) {
                    option.style.display = ''; // Mostra a opção
                } else {
                    option.style.display = 'none'; // Esconde a opção
                }
            }
        };

        // Adiciona o listener ao campo de busca
        searchInput.onkeyup = filterOptions;

        // 4. Mostrar o modal
        demandaModal.classList.remove('hidden');
    }

    function closeDemandaModal() {
        demandaModal.classList.add('hidden');
    }

    function closeDemandaDetailsModal() {
        demandaDetailsModal.classList.add('hidden');
        viewingDemandaId = null;
    }
    
    // --- LÓGICA DE EXCLUSÃO (IDÊNTICO) ---
    function requestDelete(itemId, type) {
        itemToDelete = { id: itemId, type: type };
        const modal = document.getElementById('confirmation-modal');
        const title = document.getElementById('confirmation-title');
        const message = document.getElementById('confirmation-message');
        if (type === 'cidadao') {
            const cidadao = allCidadaos.find(c => c.id === itemId);
            title.textContent = 'Excluir Cidadão';
            message.textContent = `Tem a certeza que quer excluir "${cidadao.name}"? Esta ação também excluirá todas as demandas e notas associadas a ele.`;
        } else if (type === 'demanda') {
            const demanda = allDemandas.find(d => d.id === itemId);
            title.textContent = 'Excluir Demanda';
            message.textContent = `Tem a certeza que quer excluir a demanda "${demanda.title}"? Esta ação também excluirá todas as notas de acompanhamento.`;
        }
        modal.classList.remove('hidden');
    }
    function closeConfirmationModal() {
        document.getElementById('confirmation-modal').classList.add('hidden');
        itemToDelete = { id: null, type: null };
    }

    // --- LÓGICA DO MAPA OTIMIZADA ---
    function initializeMap() {
    if (map) { map.remove(); }
    // Centraliza em Santana, Amapá, como ponto inicial
    map = L.map('map').setView([-0.03964, -51.18182], 13); 
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    markers = [];
}

async function openMapModal(cidadaosToPlot = null) {
    mapModal.classList.remove('hidden');
    
    // 1. Inicializar Mapa se necessário
    if (!map) {
        setTimeout(initializeMap, 100);
    } else {
        markers.forEach(m => m.remove());
        markers = [];
    }
    await new Promise(resolve => setTimeout(resolve, 150)); 
    map.invalidateSize();
    
    const cidadaos = cidadaosToPlot || allCidadaos;
    const bounds = [];
    
    // 2. Plotar Cidadãos (LENDO AS COORDENADAS SALVAS!)
    for (const cidadao of cidadaos) {
        // VERIFICA SE LATITUDE E LONGITUDE EXISTEM
        if (cidadao.latitude && cidadao.longitude) {
            try {
                const latLng = [parseFloat(cidadao.latitude), parseFloat(cidadao.longitude)];
                const marker = L.marker(latLng).addTo(map);
                marker.bindPopup(`
                    <strong>${cidadao.name}</strong><br>
                    ${cidadao.type}<br>
                    ${cidadao.logradouro || '', cidadao.numero || 'S/N'}
                `);
                markers.push(marker);
                bounds.push(latLng);
            } catch (error) {
                console.warn(`Erro ao plotar marker para ${cidadao.name}:`, error);
            }
        }
    }
    
    // 3. Ajustar o zoom
    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
    } else if (!cidadaosToPlot) {
        // Se for o mapa geral e não houver pontos válidos, foca em Santana/Brasil
        map.setView([-0.03964, -51.18182], 13);
    }
}
function closeMapModal() {
    mapModal.classList.add('hidden');
}

    // --- LÓGICA DO RELATÓRIO/IMPRESSÃO (IDÊNTICO) ---
    function generatePrintReport() {
        const filteredCidadaos = getFilteredCidadaos();
        if (filteredCidadaos.length === 0) {
            showToast("Nenhum cidadão encontrado para gerar o relatório.", "warning");
            return;
        }
        const reportWindow = window.open('', '', 'width=800,height=600');
        reportWindow.document.write('<html><head><title>Relatório de Cidadãos</title>');
        reportWindow.document.write(`<style> body { font-family: Arial, sans-serif; margin: 20px; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; } h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; } @media print { button { display: none; } } </style>`);
        reportWindow.document.write('</head><body>');
        reportWindow.document.write('<h1>Relatório de Cidadãos</h1>');
        reportWindow.document.write(`<p>Total de cidadãos: ${filteredCidadaos.length}</p>`);
        reportWindow.document.write('<button onclick="window.print()">Imprimir</button>');
        reportWindow.document.write('<table>');
        reportWindow.document.write(`<thead><tr><th>Nome</th><th>Tipo</th><th>Telefone</th><th>Email</th><th>Endereço Completo</th></tr></thead><tbody>`);
        filteredCidadaos.forEach(cidadao => {
            const addressParts = [cidadao.logradouro, cidadao.numero, cidadao.complemento, cidadao.bairro, cidadao.cidade, cidadao.estado, cidadao.cep].filter(Boolean);
            const endereco = addressParts.join(', ') || 'Não informado';
            reportWindow.document.write(`<tr><td>${cidadao.name}</td><td>${cidadao.type}</td><td>${cidadao.phone || ''} ${cidadao.whatsapp ? '(W)' : ''}</td><td>${cidadao.email}</td><td>${endereco}</td></tr>`);
        });
        reportWindow.document.write('</tbody></table>');
        reportWindow.document.write('</body></html>');
        reportWindow.document.close();
    }

    // --- FUNÇÕES UTILITÁRIAS (IDÊNTICO) ---
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

}); // Fim do DOMContentLoaded