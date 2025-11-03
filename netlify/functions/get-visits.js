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
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const { netId } = event.queryStringParameters;

    if (!netId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'NetID is required' })
      };
    }

    const { data, error } = await supabase
      .from('user_hours')
      .select('*')
      .eq('net_id', netId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'No data found for this NetID' })
        };
      }
      throw error;
    }

    // Return the exact same format as the original working version
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data) // Return the entire data object like the original
    };
  } catch (error) {
    console.error('Error loading visits:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
