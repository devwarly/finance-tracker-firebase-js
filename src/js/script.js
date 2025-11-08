import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    signInWithCustomToken,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    onSnapshot,
    collection,
    query,
    addDoc,
    setLogLevel,
    serverTimestamp,
    doc,
    deleteDoc,
    setDoc,
    getDocs,
    where
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Variáveis globais de ambiente
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let db = null;
let auth = null;
let currentUserId = null;
let currentUserName = null; // NOVO: Armazenar o nome de usuário
let transactions = [];
let listenerUnsubscribe = null;

// Referências do DOM
const mainAppContent = document.getElementById('mainAppContent');
const transactionForm = document.getElementById('transactionForm');
const transactionList = document.getElementById('transactionList');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const netBalanceEl = document.getElementById('netBalance');
const netBalanceContainer = document.getElementById('netBalanceContainer');
const categoryReportEl = document.getElementById('categoryReport');
const userIdDisplay = document.getElementById('userIdDisplay');
const userNameDisplay = document.getElementById('userNameDisplay'); // NOVO
const mainHeader = document.getElementById('mainHeader'); // NOVO

const authContainer = document.getElementById('authContainer');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authMessageBox = document.getElementById('authMessageBox');
const loginIdentifier = document.getElementById('loginIdentifier'); // NOVO: Campo de E-mail/Usuário

const loginSection = document.getElementById('loginSection');
const signupSection = document.getElementById('signupSection');
const showLoginButton = document.getElementById('showLoginButton');
const showSignupButton = document.getElementById('showSignupButton');

const toggleTheme = document.getElementById('toggleTheme');
const userMenuButton = document.getElementById('userMenuButton'); // NOVO
const userMenuDropdown = document.getElementById('userMenuDropdown'); // NOVO
const logoutButton = document.getElementById('logoutButton');

const filterMonth = document.getElementById('filterMonth');
const filterYear = document.getElementById('filterYear');
const filterType = document.getElementById('filterType');
const downloadReportButton = document.getElementById('downloadReportButton');

// Referências do DOM para o Resumo e Toast
const lastTransactionsList = document.getElementById('lastTransactionsList');
const balanceObservation = document.getElementById('balanceObservation');
const balanceObservationBox = document.getElementById('balanceObservationBox');
const toastContainer = document.getElementById('toastContainer');

// ------------------------------------
// FUNÇÕES DE UTILIDADE E UI
// ------------------------------------

// ... (formatCurrency, toDateObject, animateValue, showToast, applyTheme, initializeTheme, switchAuthMode permanecem inalteradas) ...

/**
 * Converte um número para o formato de moeda Real (R$).
 * @param {number} value
 * @returns {string}
 */
const formatCurrency = (value) => {
    // Garante que o valor é um número
    const numValue = parseFloat(value) || 0;
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(numValue);
};

/**
 * Converte um timestamp do Firestore ou um objeto Date para Date.
 * @param {object} date
 * @returns {Date}
 */
const toDateObject = (date) => {
    if (date instanceof Date) return date;
    if (date && typeof date.toDate === 'function') return date.toDate();
    // Tenta converter de string/timestamp brutos
    return new Date(date);
};

/**
 * Função para animar a contagem de um valor numérico em um elemento.
 * @param {HTMLElement} element - O elemento DOM.
 * @param {number} start - O valor inicial (sempre 0).
 * @param {number} end - O valor final (real).
 * @param {number} duration - Duração em ms.
 */
function animateValue(element, start, end, duration = 1000) {
    let startTimestamp = null;
    const isNegative = end < 0;
    const absEnd = Math.abs(end);

    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentValue = progress * absEnd;

        let displayValue = formatCurrency(isNegative ? -currentValue : currentValue);

        // Atualiza o texto. Se o valor real for zero, garante a cor e o zero.
        if (Math.abs(end) === 0) {
              element.textContent = formatCurrency(0);
        } else {
              element.textContent = displayValue;
        }


        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            // Garante o valor final exato formatado
            element.textContent = formatCurrency(end);
        }
    };
    window.requestAnimationFrame(step);
}

