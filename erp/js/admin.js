document.addEventListener('DOMContentLoaded', () => {
    // Set Current Date
    const dateOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', dateOptions);

    // Sidebar Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    const contentPanels = document.querySelectorAll('.content-panel');
    const pageTitle = document.querySelector('.page-title');

    const titles = {
        'overview': 'Dashboard Overview',
        'students': 'Manage Students',
        'attendance': 'Attendance Management',
        'fees': 'Fee Tracking',
        'progress': 'Progress Reports',
        'enquiries': 'Website Enquiries',
        'help': 'Admin User Manual'
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active classes
            navItems.forEach(nav => nav.classList.remove('active'));
            contentPanels.forEach(panel => panel.classList.remove('active'));

            // Add active class to clicked
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Update Title
            pageTitle.textContent = titles[targetId];

            if (targetId === 'students') loadStudents();
            if (targetId === 'progress') loadProgressStudents();
            if (targetId === 'enquiries') loadEnquiries();
            if (targetId === 'home-tuition-enq') loadHomeTuitionEnquiries();
        });
    });

    // Add Student Form Submit
    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('stuName').value;
            const stuClass = document.getElementById('stuClass').value;
            const joinDate = document.getElementById('stuDate').value;
            const fee = document.getElementById('stuFee').value;

            // Supabase Insert
            try {
                const { data, error } = await supabaseClient.from('students_master').insert([
                    { name: name, class: stuClass, join_date: joinDate, base_fee: fee }
                ]);

                if (error) throw error;

                alert(`Student ${name} added successfully!`);
                closeModal('addStudentModal');
                addStudentForm.reset();
                loadStudents(); // Reload list
            } catch (err) {
                console.error('Error adding student:', err);
                alert('Error adding student: ' + err.message);
            }
        });
    }

    // Initial Load
    loadStudents();
    updateDashboardStats();
});

// --- DASHBOARD OVERVIEW STATS ---
async function updateDashboardStats() {
    try {
        // 1. Total Enrolled
        const { count: studentCount, error: countErr } = await supabaseClient
            .from('students_master')
            .select('*', { count: 'exact', head: true });

        if (!countErr && studentCount !== null) {
            document.getElementById('statTotalStudents').textContent = studentCount;
        }

        // 2. Today's Attendance %
        const today = new Date().toISOString().split('T')[0];
        const { data: todayAtt, error: attErr } = await supabaseClient
            .from('attendance')
            .select('status')
            .eq('attendance_date', today);

        if (!attErr && todayAtt && studentCount > 0) {
            const presentCount = todayAtt.filter(a => a.status === 'Present').length;
            const percentage = Math.round((presentCount / studentCount) * 100);
            document.getElementById('statAttendance').textContent = percentage + '%';
        } else {
            document.getElementById('statAttendance').textContent = '0%';
        }

        // 3. Current Month Fees
        const currentMonth = today.substring(0, 7); // 'YYYY-MM'

        // Calculate Expected Total (Sum of all students' base fee)
        const { data: allStudents } = await supabaseClient.from('students_master').select('base_fee');
        let expectedTotal = 0;
        if (allStudents) {
            expectedTotal = allStudents.reduce((sum, s) => sum + Number(s.base_fee), 0);
        }

        // Calculate Collected (Sum of all amount_paid for current month)
        const { data: monthFees } = await supabaseClient
            .from('fees')
            .select('amount_paid')
            .eq('fee_month', currentMonth);

        let collected = 0;
        if (monthFees) {
            collected = monthFees.reduce((sum, f) => sum + Number(f.amount_paid), 0);
        }

        const pending = expectedTotal - collected;

        const elCollected = document.getElementById('statFeesCollected');
        const elPending = document.getElementById('statPendingFees');
        if (elCollected) elCollected.textContent = '₹' + collected.toLocaleString();
        if (elPending) elPending.textContent = '₹' + pending.toLocaleString();

    } catch (err) {
        console.error("Stats update error:", err);
    }
}

// Modal Logic
window.openModal = function (modalId) {
    document.getElementById(modalId).classList.add('active');
}

