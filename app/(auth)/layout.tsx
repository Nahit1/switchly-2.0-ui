import ThemeToggle from "@/components/ThemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-bg min-h-screen flex">
      {/* Left panel – branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-100px] right-[-60px] w-[350px] h-[350px] rounded-full bg-blue-600/8 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 z-10">
          <ThemeToggle />
          <span className="font-semibold text-xl tracking-tight" style={{ color: "var(--text-primary)" }}>
            Switchly
          </span>
        </div>

        {/* Hero text */}
        <div className="z-10 space-y-6">
          <div className="space-y-4">
            {[
              { icon: "⚡", title: "Anlık Kontrol", desc: "Deploy olmadan özellikleri açıp kapatın." },
              { icon: "🎯", title: "Hedefli Dağıtım", desc: "Belirli kullanıcı gruplarına özellik sunun." },
              { icon: "🛡️", title: "Risk Azaltma", desc: "Sorunlu özellikleri anında devre dışı bırakın." },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 dark:bg-white/5 dark:border-white/10 flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}>
                  {f.icon}
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{f.title}</p>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-6" style={{ borderColor: "var(--divider)" }}>
            <p className="text-sm" style={{ color: "var(--text-faint)" }}>
              &ldquo;Feature flag&rsquo;lar, modern yazılım geliştirmenin vazgeçilmez parçasıdır.&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        {children}
      </div>
    </div>
  );
}