/**
 * Exibe uma mensagem de feedback usando o card flutuante (Toast).
 * @param {string} title - Título principal da mensagem (Ex: Sucesso, Erro, Transação).
 * @param {string} description - Descrição detalhada (Ex: Transação adicionada).
 * @param {'success'|'error'} type - Tipo de mensagem.
 */
function showToast(title, description, type) {
    const isSuccess = type === 'success';
    const color = isSuccess ? '#2b9875' : '#dc2626'; // Verde ou Vermelho
    
    // Usando o path completo do ícone de checkmark:
    const iconPath = isSuccess ?
        'M4.5 12.75l6 6 9-13.5' : 
        'M6 18 18 6M6 6l12 12'; 

    const toastElement = document.createElement('div');
    toastElement.className = 'toast flex items-center justify-between w-full h-12 sm:h-14 rounded-lg px-[10px] text-xs opacity-0 transform translate-x-full transition-all duration-300 ease-out';
    toastElement.style.backgroundColor = 'var(--bg-toast)';
    toastElement.innerHTML = `
        <div class="flex gap-2">
            <div class="bg-white/5 backdrop-blur-xl p-1 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="${color}" class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="${iconPath}"></path>
                </svg>
            </div>
            <div>
                <p class="text-white font-semibold">${title}</p>
                <p class="text-gray-400">${description}</p>
            </div>
        </div>
        <button class="close-btn text-gray-500 hover:text-white hover:bg-white/5 p-1 rounded-md transition-colors ease-linear">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"></path>
            </svg>
        </button>
    `;

    // 1. Adiciona o elemento ao contêiner
    toastContainer.appendChild(toastElement);

    // 2. Animação de entrada
    setTimeout(() => {
        toastElement.classList.remove('opacity-0', 'translate-x-full');
        toastElement.classList.add('opacity-100', 'translate-x-0');
    }, 10);

    // 3. Função de fechamento
    const closeToast = () => {
        toastElement.classList.remove('opacity-100', 'translate-x-0');
        toastElement.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => toastElement.remove(), 300); // Remove o elemento após a transição
    };

    // 4. Fechamento automático (5 segundos)
    const timeoutId = setTimeout(closeToast, 5000);

    // 5. Listener para o botão de fechar
    toastElement.querySelector('.close-btn').addEventListener('click', () => {
        clearTimeout(timeoutId);
        closeToast();
    });
}

/**
 * Alterna entre o tema claro e escuro.
 * @param {boolean} isDark
 */
function applyTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-mode');
        // Salva a preferência
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        // Salva a preferência
        localStorage.setItem('theme', 'light');
    }
}


/**
 * Inicializa o tema baseado na preferência salva ou no sistema.
 */
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    let isDark = false;

    if (savedTheme) {
        isDark = savedTheme === 'dark';
    } else {
        // Verifica a preferência do sistema se não houver tema salvo
        isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // Aplica o tema e atualiza o estado do toggle
    applyTheme(isDark);
    toggleTheme.checked = isDark;
}

/**
 * Alterna a visualização entre as seções de Login e Registro.
 * @param {'login'|'signup'} mode
 */
function switchAuthMode(mode) {
    if (mode === 'login') {
        loginSection.classList.remove('hidden');
        signupSection.classList.add('hidden');

        // Estiliza os botões como "abas"
        showLoginButton.classList.add('text-indigo-600', 'border-indigo-600');
        showLoginButton.classList.remove('text-gray-500', 'border-gray-200');
        showSignupButton.classList.add('text-gray-500', 'border-gray-200');
        showSignupButton.classList.remove('text-indigo-600', 'border-indigo-600');
        showSignupButton.style.borderBottomWidth = '2px';

    } else { // mode === 'signup'
        loginSection.classList.add('hidden');
        signupSection.classList.remove('hidden');

        // Estiliza os botões como "abas"
        showSignupButton.classList.add('text-indigo-600', 'border-indigo-600');
        showSignupButton.classList.remove('text-gray-500', 'border-gray-200');
        showLoginButton.classList.add('text-gray-500', 'border-gray-200');
        showLoginButton.classList.remove('text-indigo-600', 'border-indigo-600');
        showLoginButton.style.borderBottomWidth = '2px';
    }
    // Limpa a mensagem de erro ao alternar
    authMessageBox.classList.add('hidden');
}


