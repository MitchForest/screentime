import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <div className="space-y-4 text-center">
        <h1 className="font-semibold text-2xl">Screentime</h1>
        <p className="text-muted-foreground">Bun + Next.js + Tailwind + shadcn</p>
        <div className="flex items-center justify-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
        </div>
      </div>
    </main>
  );
}
