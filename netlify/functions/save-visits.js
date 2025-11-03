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

    const { netId, newHoursData } = JSON.parse(event.body); // Changed from 'visits' to 'newHoursData'

    if (!netId || !newHoursData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'NetID and hours data are required' })
      };
    }

    // Check if user exists
    const { data: existingData, error: fetchError } = await supabase
      .from('user_hours')
      .select('*')
      .eq('net_id', netId)
      .single();

    let result;
    let mergedHoursData = newHoursData;

    if (existingData && existingData.hours_data) {
      mergedHoursData = { ...existingData.hours_data, ...newHoursData };
    }

    if (existingData) {
      const { data, error } = await supabase
        .from('user_hours')
        .update({
          hours_data: mergedHoursData,
          updated_at: new Date().toISOString()
        })
        .eq('net_id', netId);

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('user_hours')
        .insert([{
          net_id: netId,
          hours_data: newHoursData
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
