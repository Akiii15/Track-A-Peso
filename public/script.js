/* Pocketbook - front end (plain JavaScript + fetch) */
const API = '/api';
const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const $ = (selector) => document.querySelector(selector);

const state = { accounts: [], categories: [], transactions: [] };

/* ------------------------------------------------------------------ helpers */

// Wrapper around fetch: sends/receives JSON and throws an Error with the server's message
async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* no JSON body */ }
  if (!res.ok) throw new Error((data && data.message) || `Request failed (${res.status})`);
  return data;
}

function esc(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

function toast(message, kind = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${kind === 'error' ? 'error' : ''}`;
  el.textContent = message;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), kind === 'error' ? 6000 : 3500);
}

// Dates are stored at midnight UTC, so always format them in UTC to avoid off-by-one days
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-PH', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' });
const toInputDate = (iso) => iso.slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => today().slice(0, 7);

function showFormError(el, message) {
  el.textContent = message;
  el.hidden = !message;
}

function optionsHtml(items, { all, selected } = {}) {
  const first = all ? `<option value="">${esc(all)}</option>` : '';
  return first + items.map((i) => `<option value="${i._id}" ${i._id === selected ? 'selected' : ''}>${esc(i.name)}</option>`).join('');
}

/* ------------------------------------------------------------------ loading data */

async function loadAccounts() {
  state.accounts = await api('/accounts');
  renderAccounts();
  renderAccountSelects();
}

async function loadCategories() {
  state.categories = await api('/categories');
  renderCategories();
  renderCategorySelects();
}

function currentFilters() {
  const params = new URLSearchParams();
  const map = { search: '#fSearch', type: '#fType', category: '#fCategory', account: '#fAccount', from: '#fFrom', to: '#fTo' };
  for (const [key, selector] of Object.entries(map)) {
    const value = $(selector).value.trim();
    if (value) params.set(key, value);
  }
  return params;
}

async function loadTransactions() {
  const query = currentFilters().toString();
  state.transactions = await api('/transactions' + (query ? `?${query}` : ''));
  renderTransactions(Boolean(query));
}

async function loadSummary() {
  const s = await api(`/summary?month=${$('#monthPicker').value || thisMonth()}`);
  renderSummary(s);
}

async function refreshAll() {
  await Promise.all([loadAccounts(), loadCategories()]);
  await Promise.all([loadTransactions(), loadSummary()]);
}

/* ------------------------------------------------------------------ rendering */

function renderSummary(s) {
  const balanceEl = $('#totalBalance');
  balanceEl.textContent = money.format(s.totalBalance);
  balanceEl.classList.toggle('negative', s.totalBalance < 0);
  $('#countsLine').textContent =
    `${s.counts.transactions} transaction${s.counts.transactions === 1 ? '' : 's'} across ${s.counts.accounts} account${s.counts.accounts === 1 ? '' : 's'}`;

  $('#monthIncome').textContent = money.format(s.monthIncome);
  $('#monthExpense').textContent = money.format(s.monthExpense);
  const net = $('#monthNet');
  net.textContent = money.format(s.monthNet);
  net.className = s.monthNet < 0 ? 'neg' : s.monthNet > 0 ? 'pos' : '';

  const total = s.monthIncome + s.monthExpense;
  $('#splitIncome').style.width = total ? `${(s.monthIncome / total) * 100}%` : '0';
  $('#splitExpense').style.width = total ? `${(s.monthExpense / total) * 100}%` : '0';

  // Spending by category (expenses only)
  const spend = s.byCategory.filter((c) => c.type === 'expense');
  const max = spend.length ? spend[0].total : 0;
  $('#spendList').innerHTML = spend.length
    ? spend.map((c) => `
        <li>
          <div class="row-top"><span>${esc(c.name)}</span><strong>${money.format(c.total)}</strong></div>
          <div class="track"><div class="fill" style="width:${(c.total / max) * 100}%"></div></div>
        </li>`).join('')
    : '<li class="none">No expenses recorded for this month.</li>';
}

function renderTransactions(filtered) {
  const rows = state.transactions;
  $('#txBody').innerHTML = rows.map((t) => `
    <tr>
      <td class="date">${fmtDate(t.date)}</td>
      <td>${esc(t.description)}${t.note ? `<span class="note">${esc(t.note)}</span>` : ''}</td>
      <td><span class="tag ${t.type}">${esc(t.category ? t.category.name : 'Unknown')}</span></td>
      <td>${esc(t.account ? t.account.name : 'Unknown')}</td>
      <td class="num amount ${t.type}">${t.type === 'income' ? '+' : '-'}${money.format(t.amount)}</td>
      <td class="num balance ${t.runningBalance < 0 ? 'negative' : ''}">${money.format(t.runningBalance)}</td>
      <td class="actions">
        <button class="link-btn" data-action="edit" data-id="${t._id}" aria-label="Edit ${esc(t.description)}">Edit</button>
        <button class="link-btn danger" data-action="delete" data-id="${t._id}" aria-label="Delete ${esc(t.description)}">Delete</button>
      </td>
    </tr>`).join('');

  const empty = $('#txEmpty');
  empty.hidden = rows.length > 0;
  if (!rows.length) {
    empty.textContent = filtered
      ? 'No transactions match these filters. Try clearing them.'
      : 'No transactions yet. Use "Add transaction" to record your first one.';
  }

  const income = rows.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = rows.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  $('#txSummary').textContent = rows.length
    ? `${rows.length} shown. In ${money.format(income)}, out ${money.format(expense)}`
    : '';
}

function renderAccounts() {
  $('#accountList').innerHTML = state.accounts.length
    ? state.accounts.map((a) => `
      <li>
        <div><span class="name">${esc(a.name)}</span><span class="meta">${esc(a.type)}</span></div>
        <div>
          <div class="amt ${a.balance < 0 ? 'negative' : ''}">${money.format(a.balance)}</div>
          <div class="btns">
            <button class="link-btn" data-kind="account" data-action="edit" data-id="${a._id}" aria-label="Edit account ${esc(a.name)}">Edit</button>
            <button class="link-btn danger" data-kind="account" data-action="delete" data-id="${a._id}" aria-label="Delete account ${esc(a.name)}">Delete</button>
          </div>
        </div>
      </li>`).join('')
    : '<li class="small">No accounts yet. Add one to start recording transactions.</li>';
}

function renderCategories() {
  const group = (type, label) => {
    const items = state.categories.filter((c) => c.type === type);
    if (!items.length) return '';
    return `<li class="group-label">${label}</li>` + items.map((c) => `
      <li>
        <span class="name">${esc(c.name)}</span>
        <div class="btns">
          <button class="link-btn" data-kind="category" data-action="edit" data-id="${c._id}" aria-label="Edit category ${esc(c.name)}">Edit</button>
          <button class="link-btn danger" data-kind="category" data-action="delete" data-id="${c._id}" aria-label="Delete category ${esc(c.name)}">Delete</button>
        </div>
      </li>`).join('');
  };
  const html = group('income', 'Income') + group('expense', 'Expense');
  $('#categoryList').innerHTML = html || '<li class="small">No categories yet. Add one to start recording transactions.</li>';
}

function renderAccountSelects() {
  const f = $('#fAccount');
  const keep = f.value;
  f.innerHTML = optionsHtml(state.accounts, { all: 'All accounts', selected: keep });
  const tx = $('#txForm').elements.account;
  const keepTx = tx.value;
  tx.innerHTML = optionsHtml(state.accounts, { selected: keepTx });
}

function renderCategorySelects() {
  const f = $('#fCategory');
  const keep = f.value;
  f.innerHTML = optionsHtml(state.categories, { all: 'All categories', selected: keep });
  renderTxCategoryOptions();
}

// In the transaction form only show categories that match the chosen type
function renderTxCategoryOptions(selected) {
  const form = $('#txForm');
  const type = form.elements.type.value;
  const sel = form.elements.category;
  const keep = selected || sel.value;
  sel.innerHTML = optionsHtml(state.categories.filter((c) => c.type === type), { selected: keep });
}

/* ------------------------------------------------------------------ transaction dialog (Add / Edit) */

const txDialog = $('#txDialog');
const txForm = $('#txForm');
let editingTxId = null;

function openTxDialog(tx = null) {
  if (!tx && (!state.accounts.length || !state.categories.length)) {
    toast('Add at least one account and one category first.', 'error');
    return;
  }
  editingTxId = tx ? tx._id : null;
  showFormError($('#txError'), '');
  $('#txDialogTitle').textContent = tx ? 'Edit transaction' : 'Add transaction';
  $('#txSubmit').textContent = tx ? 'Save changes' : 'Save transaction';
  txForm.reset();

  txForm.elements.type.value = tx ? tx.type : 'expense';
  renderAccountSelects();
  renderTxCategoryOptions(tx ? tx.category._id : '');
  txForm.elements.date.value = tx ? toInputDate(tx.date) : today();
  if (tx) {
    txForm.elements.amount.value = tx.amount;
    txForm.elements.description.value = tx.description;
    txForm.elements.account.value = tx.account._id;
    txForm.elements.category.value = tx.category._id;
    txForm.elements.note.value = tx.note || '';
  }
  txDialog.showModal();
  txForm.elements.amount.focus();
}

// Switching Income <-> Expense swaps the category list
txForm.querySelectorAll('input[name="type"]').forEach((radio) =>
  radio.addEventListener('change', () => renderTxCategoryOptions(''))
);

txForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const f = txForm.elements;
  const body = {
    type: f.type.value,
    amount: f.amount.value === '' ? '' : Number(f.amount.value),
    date: f.date.value,
    description: f.description.value.trim(),
    account: f.account.value,
    category: f.category.value,
    note: f.note.value.trim(),
  };

  // Client-side validation (the server validates again)
  if (!body.description) return showFormError($('#txError'), 'Enter a description.');
  if (!(body.amount > 0)) return showFormError($('#txError'), 'Enter an amount greater than zero.');
  if (!body.date) return showFormError($('#txError'), 'Choose a date.');
  if (!body.account) return showFormError($('#txError'), 'Choose an account.');
  if (!body.category) return showFormError($('#txError'), `Choose a ${body.type} category. Add one first if the list is empty.`);

  const submit = $('#txSubmit');
  submit.disabled = true;
  try {
    if (editingTxId) {
      await api(`/transactions/${editingTxId}`, { method: 'PUT', body });
      toast('Transaction updated.');
    } else {
      await api('/transactions', { method: 'POST', body });
      toast('Transaction added.');
    }
    txDialog.close();
    await refreshAll();
  } catch (err) {
    showFormError($('#txError'), err.message);
  } finally {
    submit.disabled = false;
  }
});

$('#txBody').addEventListener('click', async (event) => {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;
  const tx = state.transactions.find((t) => t._id === btn.dataset.id);
  if (!tx) return;

  if (btn.dataset.action === 'edit') return openTxDialog(tx);

  if (confirm(`Delete "${tx.description}" (${money.format(tx.amount)})? This cannot be undone.`)) {
    try {
      await api(`/transactions/${tx._id}`, { method: 'DELETE' });
      toast('Transaction deleted.');
      await refreshAll();
    } catch (err) {
      toast(err.message, 'error');
    }
  }
});

/* ------------------------------------------------------------------ account / category dialog */

const entityDialog = $('#entityDialog');
const entityForm = $('#entityForm');
let entity = { kind: 'account', id: null };

const ACCOUNT_TYPES = ['cash', 'bank', 'e-wallet', 'credit card'];
const CATEGORY_TYPES = ['expense', 'income'];

function openEntityDialog(kind, item = null) {
  entity = { kind, id: item ? item._id : null };
  const isAccount = kind === 'account';
  const f = entityForm.elements;
  entityForm.reset();
  showFormError($('#entityError'), '');

  $('#entityTitle').textContent = `${item ? 'Edit' : 'Add'} ${kind}`;
  $('#entityTypeLabel').textContent = isAccount ? 'Account type' : 'Category type';
  $('#openingField').hidden = !isAccount;
  f.type.innerHTML = (isAccount ? ACCOUNT_TYPES : CATEGORY_TYPES)
    .map((t) => `<option value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('');

  if (item) {
    f.name.value = item.name;
    f.type.value = item.type;
    if (isAccount) f.openingBalance.value = item.openingBalance;
  }
  $('#entitySubmit').textContent = item ? 'Save changes' : `Save ${kind}`;
  entityDialog.showModal();
  f.name.focus();
}

entityForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const f = entityForm.elements;
  const isAccount = entity.kind === 'account';
  const body = { name: f.name.value.trim(), type: f.type.value };
  if (isAccount) body.openingBalance = Number(f.openingBalance.value || 0);

  if (!body.name) return showFormError($('#entityError'), `Enter a name for the ${entity.kind}.`);

  const path = isAccount ? '/accounts' : '/categories';
  const submit = $('#entitySubmit');
  submit.disabled = true;
  try {
    if (entity.id) {
      await api(`${path}/${entity.id}`, { method: 'PUT', body });
      toast(`${isAccount ? 'Account' : 'Category'} updated.`);
    } else {
      await api(path, { method: 'POST', body });
      toast(`${isAccount ? 'Account' : 'Category'} added.`);
    }
    entityDialog.close();
    await refreshAll();
  } catch (err) {
    showFormError($('#entityError'), err.message);
  } finally {
    submit.disabled = false;
  }
});

