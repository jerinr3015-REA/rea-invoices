import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData } = await req.json();
    
    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'No image data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending request to AI with image data...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an expert invoice data extraction AI. Analyze this invoice image/PDF and extract the following information with high accuracy:

CRITICAL INSTRUCTIONS:
- Extract EXACT values as they appear on the invoice
- For dates, use the format: YYYY-MM-DD HH:MM:SS (e.g., 2024-01-15 00:00:00)
- For numbers, include decimals exactly as shown
- If a field is not visible or unclear, leave it as an empty string ""
- For Sales Person, look for salesperson name, representative, or account manager

Extract these fields:
1. CLIENT - The company/client name at the top of the invoice
2. INVOICE NO. - The invoice number (format: XX-XXXX)
3. INVOICE DATE - The invoice date in YYYY-MM-DD HH:MM:SS format
4. CLIENT TRN - Tax Registration Number (TRN) of the client
5. DESCRIPTION - Full description of items/services
6. INVOICE SUB-TOTAL - Subtotal amount before VAT
7. REBATE - Any rebate/discount amount (or "" if none)
8. INVOICE SUB-TOTAL AFTER REBATE - Subtotal after rebate
9. VAT % AMOUNT - VAT amount value
10. TOTAL INVOICE AMOUNT - Final total amount
11. Sales Person - Name of the sales representative

Return ONLY valid JSON with these exact field names. Example format:
{
  "CLIENT": "ABC Company LLC",
  "INVOICE NO.": "24-0123",
  "INVOICE DATE": "2024-01-15 00:00:00",
  "CLIENT TRN": "100123456700003",
  "DESCRIPTION": "Office supplies and equipment",
  "INVOICE SUB-TOTAL": "1500.00",
  "REBATE": "",
  "INVOICE SUB-TOTAL AFTER REBATE": "1500.00",
  "VAT % AMOUNT": "75.00",
  "TOTAL INVOICE AMOUNT": "1575.00",
  "Sales Person": "JOHN DOE",
  "_year": "2024"
}

Extract the year from the invoice date and include it in _year field.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_invoice_data',
              description: 'Extract structured invoice data from the image',
              parameters: {
                type: 'object',
                properties: {
                  CLIENT: { type: 'string', description: 'Client company name' },
                  'INVOICE NO.': { type: 'string', description: 'Invoice number' },
                  'INVOICE DATE': { type: 'string', description: 'Invoice date in YYYY-MM-DD HH:MM:SS format' },
                  'CLIENT TRN': { type: 'string', description: 'Client Tax Registration Number' },
                  DESCRIPTION: { type: 'string', description: 'Description of items/services' },
                  'INVOICE SUB-TOTAL': { type: 'string', description: 'Subtotal before VAT' },
                  REBATE: { type: 'string', description: 'Rebate/discount amount' },
                  'INVOICE SUB-TOTAL AFTER REBATE': { type: 'string', description: 'Subtotal after rebate' },
                  'VAT % AMOUNT': { type: 'string', description: 'VAT amount' },
                  'TOTAL INVOICE AMOUNT': { type: 'string', description: 'Total invoice amount' },
                  'Sales Person': { type: 'string', description: 'Sales representative name' },
                  '_year': { type: 'string', description: 'Year from invoice date' }
                },
                required: ['CLIENT', 'INVOICE NO.', 'INVOICE DATE', 'DESCRIPTION', 'INVOICE SUB-TOTAL', 'INVOICE SUB-TOTAL AFTER REBATE', 'VAT % AMOUNT', 'TOTAL INVOICE AMOUNT']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_invoice_data' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `AI service error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log('AI response received:', JSON.stringify(result, null, 2));

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || !toolCall.function?.arguments) {
      console.error('No tool call found in response:', result);
      return new Response(
        JSON.stringify({ error: 'Could not extract invoice data. Please ensure the image is clear and contains invoice information.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted invoice data:', extractedData);

    return new Response(
      JSON.stringify({ data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error in scan-invoice function:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to process invoice';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
