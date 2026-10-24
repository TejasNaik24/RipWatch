export default function StatusPill({ active }: { active: boolean }) {
  return active ? (
    <span className="rw-pulse inline-flex items-center gap-2 rounded-full border border-alert/60 bg-alert/15 px-3 py-1 font-mono text-xs font-semibold tracking-wider text-alert">
      <span className="h-2 w-2 rounded-full bg-alert" />
      RIP DETECTED
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full border border-ok/40 bg-ok/10 px-3 py-1 font-mono text-xs font-semibold tracking-wider text-ok">
      <span className="h-2 w-2 rounded-full bg-ok" />
      CLEAR
    </span>
  );
}
