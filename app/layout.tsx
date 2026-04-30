import "@/styles/globals.css";

export const metadata = {
  title: "Finance App",
  description: "Personal Finance Management Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-black text-white antialiased selection:bg-emerald-500/30">
        {children}
      </body>
    </html>
  );
}