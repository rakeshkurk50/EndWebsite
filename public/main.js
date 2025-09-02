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

// If the page is NOT served from the backend (port 4000), point API calls to the backend URL.
const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') && location.port !== '4000'
	? 'http://localhost:4000'
	: '';

form.addEventListener('submit', async (e) => {
	e.preventDefault();
	const formData = new FormData(form);
	const payload = {};
	for (const [k, v] of formData.entries()) payload[k] = v;

	// Client-side validation
	if (!/^\d{10}$/.test(payload.mobile || '')){
		showToast('Please enter a valid 10 digit mobile number');
		return;
	}
	if (!payload.username || payload.username.trim().length === 0){
		showToast('Please enter a username');
		return;
	}
	if (!payload.password || payload.password.length < 6){
		showToast('Password must be at least 6 characters');
		return;
	}

	try {
		const res = await fetch(`${API_BASE}/api/users`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		if (!res.ok) {
			const errBody = await res.json().catch(() => ({}));
			throw new Error(errBody.error || `${res.status} ${res.statusText}`);
		}
		form.reset();
		// Load users and show the users view immediately
		await loadUsers();
		usersCard.classList.remove('hidden');
		document.querySelector('.form-card').classList.add('hidden');
		showToast('User registered successfully');
	} catch (err) {
		showToast(err.message || 'Error saving user');
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
