const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = 'https://nlhykdgpneynozwzuylk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5saHlrZGdwbmV5bm96d3p1eWxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4Njg0NzAsImV4cCI6MjEwNjQ0NDQ3MH0.-_KKSRsz_jLDveSH6kX7vjTCRabF2Eqd3bXR4ekJ_1c';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLE_NAME = 'sucf data';

app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === 'sucfadmin2026') {
        return res.json({ success: true });
    } else {
        return res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

// Register Member API
app.post('/api/members', async (req, res) => {
    try {
        const { picture, ...memberData } = req.body;
        let pictureUrl = '';

        if (picture) {
            const base64Data = Buffer.from(picture.replace(/^data:image\/\w+;base64,/, ''), 'base64');
            const fileName = member_.jpg;
            
            const { error: uploadError } = await supabase.storage
                .from('member-pictures')
                .upload(fileName, base64Data, { contentType: 'image/jpeg', upsert: true });

            if (!uploadError) {
                const { data: publicURLData } = supabase.storage
                    .from('member-pictures')
                    .getPublicUrl(fileName);
                pictureUrl = publicURLData.publicUrl;
            }
        }

        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([{ ...memberData, picture_url: pictureUrl, is_deleted: false }])
            .select();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get Members API (Filterable by level and trash status)
app.get('/api/members', async (req, res) => {
    try {
        const level = req.query.level;
        const trash = req.query.trash === 'true';

        let query = supabase.from(TABLE_NAME).select('*').eq('is_deleted', trash).order('created_at', { ascending: false });

        if (level && level !== 'all' && !trash) {
            query = query.eq('level', level);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Stats API
app.get('/api/stats', async (req, res) => {
    try {
        const { count: total } = await supabase.from(TABLE_NAME).select('*', { count: 'exact', head: true }).eq('is_deleted', false);
        const { count: male } = await supabase.from(TABLE_NAME).select('*', { count: 'exact', head: true }).eq('is_deleted', false).eq('gender', 'Male');
        const { count: female } = await supabase.from(TABLE_NAME).select('*', { count: 'exact', head: true }).eq('is_deleted', false).eq('gender', 'Female');
        const { count: trashCount } = await supabase.from(TABLE_NAME).select('*', { count: 'exact', head: true }).eq('is_deleted', true);

        res.json({ total: total || 0, male: male || 0, female: female || 0, trash: trashCount || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Members (Soft delete single or bulk)
app.post('/api/members/delete', async (req, res) => {
    try {
        const { ids } = req.body; // array of IDs
        const { error } = await supabase.from(TABLE_NAME).update({ is_deleted: true }).in('id', ids);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Restore Members (Single or bulk)
app.post('/api/members/restore', async (req, res) => {
    try {
        const { ids } = req.body;
        const { error } = await supabase.from(TABLE_NAME).update({ is_deleted: false }).in('id', ids);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Permanent Delete
app.post('/api/members/permanent-delete', async (req, res) => {
    try {
        const { ids } = req.body;
        const { error } = await supabase.from(TABLE_NAME).delete().in('id', ids);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log("SUCF Town Campus Server running on http://localhost:" + PORT);
});
