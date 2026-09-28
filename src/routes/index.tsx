import { createFileRoute } from "@tanstack/react-router";
import { isValidElement, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowDown, ArrowRight, Check, ChevronRight, Copy, ExternalLink, FileCode2, Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import guide from "@/content/guide.md?raw";
import showroom from "@/assets/showroom.jpg";

const groups = [
  { name: "Start", items: [
    { label: "Quick start", id: "quick-start" },
    { label: "Overview", id: "overview" },
    { label: "Prerequisites", id: "prerequisites" },
    { label: "Authentication", id: "authentication" },
    { label: "Required packages", id: "required-packages" },
  ] },
  { name: "Integrate", items: [
    { label: "The iframe", id: "step-1-the-iframe" },
    { label: "The button", id: "step-2-the-see-it-live-button" },
    { label: "Picture-in-picture", id: "step-3-pip-player-optional-advanced" },
    { label: "Advanced patterns", id: "step-3b-advanced-integration-patterns" },
    { label: "Events", id: "step-4-listening-to-postmessage-events" },
    { label: "Practical examples", id: "practical-examples" },
    { label: "Status polling", id: "step-5-status-polling" },
  ] },
  { name: "Reference", items: [
    { label: "Configuration", id: "configuration-reference" },
    { label: "Error handling", id: "error-handling" },
    { label: "Security", id: "security-considerations" },
    { label: "Troubleshooting", id: "troubleshooting" },
    { label: "Complete example", id: "minimal-complete-example" },
  ] },
];
const allItems = groups.flatMap((group) => group.items);
const iframeCode = `<iframe
  src="https://web.360world.com/seelive/?deep_link_sub1=quickconnectlink&deep_link_sub2=YOUR_LINK_ID"
  title="Live Showroom"
  style="width: 100%; height: 100%; border: none;"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; xr-spatial-tracking; fullscreen"
  allowfullscreen
  referrerpolicy="no-referrer-when-downgrade"
></iframe>`;
const reactCode = `interface ShowroomIframeProps {
  link: string;
  productName: string;
  onLoad?: () => void;
}

const ShowroomIframe = ({ link, productName, onLoad }: ShowroomIframeProps) => (
  <iframe
    src={link}
    title={\`\${productName} — Live Showroom\`}
    style={{ width: "100%", height: "100%", border: "none" }}
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; xr-spatial-tracking; fullscreen"
    allowFullScreen
    referrerPolicy="no-referrer-when-downgrade"
    onLoad={onLoad}
  />
);`;
const content = guide.slice(guide.indexOf("## Overview"));
const slug = (value: string) => value.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
const headings = Array.from(content.matchAll(/^#{2,4} (.+)$/gm)).map((match) => { const label = (match[1] ?? "").replace(/[`*]/g, ""); return { label, id: slug(label) }; });
const searchItems = [{ label: "Quick start", id: "quick-start" }, ...headings];

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "See Live Integration Guide — 360 World" },
    { name: "description", content: "Embed 360 World's live showroom in your website. Follow the iframe, button, PiP, events, status polling, and security integration guide." },
    { property: "og:title", content: "See Live Integration Guide — 360 World" },
    { property: "og:description", content: "A practical guide to adding 360 World's live showroom experience to your product pages." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: DocsPage,
});

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setCopied(false), 1800);
    } catch { setCopied(false); }
  };
  return <div className="my-4 min-w-0 overflow-hidden rounded-lg border border-border bg-code">
    <div className="flex h-10 items-center justify-between border-b border-code-foreground/15 px-4 text-[11px] text-code-foreground/60">
      <span className="font-mono">{label}</span>
      <Button variant="code" size="sm" onClick={copy} aria-label={copied ? "Copied code" : `Copy ${label} code`} title={copied ? "Copied" : "Copy code"} className="h-7 px-2.5 text-[11px]">
        {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
      </Button>
    </div>
    <pre className="overflow-x-auto p-4 font-mono text-xs leading-[1.85] text-code-foreground sm:text-[13px]"><code>{code}</code></pre>
  </div>;
}

