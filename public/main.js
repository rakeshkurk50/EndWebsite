const form = document.getElementById('regForm');
const viewBtn = document.getElementById('viewUsers');
const usersCard = document.getElementById('usersCard');
const usersList = document.getElementById('usersList');
const backBtn = document.getElementById('back');

// Toast element
let toast;
function ensureToast(){
	if (!toast){
		toast = document.createElement('div');
		toast.className = 'toast';
		document.body.appendChild(toast);
	}
}
function showToast(message, timeout = 2500){
	ensureToast();
	toast.textContent = message;
	toast.classList.add('show');
	setTimeout(() => toast.classList.remove('show'), timeout);
}

// Determine API base. Default to same origin, but when the page is served
// from Live Server (typically port 5500) point to the backend on port 3000.
// This prevents POSTs from going to the static file server which returns 405.
let API_BASE = '';
try {
	if ((location.hostname === '127.0.0.1' || location.hostname === 'localhost') && location.port && location.port !== '3000') {
 		API_BASE = location.protocol + '//' + location.hostname + ':3000';
 	}
} catch (e) {
 	// If location is not available (e.g., non-browser environment), keep default
}

async function postUser(payload){
	try{
		const res = await fetch(`${API_BASE}/api/users`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const body = await res.json().catch(()=>({}));
		if (!res.ok) throw new Error(body.error || body.message || `${res.status} ${res.statusText}`);
		return body;
	}catch(e){
		throw e;
	}
}

form.addEventListener('submit', async (e) => {
	e.preventDefault();
	const formData = new FormData(form);
	const payload = {};
	for (const [k, v] of formData.entries()) payload[k] = v;

	// Client-side validation
	// Mobile
	if (!/^\d{10}$/.test((payload.mobile||'').replace(/\D/g,''))){
		showToast('Please enter a valid 10 digit mobile number');
		return;
	}

	// Name fields: letters only
	const nameFields = ['firstName','lastName','street','city','state','country'];
	for (const f of nameFields) {
		if (payload[f] && !/^[A-Za-z\s'-]+$/.test(payload[f].trim())) {
			showToast(`${f} can only contain letters and basic punctuation`);
			return;
		}
	}

	// Address: letters only, show inline error below field
	const addressErrorEl = document.getElementById('addressError');
	if (payload.address && !/^[A-Za-z\s'-]+$/.test(payload.address.trim())) {
		if (addressErrorEl) {
			addressErrorEl.textContent = 'Address can only contain letters and basic punctuation';
			addressErrorEl.style.display = 'block';
		}
		return;
	} else {
		if (addressErrorEl) { addressErrorEl.textContent = ''; addressErrorEl.style.display = 'none'; }
	}

	// Username: start with letter, letters and digits only
	if (!payload.username || !/^[A-Za-z][A-Za-z0-9]*$/.test(payload.username)) {
		showToast('Username must start with a letter and contain only letters and digits');
		return;
	}

	// Password: min 8, one upper, one lower, one number, one special (not start/end)
	const pwd = payload.password || '';
	if (pwd.length < 8) {
		showToast('Password must be at least 8 characters');
		return;
	}
	if (!/[A-Z]/.test(pwd)) { showToast('Password must include at least one uppercase letter'); return; }
	if (!/[a-z]/.test(pwd)) { showToast('Password must include at least one lowercase letter'); return; }
	if (!/[0-9]/.test(pwd)) { showToast('Password must include at least one number'); return; }
	if (!/[!@#\$%\^&\*\(\)\-_=+\[\]\{\};:'",.<>\/?\\|`~]/.test(pwd)) { showToast('Password must include at least one special character'); return; }
	// special char must not be first or last
	if (/^[!@#\$%\^&\*\(\)\-_=+\[\]\{\};:'",.<>\/?\\|`~]/.test(pwd) || /[!@#\$%\^&\*\(\)\-_=+\[\]\{\};:'",.<>\/?\\|`~]$/.test(pwd)) {
		showToast('Special character must not be the first or last character of the password');
		return;
	}

	try {
		const data = await postUser(payload);
		form.reset();
		await loadUsers();
		usersCard.classList.remove('hidden');
		document.querySelector('.form-card').classList.add('hidden');
		showToast('User registered successfully');
	} catch (err) {
		showToast(err.message || 'Error saving user', 5000);
		console.error(err);
	}
});

viewBtn.addEventListener('click', async () => {
	await loadUsers();
	usersCard.classList.remove('hidden');
	document.querySelector('.form-card').classList.add('hidden');
});

backBtn.addEventListener('click', () => {
	usersCard.classList.add('hidden');
	document.querySelector('.form-card').classList.remove('hidden');
});

function initialsFor(name){
	if (!name) return 'U';
	const parts = name.split(' ').filter(Boolean);
	if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
	return (parts[0][0] + parts[1][0]).toUpperCase();
}

async function loadUsers(){
	usersList.innerHTML = 'Loading...';
	try{
		const res = await fetch(`${API_BASE}/api/users`);
		const users = await res.json();
		if (!Array.isArray(users)) throw new Error('Invalid response');
		usersList.innerHTML = '';
		if (users.length === 0){
			usersList.innerHTML = '<div class="user-item">No users registered yet</div>';
			return;
		}
		users.forEach(u => {
			const div = document.createElement('div');
			div.className = 'user-item';
			const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
			const avatar = document.createElement('div');
			avatar.className = 'user-avatar';
			avatar.textContent = initialsFor(fullName);
			const content = document.createElement('div');
			content.className = 'user-content';
			content.innerHTML = `
				<h4>${fullName}</h4>
				<div class="user-meta">${u.email} • ${u.mobile}</div>
				<div class="user-address">${[u.address,u.street,u.city,u.state,u.country].filter(Boolean).join(', ')}</div>
				<div class="user-time">Registered: ${new Date(u.createdAt).toLocaleString()}</div>
			`;
			div.appendChild(avatar);
			div.appendChild(content);
			usersList.appendChild(div);
			// click animation
			div.addEventListener('click', () => {
				div.classList.add('clicked');
				setTimeout(() => div.classList.remove('clicked'), 220);
			});
		});
	}catch(err){
		usersList.innerHTML = '<div class="user-item">Failed to load users</div>';
		console.error(err);
	}
}
