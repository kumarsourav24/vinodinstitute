// Detailed content for each course
const courseContent = {
    'ssc': {
        title: 'SSC (Class VI-X)',
        body: '<p>BSE Telangana Curriculum with a special focus on Maths and Science fundamentals.</p><ul><li>Comprehensive coverage of all subjects.</li><li>Regular weekly assessments and mock tests.</li><li>Special doubt-clearing sessions.</li><li>Foundation building for future competitive exams.</li></ul>'
    },
    'inter': {
        title: 'Intermediate',
        body: '<p>TSBIE Streams: MPC, MEC, CEC with integrated coaching for competitive exams.</p><ul><li>EAMCET/JEE/NEET integrated approach.</li><li>Experienced faculty for core subjects (Physics, Chemistry, Maths).</li><li>Extensive study material and question banks.</li><li>Career counseling and guidance.</li></ul>'
    },
    'degree': {
        title: 'Degree (UG)',
        body: '<p>Osmania University B.Sc & B.Com with practical application focus.</p><ul><li>In-depth conceptual teaching.</li><li>Focus on university exam patterns and previous papers.</li><li>Skill development workshops.</li><li>Seminars and project guidance.</li></ul>'
    },
    'engg': {
        title: 'Engineering',
        body: '<p>JNTUH B.Tech Support with specialization in Mathematics and Electronics.</p><ul><li>Remedial classes for difficult subjects like M1, M2, M3, M4.</li><li>Core electronics subjects (EDC, ECA, STLD).</li><li>Exam-oriented preparation.</li><li>Programming basics and soft skills.</li></ul>'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Course Modal Logic
    const modal = document.getElementById('courseModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const closeBtn = document.querySelector('.close-modal');

    if (modal && closeBtn) {
        const courseButtons = document.querySelectorAll('.course-card .btn-outline');
        const keys = ['ssc', 'inter', 'degree', 'engg'];
        
        courseButtons.forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const key = keys[index];
                if(courseContent[key]) {
                    modalTitle.textContent = courseContent[key].title;
                    modalBody.innerHTML = courseContent[key].body;
                    modal.classList.add('show');
                }
            });
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
        });

        window.addEventListener('click', (e) => {
            if(e.target === modal) {
                modal.classList.remove('show');
            }
        });
    }

    // Mobile Navigation Toggle
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', () => {
            navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
            navLinks.style.flexDirection = 'column';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '100%';
            navLinks.style.left = '0';
            navLinks.style.width = '100%';
            navLinks.style.background = '#fff';
            navLinks.style.padding = '20px';
            navLinks.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
        });
    }

    // Form Submission Handler
    const enrollForm = document.getElementById('enrollForm');
    if (enrollForm) {
        enrollForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = enrollForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Sending...';
            btn.style.opacity = '0.7';

            const name = document.getElementById('studentName').value;
            const phone = document.getElementById('studentPhone').value;
            const course = document.getElementById('courseSelect').value;
            const message = document.getElementById('message').value;

            // Direct fetch to Supabase REST API
            const supabaseUrl = 'https://asxjxcwkfkqwrnsmeezw.supabase.co/rest/v1/enquiries';
            const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzeGp4Y3drZmtxd3Juc21lZXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMjI3MzYsImV4cCI6MjA5MjY5ODczNn0.sjHoclkhtLkc_yFGVuWrn-TG8J5CBv2DyYwafTyTjjE';

            try {
                const response = await fetch(supabaseUrl, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        student_name: name,
                        phone_number: phone,
                        course: course,
                        requirements: message,
                        status: 'New'
                    })
                });

                if (!response.ok) throw new Error('Network response was not ok');

                alert('Thank you! Your inquiry has been submitted successfully. Our counselors will contact you shortly.');
                enrollForm.reset();
            } catch (error) {
                console.error('Error submitting form:', error);
                alert('Sorry, there was an issue submitting your inquiry. Please try again or call us directly.');
            } finally {
                btn.textContent = originalText;
                btn.style.opacity = '1';
            }
        });
    }
});
