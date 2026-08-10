export default function AutopilotFullAutoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 max-h-full flex-col overflow-hidden">
      {children}
    </div>
  );
}
