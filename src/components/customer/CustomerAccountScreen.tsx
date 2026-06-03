import { FileText, Info, LogOut, Mail, Shield, User as UserIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";

export const CustomerAccountScreen = () => {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <CardContent className="p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
            <UserIcon className="w-7 h-7 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {(user?.user_metadata?.full_name as string) ?? t("common.customer")}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 p-4 border-b">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{t("common.email")}</p>
              <p className="text-sm text-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{t("common.account")}</p>
              <p className="text-sm text-foreground">{t("common.customer")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button asChild variant="outline" className="w-full">
        <Link to="/about">
          <Info className="w-4 h-4 mr-2" />
          {t("common.aboutUs")}
        </Link>
      </Button>

      <Button variant="outline" onClick={handleSignOut} className="w-full">
        <LogOut className="w-4 h-4 mr-2" />
        {t("common.signOut")}
      </Button>
    </div>
  );
};

export default CustomerAccountScreen;
