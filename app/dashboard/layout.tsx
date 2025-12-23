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
  Loader2,
  FolderOpen
} from "lucide-react";
import { useEffect } from "react";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { UnsavedDataProvider, useUnsavedData } from "@/app/contexts/UnsavedDataContext";

const baseNavigation = [
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

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    const refCheck = checkUnsavedDataRef.current?.() ?? false;
    const shouldBlock = hasUnsavedData || refCheck;
    console.log("[Sidebar] Navigation click to:", href, "| hasUnsavedData:", hasUnsavedData, "| refCheck:", refCheck, "| shouldBlock:", shouldBlock, "| pathname:", pathname);
    if (shouldBlock && pathname !== href) {
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
          {baseNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                  transition-all duration-200 group
                  ${isActive 
                    ? 'bg-primary text-white shadow-md' 
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-primary'}`} />
                {item.name}
                {isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
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
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-500 truncate">{userEmail}</p>
            </div>
          </div>
          <button 
            onClick={async () => {
              await signOut({ redirect: false });
              router.push("/");
              router.refresh();
            }}
            className="flex items-center gap-2 w-full px-4 py-2 mt-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Abmelden
          </button>
        </div>
      </div>
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
        <div className="p-6 lg:p-8">
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
