import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuildTwin — Test changes before they touch production",
  description:
    "BuildTwin is a developer infrastructure platform that lets developers simulate a proposed software change in a safe temporary environment before applying it to the real repository.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=JetBrains+Mono:wght@100..900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface-container-lowest font-body-md text-on-surface antialiased selection:bg-primary/20 selection:text-primary">
        {children}
      </body>
    </html>
  );
}
