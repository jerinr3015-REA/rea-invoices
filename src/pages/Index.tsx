import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { InvoiceManagement } from "@/components/InvoiceManagement";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import animaLogo from "@/assets/anima-logo.jpeg";
import reaLogo from "@/assets/rea-logo.png";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-primary shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <img src={reaLogo} alt="REA" className="h-20 w-20 object-contain" />
              <div className="h-16 w-px bg-primary-foreground/20"></div>
              <img src={animaLogo} alt="Anima Tech Studio" className="h-20 w-20 object-contain" />
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <h1 className="text-3xl font-bold text-primary-foreground tracking-tight">REA INVOICE TRACKER</h1>
                <p className="text-sm text-primary-foreground/80 mt-1">Powered by Anima Tech Studio × REA</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="ml-4 bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-6 py-8">
        <InvoiceManagement />
      </main>
    </div>
  );
};

export default Index;