// ------------------------------------
// FUNÇÕES DE AUTENTICAÇÃO
// ------------------------------------

/**
 * Obtém o nome de usuário do Firestore.
 * @param {string} userId
 */
async function getUserName(userId) {
    try {
        const userDocRef = doc(db, `artifacts/${appId}/users/${userId}`);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            return userDoc.data().userName;
        }
        return null;
    } catch (e) {
        console.error("Erro ao obter nome de usuário:", e);
        return null;
    }
}

/**
 * Lida com o registro de um novo usuário.
 * @param {Event} e
 */
async function handleSignUp(e) {
    e.preventDefault();
    const userName = document.getElementById('signupUserName').value.trim(); // NOVO
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    try {
        // 1. Verifica se o nome de usuário já existe
        const usersRef = collection(db, `artifacts/${appId}/users`);
        const q = query(usersRef, where("userName", "==", userName));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            showToast("Erro no Registro", "Nome de usuário já está em uso.", 'error');
            return;
        }

        // 2. Cria o usuário com e-mail e senha no Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 3. Salva o nome de usuário no Firestore (na coleção de usuários)
        await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}`), {
            email: email,
            userName: userName,
            createdAt: serverTimestamp()
        });

        showToast("Sucesso!", "Conta criada e logado com sucesso.", 'success');
    } catch (error) {
        console.error("Erro no registro:", error);
        let errorMessage = "Verifique o e-mail e senha.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "Este e-mail já está em uso.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "E-mail inválido.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "A senha deve ter pelo menos 6 caracteres.";
        }
        showToast("Erro no Registro", errorMessage, 'error');
    }
}

/**
 * Lida com o login do usuário.
 * @param {Event} e
 */
async function handleSignIn(e) {
    e.preventDefault();
    const identifier = loginIdentifier.value.trim(); // Pode ser E-mail ou Nome de Usuário
    const password = document.getElementById('loginPassword').value;

    try {
        // 1. Tenta fazer login diretamente com o identificador como E-mail
        await signInWithEmailAndPassword(auth, identifier, password);
        showToast("Login Concluído!", "Carregando seus dados financeiros...", 'success');

    } catch (error) {
        // 2. Se falhar, verifica se o identificador é um nome de usuário
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
            try {
                // Tenta encontrar o e-mail associado ao nome de usuário
                const usersRef = collection(db, `artifacts/${appId}/users`);
                const q = query(usersRef, where("userName", "==", identifier));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    showToast("Erro no Login", "E-mail, nome de usuário ou senha incorretos.", 'error');
                    return;
                }

                // Pega o primeiro e-mail encontrado (deve ser único)
                const userDoc = snapshot.docs[0];
                const emailFromUserName = userDoc.data().email;

                // Tenta fazer login com o e-mail real e a senha fornecida
                await signInWithEmailAndPassword(auth, emailFromUserName, password);
                showToast("Login Concluído!", "Carregando seus dados financeiros...", 'success');

            } catch (innerError) {
                // Erro de login real
                console.error("Erro no login (após tentativa com nome de usuário):", innerError);
                showToast("Erro no Login", "E-mail, nome de usuário ou senha incorretos.", 'error');
            }
        } else {
            // Outro erro de login (ex: auth/wrong-password)
            console.error("Erro no login:", error);
            showToast("Erro no Login", "E-mail, nome de usuário ou senha incorretos.", 'error');
        }
    }
}

/**
 * Lida com o logout do usuário.
 */
async function handleSignOut() {
    try {
        // Oculta o menu ao deslogar
        userMenuDropdown.classList.add('hidden');
        await signOut(auth);
        showToast("Deslogado", "Você saiu da sua conta.", 'success');
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        showToast("Erro", "Erro ao fazer logout.", 'error');
    }
}

/**
 * Inicializa o Firebase e a autenticação.
 */
async function initializeFirebase() {
    if (!firebaseConfig) {
        console.error("Firebase config is missing.");
        userIdDisplay.textContent = 'Erro de Config.';
        authContainer.classList.remove('hidden');
        return;
    }

    try {
        setLogLevel('Debug');
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        await setPersistence(auth, browserLocalPersistence);

        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken).catch(e => {
                console.warn("Falha ao usar token inicial, prosseguindo com fluxo normal de auth:", e.message);
            });
        } else if (!auth.currentUser) {
            authContainer.classList.remove('hidden');
        }

        onAuthStateChanged(auth, async (user) => {
            if (listenerUnsubscribe) {
                listenerUnsubscribe();
                listenerUnsubscribe = null;
                transactions = [];
            }

            if (user) {
                currentUserId = user.uid;
                
                // NOVO: Busca e exibe o nome de usuário
                currentUserName = await getUserName(currentUserId) || user.email.split('@')[0];
                userNameDisplay.textContent = currentUserName;
                userIdDisplay.textContent = currentUserId;

                // Mostra o conteúdo principal e o header
                authContainer.classList.add('hidden');
                mainAppContent.classList.remove('hidden');
                mainHeader.classList.remove('hidden'); // MOSTRA O NOVO HEADER
                
                setupTransactionListener();
            } else {
                currentUserId = null;
                currentUserName = null; // Limpa o nome de usuário
                
                // Oculta o conteúdo principal e o header, mostra a tela de login
                userNameDisplay.textContent = 'Deslogado';
                userIdDisplay.textContent = 'Deslogado';
                mainAppContent.classList.add('hidden');
                mainHeader.classList.add('hidden'); // OCULTA O HEADER
                authContainer.classList.remove('hidden');
                
                switchAuthMode('login');
                transactionList.innerHTML = '<tr><td colspan="5" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">Faça login para ver suas transações.</td></tr>';
                renderFilteredData([]);
            }
        });

    } catch (error) {
        console.error("Erro na inicialização do Firebase:", error);
        userIdDisplay.textContent = 'Erro de Inicialização';
        mainHeader.classList.add('hidden');
        authContainer.classList.remove('hidden');
        showToast("Erro de Inicialização", "Erro de configuração do aplicativo. Verifique o console.", 'error');
    }
}


// ------------------------------------
// FUNÇÕES DE TRANSAÇÃO E RELATÓRIO
// ------------------------------------

// ... (getTransactionCollectionRef, populateYearFilter, getFilteredTransactions, setupTransactionListener, renderFilteredData, renderTransactions, deleteTransaction, generateReport, addTransaction, getReportSummary, downloadReport permanecem inalteradas) ...

/**
 * Retorna a referência da coleção de transações do usuário atual.
 */
function getTransactionCollectionRef() {
    if (!db || !currentUserId) return null;
    return collection(db, `artifacts/${appId}/users/${currentUserId}/transactions`);
}

/**
 * Preenche o seletor de anos com base nas transações existentes.
 */
function populateYearFilter() {
    const years = new Set();
    transactions.forEach(t => {
        const date = toDateObject(t.date);
        if (!isNaN(date)) {
            years.add(date.getFullYear());
        }
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a);
    const currentSelectedYear = filterYear.value;
    filterYear.innerHTML = '<option value="">Todos</option>';
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year.toString() === currentSelectedYear) {
            option.selected = true;
        }
        filterYear.appendChild(option);
    });
}

/**
 * Filtra as transações baseadas nos seletores de filtro (Mês, Ano, Tipo).
 * @returns {Array} A lista de transações filtradas.
 */
function getFilteredTransactions() {
    const month = filterMonth.value;
    const year = filterYear.value;
    const type = filterType.value;

    let filtered = transactions;

    if (month || year || type) {
        filtered = transactions.filter(t => {
            const date = toDateObject(t.date);
            const tMonth = date.getMonth() + 1;
            const tYear = date.getFullYear();

            const monthMatch = !month || tMonth === parseInt(month);
            const yearMatch = !year || tYear === parseInt(year);
            const typeMatch = !type || t.type === type;

            return monthMatch && yearMatch && typeMatch;
        });
    }

    filtered.sort((a, b) => {
        const dateA = toDateObject(a.date);
        const dateB = toDateObject(b.date);
        return dateB - dateA;
    });

    return filtered;
}


/**
 * Configura o listener em tempo real para as transações.
 */
function setupTransactionListener() {
    const transactionsRef = getTransactionCollectionRef();
    if (!transactionsRef) return;

    const q = query(transactionsRef);

    listenerUnsubscribe = onSnapshot(q, (snapshot) => {
        transactions = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            transactions.push({
                id: doc.id,
                ...data,
                _timestamp: toDateObject(data.createdAt || Date.now()).getTime()
            });
        });

        populateYearFilter();
        renderFilteredData();

    }, (error) => {
        console.error("Erro ao ouvir transações em tempo real:", error);
        showToast("Erro de Dados", "Erro ao carregar transações.", 'error');
        transactionList.innerHTML = '<tr><td colspan="5" class="px-6 py-4 whitespace-nowrap text-sm text-red-500 text-center">Erro ao carregar dados.</td></tr>';
    });
}

/**
 * Função unificada para renderizar os dados após filtro ou atualização.
 * @param {Array} [optionalTransactions] - Transações opcionais para renderizar (ex: quando desloga).
 */
function renderFilteredData(optionalTransactions = null) {
    const transactionsToUse = optionalTransactions !== null ? optionalTransactions : getFilteredTransactions();

    renderTransactions(transactionsToUse);
    generateReport(transactionsToUse);

    downloadReportButton.disabled = transactionsToUse.length === 0;
}


/**
 * Renderiza a lista de transações na tabela.
 */
function renderTransactions(transactionsToRender) {
    transactionList.innerHTML = '';
    if (transactionsToRender.length === 0) {
        transactionList.innerHTML = '<tr><td colspan="5" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">Nenhuma transação encontrada com os filtros atuais.</td></tr>';
        return;
    }

    transactionsToRender.forEach(t => {
        const transactionDate = toDateObject(t.date);
        const formattedDate = transactionDate.toLocaleDateString('pt-BR');
        const isExpense = t.type === 'expense';
        const valueClass = isExpense ? 'text-red-600' : 'text-green-600';
        const sign = isExpense ? '-' : '+';

        const tenMinutesAgo = Date.now() - 600000;
        const canDelete = t._timestamp > tenMinutesAgo;
        const deleteButton = canDelete ?
            `<button data-id="${t.id}" class="delete-btn text-red-500 hover:text-red-700 font-semibold transition duration-150 text-xs">Excluir</button>` :
            `<span class="text-gray-400 text-xs" title="Passaram-se mais de 10 minutos desde a criação.">Expirado</span>`;


        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition duration-150 ease-in-out';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formattedDate}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${t.description}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${valueClass}">${sign} ${formatCurrency(t.value)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${t.category}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
                ${deleteButton}
            </td>
        `;
        transactionList.appendChild(row);
    });
}