function DocsPage() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("quick-start");
  const searchRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())).slice(0, 12), [query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
      if (event.key === "Escape") { setSearchOpen(false); setMenuOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (searchOpen) searchRef.current?.focus(); else setQuery(""); }, [searchOpen]);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: "-85px 0px -70% 0px" });
    document.querySelectorAll("[data-doc-heading]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  const goTo = (id: string) => { setSearchOpen(false); setMenuOpen(false); setActive(id); document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); window.history.replaceState(null, "", `#${id}`); };

  const nav = <nav aria-label="Documentation" className="space-y-5 text-[13px]">
    {groups.map((group) => <div key={group.name}>
      <p className="mb-2 px-2 font-mono text-[10px] font-semibold uppercase text-primary">{group.name}</p>
      <div className="space-y-0.5">{group.items.map((item) => <a key={item.id} href={`#${item.id}`} onClick={(event) => { event.preventDefault(); goTo(item.id); }} className={`block rounded-md px-2 py-1.5 transition-colors hover:bg-panel hover:text-foreground ${active === item.id ? "bg-panel font-semibold text-primary" : "text-muted-foreground"}`}>{item.label}</a>)}</div>
    </div>)}
  </nav>;

  const heading = ({ level, children }: { level: 2 | 3 | 4; children: ReactNode }) => {
    const text = flattenText(children);
    const id = slug(text);
    const Tag = `h${level}` as "h2" | "h3" | "h4";
    return <Tag id={id} data-doc-heading>{children}<a href={`#${id}`} aria-label={`Link to ${text}`} className="ml-2 opacity-0 transition-opacity hover:opacity-100 focus:opacity-100 group-hover:opacity-100">#</a></Tag>;
  };

  return <div className="docs-background min-h-screen font-sans text-foreground antialiased">
    <header className="frost sticky top-0 z-40 border-b border-border">
      <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-3 px-4 sm:px-6">
        <Button variant="docs" size="compactIcon" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open navigation" title="Open navigation"><Menu /></Button>
        <a href="#quick-start" onClick={(event) => { event.preventDefault(); goTo("quick-start"); }} className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">360</span>
          <span className="truncate text-[15px] font-semibold">World See Live</span>
          <span className="hidden border-l border-border pl-3 text-[13px] text-muted-foreground sm:inline">Docs</span>
        </a>
        <Button variant="docs" onClick={() => setSearchOpen(true)} className="ml-auto h-9 w-9 justify-center px-0 text-muted-foreground md:w-64 md:justify-start md:px-3" aria-label="Search documentation"><Search className="size-4" /><span className="hidden flex-1 text-left font-normal md:inline">Search docs…</span><kbd className="hidden rounded border border-border bg-background/50 px-1.5 font-mono text-[10px] md:inline">⌘ K</kbd></Button>
        <a href="https://360world.com" target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary sm:inline-flex">360 World <ExternalLink className="size-3" /></a>
      </div>
    </header>

    <div className="mx-auto grid max-w-[1480px] grid-cols-1 gap-8 px-4 pb-24 pt-9 sm:px-6 lg:grid-cols-[208px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[208px_minmax(0,1fr)_214px] xl:gap-12">
      <aside className="hidden lg:block"><div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-6">{nav}</div></aside>
      <main className="min-w-0 max-w-[800px]">
        <section id="quick-start" data-doc-heading className="scroll-mt-24">
          <div className="mb-5 flex items-center gap-2 font-mono text-[11px] font-medium text-primary"><span className="size-1.5 rounded-full bg-success" /> INTEGRATION GUIDE <ChevronRight className="size-3 text-muted-foreground" /> GETTING STARTED</div>
          <h1 className="max-w-[650px] text-balance text-[33px] font-semibold leading-[1.2] sm:text-[39px]">Embed a live showroom in your product page</h1>
          <p className="mt-4 max-w-[640px] text-pretty text-[15px] leading-7 text-muted-foreground">Let customers see physical products in your store through a live video session. Start with one iframe, then add a button, session events, or picture-in-picture as needed.</p>
          <div className="mt-7 border-l-[3px] border-primary bg-panel/65 px-5 py-4">
            <div className="flex items-start gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 font-mono text-xs font-semibold text-primary">01</span><div><p className="text-[13px] font-semibold">Get your quick-connect link</p><p className="mt-1 text-[13px] leading-6 text-muted-foreground">Create a link for your product in the 360 World dashboard. The <code className="rounded bg-background px-1 font-mono text-xs text-foreground">deep_link_sub2</code> parameter contains its link ID.</p></div></div>
          </div>
          <div className="mt-6">
            <div className="flex items-start gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 font-mono text-xs font-semibold text-primary">02</span><div><p className="text-[13px] font-semibold">Add the iframe to your product page</p><p className="mt-1 text-[13px] leading-6 text-muted-foreground">Replace <code className="rounded bg-panel px-1 font-mono text-xs text-foreground">YOUR_LINK_ID</code> with the ID from your link. No packages are required for a basic integration.</p></div></div>
            <CodeBlock label="index.html" code={iframeCode} />
          </div>
          <div className="mt-6 flex items-start gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 font-mono text-xs font-semibold text-primary">03</span><div><p className="text-[13px] font-semibold">Open it from a “See It Live” button</p><p className="mt-1 text-[13px] leading-6 text-muted-foreground">Show the iframe in a modal or floating player when a customer clicks. Keep it mounted while the session is active.</p></div></div>
          <a href="#step-2-the-see-it-live-button" onClick={(event) => { event.preventDefault(); goTo("step-2-the-see-it-live-button"); }} className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">See the button example <ArrowRight className="size-4" /></a>
        </section>

        <section className="mt-12 border-t border-border pt-8">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase text-primary"><FileCode2 className="size-4" /> React component</div>
          <h2 className="mt-2 text-xl font-semibold">Using React?</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Pass your quick-connect URL to a reusable iframe component. The full guide includes button and advanced PiP examples.</p>
          <CodeBlock label="ShowroomIframe.tsx" code={reactCode} />
        </section>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a href="#step-4-listening-to-postmessage-events" onClick={(event) => { event.preventDefault(); goTo("step-4-listening-to-postmessage-events"); }} className="rounded-lg border border-border bg-panel/55 p-4 transition-colors hover:bg-panel"><p className="font-mono text-[10px] uppercase text-primary">postMessage</p><h3 className="mt-1 text-sm font-semibold">Session events <ArrowRight className="ml-1 inline size-3" /></h3><p className="mt-2 text-[13px] leading-5 text-muted-foreground">Listen for <code className="font-mono text-xs">state_changed</code>, <code className="font-mono text-xs">orientation_changed</code>, and errors.</p></a>
          <a href="#step-5-status-polling" onClick={(event) => { event.preventDefault(); goTo("step-5-status-polling"); }} className="rounded-lg border border-border bg-panel/55 p-4 transition-colors hover:bg-panel"><p className="font-mono text-[10px] uppercase text-primary">Availability</p><h3 className="mt-1 text-sm font-semibold">Status polling <ArrowRight className="ml-1 inline size-3" /></h3><p className="mt-2 text-[13px] leading-5 text-muted-foreground">Check <code className="font-mono text-xs">GET /see-live/:id</code> with your origin-restricted public key.</p></a>
        </div>

        <div className="mt-14 flex items-center gap-3 border-b border-border pb-3"><span className="font-mono text-[11px] uppercase text-primary">The complete guide</span><ArrowDown className="size-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">From setup to troubleshooting</span></div>
        <article className="doc-prose min-w-0 break-words [&_h2]:group [&_h3]:group [&_h4]:group">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
            h2: ({ children }) => heading({ level: 2, children }),
            h3: ({ children }) => heading({ level: 3, children }),
            h4: ({ children }) => heading({ level: 4, children }),
            a: ({ href, children }) => href?.startsWith("./") ? <span title="This companion guide is not included in the supplied document" className="text-muted-foreground underline decoration-dotted">{children}</span> : <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}>{children}</a>,
            pre: ({ children }) => { const codeElement = isValidElement<{ className?: string; children?: ReactNode }>(children) ? children : null; return <CodeBlock label={codeElement?.props.className?.replace("language-", "") || "text"} code={String(codeElement?.props.children ?? "").replace(/\n$/, "")} />; },
            code: ({ children }) => <code>{children}</code>,
            table: ({ children }) => <div className="my-5 overflow-x-auto rounded-lg border border-border bg-panel/50"><table>{children}</table></div>,
          }}>{content}</ReactMarkdown>
        </article>
        <footer className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">© 360 World · <a href="https://360world.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">360world.com</a></footer>
      </main>

      <aside className="hidden xl:block"><div className="frost sticky top-24 rounded-lg border border-border p-4">
        <p className="font-mono text-[10px] uppercase text-muted-foreground">On this page</p>
        <div className="mt-3 space-y-1">{["quick-start", "required-packages", "step-1-the-iframe", "step-2-the-see-it-live-button", "step-4-listening-to-postmessage-events", "step-5-status-polling", "security-considerations"].map((id) => { const item = allItems.find((entry) => entry.id === id); return item ? <a key={item.id} href={`#${item.id}`} onClick={(event) => { event.preventDefault(); goTo(item.id); }} className={`block border-l-2 py-1 pl-2 text-xs transition-colors hover:text-primary ${active === item.id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground"}`}>{item.label}</a> : null; })}</div>
        <div className="mt-6 border-t border-border pt-4"><p className="font-mono text-[10px] uppercase text-primary">A live showroom, in context</p><img src={showroom} alt="Illustrative furniture showroom with a red lounge chair" loading="lazy" width={640} height={512} className="mt-3 aspect-[4/3] w-full rounded-md object-cover" /><p className="mt-2 text-[11px] leading-5 text-muted-foreground">Illustrative preview · Your iframe loads your own showroom session.</p></div>
      </div></aside>
    </div>

    {menuOpen && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-foreground/30" onClick={() => setMenuOpen(false)} /><aside className="frost absolute inset-y-0 left-0 w-[min(85vw,310px)] overflow-y-auto border-r border-border p-5"><div className="mb-6 flex items-center justify-between"><span className="font-semibold">Contents</span><Button variant="docs" size="compactIcon" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X /></Button></div>{nav}</aside></div>}
    {searchOpen && <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"><div className="absolute inset-0 bg-foreground/35 backdrop-blur-sm" onClick={() => setSearchOpen(false)} /><div role="dialog" aria-modal="true" aria-label="Search documentation" className="relative w-full max-w-xl overflow-hidden rounded-lg border border-border bg-popover shadow-2xl"><div className="flex items-center gap-3 border-b border-border px-4"><Search className="size-5 text-muted-foreground" /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the guide…" className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" onKeyDown={(event) => { if (event.key === "Enter" && results[0]) goTo(results[0].id); }} /><Button variant="ghost" size="compactIcon" onClick={() => setSearchOpen(false)} aria-label="Close search"><X /></Button></div><div className="max-h-[55vh] overflow-y-auto p-2">{results.length ? results.map((item) => <Button key={item.id} variant="ghost" onClick={() => goTo(item.id)} className="flex h-auto w-full justify-between rounded-md px-3 py-3 text-left font-normal"><span className="min-w-0 truncate">{item.label}</span><ArrowRight className="size-4 shrink-0 text-muted-foreground" /></Button>) : <p className="p-6 text-center text-sm text-muted-foreground">No matching sections</p>}</div><div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">Searches section titles · Press Enter to open the first result</div></div></div>}
  </div>;
}

function flattenText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join("");
  if (children && typeof children === "object" && "props" in children) return flattenText((children as { props: { children?: ReactNode } }).props.children);
  return "";
}
