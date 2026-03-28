"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { userService } from "@/lib/services/user.service";

const ORG_PAGE = "/dashboard/organizations";

const navItems = [
  {
    href: "/dashboard",
    label: "Genel Bakış",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: ORG_PAGE,
    label: "Organizasyonlar",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/projects",
    label: "Projeler",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/flags",
    label: "Feature Flags",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ),
  },
  {
    href: "/dashboard/segments",
    label: "Segmentasyon",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Ayarlar",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    soon: true,
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasOrg, setHasOrg] = useState(false);

  // Cache: once confirmed true, skip re-checking on every navigation
  const orgConfirmed = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    setUserName(localStorage.getItem("userName") ?? "Kullanıcı");
    setUserEmail(localStorage.getItem("userEmail") ?? "");

    // Skip API call if we already know the user has an org
    if (orgConfirmed.current) {
      setReady(true);
      return;
    }

    userService
      .checkHasOrganization()
      .then((has) => {
        setHasOrg(has);
        if (has) orgConfirmed.current = true;

        // No org → force to org creation page
        if (!has && pathname !== ORG_PAGE) {
          router.replace(ORG_PAGE);
          return;
        }
        setReady(true);
      })
      .catch(() => {
        // On error, allow access but don't confirm
        setReady(true);
      });
  }, [router, pathname]); // re-run on pathname change to catch post-creation navigation

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    orgConfirmed.current = false;
    router.push("/login");
  }

  if (!ready) return null;

  const initials =
    userName
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  const Sidebar = (
    <aside
      className="flex flex-col h-full"
      style={{
        width: 260,
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <ThemeToggle />
        <span className="font-bold text-lg tracking-tight" style={{ color: "var(--text-primary)" }}>
          Switchly
        </span>
      </div>

      {/* Setup banner — shown when user has no org */}
      {!hasOrg && (
        <div className="mx-3 mt-3 px-3 py-2.5 rounded-xl text-xs" style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)", color: "#fbbf24" }}>
          <p className="font-semibold mb-0.5">Kurulum gerekli</p>
          <p style={{ color: "rgba(251,191,36,0.7)" }}>Devam etmek için bir organizasyon oluşturun.</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
          Menü
        </p>
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          // Lock all nav items except organizations when no org
          const locked = !hasOrg && item.href !== ORG_PAGE;
          const disabled = item.soon || locked;

          return (
            <Link
              key={item.href}
              href={disabled ? "#" : item.href}
              onClick={(e) => {
                if (disabled) e.preventDefault();
                else setSidebarOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: active ? "rgba(124,58,237,0.15)" : "transparent",
                color: active ? "#a78bfa" : "var(--text-muted)",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.4 : 1,
              }}
            >
              <span style={{ color: active ? "#a78bfa" : "var(--text-muted)" }}>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.soon && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>
                  Yakında
                </span>
              )}
              {active && !disabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "var(--sidebar-item-bg)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "linear-gradient(135deg,#7c3aed,#3b82f6)" }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{userName}</p>
            <p className="text-xs truncate" style={{ color: "var(--text-faint)" }}>{userEmail}</p>
          </div>
          <button onClick={logout} className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10" title="Çıkış yap" style={{ color: "var(--text-faint)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--page-bg)" }}>
        {/* Desktop sidebar */}
        <div className="hidden lg:flex flex-shrink-0">{Sidebar}</div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
            <div className="relative z-10 flex">{Sidebar}</div>
          </div>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile topbar */}
          <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b" style={{ background: "var(--sidebar-bg)", borderColor: "var(--sidebar-border)" }}>
            <button onClick={() => setSidebarOpen(true)} style={{ color: "var(--text-muted)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Switchly</span>
          </header>

          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
