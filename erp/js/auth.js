document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const loginError = document.getElementById('loginError');
    let currentRole = 'student'; // Default role

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentRole = btn.dataset.role;
        });
    });

    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = document.getElementById('userId').value;
            const password = document.getElementById('password').value;

            loginError.style.display = 'none';
            const btn = loginForm.querySelector('button[type="submit"]');
            btn.innerHTML = 'Authenticating...';
            btn.disabled = true;

            try {
                if(currentRole === 'admin') {
                    // Query the admins table in Supabase
                    const { data: admins, error } = await supabaseClient
                        .from('admins')
                        .select('*')
                        .eq('username', userId)
                        .eq('password', password);

                    if (error) throw error;

                    if (admins && admins.length > 0) {
                        // Success
                        window.location.href = 'admin.html';
                    } else {
                        throw new Error('Invalid Admin Username or Password.');
                    }
                } else if(currentRole === 'student') {
                    // For now, mock student login (we will build this later)
                    if(userId === 'student' && password === 'student123') {
                        window.location.href = 'student.html';
                    } else {
                        throw new Error('Invalid Student ID or Password.');
                    }
                }
            } catch (error) {
                loginError.textContent = error.message;
                loginError.style.display = 'block';
            } finally {
                btn.innerHTML = 'Login to Dashboard <i class="fa-solid fa-arrow-right"></i>';
                btn.disabled = false;
            }
        });
    }
});
