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

    console.log('Processing invoice image with AI...');

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
                text: `Extract invoice details from this image. You must extract these exact fields:
- CLIENT (client name)
- INVOICE NO. (invoice number)
- INVOICE DATE (in YYYY-MM-DD format)
- CLIENT TRN (tax registration number)
- DESCRIPTION (brief description of items/services)
- INVOICE SUB-TOTAL (subtotal amount as number only, no currency)
- REBATE (rebate amount as number only, use "0" if not present)
- INVOICE SUB-TOTAL AFTER REBATE (subtotal after rebate as number only)
- VAT % AMOUNT (VAT amount as number only)
- TOTAL INVOICE AMOUNT (total amount as number only)
- Sales Person (sales person name)

Look carefully at the invoice and extract all visible information.`
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
            type: "function",
            function: {
              name: "extract_invoice_data",
              description: "Extract structured invoice data from the image",
              parameters: {
                type: "object",
                properties: {
                  CLIENT: { type: "string" },
                  "INVOICE NO.": { type: "string" },
                  "INVOICE DATE": { type: "string" },
                  "CLIENT TRN": { type: "string" },
                  DESCRIPTION: { type: "string" },
                  "INVOICE SUB-TOTAL": { type: "string" },
                  REBATE: { type: "string" },
                  "INVOICE SUB-TOTAL AFTER REBATE": { type: "string" },
                  "VAT % AMOUNT": { type: "string" },
                  "TOTAL INVOICE AMOUNT": { type: "string" },
                  "Sales Person": { type: "string" }
                },
                required: ["CLIENT", "INVOICE NO.", "INVOICE DATE", "CLIENT TRN", "DESCRIPTION", 
                          "INVOICE SUB-TOTAL", "REBATE", "INVOICE SUB-TOTAL AFTER REBATE", 
                          "VAT % AMOUNT", "TOTAL INVOICE AMOUNT", "Sales Person"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_invoice_data" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
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
        JSON.stringify({ error: 'Failed to process invoice' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      console.error('No tool call in response');
      return new Response(
        JSON.stringify({ error: 'Failed to extract invoice data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted invoice data:', extractedData);

    // Add current year if not extracted
    const currentYear = new Date().getFullYear().toString();
    extractedData._year = currentYear;

    return new Response(
      JSON.stringify({ data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scan-invoice function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