/**
 * Remove uma transação.
 */
async function deleteTransaction(id) {
    if (!confirm("Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.")) return;

    try {
        const transactionToDelete = transactions.find(t => t.id === id);
        if (!transactionToDelete) {
            showToast("Erro", "Transação não encontrada.", 'error');
            return;
        }

        const tenMinutesAgo = Date.now() - 600000;
        if (transactionToDelete._timestamp <= tenMinutesAgo) {
            showToast("Exclusão Expirada", "Limite de 10 minutos excedido.", 'error');
            return;
        }

        const transactionsRef = getTransactionCollectionRef();
        if (!transactionsRef) return;

        await deleteDoc(doc(db, transactionsRef.path, id));
        showToast("Sucesso", "Transação excluída com sucesso!", 'success');

    } catch (error) {
        console.error("Erro ao excluir transação:", error);
        showToast("Erro de Exclusão", "Ocorreu um erro ao excluir a transação.", 'error');
    }
}


/**
 * Calcula e renderiza o relatório de balanço, últimas operações e observações.
 */
function generateReport(transactionsToAnalyze) {
    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCategory = {};

    transactionsToAnalyze.forEach(t => {
        const value = parseFloat(t.value);
        if (t.type === 'income') {
            totalIncome += value;
        } else if (t.type === 'expense') {
            totalExpense += value;
            const category = t.category || 'Outros';
            expenseByCategory[category] = (expenseByCategory[category] || 0) + value;
        }
    });

    const netBalance = totalIncome - totalExpense;
    
    // 1. Renderiza o Balanço Rápido com Animação
    animateValue(totalIncomeEl, 0, totalIncome);
    totalIncomeEl.dataset.value = totalIncome;

    animateValue(totalExpenseEl, 0, totalExpense);
    totalExpenseEl.dataset.value = totalExpense;
    
    animateValue(netBalanceEl, 0, netBalance);
    netBalanceEl.dataset.value = netBalance;

    netBalanceContainer.classList.remove('text-red-600', 'text-green-600', 'text-gray-900');
    if (netBalance > 0) {
        netBalanceContainer.classList.add('text-green-600');
    } else if (netBalance < 0) {
        netBalanceContainer.classList.add('text-red-600');
    } else {
        netBalanceContainer.classList.add('text-gray-900');
    }

    // 2. Renderiza o Relatório de Categorias
    categoryReportEl.innerHTML = '';
    const totalExpenseSum = totalExpense > 0 ? totalExpense : 1;
    const sortedCategories = Object.entries(expenseByCategory).sort(([, a], [, b]) => b - a);

    if (totalExpense > 0) {
          categoryReportEl.innerHTML = `
             <div class="space-y-1 pb-3 mb-3 border-b border-gray-300">
                 <div class="flex justify-between text-base font-bold text-red-700">
                     <span>Despesa Total no Período</span>
                     <span>${formatCurrency(totalExpense)}</span>
                 </div>
             </div>
        `;
    } else if (sortedCategories.length === 0) {
        categoryReportEl.innerHTML = '<p class="text-gray-500">Nenhuma despesa registrada ainda no período selecionado.</p>';
        return;
    }

    sortedCategories.forEach(([category, amount]) => {
        const percentage = ((amount / totalExpenseSum) * 100).toFixed(1);
        const item = document.createElement('div');
        item.className = 'space-y-1';
        item.innerHTML = `
            <div class="flex justify-between text-sm font-medium text-gray-700">
                <span>${category} (${percentage}%)</span>
                <span>${formatCurrency(amount)}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
                <div class="bg-indigo-500 h-2.5 rounded-full" style="width: ${percentage}%"></div>
            </div>
        `;
        categoryReportEl.appendChild(item);
    });

    // 3. Últimas Operações
    const last5Transactions = transactionsToAnalyze.slice(0, 5); // Usa a lista ordenada e filtrada
    lastTransactionsList.innerHTML = '';

    if (last5Transactions.length === 0) {
        lastTransactionsList.innerHTML = '<li class="text-gray-500">Nenhuma transação recente.</li>';
    } else {
        last5Transactions.forEach(t => {
            const isExpense = t.type === 'expense';
            const sign = isExpense ? '–' : '+';
            const color = isExpense ? 'text-red-500' : 'text-green-500';
            const li = document.createElement('li');
            li.className = 'flex justify-between';
            li.innerHTML = `
                <span class="text-gray-700 truncate">${t.description}</span>
                <span class="font-semibold ${color}">${sign} ${formatCurrency(t.value)}</span>
            `;
            lastTransactionsList.appendChild(li);
        });
    }

    // 4. Observação de Balanço
    let observationText = "O seu balanço atual está sendo monitorado. Faça mais transações para gerar observações.";
    let observationColor = "text-gray-700";

    if (transactionsToAnalyze.length >= 5) {
        if (netBalance >= 1000) {
            observationText = "Excelente! Você tem um saldo líquido positivo significativo. Continue monitorando seus gastos.";
            observationColor = "text-green-600";
        } else if (netBalance > 0) {
            observationText = "Parabéns, seu balanço é positivo! Pequenos ajustes podem aumentar ainda mais sua economia.";
            observationColor = "text-indigo-600";
        } else if (netBalance < 0 && totalExpense > 0.5 * totalIncome) {
            observationText = "Atenção: Seu balanço está negativo e suas despesas estão superando rapidamente suas receitas.";
            observationColor = "text-red-600";
        } else if (netBalance < 0) {
            observationText = "O balanço está ligeiramente negativo. Revise as últimas despesas para identificar oportunidades de corte.";
            observationColor = "text-yellow-600";
        }
    }

    balanceObservation.textContent = observationText;
    // Garante que a cor do texto da observação mude
    balanceObservation.className = `text-sm ${observationColor}`;
    balanceObservationBox.className = `mt-4 p-3 rounded-lg border border-gray-200`; // Reseta a classe do box
}


