import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Download, Plus, Search, Edit, FileText, TrendingUp, Coins, FileSpreadsheet, FileDown, Camera, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Invoice {
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

export const InvoiceManagement = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState<Partial<Invoice>>({});
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch invoices from database
  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('invoice_date', { ascending: false });

      if (error) throw error;

      // Transform database format to component format
      const transformedData: Invoice[] = (data || []).map(item => ({
        CLIENT: item.client,
        "INVOICE NO.": item.invoice_no,
        "INVOICE DATE": new Date(item.invoice_date).toISOString().replace('T', ' ').substring(0, 19),
        "CLIENT TRN": item.client_trn || "",
        DESCRIPTION: item.description,
        "INVOICE SUB-TOTAL": item.invoice_subtotal.toString(),
        REBATE: item.rebate ? item.rebate.toString() : "",
        "INVOICE SUB-TOTAL AFTER REBATE": item.invoice_subtotal_after_rebate.toString(),
        "VAT % AMOUNT": item.vat_amount.toString(),
        "TOTAL INVOICE AMOUNT": item.total_invoice_amount.toString(),
        "Sales Person": item.sales_person,
        _year: item.year
      }));

      setInvoices(transformedData);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setIsLoading(false);
    }
  };

  const years = useMemo(() => {
    const uniqueYears = [...new Set(invoices.map((inv) => inv._year))].filter(year => year && year.trim() !== "");
    return uniqueYears.sort();
  }, [invoices]);

  const salesPersons = useMemo(() => {
    const unique = [...new Set(invoices.map((inv) => inv["Sales Person"]))].filter(person => person && person.trim() !== "");
    return unique.sort();
  }, [invoices]);

  const clients = useMemo(() => {
    const unique = [...new Set(invoices.map((inv) => inv.CLIENT))].filter(client => client && client.trim() !== "");
    return unique.sort();
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.CLIENT.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice["INVOICE NO."].toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.DESCRIPTION.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesYear = selectedYear === "all" || invoice._year === selectedYear;
      const matchesSalesPerson =
        selectedSalesPerson === "all" || invoice["Sales Person"] === selectedSalesPerson;
      const matchesClient = selectedClient === "all" || invoice.CLIENT === selectedClient;

      // Date filtering
      const invoiceDate = invoice["INVOICE DATE"].split(" ")[0];
      const matchesStartDate = !startDate || invoiceDate >= startDate;
      const matchesEndDate = !endDate || invoiceDate <= endDate;

      return matchesSearch && matchesYear && matchesSalesPerson && matchesClient && matchesStartDate && matchesEndDate;
    });
  }, [invoices, searchTerm, selectedYear, selectedSalesPerson, selectedClient, startDate, endDate]);

  const totalAmount = useMemo(() => {
    return filteredInvoices.reduce(
      (sum, inv) => {
        const amount = parseFloat(inv["TOTAL INVOICE AMOUNT"] || "0");
        return sum + (isNaN(amount) ? 0 : amount);
      },
      0
    );
  }, [filteredInvoices]);

  const handleDownloadExcel = () => {
    const exportData = filteredInvoices.map(inv => ({
      'Invoice No.': inv["INVOICE NO."],
      'Date': inv["INVOICE DATE"].split(" ")[0],
      'Client': inv.CLIENT,
      'Client TRN': inv["CLIENT TRN"],
      'Description': inv.DESCRIPTION,
      'Sub-Total': parseFloat(inv["INVOICE SUB-TOTAL"] || "0").toFixed(2),
      'Rebate': parseFloat(inv.REBATE || "0").toFixed(2),
      'Sub-Total After Rebate': parseFloat(inv["INVOICE SUB-TOTAL AFTER REBATE"] || "0").toFixed(2),
      'VAT Amount': parseFloat(inv["VAT % AMOUNT"] || "0").toFixed(2),
      'Total Amount (AED)': parseFloat(inv["TOTAL INVOICE AMOUNT"] || "0").toFixed(2),
      'Sales Person': inv["Sales Person"],
      'Year': inv._year
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    
    const fileName = `REA_Invoices_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Excel file downloaded successfully");
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('landscape');
    
    // Add title
    doc.setFontSize(16);
    doc.text('REA INVOICE TRACKER', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
    doc.text(`Total Invoices: ${filteredInvoices.length} | Total Amount: ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} AED`, 14, 28);

    // Prepare table data
    const tableData = filteredInvoices.map(inv => [
      inv["INVOICE NO."],
      inv["INVOICE DATE"].split(" ")[0],
      inv.CLIENT,
      inv.DESCRIPTION.substring(0, 40) + (inv.DESCRIPTION.length > 40 ? '...' : ''),
      parseFloat(inv["INVOICE SUB-TOTAL"] || "0").toFixed(2),
      parseFloat(inv["VAT % AMOUNT"] || "0").toFixed(2),
      parseFloat(inv["TOTAL INVOICE AMOUNT"] || "0").toFixed(2),
      inv["Sales Person"]
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Invoice No.', 'Date', 'Client', 'Description', 'Sub-Total', 'VAT', 'Total (AED)', 'Sales Person']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 150, 200] },
      styles: { fontSize: 8 },
      columnStyles: {
        3: { cellWidth: 60 },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' }
      }
    });

    doc.save(`REA_Invoices_${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF file downloaded successfully");
  };

  const handleSaveInvoice = async () => {
    try {
      // Transform component format to database format
      const dbData = {
        client: formData.CLIENT || "",
        invoice_no: formData["INVOICE NO."] || "",
        invoice_date: formData["INVOICE DATE"] ? new Date(formData["INVOICE DATE"]).toISOString() : new Date().toISOString(),
        client_trn: formData["CLIENT TRN"] || "",
        description: formData.DESCRIPTION || "",
        invoice_subtotal: parseFloat(formData["INVOICE SUB-TOTAL"] || "0"),
        rebate: parseFloat(formData.REBATE || "0"),
        invoice_subtotal_after_rebate: parseFloat(formData["INVOICE SUB-TOTAL AFTER REBATE"] || "0"),
        vat_amount: parseFloat(formData["VAT % AMOUNT"] || "0"),
        total_invoice_amount: parseFloat(formData["TOTAL INVOICE AMOUNT"] || "0"),
        sales_person: formData["Sales Person"] || "",
        year: formData._year || new Date().getFullYear().toString()
      };

      if (editingInvoice) {
        // Update existing invoice
        const { error } = await supabase
          .from('invoices')
          .update(dbData)
          .eq('invoice_no', editingInvoice["INVOICE NO."]);

        if (error) throw error;
        toast.success("Invoice updated successfully");
      } else {
        // Insert new invoice
        const { error } = await supabase
          .from('invoices')
          .insert([dbData]);

        if (error) throw error;
        toast.success("Invoice added successfully");
      }

      // Refresh the list
      await fetchInvoices();
      setIsAddDialogOpen(false);
      setEditingInvoice(null);
      setFormData({});
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      toast.error(error.message || "Failed to save invoice");
    }
  };

  const openAddDialog = () => {
    setEditingInvoice(null);
    setFormData({
      CLIENT: "",
      "INVOICE NO.": "",
      "INVOICE DATE": new Date().toISOString().split("T")[0] + " 00:00:00",
      "CLIENT TRN": "",
      DESCRIPTION: "",
      "INVOICE SUB-TOTAL": "",
      REBATE: "",
      "INVOICE SUB-TOTAL AFTER REBATE": "",
      "VAT % AMOUNT": "",
      "TOTAL INVOICE AMOUNT": "",
      "Sales Person": "",
      _year: new Date().getFullYear().toString(),
    });
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData(invoice);
    setIsAddDialogOpen(true);
  };

  const handleFileUpload = async (file: File) => {
    setIsScanning(true);
    try {
      console.log('Processing file:', file.name, file.type, file.size);
      
      // Validate file
      if (file.size > 20 * 1024 * 1024) {
        toast.error('File size must be less than 20MB');
        return;
      }

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const imageData = await base64Promise;
      console.log('File converted to base64, length:', imageData.length);
      
      toast.info('Scanning invoice... This may take a few seconds.');

      // Call edge function to extract data
      const { data, error } = await supabase.functions.invoke('scan-invoice', {
        body: { imageData }
      });

      console.log('Response:', { data, error });

      if (error) {
        console.error('Scan error:', error);
        if (error.message.includes('429')) {
          toast.error('Rate limit exceeded. Please try again in a moment.');
        } else if (error.message.includes('402')) {
          toast.error('AI credits exhausted. Please contact support.');
        } else {
          toast.error(error.message || 'Failed to scan invoice');
        }
        return;
      }

      if (data?.error) {
        console.error('API error:', data.error);
        toast.error(data.error);
        return;
      }

      if (data?.data) {
        console.log('Extracted data:', data.data);
        setFormData(data.data);
        toast.success('Invoice scanned successfully! Please review and adjust the data if needed.');
      } else {
        console.error('No data in response:', data);
        toast.error('Could not extract invoice data from the image');
      }
    } catch (error) {
      console.error('Error scanning invoice:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to scan invoice');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCameraCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 bg-primary/20 rounded-xl">
              <FileText className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Total Invoices</p>
              <p className="text-2xl sm:text-4xl font-bold text-foreground">{filteredInvoices.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-gold/5 to-gold/10 border-gold/30 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 bg-gold/20 rounded-xl">
              <Coins className="h-5 w-5 sm:h-7 sm:w-7 text-gold" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Total Amount</p>
              <p className="text-xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/30 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 bg-secondary/20 rounded-xl">
              <TrendingUp className="h-5 w-5 sm:h-7 sm:w-7 text-secondary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Average Invoice</p>
              <p className="text-xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                {filteredInvoices.length > 0 
                  ? (totalAmount / filteredInvoices.length).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : "0.00"} AED
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="p-4 sm:p-6 shadow-md">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client, invoice number, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <div className="flex gap-2 sm:gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 h-11 flex-1 sm:flex-none">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownloadExcel} className="gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-success" />
                    Download as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadPDF} className="gap-2">
                    <FileDown className="h-4 w-4 text-destructive" />
                    Download as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openAddDialog} className="gap-2 h-11 bg-primary hover:bg-primary/90 flex-1 sm:flex-none">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Invoice</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">
                      {editingInvoice ? "Edit Invoice" : "Add New Invoice"}
                    </DialogTitle>
                  </DialogHeader>

                {!editingInvoice && (
                  <div className="py-4 border-b">
                    <Label className="text-sm font-medium mb-2 block">Scan Invoice</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <label className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleCameraCapture}
                          className="hidden"
                          disabled={isScanning}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full gap-2"
                          onClick={(e) => {
                            e.preventDefault();
                            (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                          }}
                          disabled={isScanning}
                        >
                          <Camera className="h-4 w-4" />
                          {isScanning ? "Scanning..." : "Take Photo"}
                        </Button>
                      </label>
                      <label className="flex-1">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleFileSelect}
                          className="hidden"
                          disabled={isScanning}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full gap-2"
                          onClick={(e) => {
                            e.preventDefault();
                            (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                          }}
                          disabled={isScanning}
                        >
                          <Upload className="h-4 w-4" />
                          {isScanning ? "Scanning..." : "Upload File"}
                        </Button>
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Upload an invoice image or PDF to auto-fill the form
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Invoice Number</Label>
                    <Input
                      value={formData["INVOICE NO."] || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, "INVOICE NO.": e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice Date</Label>
                    <Input
                      type="date"
                      value={formData["INVOICE DATE"]?.split(" ")[0] || ""}
                      onChange={(e) =>
                        setFormData({ 
                          ...formData, 
                          "INVOICE DATE": e.target.value + " 00:00:00" 
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Name</Label>
                    <Input
                      value={formData.CLIENT || ""}
                      onChange={(e) => setFormData({ ...formData, CLIENT: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client TRN</Label>
                    <Input
                      value={formData["CLIENT TRN"] || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, "CLIENT TRN": e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Description</Label>
                    <Input
                      value={formData.DESCRIPTION || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, DESCRIPTION: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice Sub-Total</Label>
                    <Input
                      type="number"
                      value={formData["INVOICE SUB-TOTAL"] || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, "INVOICE SUB-TOTAL": e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rebate</Label>
                    <Input
                      type="number"
                      value={formData.REBATE || ""}
                      onChange={(e) => setFormData({ ...formData, REBATE: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>VAT Amount</Label>
                    <Input
                      type="number"
                      value={formData["VAT % AMOUNT"] || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, "VAT % AMOUNT": e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Amount</Label>
                    <Input
                      type="number"
                      value={formData["TOTAL INVOICE AMOUNT"] || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, "TOTAL INVOICE AMOUNT": e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sales Person</Label>
                    <Input
                      value={formData["Sales Person"] || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, "Sales Person": e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input
                      value={formData._year || ""}
                      onChange={(e) => setFormData({ ...formData, _year: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={handleSaveInvoice} className="w-full">
                  {editingInvoice ? "Update Invoice" : "Add Invoice"}
                </Button>
               </DialogContent>
            </Dialog>
           </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client} value={client}>
                      {client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Sales Person</Label>
              <Select value={selectedSalesPerson} onValueChange={setSelectedSalesPerson}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sales Persons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sales Persons</SelectItem>
                  {salesPersons.map((person) => (
                    <SelectItem key={person} value={person}>
                      {person}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="shadow-md">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Loading invoices...</span>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No invoices found</p>
                <p className="text-sm text-muted-foreground/70 mt-2">Try adjusting your filters or add a new invoice</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Invoice No.</TableHead>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="whitespace-nowrap">Client</TableHead>
                    <TableHead className="whitespace-nowrap">Description</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Sub-Total</TableHead>
                    <TableHead className="text-right whitespace-nowrap">VAT</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                    <TableHead className="whitespace-nowrap">Sales Person</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice["INVOICE NO."]}>
                      <TableCell className="font-medium whitespace-nowrap">{invoice["INVOICE NO."]}</TableCell>
                      <TableCell className="whitespace-nowrap">{invoice["INVOICE DATE"].split(" ")[0]}</TableCell>
                      <TableCell className="whitespace-nowrap">{invoice.CLIENT}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{invoice.DESCRIPTION}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {parseFloat(invoice["INVOICE SUB-TOTAL"] || "0").toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {parseFloat(invoice["VAT % AMOUNT"] || "0").toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {parseFloat(invoice["TOTAL INVOICE AMOUNT"] || "0").toFixed(2)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{invoice["Sales Person"]}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(invoice)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
