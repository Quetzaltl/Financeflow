class ExpenseTracker {
    constructor() {
        this.transactions = this.loadTransactions();
        this.currentPeriod = 'all';
        this.currentType = 'income';
        this.initializeApp();
    }

    initializeApp() {
        this.bindEvents();
        this.setDefaultDate();
        this.updateSummary();
        this.renderTransactions();
    }

    bindEvents() {
        // Modal events
        document.getElementById('addTransactionBtn').addEventListener('click', () => this.openModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('transactionModal').addEventListener('click', (e) => {
            if (e.target.id === 'transactionModal') this.closeModal();
        });

        // Form events
        document.getElementById('transactionForm').addEventListener('submit', (e) => this.handleSubmit(e));

        // Transaction type toggle
        document.querySelectorAll('.type-option').forEach(option => {
            option.addEventListener('click', () => this.selectTransactionType(option.dataset.type));
        });

        // Time filter events
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => this.changePeriod(btn.dataset.period));
        });

        // Search events
        document.getElementById('searchBox').addEventListener('input', (e) => this.searchTransactions(e.target.value));
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('transactionDate').value = today;
    }

    openModal() {
        document.getElementById('transactionModal').style.display = 'block';
        document.getElementById('transactionName').focus();
    }

    closeModal() {
        document.getElementById('transactionModal').style.display = 'none';
        document.getElementById('transactionForm').reset();
        this.setDefaultDate();
        this.selectTransactionType('income');
    }

    selectTransactionType(type) {
        this.currentType = type;
        document.querySelectorAll('.type-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const transaction = {
            id: Date.now(),
            name: document.getElementById('transactionName').value.trim(),
            amount: parseFloat(document.getElementById('transactionAmount').value),
            category: document.getElementById('transactionCategory').value,
            date: document.getElementById('transactionDate').value,
            type: this.currentType,
            timestamp: new Date().getTime()
        };

        this.transactions.push(transaction);
        this.saveTransactions();
        this.updateSummary();
        this.renderTransactions();
        this.closeModal();

        // Show success feedback
        this.showNotification(`${transaction.type === 'income' ? 'Income' : 'Expense'} added successfully!`, 'success');
    }

    deleteTransaction(id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveTransactions();
            this.updateSummary();
            this.renderTransactions();
            this.showNotification('Transaction deleted successfully!', 'success');
        }
    }

    changePeriod(period) {
        this.currentPeriod = period;
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-period="${period}"]`).classList.add('active');
        this.updateSummary();
        this.renderTransactions();
    }

    getFilteredTransactions(searchTerm = '') {
        let filtered = this.transactions.filter(transaction => {
            if (searchTerm) {
                const matchesSearch = transaction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
                if (!matchesSearch) return false;
            }

            const transactionDate = new Date(transaction.date);
            const now = new Date();

            switch (this.currentPeriod) {
                case 'day':
                    return transactionDate.toDateString() === now.toDateString();
                case 'week':
                    const weekStart = new Date(now);
                    weekStart.setDate(now.getDate() - now.getDay());
                    weekStart.setHours(0, 0, 0, 0);
                    return transactionDate >= weekStart;
                case 'month':
                    return transactionDate.getMonth() === now.getMonth() && 
                           transactionDate.getFullYear() === now.getFullYear();
                case 'year':
                    return transactionDate.getFullYear() === now.getFullYear();
                case 'previous-year':
                    return transactionDate.getFullYear() < now.getFullYear();
                default:
                    return true;
            }
        });

        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    updateSummary() {
        const filtered = this.getFilteredTransactions();
        
        const income = filtered
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const expenses = filtered
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const balance = income - expenses;

        document.getElementById('totalIncome').textContent = this.formatCurrency(income);
        document.getElementById('totalExpenses').textContent = this.formatCurrency(expenses);
        document.getElementById('netBalance').textContent = this.formatCurrency(balance);

        // Update balance color based on positive/negative
        const balanceElement = document.getElementById('netBalance');
        balanceElement.style.color = balance >= 0 ? '#27ae60' : '#e74c3c';
    }

    renderTransactions() {
        const container = document.getElementById('transactionsList');
        const filtered = this.getFilteredTransactions();

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="no-transactions">
                    ${this.currentPeriod === 'all' ? 
                        'No transactions yet. Start by adding your first transaction!' : 
                        `No transactions found for the selected ${this.currentPeriod === 'previous-year' ? 'previous years' : this.currentPeriod}.`
                    }
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-name">${this.escapeHtml(transaction.name)}</div>
                    <div class="transaction-details">
                        <span>${this.capitalizeFirst(transaction.category.replace('-', ' '))}</span>
                        <span>${this.formatDate(transaction.date)}</span>
                    </div>
                </div>
                <div class="transaction-amount">
                    <div class="amount ${transaction.type}">
                        ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                    </div>
                    <button class="delete-btn" onclick="expenseTracker.deleteTransaction(${transaction.id})">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    searchTransactions(searchTerm) {
        const filtered = this.getFilteredTransactions(searchTerm);
        this.renderFilteredTransactions(filtered);
    }

    renderFilteredTransactions(transactions) {
        const container = document.getElementById('transactionsList');

        if (transactions.length === 0) {
            container.innerHTML = '<div class="no-transactions">No transactions match your search.</div>';
            return;
        }

        container.innerHTML = transactions.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-name">${this.escapeHtml(transaction.name)}</div>
                    <div class="transaction-details">
                        <span>${this.capitalizeFirst(transaction.category.replace('-', ' '))}</span>
                        <span>${this.formatDate(transaction.date)}</span>
                    </div>
                </div>
                <div class="transaction-amount">
                    <div class="amount ${transaction.type}">
                        ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                    </div>
                    <button class="delete-btn" onclick="expenseTracker.deleteTransaction(${transaction.id})">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Utility methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#27ae60' : '#3498db'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-weight: 600;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    }

    // Data persistence
    loadTransactions() {
        const stored = window.localStorage?.getItem('expenseTrackerData');
        return stored ? JSON.parse(stored) : [];
    }

    saveTransactions() {
        if (window.localStorage) {
            window.localStorage.setItem('expenseTrackerData', JSON.stringify(this.transactions));
        }
    }
}

// Initialize the app
const expenseTracker = new ExpenseTracker();

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        expenseTracker.closeModal();
    }
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        expenseTracker.openModal();
    }
});