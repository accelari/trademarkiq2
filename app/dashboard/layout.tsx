"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Menu,
  X,
  LogOut,
  ChevronRight,
  ChevronDown,
  Loader2,
  FolderOpen,
  LayoutDashboard,
  Mic,
  Type,
  Search,
  ClipboardCheck,
  FileText,
  MessageCircle,
  Eye,
  Calendar,
  User,
  CreditCard,
  Settings,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect } from "react";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { UnsavedDataProvider, useUnsavedData } from "@/app/contexts/UnsavedDataContext";

const baseNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Meine Markenfälle", href: "/dashboard/cases", icon: FolderOpen },
];

function Sidebar({ 
  sidebarOpen, 
  setSidebarOpen,
  session,
  userName,
  userEmail,
  userInitials,
  pathname,
  router
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  session: any;
  userName: string;
  userEmail: string;
  userInitials: string;
  pathname: string;
  router: any;
}) {
  const { 
    hasUnsavedData, 
    setPendingNavigation, 
    setShowLeaveModal,
    checkUnsavedDataRef
  } = useUnsavedData();

  const caseMatch = pathname.match(/^\/dashboard\/case\/([^\/]+)/);
  const caseId = caseMatch?.[1] ?? null;
  const isCasePage = Boolean(caseId);

  const [currentHash, setCurrentHash] = useState<string>("");

  const dashboardItem = baseNavigation[0];
  const casesItem = baseNavigation[1];
  const DashboardIcon = dashboardItem.icon;
  const CasesIcon = casesItem.icon;

  const [isCreatingCase, setIsCreatingCase] = useState(false);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  const [createCaseError, setCreateCaseError] = useState<string | null>(null);
  const [showDeleteProfileModal, setShowDeleteProfileModal] = useState(false);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);

  const openNewCaseModal = (hash: string) => {
    setPendingHash(hash);
    setCreateCaseError(null);
    setShowNewCaseModal(true);
  };

  const confirmCreateCase = async () => {
    if (isCreatingCase || !pendingHash) return;
    setIsCreatingCase(true);
    setCreateCaseError(null);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trademarkName: null }),
      });

      if (!res.ok) {
        throw new Error("Fehler beim Erstellen");
      }

      const result = await res.json();
      const newCaseId = result?.case?.id;
      if (!newCaseId) {
        throw new Error("Fehler beim Erstellen");
      }

      setShowNewCaseModal(false);
      setSidebarOpen(false);
      router.push(`/dashboard/case/${newCaseId}#${pendingHash}`);
    } catch (err) {
      console.error("[Sidebar] Failed to create case:", err);
      setCreateCaseError("Fehler beim Erstellen. Bitte erneut versuchen.");
    } finally {
      setIsCreatingCase(false);
    }
  };

  const cancelNewCaseModal = () => {
    setShowNewCaseModal(false);
    setPendingHash(null);
    setCreateCaseError(null);
  };

  useEffect(() => {
    if (!isCasePage) {
      setCurrentHash("");
      return;
    }

    const update = () => {
      setCurrentHash(window.location.hash || "");
    };

    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [isCasePage]);

  const caseTabs = [
    { name: "Beratung", hash: "beratung", icon: Mic },
    { name: "Markenname", hash: "markenname", icon: Type },
    { name: "Recherche", hash: "recherche", icon: Search },
    { name: "Checkliste", hash: "ueberpruefung", icon: ClipboardCheck },
    { name: "Anmeldung", hash: "anmeldung", icon: FileText },
    { name: "Kommunikation", hash: "kommunikation", icon: MessageCircle },
    { name: "Überwachung", hash: "ueberwachung", icon: Eye },
    { name: "Fristen", hash: "fristen", icon: Calendar },
  ] as const;

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    const refCheck = checkUnsavedDataRef.current?.() ?? false;
    const shouldBlock = hasUnsavedData || refCheck;
    const baseHref = href.split("#")[0];
    console.log("[Sidebar] Navigation click to:", href, "| hasUnsavedData:", hasUnsavedData, "| refCheck:", refCheck, "| shouldBlock:", shouldBlock, "| pathname:", pathname);

    // If it's just a hash change within the current page, don't block navigation.
    if (baseHref === pathname) {
      setSidebarOpen(false);
      return;
    }

    if (shouldBlock && pathname !== baseHref) {
      e.preventDefault();
      setPendingNavigation(href);
      setShowLeaveModal(true);
    } else {
      setSidebarOpen(false);
    }
  };

  return (
    <aside className={`
      fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-gray-200 
      transform transition-transform duration-300 ease-in-out
      lg:translate-x-0
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TM</span>
            </div>
            <span className="font-semibold text-lg text-gray-900">TrademarkIQ</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link
            key={dashboardItem.name}
            href={dashboardItem.href}
            onClick={(e) => handleNavClick(e, dashboardItem.href)}
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium
              transition-colors duration-200 group
              ${pathname === dashboardItem.href ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}
            `}
          >
            <DashboardIcon className={`w-4 h-4 ${pathname === dashboardItem.href ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
            <span className="truncate">{dashboardItem.name}</span>
            {pathname === dashboardItem.href && (
              <span className="ml-auto w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-white" />
              </span>
            )}
          </Link>

          <div className="mt-2 space-y-1">
            {caseTabs.map((tab) => {
              const href = isCasePage ? `/dashboard/case/${caseId}#${tab.hash}` : "/dashboard/cases";
              const normalizedHash = currentHash === "#markenpruefung" ? "#recherche" : currentHash;
              const isActive = isCasePage && normalizedHash === `#${tab.hash}`;

              return (
                <Link
                  key={tab.hash}
                  href={href}
                  onClick={(e) => {
                    if (isCasePage) {
                      e.preventDefault();
                      window.location.hash = `#${tab.hash}`;
                      setSidebarOpen(false);
                      return;
                    }

                    e.preventDefault();
                    openNewCaseModal(tab.hash);
                  }}
                  className={`
                    relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium
                    transition-colors duration-200 group
                    ${isCreatingCase ? 'opacity-60 pointer-events-none' : ''}
                    ${isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}
                  `}
                  aria-disabled={isCreatingCase}
                >
                  {isActive && (
                    <span className="absolute inset-0 rounded-lg animate-pulse bg-primary/20" />
                  )}
                  <tab.icon className={`relative z-10 w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
                  <span className="relative z-10 truncate">{tab.name}</span>
                  {isActive && (
                    <span className="relative z-10 ml-auto w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                      <ChevronRight className="w-4 h-4 text-white" />
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <Link
            key={casesItem.name}
            href={casesItem.href}
            onClick={(e) => handleNavClick(e, casesItem.href)}
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium
              transition-colors duration-200 group
              ${pathname === casesItem.href ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}
            `}
          >
            <CasesIcon className={`w-4 h-4 ${pathname === casesItem.href ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
            <span className="truncate">{casesItem.name}</span>
            {pathname === casesItem.href && (
              <span className="ml-auto w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-white" />
              </span>
            )}
          </Link>
        </nav>

        {/* Credit-Anzeige */}
        <div className="px-4 py-3 border-t border-gray-200">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">Credits</span>
              <span className="text-xs text-gray-500">33 / 50</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '66%' }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Free Plan</p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 px-4 py-3 w-full hover:bg-gray-100 rounded-lg transition-colors">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  {session.user?.image ? (
                    <img 
                      src={session.user.image} 
                      alt={userName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-primary font-medium text-sm">{userInitials}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                  <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mein Konto</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => router.push('/dashboard/profile')}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                Profil
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => router.push('/dashboard/subscription')}
                className="cursor-pointer"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Subscription verwalten
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => router.push('/dashboard/settings')}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                Einstellungen
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => setShowDeleteProfileModal(true)}
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Profil löschen
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={async () => {
                  await signOut({ redirect: false });
                  router.push("/");
                  router.refresh();
                }}
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* New Case Modal */}
      {showNewCaseModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4"
          onClick={cancelNewCaseModal}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Neuen Markenfall starten
              </h3>
              <p className="text-sm text-gray-600">
                Wir legen einen neuen Markenfall für Sie an. Keine Sorge – Sie können ihn jederzeit löschen.
              </p>
            </div>

            {createCaseError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {createCaseError}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={confirmCreateCase}
                disabled={isCreatingCase}
                className="w-full px-4 py-2.5 text-white bg-primary hover:bg-primary/90 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCreatingCase ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Erstelle...
                  </>
                ) : (
                  "Los geht's"
                )}
              </button>
              <button
                onClick={cancelNewCaseModal}
                disabled={isCreatingCase}
                className="w-full px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Profile Modal */}
      {showDeleteProfileModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4"
          onClick={() => setShowDeleteProfileModal(false)}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Profil unwiderruflich löschen?
              </h3>
              <p className="text-sm text-gray-600">
                Alle Ihre Daten, Markenfälle und Recherchen werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  setIsDeletingProfile(true);
                  try {
                    const res = await fetch("/api/user/delete", { method: "DELETE" });
                    if (res.ok) {
                      await signOut({ callbackUrl: "/" });
                    } else {
                      alert("Fehler beim Löschen. Bitte erneut versuchen.");
                    }
                  } catch (err) {
                    console.error("Delete profile error:", err);
                    alert("Fehler beim Löschen. Bitte erneut versuchen.");
                  } finally {
                    setIsDeletingProfile(false);
                  }
                }}
                disabled={isDeletingProfile}
                className="w-full px-4 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeletingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Lösche...
                  </>
                ) : (
                  "Ja, Profil löschen"
                )}
              </button>
              <button
                onClick={() => setShowDeleteProfileModal(false)}
                disabled={isDeletingProfile}
                className="w-full px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function LeaveModal() {
  const { 
    showLeaveModal, 
    setShowLeaveModal, 
    pendingNavigation, 
    setPendingNavigation,
    onSaveBeforeLeave,
    setHasUnsavedData
  } = useUnsavedData();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const handleDiscardAndNavigate = () => {
    setShowLeaveModal(false);
    setHasUnsavedData(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleSaveAndNavigate = async () => {
    setIsSaving(true);
    try {
      let saveSuccess = true;
      if (onSaveBeforeLeave) {
        const result = await onSaveBeforeLeave();
        saveSuccess = result !== false;
      }
      if (saveSuccess) {
        setShowLeaveModal(false);
        setHasUnsavedData(false);
        if (pendingNavigation) {
          router.push(pendingNavigation);
          setPendingNavigation(null);
        }
      }
    } catch (error) {
      console.error("Error saving before leave:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!showLeaveModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center" onClick={() => setShowLeaveModal(false)}>
      <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">Ungespeicherte Änderungen</h3>
        <p className="text-gray-600 mb-4">Möchten Sie Ihre Daten speichern bevor Sie die Seite verlassen?</p>
        <div className="flex gap-3 justify-end">
          <button 
            onClick={handleDiscardAndNavigate} 
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSaving}
          >
            Verwerfen
          </button>
          <button 
            onClick={handleSaveAndNavigate} 
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userName = session.user?.name || session.user?.email?.split("@")[0] || "Benutzer";
  const userEmail = session.user?.email || "";
  const userInitials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const isCasePage = /^\/dashboard\/case\//.test(pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        session={session}
        userName={userName}
        userEmail={userEmail}
        userInitials={userInitials}
        pathname={pathname}
        router={router}
      />

      <LeaveModal />

      <main className="lg:pl-72 min-h-screen">
        <div className={isCasePage ? "pt-2 px-6 pb-6 lg:pt-3 lg:px-8 lg:pb-8" : "p-6 lg:p-8"}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UnsavedDataProvider>
      <DashboardContent>{children}</DashboardContent>
    </UnsavedDataProvider>
  );
}