// Edit / delete buttons inside the accounts and categories lists
async function handleEntityClick(event) {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;
  const { kind, action, id } = btn.dataset;
  const list = kind === 'account' ? state.accounts : state.categories;
  const item = list.find((x) => x._id === id);
  if (!item) return;

  if (action === 'edit') return openEntityDialog(kind, item);

  if (confirm(`Delete the ${kind} "${item.name}"?`)) {
    try {
      await api(`${kind === 'account' ? '/accounts' : '/categories'}/${id}`, { method: 'DELETE' });
      toast(`${kind === 'account' ? 'Account' : 'Category'} deleted.`);
      await refreshAll();
    } catch (err) {
      toast(err.message, 'error'); // e.g. "This account has 3 transactions..."
    }
  }
}
$('#accountList').addEventListener('click', handleEntityClick);
$('#categoryList').addEventListener('click', handleEntityClick);

/* ------------------------------------------------------------------ page wiring */

$('#addTxBtn').addEventListener('click', () => openTxDialog());
$('#addAccountBtn').addEventListener('click', () => openEntityDialog('account'));
$('#addCategoryBtn').addEventListener('click', () => openEntityDialog('category'));

document.querySelectorAll('dialog [data-close]').forEach((btn) =>
  btn.addEventListener('click', () => btn.closest('dialog').close())
);

// Filters: reload as the person types or changes a value
let searchTimer;
$('#fSearch').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadTransactions().catch((e) => toast(e.message, 'error')), 250);
});
['#fType', '#fCategory', '#fAccount', '#fFrom', '#fTo'].forEach((sel) =>
  $(sel).addEventListener('change', () => loadTransactions().catch((e) => toast(e.message, 'error')))
);
$('#filters').addEventListener('submit', (e) => e.preventDefault());
$('#clearFilters').addEventListener('click', () => {
  $('#filters').reset();
  loadTransactions().catch((e) => toast(e.message, 'error'));
});

$('#monthPicker').addEventListener('change', () => loadSummary().catch((e) => toast(e.message, 'error')));

// Start
$('#monthPicker').value = thisMonth();
refreshAll().catch((err) => toast(`Could not load data: ${err.message}`, 'error'));
