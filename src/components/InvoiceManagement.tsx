import { useState, useMemo } from "react";
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
import { Download, Plus, Search, Edit, FileText } from "lucide-react";
import { toast } from "sonner";
import invoicesData from "@/data/invoices.json";

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
  const [invoices, setInvoices] = useState<Invoice[]>(invoicesData as Invoice[]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState<Partial<Invoice>>({});

  const years = useMemo(() => {
    const uniqueYears = [...new Set(invoices.map((inv) => inv._year))].filter(year => year && year.trim() !== "");
    return uniqueYears.sort();
  }, [invoices]);

  const salesPersons = useMemo(() => {
    const unique = [...new Set(invoices.map((inv) => inv["Sales Person"]))].filter(person => person && person.trim() !== "");
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

      return matchesSearch && matchesYear && matchesSalesPerson;
    });
  }, [invoices, searchTerm, selectedYear, selectedSalesPerson]);

  const totalAmount = useMemo(() => {
    return filteredInvoices.reduce(
      (sum, inv) => sum + parseFloat(inv["TOTAL INVOICE AMOUNT"]),
      0
    );
  }, [filteredInvoices]);

  const handleDownload = () => {
    const dataStr = JSON.stringify(filteredInvoices, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoices_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    toast.success("Invoices downloaded successfully");
  };

  const handleSaveInvoice = () => {
    if (editingInvoice) {
      setInvoices(
        invoices.map((inv) =>
          inv["INVOICE NO."] === editingInvoice["INVOICE NO."]
            ? { ...inv, ...formData }
            : inv
        )
      );
      toast.success("Invoice updated successfully");
    } else {
      const newInvoice = {
        ...formData,
        "INVOICE NO.": `24-${String(invoices.length + 1).padStart(4, "0")}`,
      } as Invoice;
      setInvoices([...invoices, newInvoice]);
      toast.success("Invoice added successfully");
    }
    setIsAddDialogOpen(false);
    setEditingInvoice(null);
    setFormData({});
  };

  const openAddDialog = () => {
    setEditingInvoice(null);
    setFormData({
      CLIENT: "",
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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Invoices</p>
              <p className="text-2xl font-bold">{filteredInvoices.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold text-primary">
              AED {totalAmount.toFixed(2)}
            </p>
          </div>
        </Card>
        <Card className="p-6">
          <div>
            <p className="text-sm text-muted-foreground">Average Invoice</p>
            <p className="text-2xl font-bold text-secondary">
              AED {filteredInvoices.length > 0 ? (totalAmount / filteredInvoices.length).toFixed(2) : "0.00"}
            </p>
          </div>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client, invoice number, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full lg:w-40">
              <SelectValue placeholder="Year" />
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
          <Select value={selectedSalesPerson} onValueChange={setSelectedSalesPerson}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Sales Person" />
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
          <Button onClick={handleDownload} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingInvoice ? "Edit Invoice" : "Add New Invoice"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
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
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Sub-Total</TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Sales Person</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice["INVOICE NO."]}>
                  <TableCell className="font-medium">{invoice["INVOICE NO."]}</TableCell>
                  <TableCell>{invoice["INVOICE DATE"].split(" ")[0]}</TableCell>
                  <TableCell>{invoice.CLIENT}</TableCell>
                  <TableCell className="max-w-xs truncate">{invoice.DESCRIPTION}</TableCell>
                  <TableCell className="text-right">
                    {parseFloat(invoice["INVOICE SUB-TOTAL"]).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {parseFloat(invoice["VAT % AMOUNT"]).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {parseFloat(invoice["TOTAL INVOICE AMOUNT"]).toFixed(2)}
                  </TableCell>
                  <TableCell>{invoice["Sales Person"]}</TableCell>
                  <TableCell className="text-right">
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
        </div>
      </Card>
    </div>
  );
};
