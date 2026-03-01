import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#090d16] text-white p-6 flex flex-col items-center justify-center">
      <div className="max-w-md rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <p className="text-[#8494b4] text-sm mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className={cn(
            "block w-full py-4 rounded-lg font-medium text-white",
            "bg-[#3b6ef5] hover:opacity-90 active:scale-[0.98] transition"
          )}
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
