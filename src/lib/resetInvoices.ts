import { supabase } from "@/integrations/supabase/client";

export const deleteAllInvoices = async () => {
  try {
    console.log('Deleting all invoices from database...');
    
    // Delete all records
    const { error } = await supabase
      .from('invoices')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (error) throw error;

    console.log('All invoices deleted successfully');
    return { success: true, message: 'All invoices deleted' };
  } catch (error) {
    console.error('Error deleting invoices:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to delete invoices',
      error 
    };
  }
};
