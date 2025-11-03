const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const { netId, visits } = JSON.parse(event.body);

    if (!netId || !visits) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'NetID and visits data are required' })
      };
    }

    // Check if user exists and get current data
    const { data: existingData } = await supabase
      .from('user_hours')
      .select('*')
      .eq('net_id', netId)
      .single();

    let result;

    if (existingData) {
      // Merge existing data with new data
      let existingVisits = existingData.hours_data;
      
      // Convert old format to new format if needed
      if (existingVisits && typeof Object.values(existingVisits)[0] === 'number') {
        const convertedVisits = {};
        for (const date in existingVisits) {
          convertedVisits[date] = {
            ARC: existingVisits[date] > 0 ? 1 : 0,
            CRCE: 0
          };
        }
        existingVisits = convertedVisits;
      }
      
      const mergedVisits = { ...existingVisits, ...visits };
      
      const { data, error } = await supabase
        .from('user_hours')
        .update({
          hours_data: mergedVisits,
          updated_at: new Date().toISOString()
        })
        .eq('net_id', netId);

      if (error) throw error;
      result = data;
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('user_hours')
        .insert([{
          net_id: netId,
          hours_data: visits
        }]);

      if (error) throw error;
      result = data;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: result })
    };
  } catch (error) {
    console.error('Error saving visits:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
