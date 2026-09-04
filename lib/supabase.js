const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (key && key.startsWith('sb_publishable_')) {
	throw new Error('SUPABASE_SERVICE_ROLE_KEY is a publishable key. Use the private service_role/secret key for the Express server.');
}

const enabled = Boolean(url && key);
const client = enabled ? createClient(url, key) : null;

module.exports = { client, enabled };