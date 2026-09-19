import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "hf_employer_id";

interface OrgContextValue {
  loading: boolean;
  error: string | null;
  userId: string | null;
  isAnonymous: boolean;
  employerIds: string[];
  employerId: string | null;
  companyNames: Record<string, string>;
  setEmployerId: (id: string) => void;
  refresh: () => Promise<void>;
  isRecruiter: boolean;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [employerIds, setEmployerIds] = useState<string[]>([]);
  const [employerId, setEmployerIdState] = useState<string | null>(null);
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        setUserId(null);
        setIsAnonymous(false);
        setEmployerIds([]);
        setEmployerIdState(null);
        setCompanyNames({});
        return;
      }
      setUserId(user.id);
      setIsAnonymous(Boolean(user.is_anonymous));

      const { data: links, error: linkError } = await supabase
        .from("recruiter_employers")
        .select("employer_id")
        .eq("user_id", user.id);
      if (linkError) throw linkError;

      const ids = (links ?? []).map((r) => r.employer_id as string);
      setEmployerIds(ids);

      let names: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: employers } = await supabase
          .from("employers")
          .select("id, company_name")
          .in("id", ids);
        names = Object.fromEntries(
          (employers ?? []).map((e) => [e.id as string, e.company_name as string]),
        );
        setCompanyNames(names);
      } else {
        setCompanyNames({});
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      const next =
        (stored && ids.includes(stored) ? stored : null) ?? ids[0] ?? null;
      setEmployerIdState(next);
      if (next) localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load organisation");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  const setEmployerId = useCallback((id: string) => {
    setEmployerIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const value = useMemo<OrgContextValue>(
    () => ({
      loading,
      error,
      userId,
      isAnonymous,
      employerIds,
      employerId,
      companyNames,
      setEmployerId,
      refresh,
      isRecruiter: employerIds.length > 0 && !isAnonymous,
    }),
    [
      loading,
      error,
      userId,
      isAnonymous,
      employerIds,
      employerId,
      companyNames,
      setEmployerId,
      refresh,
    ],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