window.closeModal = function (modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modal on outside click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// Load students from Supabase
async function loadStudents() {
    const tbody = document.querySelector('#studentsTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Loading students from database...</td></tr>';

    try {
        const { data: students, error } = await supabaseClient
            .from('students_master')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        tbody.innerHTML = '';

        if (!students || students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No students found. Add one!</td></tr>';
            return;
        }

        students.forEach((student) => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${student.name}</strong></td>
                    <td><span class="badge badge-success">${student.class}</span></td>
                    <td>${student.join_date}</td>
                    <td>₹${student.base_fee}</td>
                    <td>
                        <button class="btn-icon" title="Edit"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon" style="color:var(--danger); border-color:var(--danger);" title="Delete" onclick="deleteStudent('${student.id}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        // Update stats
        updateDashboardStats();

    } catch (err) {
        console.error('Error fetching students:', err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--danger);">Error loading data: ${err.message}. Ensure tables are created in Supabase.</td></tr>`;
    }
}

// Global delete function
window.deleteStudent = async function (id) {
    if (confirm('Are you sure you want to delete this student?')) {
        try {
            const { error } = await supabaseClient.from('students_master').delete().eq('id', id);
            if (error) throw error;
            loadStudents();
        } catch (err) {
            alert('Error deleting: ' + err.message);
        }
    }
}

// --- ATTENDANCE MODULE ---

// Set today's date automatically
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('attendanceDate');
    if (dateInput) dateInput.value = today;
});

// Load students for attendance marking
window.loadAttendanceStudents = async function () {
    const selectedClass = document.getElementById('attendanceClass').value;
    const dateValue = document.getElementById('attendanceDate').value;
    const tbody = document.querySelector('#attendanceTable tbody');
    const saveBtn = document.getElementById('btnSaveAttendance');

    if (!selectedClass || !dateValue) {
        alert("Please select both a Date and a Class.");
        return;
    }

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading students...</td></tr>';
    saveBtn.style.display = 'none';

    try {
        // 1. Fetch all students in the class
        const { data: students, error: stuError } = await supabaseClient
            .from('students_master')
            .select('id, name, class')
            .eq('class', selectedClass);

        if (stuError) throw stuError;

        if (!students || students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No students found for this class.</td></tr>';
            return;
        }

        // 2. Fetch existing attendance for this date/class
        const studentIds = students.map(s => s.id);
        const { data: existingAtt, error: attError } = await supabaseClient
            .from('attendance')
            .select('*')
            .eq('attendance_date', dateValue)
            .in('student_id', studentIds);

        if (attError) throw attError;

        // Map existing attendance
        const attMap = {};
        if (existingAtt) {
            existingAtt.forEach(record => {
                attMap[record.student_id] = record.status;
            });
        }

        // 3. Render Table
        tbody.innerHTML = '';
        students.forEach(student => {
            const status = attMap[student.id]; // 'Present' or 'Absent' or undefined
            const isPresent = status === 'Present' ? 'checked' : '';
            const isAbsent = status === 'Absent' ? 'checked' : '';

            // If neither is checked, default to Present (makes marking faster)
            const defaultPresent = (!isPresent && !isAbsent) ? 'checked' : isPresent;

            tbody.innerHTML += `
                <tr>
                    <td><strong>${student.name}</strong></td>
                    <td><span class="badge badge-success">${student.class}</span></td>
                    <td style="text-align:center;">
                        <input type="radio" name="att_${student.id}" value="Present" ${defaultPresent} style="transform: scale(1.5);">
                    </td>
                    <td style="text-align:center;">
                        <input type="radio" name="att_${student.id}" value="Absent" ${isAbsent} style="transform: scale(1.5);">
                    </td>
                </tr>
            `;
        });

        saveBtn.style.display = 'inline-block';

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Error: ${err.message}</td></tr>`;
    }
}

// Save Attendance
const attendanceForm = document.getElementById('attendanceForm');
if (attendanceForm) {
    attendanceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dateValue = document.getElementById('attendanceDate').value;
        const btn = document.getElementById('btnSaveAttendance');

        btn.innerHTML = 'Saving...';
        btn.disabled = true;

        try {
            // Collect all radio values
            const formData = new FormData(attendanceForm);
            const upsertData = [];

            for (let [key, value] of formData.entries()) {
                if (key.startsWith('att_')) {
                    const studentId = key.split('_')[1];
                    upsertData.push({
                        student_id: studentId,
                        attendance_date: dateValue,
                        status: value
                    });
                }
            }

            // Upsert into Supabase (requires UNIQUE constraint on student_id + attendance_date)
            // If it already exists, it updates. If not, it inserts.
            const { error } = await supabaseClient
                .from('attendance')
                .upsert(upsertData, { onConflict: 'student_id, attendance_date' });

            if (error) throw error;

            alert('Attendance saved successfully!');
            updateDashboardStats(); // Refresh dashboard widget

        } catch (err) {
            console.error(err);
            alert('Error saving attendance: ' + err.message);
        } finally {
            btn.innerHTML = 'Save Attendance';
            btn.disabled = false;
        }
    });
}

// --- ATTENDANCE REPORT DOWNLOAD ---
window.downloadAttendanceReport = async function () {
    const monthVal = document.getElementById('reportMonth').value; // YYYY-MM format
    const classVal = document.getElementById('reportClass').value;

    if (!monthVal || !classVal) {
        alert("Please select both a month and a class to generate the report.");
        return;
    }

    const btn = document.querySelector('button[onclick="downloadAttendanceReport()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
    btn.disabled = true;

    try {
        // 1. Get all students for the class
        const { data: students, error: stuError } = await supabaseClient
            .from('students_master')
            .select('id, name')
            .eq('class', classVal)
            .order('name');

        if (stuError) throw stuError;
        if (!students || students.length === 0) {
            alert("No students found for this class.");
            return;
        }

        // 2. Get attendance for the selected month
        const studentIds = students.map(s => s.id);
        const startDate = `${monthVal}-01`;

        // Calculate last day of the month
        const [year, month] = monthVal.split('-');
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${monthVal}-${lastDay}`;

        const { data: attendance, error: attError } = await supabaseClient
            .from('attendance')
            .select('student_id, attendance_date, status')
            .in('student_id', studentIds)
            .gte('attendance_date', startDate)
            .lte('attendance_date', endDate);

        if (attError) throw attError;

        // 3. Process data into a map
        // attMap = { student_id: { 'YYYY-MM-DD': 'Present' } }
        const attMap = {};
        attendance.forEach(record => {
            if (!attMap[record.student_id]) attMap[record.student_id] = {};
            attMap[record.student_id][record.attendance_date] = record.status;
        });

        // 4. Generate CSV String
        let csvContent = "";

        // CSV Header
        let header = ["Student Name"];
        for (let d = 1; d <= lastDay; d++) {
            header.push(`${d}`);
        }
        header.push("Total Present", "Total Absent");
        csvContent += header.join(",") + "\n";

        // CSV Rows
        students.forEach(student => {
            let safeName = student.name.replace(/,/g, ''); // Remove commas to prevent CSV breakage
            let row = [safeName];
            let presentCount = 0;
            let absentCount = 0;

            for (let d = 1; d <= lastDay; d++) {
                const dateStr = `${monthVal}-${d.toString().padStart(2, '0')}`;
                const status = attMap[student.id] ? attMap[student.id][dateStr] : '-';

                if (status === 'Present') {
                    row.push('P');
                    presentCount++;
                } else if (status === 'Absent') {
                    row.push('A');
                    absentCount++;
                } else {
                    row.push('-'); // Not marked
                }
            }

            row.push(presentCount, absentCount);
            csvContent += row.join(",") + "\n";
        });

        // 5. Trigger File Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Attendance_${classVal}_${monthVal}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err) {
        console.error(err);
        alert("Error generating report: " + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// View Attendance Report on Screen
window.viewAttendanceReport = async function () {
    const monthVal = document.getElementById('reportMonth').value;
    const classVal = document.getElementById('reportClass').value;
    const container = document.getElementById('reportViewContainer');

    if (!monthVal || !classVal) {
        alert("Please select both a month and a class to view the report.");
        return;
    }

    container.style.display = 'block';
    container.innerHTML = '<p style="text-align:center;">Loading report...</p>';

    try {
        const { data: students, error: stuError } = await supabaseClient
            .from('students_master')
            .select('id, name')
            .eq('class', classVal)
            .order('name');

        if (stuError) throw stuError;
        if (!students || students.length === 0) {
            container.innerHTML = '<p style="text-align:center;">No students found for this class.</p>';
            return;
        }

        const [year, month] = monthVal.split('-');
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = `${monthVal}-01`;
        const endDate = `${monthVal}-${lastDay}`;
        const studentIds = students.map(s => s.id);

        const { data: attendance, error: attError } = await supabaseClient
            .from('attendance')
            .select('student_id, attendance_date, status')
            .in('student_id', studentIds)
            .gte('attendance_date', startDate)
            .lte('attendance_date', endDate);

        if (attError) throw attError;

        const attMap = {};
        attendance.forEach(record => {
            if (!attMap[record.student_id]) attMap[record.student_id] = {};
            attMap[record.student_id][record.attendance_date] = record.status;
        });

        // Build HTML Table
        let html = '<table style="width:100%; border-collapse: collapse; min-width: 800px; font-size: 0.85rem;">';

        // Header
        html += '<thead><tr><th style="position:sticky; left:0; background:#F8FAFC; border:1px solid #E2E8F0; padding:10px;">Student Name</th>';
        for (let d = 1; d <= lastDay; d++) {
            html += `<th style="border:1px solid #E2E8F0; padding:10px; text-align:center;">${d}</th>`;
        }
        html += '<th style="border:1px solid #E2E8F0; padding:10px; text-align:center;">Total P</th><th style="border:1px solid #E2E8F0; padding:10px; text-align:center;">Total A</th></tr></thead><tbody>';

        // Rows
        students.forEach(student => {
            html += `<tr><td style="position:sticky; left:0; background:#FFF; border:1px solid #E2E8F0; padding:10px;"><strong>${student.name}</strong></td>`;
            let presentCount = 0;
            let absentCount = 0;

            for (let d = 1; d <= lastDay; d++) {
                const dateStr = `${monthVal}-${d.toString().padStart(2, '0')}`;
                const status = attMap[student.id] ? attMap[student.id][dateStr] : null;

                let cellColor = '#FFF';
                let text = '-';
                if (status === 'Present') {
                    text = 'P';
                    cellColor = '#E6FFF3'; // light green
                    presentCount++;
                } else if (status === 'Absent') {
                    text = 'A';
                    cellColor = '#FEE2E2'; // light red
                    absentCount++;
                }

                html += `<td style="border:1px solid #E2E8F0; padding:10px; text-align:center; background:${cellColor}; font-weight:600;">${text}</td>`;
            }
            html += `<td style="border:1px solid #E2E8F0; padding:10px; text-align:center; font-weight:700; color:var(--success);">${presentCount}</td>`;
            html += `<td style="border:1px solid #E2E8F0; padding:10px; text-align:center; font-weight:700; color:var(--danger);">${absentCount}</td>`;
            html += '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style="text-align:center; color:red;">Error: ${err.message}</p>`;
    }
}

// --- FEE TRACKING MODULE ---

// Default to current month
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const feeMonthInput = document.getElementById('feeMonth');
    if (feeMonthInput) feeMonthInput.value = today.toISOString().substring(0, 7);
});

window.loadFees = async function () {
    const monthVal = document.getElementById('feeMonth').value;
    const classVal = document.getElementById('feeClass').value;
    const searchVal = document.getElementById('feeSearch').value.toLowerCase();
    const tbody = document.querySelector('#feesTable tbody');

    if (!monthVal) {
        alert("Please select a month.");
        return;
    }

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading fees...</td></tr>';

    try {
        // 1. Fetch Students
        let query = supabaseClient.from('students_master').select('id, name, class, base_fee').order('name');
        if (classVal) query = query.eq('class', classVal);

        const { data: students, error: stuErr } = await query;
        if (stuErr) throw stuErr;

        let filteredStudents = students;
        if (searchVal) {
            filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchVal));
        }

        if (!filteredStudents || filteredStudents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No students found matching filters.</td></tr>';
            return;
        }

        // 2. Fetch Fees for month
        const studentIds = filteredStudents.map(s => s.id);
        const { data: feesData, error: feeErr } = await supabaseClient
            .from('fees')
            .select('*')
            .eq('fee_month', monthVal)
            .in('student_id', studentIds);

        if (feeErr) throw feeErr;

        const feeMap = {};
        if (feesData) {
            feesData.forEach(f => { feeMap[f.student_id] = f; });
        }

        // 3. Render
        tbody.innerHTML = '';
        filteredStudents.forEach(student => {
            const feeRecord = feeMap[student.id] || { status: 'Pending', amount_paid: 0 };

            const isPaid = feeRecord.status === 'Paid' ? 'selected' : '';
            const isUnpaid = feeRecord.status === 'Unpaid' ? 'selected' : '';
            const isPending = feeRecord.status === 'Pending' ? 'selected' : '';

            let badgeClass = 'badge-warning';
            if (feeRecord.status === 'Paid') badgeClass = 'badge-success';
            if (feeRecord.status === 'Unpaid') badgeClass = 'badge-danger';

            const amtVal = feeRecord.amount_paid > 0 ? feeRecord.amount_paid : 0;

            tbody.innerHTML += `
                <tr>
                    <td><strong>${student.name}</strong></td>
                    <td><span class="badge ${badgeClass}">${student.class}</span></td>
                    <td>₹${student.base_fee}</td>
                    <td>
                        <select id="feeStatus_${student.id}" style="padding:8px; width:110px; border-radius:8px; border:1px solid var(--border-color);">
                            <option value="Pending" ${isPending}>Pending</option>
                            <option value="Paid" ${isPaid}>Paid</option>
                            <option value="Unpaid" ${isUnpaid}>Unpaid</option>
                        </select>
                    </td>
                    <td>
                        <input type="number" id="feeAmt_${student.id}" value="${amtVal}" style="width: 100px; padding: 8px; border-radius: 8px; border: 1px solid var(--border-color);" min="0">
                    </td>
                    <td>
                        <button class="btn-primary btn-small" onclick="saveFee('${student.id}', '${monthVal}')">Save</button>
                    </td>
                </tr>
            `;
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error: ${err.message}</td></tr>`;
    }
}

window.saveFee = async function (studentId, monthVal) {
    const status = document.getElementById(`feeStatus_${studentId}`).value;
    const amt = document.getElementById(`feeAmt_${studentId}`).value;

    try {
        const { error } = await supabaseClient.from('fees').upsert({
            student_id: studentId,
            fee_month: monthVal,
            status: status,
            amount_paid: Number(amt) || 0
        }, { onConflict: 'student_id, fee_month' });

        if (error) throw error;

        if (typeof showNotification === 'function') {
            showNotification('Fee record saved successfully!');
        } else {
            alert('Fee record saved successfully!');
        }

        updateDashboardStats();
        loadFees(); // Reload table to reflect new badge colors

    } catch (err) {
        console.error(err);
        alert('Error saving fee: ' + err.message);
    }
}

window.downloadFeeReport = async function () {
    const monthVal = document.getElementById('feeMonth').value;
    const classVal = document.getElementById('feeClass').value;

    if (!monthVal) {
        alert("Please select a month to download the report.");
        return;
    }

    try {
        // Fetch Students
        let query = supabaseClient.from('students_master').select('id, name, class, base_fee').order('name');
        if (classVal) query = query.eq('class', classVal);

        const { data: students, error: stuErr } = await query;
        if (stuErr) throw stuErr;

        if (!students || students.length === 0) {
            alert("No students found.");
            return;
        }

        // Fetch Fees
        const studentIds = students.map(s => s.id);
        const { data: feesData, error: feeErr } = await supabaseClient
            .from('fees')
            .select('*')
            .eq('fee_month', monthVal)
            .in('student_id', studentIds);

        if (feeErr) throw feeErr;

        const feeMap = {};
        if (feesData) feesData.forEach(f => { feeMap[f.student_id] = f; });

        // Generate CSV
        let csvContent = "Student Name,Class,Base Fee,Status,Amount Paid,Pending Balance\n";

        students.forEach(student => {
            const feeRecord = feeMap[student.id] || { status: 'Pending', amount_paid: 0 };
            const safeName = student.name.replace(/,/g, '');
            const amountPaid = feeRecord.amount_paid > 0 ? feeRecord.amount_paid : 0;
            const balance = Number(student.base_fee) - Number(amountPaid);

            csvContent += `${safeName},${student.class},${student.base_fee},${feeRecord.status},${amountPaid},${balance}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Fee_Report_${classVal || 'All'}_${monthVal}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err) {
        console.error(err);
        alert("Error generating fee report: " + err.message);
    }
}

// --- PROGRESS MODULE ---

window.loadProgressStudents = async function () {
    const select = document.getElementById('progStudentSelect');
    if (!select) return;

    try {
        const { data: students, error } = await supabaseClient.from('students_master').select('id, name, class').order('name');
        if (error) throw error;

        select.innerHTML = '<option value="">-- Choose Student --</option>';
        students.forEach(s => {
            select.innerHTML += `<option value="${s.id}">${s.name} (${s.class})</option>`;
        });
    } catch (err) {
        console.error(err);
        select.innerHTML = '<option value="">Error loading students</option>';
    }
}

window.loadStudentProgress = async function () {
    const studentId = document.getElementById('progStudentSelect').value;
    const tbody = document.querySelector('#progressTable tbody');
    const label = document.getElementById('progStudentNameLabel');

    if (!studentId) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Select a student to view progress.</td></tr>';
        label.textContent = "Student Performance";
        return;
    }

    const select = document.getElementById('progStudentSelect');
    label.textContent = `Performance: ${select.options[select.selectedIndex].text}`;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';

    try {
        const { data: tests, error } = await supabaseClient
            .from('progress')
            .select('*')
            .eq('student_id', studentId)
            .order('test_date', { ascending: false });

        if (error) throw error;

        if (!tests || tests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No tests recorded yet.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        tests.forEach(test => {
            const percentage = Math.round((test.marks_obtained / test.max_marks) * 100);
            let badgeColor = 'badge-success';
            if (percentage < 40) badgeColor = 'badge-danger';
            else if (percentage < 70) badgeColor = 'badge-warning';

            tbody.innerHTML += `
                <tr>
                    <td>${test.test_date}</td>
                    <td><strong>${test.test_name}</strong></td>
                    <td>${test.marks_obtained} / ${test.max_marks}</td>
                    <td><span class="badge ${badgeColor}">${percentage}%</span></td>
                    <td>
                        <button class="btn-icon" style="color:var(--danger); border-color:var(--danger);" onclick="deleteProgress('${test.id}', '${studentId}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error: ${err.message}</td></tr>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const progDate = document.getElementById('progDate');
    if (progDate) progDate.value = new Date().toISOString().split('T')[0];

    const progressForm = document.getElementById('progressForm');
    if (progressForm) {
        progressForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentId = document.getElementById('progStudentSelect').value;
            if (!studentId) {
                alert("Please select a student first.");
                return;
            }

            const testName = document.getElementById('progTestName').value;
            const maxMarks = document.getElementById('progMaxMarks').value;
            const obtained = document.getElementById('progMarksObtained').value;
            const tDate = document.getElementById('progDate').value;

            if (Number(obtained) > Number(maxMarks)) {
                alert("Marks obtained cannot be greater than max marks!");
                return;
            }

            const btn = progressForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Saving...';
            btn.disabled = true;

            try {
                const { error } = await supabaseClient.from('progress').insert([
                    {
                        student_id: studentId,
                        test_name: testName,
                        max_marks: maxMarks,
                        marks_obtained: obtained,
                        test_date: tDate
                    }
                ]);

                if (error) throw error;

                progressForm.reset();
                document.getElementById('progStudentSelect').value = studentId;
                document.getElementById('progDate').value = new Date().toISOString().split('T')[0];

                if (typeof showNotification === 'function') {
                    showNotification('Test marks saved successfully!');
                } else {
                    alert('Test marks saved successfully!');
                }

                loadStudentProgress();
            } catch (err) {
                console.error(err);
                alert("Error saving marks: " + err.message);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
});

window.deleteProgress = async function (testId, studentId) {
    if (confirm('Delete this test record?')) {
        try {
            const { error } = await supabaseClient.from('progress').delete().eq('id', testId);
            if (error) throw error;
            document.getElementById('progStudentSelect').value = studentId;
            loadStudentProgress();
        } catch (err) {
            alert("Error deleting test: " + err.message);
        }
    }
}

// --- ENQUIRIES MANAGEMENT ---
window.loadEnquiries = async function() {
    const tbody = document.querySelector('#enquiriesTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading...</td></tr>';

    try {
        const { data, error } = await window.supabaseClient
            .from('enquiries')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No enquiries found.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.forEach(enq => {
            const date = new Date(enq.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            let statusBadge = '';
            if (enq.status === 'New') {
                statusBadge = '<span style="background:#FFE4E6; color:#E11D48; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:600;">New</span>';
            } else if (enq.status === 'Contacted') {
                statusBadge = '<span style="background:#FEF08A; color:#854D0E; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:600;">Contacted</span>';
            } else {
                statusBadge = `<span style="background:#DCFCE7; color:#166534; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:600;">${enq.status}</span>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-size:0.9rem; color:var(--text-muted);">${date}</td>
                <td style="font-weight:600; color:var(--text-navy);">${enq.student_name}</td>
                <td><a href="tel:${enq.phone_number}" style="color:var(--primary-orange); text-decoration:none;">${enq.phone_number}</a></td>
                <td>${enq.course || '-'}</td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${enq.requirements || ''}">${enq.requirements || '-'}</td>
                <td>${statusBadge}</td>
                <td>
                    ${enq.status === 'New' ? 
                        `<button class="btn-outline" style="padding:5px 10px; font-size:0.8rem;" onclick="updateEnquiryStatus('${enq.id}', 'Contacted')">Mark Contacted</button>` : 
                        enq.status === 'Contacted' ? `<button class="btn-outline" style="padding:5px 10px; font-size:0.8rem;" onclick="updateEnquiryStatus('${enq.id}', 'Resolved')">Resolve</button>` : `<span style="color:var(--text-muted); font-size:0.8rem;">Done</span>`
                    }
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error('Error loading enquiries:', err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Error: ${err.message}</td></tr>`;
    }
}

window.updateEnquiryStatus = async function(id, newStatus) {
    if(!confirm(`Mark this enquiry as ${newStatus}?`)) return;

    try {
        const { error } = await window.supabaseClient
            .from('enquiries')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) throw error;
        loadEnquiries();
    } catch (err) {
        console.error('Error updating status:', err);
        alert('Failed to update status: ' + err.message);
    }
}

// --- HOME TUITION ENQUIRIES ---
window.loadHomeTuitionEnquiries = async function() {
    const tbody = document.querySelector('#htEnquiriesTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading...</td></tr>';

    try {
        const { data, error } = await window.supabaseClient
            .from('home_tuition_inquiries')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No home tuition requests found.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.forEach(enq => {
            const date = new Date(enq.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            let statusBadge = '';
            if (enq.status === 'New') {
                statusBadge = '<span style="background:#FFE4E6; color:#E11D48; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:600;">New</span>';
            } else if (enq.status === 'Contacted') {
                statusBadge = '<span style="background:#FEF08A; color:#854D0E; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:600;">Contacted</span>';
            } else {
                statusBadge = `<span style="background:#DCFCE7; color:#166534; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:600;">${enq.status}</span>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-size:0.9rem; color:var(--text-muted);">${date}</td>
                <td style="font-weight:600; color:var(--text-navy);">${enq.student_name}</td>
                <td><a href="tel:${enq.phone_number}" style="color:var(--primary-orange); text-decoration:none;">${enq.phone_number}</a></td>
                <td>${enq.class_grade || '-'} / ${enq.subjects || '-'}</td>
                <td>${enq.location || '-'}</td>
                <td>${statusBadge}</td>
                <td>
                    ${enq.status === 'New' ? 
                        `<button class="btn-outline" style="padding:5px 10px; font-size:0.8rem;" onclick="updateHTEnquiryStatus('${enq.id}', 'Contacted')">Mark Contacted</button>` : 
                        enq.status === 'Contacted' ? `<button class="btn-outline" style="padding:5px 10px; font-size:0.8rem;" onclick="updateHTEnquiryStatus('${enq.id}', 'Resolved')">Resolve</button>` : `<span style="color:var(--text-muted); font-size:0.8rem;">Done</span>`
                    }
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error('Error loading home tuition enquiries:', err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Error: ${err.message}. Have you created the home_tuition_inquiries table in Supabase?</td></tr>`;
    }
}

window.updateHTEnquiryStatus = async function(id, newStatus) {
    if(!confirm(`Mark this home tuition request as ${newStatus}?`)) return;

    try {
        const { error } = await window.supabaseClient
            .from('home_tuition_inquiries')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) throw error;
        loadHomeTuitionEnquiries();
    } catch (err) {
        console.error('Error updating status:', err);
        alert('Failed to update status: ' + err.message);
    }
}
