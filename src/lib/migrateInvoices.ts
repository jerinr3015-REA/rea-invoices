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

    // Transform JSON data to database format
    const dbInvoices = (invoicesData as InvoiceJson[]).map(invoice => {
      // Parse date safely
      let invoiceDate: string;
      try {
        const dateStr = invoice["INVOICE DATE"];
        // Handle various date formats
        if (dateStr && dateStr.trim() !== "") {
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            invoiceDate = parsedDate.toISOString();
          } else {
            // Try parsing as YYYY-MM-DD
            const dateParts = dateStr.split(" ")[0].split("-");
            if (dateParts.length === 3) {
              const year = parseInt(dateParts[0]);
              const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
              const day = parseInt(dateParts[2]);
              invoiceDate = new Date(year, month, day).toISOString();
            } else {
              invoiceDate = new Date().toISOString();
            }
          }
        } else {
          invoiceDate = new Date().toISOString();
        }
      } catch (error) {
        console.warn(`Invalid date for invoice ${invoice["INVOICE NO."]}: ${invoice["INVOICE DATE"]}`);
        invoiceDate = new Date().toISOString();
      }

      return {
        client: invoice.CLIENT,
        invoice_no: invoice["INVOICE NO."],
        invoice_date: invoiceDate,
        client_trn: invoice["CLIENT TRN"] || "",
        description: invoice.DESCRIPTION,
        invoice_subtotal: parseFloat(invoice["INVOICE SUB-TOTAL"] || "0"),
        rebate: parseFloat(invoice.REBATE || "0"),
        invoice_subtotal_after_rebate: parseFloat(invoice["INVOICE SUB-TOTAL AFTER REBATE"] || "0"),
        vat_amount: parseFloat(invoice["VAT % AMOUNT"] || "0"),
        total_invoice_amount: parseFloat(invoice["TOTAL INVOICE AMOUNT"] || "0"),
        sales_person: invoice["Sales Person"],
        year: invoice._year
      };
    });

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
