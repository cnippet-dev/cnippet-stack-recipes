import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";

export default function PostsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ToastProvider position="bottom-right">
      <AnchoredToastProvider>{children}</AnchoredToastProvider>
    </ToastProvider>
  );
}
