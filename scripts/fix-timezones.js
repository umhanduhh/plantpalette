// Script to fix timezone issues in food_logs
// This converts all logged_at timestamps to their Pacific Time date equivalent
// and updates the logged_date field accordingly

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to convert UTC timestamp to Pacific Time date string (YYYY-MM-DD)
function convertToPacificDate(utcTimestamp) {
  const date = new Date(utcTimestamp);

  // Convert to Pacific Time (America/Los_Angeles)
  const pacificDate = new Date(date.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles'
  }));

  const year = pacificDate.getFullYear();
  const month = String(pacificDate.getMonth() + 1).padStart(2, '0');
  const day = String(pacificDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

async function fixTimezones() {
  console.log('Starting timezone fix...\n');

  // Get all food logs
  const { data: logs, error: fetchError } = await supabase
    .from('food_logs')
    .select('*')
    .order('logged_at', { ascending: false });

  if (fetchError) {
    console.error('Error fetching logs:', fetchError);
    process.exit(1);
  }

  if (!logs || logs.length === 0) {
    console.log('No food logs found.');
    return;
  }

  console.log(`Found ${logs.length} food logs to process\n`);

  let updatedCount = 0;
  let unchangedCount = 0;

  // Process each log
  for (const log of logs) {
    const currentDate = log.logged_date;
    const correctDate = convertToPacificDate(log.logged_at);

    if (currentDate !== correctDate) {
      console.log(`Updating: ${log.food_name}`);
      console.log(`  Current date: ${currentDate}`);
      console.log(`  Correct date: ${correctDate}`);
      console.log(`  Logged at: ${log.logged_at}\n`);

      const { error: updateError } = await supabase
        .from('food_logs')
        .update({ logged_date: correctDate })
        .eq('id', log.id);

      if (updateError) {
        console.error(`Error updating log ${log.id}:`, updateError);
      } else {
        updatedCount++;
      }
    } else {
      unchangedCount++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total logs: ${logs.length}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Unchanged: ${unchangedCount}`);
  console.log('\nTimezone fix complete!');
}

// Run the script
fixTimezones().catch(console.error);
