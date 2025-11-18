import { supabase } from "@/integrations/supabase/client";
import invoicesData from "@/data/invoices.json";

export interface InvoiceJson {
  CLIENT: string;
  "INVOICE NO.": string;
  "INVOICE DATE": string;
  "CLIENT TRN": string;
  DESCRIPTION: string;
  "INVOICE SUB-TOTAL": string;
  REBATE: string;
  "INVOICE SUB-TOTAL AFTER REBATE": string;
  "VAT % AMOUNT": string;
  "TOTAL INVOICE AMOUNT": string;
  "Sales Person": string;
  _year: string;
}

export const migrateInvoicesToDatabase = async () => {
  try {
    console.log('Starting migration of invoices to database...');
    
    // Check if database already has data
    const { count, error: countError } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    if (count && count > 0) {
      console.log('Database already has data, skipping migration');
      return { success: true, message: 'Data already migrated', count };
    }

    // Transform JSON data to database format
    const dbInvoices = (invoicesData as InvoiceJson[]).map(invoice => ({
      client: invoice.CLIENT,
      invoice_no: invoice["INVOICE NO."],
      invoice_date: new Date(invoice["INVOICE DATE"]).toISOString(),
      client_trn: invoice["CLIENT TRN"] || "",
      description: invoice.DESCRIPTION,
      invoice_subtotal: parseFloat(invoice["INVOICE SUB-TOTAL"] || "0"),
      rebate: parseFloat(invoice.REBATE || "0"),
      invoice_subtotal_after_rebate: parseFloat(invoice["INVOICE SUB-TOTAL AFTER REBATE"] || "0"),
      vat_amount: parseFloat(invoice["VAT % AMOUNT"] || "0"),
      total_invoice_amount: parseFloat(invoice["TOTAL INVOICE AMOUNT"] || "0"),
      sales_person: invoice["Sales Person"],
      year: invoice._year
    }));

    console.log(`Migrating ${dbInvoices.length} invoices...`);

    // Insert in batches of 100 to avoid timeout
    const batchSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < dbInvoices.length; i += batchSize) {
      const batch = dbInvoices.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('invoices')
        .insert(batch);

      if (insertError) {
        console.error('Error inserting batch:', insertError);
        throw insertError;
      }

      totalInserted += batch.length;
      console.log(`Migrated ${totalInserted}/${dbInvoices.length} invoices`);
    }

    console.log('Migration completed successfully!');
    return { 
      success: true, 
      message: `Successfully migrated ${totalInserted} invoices`, 
      count: totalInserted 
    };

  } catch (error) {
    console.error('Migration error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Migration failed',
      error 
    };
  }
};