/**
 * Adiciona uma nova transação ao Firestore.
 */
async function addTransaction(e) {
    e.preventDefault();

    if (!currentUserId) {
        showToast("Erro", "Você precisa estar logado para adicionar transações.", 'error');
        return;
    }

    const transactionsRef = getTransactionCollectionRef();
    const dateInput = document.getElementById('date').value;

    const transactionData = {
        date: new Date(dateInput),
        description: document.getElementById('description').value,
        value: parseFloat(document.getElementById('value').value),
        type: document.getElementById('type').value,
        category: document.getElementById('category').value,
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(transactionsRef, transactionData);
        showToast("Sucesso", "Transação adicionada com sucesso!", 'success');
        transactionForm.reset();
        document.getElementById('date').valueAsDate = new Date();
    } catch (error) {
        console.error("Erro ao adicionar transação:", error);
        showToast("Erro de Transação", `Erro ao salvar: ${error.message}`, 'error');
    }
}


// ------------------------------------
// FUNÇÕES DE DOWNLOAD PDF
// ------------------------------------

/**
 * Função utilitária para extrair apenas o resumo do balanço para o PDF.
 */
function getReportSummary(transactionsToAnalyze) {
    let totalIncome = 0;
    let totalExpense = 0;

    transactionsToAnalyze.forEach(t => {
        const value = parseFloat(t.value);
        if (t.type === 'income') {
            totalIncome += value;
        } else if (t.type === 'expense') {
            totalExpense += value;
        }
    });

    const netBalance = totalIncome - totalExpense;

    return {
        income: formatCurrency(totalIncome),
        expense: formatCurrency(totalExpense),
        netBalance: formatCurrency(netBalance),
    };
}

