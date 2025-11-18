-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client TEXT NOT NULL,
  invoice_no TEXT NOT NULL UNIQUE,
  invoice_date TIMESTAMP WITH TIME ZONE NOT NULL,
  client_trn TEXT,
  description TEXT NOT NULL,
  invoice_subtotal DECIMAL(12, 2) NOT NULL,
  rebate DECIMAL(12, 2) DEFAULT 0,
  invoice_subtotal_after_rebate DECIMAL(12, 2) NOT NULL,
  vat_amount DECIMAL(12, 2) NOT NULL,
  total_invoice_amount DECIMAL(12, 2) NOT NULL,
  sales_person TEXT NOT NULL,
  year TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all invoices
CREATE POLICY "Authenticated users can view all invoices"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert invoices
CREATE POLICY "Authenticated users can insert invoices"
  ON public.invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update invoices
CREATE POLICY "Authenticated users can update invoices"
  ON public.invoices
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete invoices
CREATE POLICY "Authenticated users can delete invoices"
  ON public.invoices
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_invoices_invoice_no ON public.invoices(invoice_no);
CREATE INDEX idx_invoices_client ON public.invoices(client);
CREATE INDEX idx_invoices_year ON public.invoices(year);
CREATE INDEX idx_invoices_sales_person ON public.invoices(sales_person);
CREATE INDEX idx_invoices_date ON public.invoices(invoice_date);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoices_updated_at();