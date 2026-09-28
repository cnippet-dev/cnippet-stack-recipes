import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";
import { TRPCReactProvider } from "@/trpc/client";

export default function PostsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TRPCReactProvider>
      <ToastProvider position="bottom-right">
        <AnchoredToastProvider>{children}</AnchoredToastProvider>
      </ToastProvider>
    </TRPCReactProvider>
  );
}
