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
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Variáveis globais de ambiente (Mantenha se estiver usando um ambiente como o Canvas)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let db = null;
let auth = null;
let currentUserId = null;
let transactions = [];
let listenerUnsubscribe = null; // Para guardar a função de desinscrição do Firestore

// Referências do DOM para o App Principal
const mainAppContent = document.getElementById('mainAppContent');
const transactionForm = document.getElementById('transactionForm');
const transactionList = document.getElementById('transactionList');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const netBalanceEl = document.getElementById('netBalance');
const netBalanceContainer = document.getElementById('netBalanceContainer');
const categoryReportEl = document.getElementById('categoryReport');
const userIdDisplay = document.getElementById('userIdDisplay');
const messageBox = document.getElementById('messageBox');
const logoutButton = document.getElementById('logoutButton');

// Referências do DOM para Autenticação
const authContainer = document.getElementById('authContainer');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authMessageBox = document.getElementById('authMessageBox');
// Referências para a alternância entre Login/Registro
const loginSection = document.getElementById('loginSection');
const signupSection = document.getElementById('signupSection');
const showLoginButton = document.getElementById('showLoginButton');
const showSignupButton = document.getElementById('showSignupButton');

// NOVO: Referência para o toggle de tema
const toggleTheme = document.getElementById('toggleTheme');


// ------------------------------------
// FUNÇÕES DE UTILIDADE E UI
// ------------------------------------

/**
 * Converte um número para o formato de moeda Real (R$).
 * @param {number} value
 * @returns {string}
 */
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

/**
 * Exibe uma mensagem de feedback na tela de autenticação.
 * @param {string} text
 * @param {'success'|'error'} type
 */
function showAuthMessage(text, type) {
    authMessageBox.textContent = text;
    authMessageBox.classList.remove('hidden', 'text-green-600', 'text-red-600');
    authMessageBox.classList.add(type === 'success' ? 'text-green-600' : 'text-red-600');
    setTimeout(() => {
        authMessageBox.classList.add('hidden');
    }, 5000);
}

/**
 * Exibe uma mensagem de feedback ao usuário no formulário de transação.
 * @param {string} text
 * @param {'success'|'error'} type
 */
function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.classList.remove('hidden', 'text-green-600', 'text-red-600');
    messageBox.classList.add(type === 'success' ? 'text-green-600' : 'text-red-600');
    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 3000);
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


/**
 * NOVO: Alterna entre o tema claro e escuro.
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
 * NOVO: Inicializa o tema baseado na preferência salva ou no sistema.
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

// ------------------------------------
// FUNÇÕES DE AUTENTICAÇÃO
// ------------------------------------

/**
 * Lida com o registro de um novo usuário.
 * @param {Event} e
 */
async function handleSignUp(e) {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        showAuthMessage("Conta criada com sucesso! Redirecionando...", 'success');
    } catch (error) {
        console.error("Erro no registro:", error);
        let errorMessage = "Erro ao criar conta. Verifique o e-mail e senha.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "Este e-mail já está em uso.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "O e-mail fornecido é inválido.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "A senha deve ter pelo menos 6 caracteres.";
        }
        showAuthMessage(errorMessage, 'error');
    }
}

/**
 * Lida com o login do usuário.
 * @param {Event} e
 */
async function handleSignIn(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showAuthMessage("Login realizado com sucesso! Carregando dados...", 'success');
    } catch (error) {
        console.error("Erro no login:", error);
        showAuthMessage("Erro no login. Verifique seu e-mail e senha.", 'error');
    }
}

/**
 * Lida com o logout do usuário.
 */
async function handleSignOut() {
    try {
        await signOut(auth);
        console.log("Usuário deslogado com sucesso.");
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        showMessage("Erro ao fazer logout.", 'error');
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
        
        onAuthStateChanged(auth, (user) => {
            // 1. Limpa listeners e dados antigos
            if (listenerUnsubscribe) {
                listenerUnsubscribe();
                listenerUnsubscribe = null;
                transactions = [];
            }

            if (user) {
                // USUÁRIO LOGADO: MOSTRA O APP
                currentUserId = user.uid;
                userIdDisplay.textContent = currentUserId;
                authContainer.classList.add('hidden');
                mainAppContent.classList.remove('hidden');
                logoutButton.classList.remove('hidden');
                console.log("Usuário autenticado:", currentUserId);
                setupTransactionListener(); // Inicia o listener de transações
            } else {
                // USUÁRIO DESLOGADO: MOSTRA A TELA DE LOGIN
                currentUserId = null;
                userIdDisplay.textContent = 'Deslogado';
                mainAppContent.classList.add('hidden');
                logoutButton.classList.add('hidden');
                authContainer.classList.remove('hidden');
                // Garante que o modo de autenticação padrão (Login) esteja ativo
                switchAuthMode('login'); 
                // Limpa o histórico de transações na UI
                transactionList.innerHTML = '<tr><td colspan="4" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">Faça login para ver suas transações.</td></tr>';
                generateReport(); // Zera o relatório
            }
        });

    } catch (error) {
        console.error("Erro na inicialização do Firebase:", error);
        userIdDisplay.textContent = 'Erro de Inicialização';
        authContainer.classList.remove('hidden');
        showAuthMessage("Erro de configuração do aplicativo. Verifique o console.", 'error');
    }
}

