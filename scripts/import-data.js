const fs = require('fs');
const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/trademarkiq';

const FILES = {
  users: '/home/ubuntu/attachments/6941eb65-a8fd-4090-b02d-7c5527012ca8/users.json',
  accounts: '/home/ubuntu/attachments/b2bd60f5-9fa4-437b-bbdc-4f9977f3444c/accounts.json',
  sessions: '/home/ubuntu/attachments/7dbdf295-b354-4868-865c-99725555b119/sessions.json',
  verification_tokens: '/home/ubuntu/attachments/690c5b8b-3c50-4a0f-9e62-327dfd0fd9b5/verification_tokens.json',
  trademark_cases: '/home/ubuntu/attachments/6eec6841-da3f-47a4-9b3f-e64755a0358a/trademark_cases.json',
  case_steps: '/home/ubuntu/attachments/263f1a2a-80fa-4302-9b5e-3ba9de4cbacd/case_steps.json',
  case_decisions: '/home/ubuntu/attachments/88bba58a-2296-4ac7-b8fc-80e96d98b5d0/case_decisions.json',
  case_events: '/home/ubuntu/attachments/fb2081ec-472f-4275-8bb8-0be253f94523/case_events.json',
  case_analyses: '/home/ubuntu/attachments/35f7178b-5665-4070-99c0-03476cc6d251/case_analyses.json',
  consultations: '/home/ubuntu/attachments/429337e7-e676-4eb4-836a-c6a476065b60/consultations.json',
  recherche_history: '/home/ubuntu/attachments/4b4e76d7-59ba-48ba-973b-3a0d1f6fccbb/recherche_history.json',
  chat_logs: '/home/ubuntu/attachments/438a6fd8-3914-4529-8d2d-b99996b43bab/chat_logs.json',
};

const TABLE_COLUMNS = {
  users: ['id', 'email', 'name', 'password', 'image', 'email_verified', 'created_at', 'updated_at', 'is_admin', 'tour_completed'],
  accounts: ['id', 'user_id', 'type', 'provider', 'provider_account_id', 'refresh_token', 'access_token', 'expires_at', 'token_type', 'scope', 'id_token', 'session_state'],
  sessions: ['id', 'session_token', 'user_id', 'expires'],
  verification_tokens: ['identifier', 'token', 'expires'],
  trademark_cases: ['id', 'case_number', 'user_id', 'trademark_name', 'status', 'created_at', 'updated_at'],
  case_steps: ['id', 'case_id', 'step', 'status', 'started_at', 'completed_at', 'skipped_at', 'skip_reason', 'metadata', 'created_at'],
  case_decisions: ['id', 'case_id', 'trademark_names', 'trademark_type', 'visited_accordions', 'countries', 'nice_classes', 'completeness_score', 'confidence_score', 'needs_confirmation', 'confirmed_at', 'confirmed_by', 'raw_summary', 'extracted_at'],
  case_events: ['id', 'case_id', 'user_id', 'event_type', 'event_data', 'created_at'],
  case_analyses: ['id', 'case_id', 'user_id', 'search_query', 'search_terms_used', 'conflicts', 'ai_analysis', 'risk_score', 'risk_level', 'total_results_analyzed', 'alternative_names', 'expert_strategy', 'created_at', 'updated_at'],
  consultations: ['id', 'user_id', 'title', 'summary', 'transcript', 'session_protocol', 'duration', 'mode', 'status', 'extracted_data', 'email_sent', 'email_sent_at', 'case_id', 'created_at', 'updated_at'],
  recherche_history: ['id', 'case_id', 'user_id', 'keyword', 'trademark_type', 'countries', 'nice_classes', 'risk_score', 'risk_level', 'decision', 'result', 'created_at'],
  chat_logs: ['id', 'user_id', 'case_id', 'session_id', 'role', 'content', 'input_tokens', 'output_tokens', 'total_tokens', 'cost_eur', 'credits', 'model', 'duration_ms', 'created_at'],
};

const IMPORT_ORDER = [
  'users',
  'accounts',
  'sessions',
  'verification_tokens',
  'trademark_cases',
  'case_steps',
  'case_decisions',
  'case_events',
  'case_analyses',
  'consultations',
  'recherche_history',
  'chat_logs',
];

function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return [];
  }
}

function formatValue(value, column) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}

async function importTable(client, tableName, data, columns) {
  if (!data || data.length === 0) {
    console.log(`  Skipping ${tableName} - no data`);
    return 0;
  }

  console.log(`  Importing ${data.length} rows into ${tableName}...`);
  
  let imported = 0;
  for (const row of data) {
    const values = columns.map(col => formatValue(row[col], col));
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const columnNames = columns.join(', ');
    
    const query = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
    
    try {
      await client.query(query, values);
      imported++;
    } catch (error) {
      console.error(`    Error inserting row in ${tableName}:`, error.message);
    }
  }
  
  console.log(`  Imported ${imported}/${data.length} rows into ${tableName}`);
  return imported;
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log('Connected to database\n');

    for (const tableName of IMPORT_ORDER) {
      const filePath = FILES[tableName];
      const columns = TABLE_COLUMNS[tableName];
      
      if (!filePath || !columns) {
        console.log(`Skipping ${tableName} - no file or columns defined`);
        continue;
      }
      
      console.log(`Processing ${tableName}...`);
      const data = readJsonFile(filePath);
      await importTable(client, tableName, data, columns);
      console.log('');
    }

    console.log('Import complete!');
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await client.end();
  }
}

main();
