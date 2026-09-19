import { Link } from "react-router-dom";
import { HireFastLogo } from "@/components/ui/HireFastLogo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-slate-900">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <HireFastLogo size="md" className="mx-auto mb-4 justify-center" />
        <h1 className="mb-2 text-[26px] font-bold tracking-tight">Page not found</h1>
        <p className="mb-6 text-sm text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button asChild size="lg" className="w-full rounded-xl bg-blue-600 text-white">
          <Link to="/jobs">Browse jobs</Link>
        </Button>
      </div>
    </div>
  );
}