// ------------------------------------
// FUNÇÕES DE TRANSAÇÃO E RELATÓRIO
// ------------------------------------

/**
 * Retorna a referência da coleção de transações do usuário atual.
 * @returns {import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js").CollectionReference | null}
 */
function getTransactionCollectionRef() {
    if (!db || !currentUserId) return null;
    return collection(db, `artifacts/${appId}/users/${currentUserId}/transactions`);
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
            transactions.push({ id: doc.id, ...doc.data() });
        });

        // Ordena em memória pela data mais recente primeiro
        transactions.sort((a, b) => {
            const dateA = a.date instanceof Date ? a.date : (a.date.toDate ? a.date.toDate() : new Date(a.date));
            const dateB = b.date instanceof Date ? b.date : (b.date.toDate ? b.date.toDate() : new Date(b.date));
            return dateB - dateA; // Mais recente primeiro
        });

        renderTransactions();
        generateReport();
    }, (error) => {
        console.error("Erro ao ouvir transações em tempo real:", error);
        transactionList.innerHTML = '<tr><td colspan="4" class="px-6 py-4 whitespace-nowrap text-sm text-red-500 text-center">Erro ao carregar dados. Verifique o console.</td></tr>';
    });
}

/**
 * Renderiza a lista de transações na tabela.
 */
function renderTransactions() {
    transactionList.innerHTML = '';
    if (transactions.length === 0) {
        transactionList.innerHTML = '<tr><td colspan="4" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">Nenhuma transação registrada.</td></tr>';
        return;
    }

    transactions.forEach(t => {
        const transactionDate = t.date instanceof Date ? t.date : (t.date.toDate ? t.date.toDate() : new Date(t.date));
        const formattedDate = transactionDate.toLocaleDateString('pt-BR');
        const isExpense = t.type === 'expense';
        const valueClass = isExpense ? 'text-red-600' : 'text-green-600';
        const sign = isExpense ? '-' : '+';

        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition duration-150 ease-in-out';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formattedDate}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${t.description}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${valueClass}">${sign} ${formatCurrency(t.value)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${t.category}</td>
        `;
        transactionList.appendChild(row);
    });
}

/**
 * Calcula e renderiza o relatório de balanço e gastos por categoria.
 */
function generateReport() {
    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCategory = {};

    transactions.forEach(t => {
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

    // 1. Renderiza o Balanço Rápido
    totalIncomeEl.textContent = formatCurrency(totalIncome);
    totalExpenseEl.textContent = formatCurrency(totalExpense);
    netBalanceEl.textContent = formatCurrency(Math.abs(netBalance));

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

    if (sortedCategories.length === 0) {
        categoryReportEl.innerHTML = '<p class="text-gray-500">Nenhuma despesa registrada ainda.</p>';
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
}


/**
 * Adiciona uma nova transação ao Firestore.
 * @param {Event} e
 */
async function addTransaction(e) {
    e.preventDefault();

    if (!currentUserId) {
        showMessage("Erro: Você precisa estar logado para adicionar transações.", 'error');
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
        showMessage("Transação adicionada com sucesso!", 'success');
        transactionForm.reset();
        document.getElementById('date').valueAsDate = new Date(); 
    } catch (error) {
        console.error("Erro ao adicionar transação:", error);
        showMessage(`Erro ao salvar: ${error.message}`, 'error');
    }
}

// ------------------------------------
// INICIALIZAÇÃO E LISTENERS
// ------------------------------------

window.onload = function() {
    // 1. Inicializa o Tema ANTES do Firebase para evitar flash de estilo
    initializeTheme();
    
    // 2. Define a data atual como padrão no input
    document.getElementById('date').valueAsDate = new Date(); 
    
    // 3. Inicializa o Firebase
    initializeFirebase();
    
    // 4. Configuração inicial para garantir que o login apareça primeiro
    switchAuthMode('login');

    // 5. Adiciona listeners de formulários e botões

    // NOVO: Listener para o botão de tema
    toggleTheme.addEventListener('change', (e) => {
        applyTheme(e.target.checked);
    });

    transactionForm.addEventListener('submit', addTransaction);
    loginForm.addEventListener('submit', handleSignIn);
    signupForm.addEventListener('submit', handleSignUp);
    logoutButton.addEventListener('click', handleSignOut);

    // NOVOS LISTENERS PARA ALTERNÂNNCIA DE TELA
    showLoginButton.addEventListener('click', () => switchAuthMode('login'));
    showSignupButton.addEventListener('click', () => switchAuthMode('signup'));
};