/**
 * Gera e baixa o relatório em formato PDF.
 */
function downloadReport() {
    // Verifica se jsPDF está carregado
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        showToast("Erro", "Biblioteca de PDF não carregada. Recarregue a página.", 'error');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const filteredTransactions = getFilteredTransactions();

    if (filteredTransactions.length === 0) {
        showToast("Aviso", "Não há transações para gerar o relatório com os filtros atuais.", 'error');
        return;
    }

    // Configurações de filtro
    const monthName = filterMonth.value ? filterMonth.options[filterMonth.selectedIndex].text : 'Todos';
    const yearValue = filterYear.value || 'Todos';
    const typeName = filterType.value ? filterType.options[filterType.selectedIndex].text : 'Todas';

    // Título e Filtros
    doc.setFontSize(18);
    doc.text("Relatório Financeiro", 10, 20);
    doc.setFontSize(10);
    doc.text(`Filtros: Mês=${monthName}, Ano=${yearValue}, Tipo=${typeName}`, 10, 28);

    doc.setFontSize(12);
    let yOffset = 40;

    // Tabela de Transações
    const tableData = filteredTransactions.map(t => {
        const date = toDateObject(t.date).toLocaleDateString('pt-BR');
        const sign = t.type === 'expense' ? '-' : '+';
        const value = `${sign} ${formatCurrency(t.value)}`;
        return [date, t.description, value, t.category];
    });

    doc.autoTable({
        startY: yOffset,
        head: [['Data', 'Descrição', 'Valor', 'Categoria']],
        body: tableData,
        theme: 'striped',
        styles: {
            font: 'helvetica',
            fontSize: 10,
        },
        headStyles: {
            fillColor: [63, 81, 181],
        },
        didDrawPage: function(data) {
            doc.text(`Página ${data.pageNumber} de ${data.pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
    });

    yOffset = doc.autoTable.previous.finalY + 10;

    // Resumo do Balanço
    const reportData = getReportSummary(filteredTransactions);
    doc.setFontSize(14);
    doc.text("Resumo do Período", 10, yOffset);
    yOffset += 8;

    doc.setFontSize(12);
    doc.setTextColor(33, 33, 33);
    doc.text(`Receitas Totais: ${reportData.income}`, 10, yOffset);
    doc.text(`Despesas Totais: ${reportData.expense}`, 100, yOffset);
    yOffset += 7;

    const balanceColor = reportData.netBalance.includes('-') ? [220, 38, 38] : [16, 185, 129];
    doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
    doc.setFontSize(16);
    doc.text(`Saldo Líquido: ${reportData.netBalance}`, 10, yOffset);

    doc.save(`Relatorio_Financeiro_${monthName}_${yearValue}.pdf`);
    showToast("Sucesso", "Relatório PDF gerado!", 'success');
}


// ------------------------------------
// INICIALIZAÇÃO E LISTENERS
// ------------------------------------

window.onload = function() {
    initializeTheme();
    document.getElementById('date').valueAsDate = new Date();
    initializeFirebase();
    switchAuthMode('login');

    toggleTheme.addEventListener('change', (e) => {
        applyTheme(e.target.checked);
    });

    // NOVO: Listener para o botão do menu de usuário (Dropdown)
    userMenuButton.addEventListener('click', () => {
        userMenuDropdown.classList.toggle('hidden');
    });

    // Fechar dropdown ao clicar fora
    document.addEventListener('click', (e) => {
        if (!userMenuButton.contains(e.target) && !userMenuDropdown.contains(e.target)) {
            userMenuDropdown.classList.add('hidden');
        }
    });

    // LISTENERS DE FILTRO
    filterMonth.addEventListener('change', renderFilteredData);
    filterYear.addEventListener('change', renderFilteredData);
    filterType.addEventListener('change', renderFilteredData);

    downloadReportButton.addEventListener('click', downloadReport);

    // Listener de exclusão.
    transactionList.addEventListener('click', (e) => {
        // Encontra o botão de exclusão ou um de seus pais
        const deleteButton = e.target.closest('.delete-btn');
        if (deleteButton) {
            const transactionId = deleteButton.getAttribute('data-id');
            deleteTransaction(transactionId);
        }
    });

    transactionForm.addEventListener('submit', addTransaction);
    loginForm.addEventListener('submit', handleSignIn);
    signupForm.addEventListener('submit', handleSignUp);
    logoutButton.addEventListener('click', handleSignOut);

    showLoginButton.addEventListener('click', () => switchAuthMode('login'));
    showSignupButton.addEventListener('click', () => switchAuthMode('signup'));
};