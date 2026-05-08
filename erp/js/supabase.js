// Replace these with your actual Supabase project credentials
const supabaseUrl = 'https://asxjxcwkfkqwrnsmeezw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzeGp4Y3drZmtxd3Juc21lZXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMjI3MzYsImV4cCI6MjA5MjY5ODczNn0.sjHoclkhtLkc_yFGVuWrn-TG8J5CBv2DyYwafTyTjjE';

// Initialize the Supabase client and assign to window to avoid shadowing
window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Helper function to show notifications (can be expanded later)
function showNotification(message, type = 'success') {
    // Basic alert for now, can be replaced with toast UI
    alert(`${type.toUpperCase()}: ${message}`);
}
