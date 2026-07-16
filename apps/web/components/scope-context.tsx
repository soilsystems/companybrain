"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  apiFetch,
  type BusinessSummary,
  type MeResponse,
  type OrganizationSummary,
} from "@/lib/api-client";
import { env } from "@/lib/env";

type ScopeContextValue = {
  user: MeResponse["user"] | null;
  organizations: OrganizationSummary[];
  organization: OrganizationSummary | null;
  business: BusinessSummary | null;
  domainId: string;
  loading: boolean;
  error: string;
  setOrganizationId: (id: string) => void;
  setBusinessId: (id: string) => void;
  setDomainId: (id: string) => void;
};

const ScopeContext = createContext<ScopeContextValue>({
  user: null,
  organizations: [],
  organization: null,
  business: null,
  domainId: env.NEXT_PUBLIC_DEFAULT_DOMAIN_ID ?? "",
  loading: false,
  error: "",
  setOrganizationId: () => undefined,
  setBusinessId: () => undefined,
  setDomainId: () => undefined,
});

export function ScopeProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [businessId, setBusinessId] = useState(
    env.NEXT_PUBLIC_DEFAULT_BUSINESS_ID ?? "",
  );
  const [domainId, setDomainId] = useState(
    env.NEXT_PUBLIC_DEFAULT_DOMAIN_ID ?? "",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<MeResponse>("/api/v1/auth/me")
      .then((payload) => {
        setUser(payload.user);
        setOrganizations(payload.organizations);
        const organization = payload.organizations[0];
        const business =
          organization?.businesses.find(
            (item) => item.id === env.NEXT_PUBLIC_DEFAULT_BUSINESS_ID,
          ) ?? organization?.businesses[0];
        setOrganizationId(organization?.id ?? "");
        setBusinessId(
          business?.id ?? env.NEXT_PUBLIC_DEFAULT_BUSINESS_ID ?? "",
        );
        setDomainId((current) => current || business?.domains[0]?.id || "");
      })
      .catch(() => setError("Sign in to load your authorized workspaces."))
      .finally(() => setLoading(false));
  }, []);

  const organization =
    organizations.find((item) => item.id === organizationId) ??
    organizations[0] ??
    null;
  const business =
    organization?.businesses.find((item) => item.id === businessId) ??
    organization?.businesses[0] ??
    null;
  const selectOrganization = useCallback(
    (id: string) => {
      setOrganizationId(id);
      const nextOrganization = organizations.find((item) => item.id === id);
      const nextBusiness = nextOrganization?.businesses[0];
      setBusinessId(nextBusiness?.id ?? "");
      setDomainId(nextBusiness?.domains[0]?.id ?? "");
    },
    [organizations],
  );
  const selectBusiness = useCallback(
    (id: string) => {
      setBusinessId(id);
      const nextBusiness = organization?.businesses.find(
        (item) => item.id === id,
      );
      setDomainId(nextBusiness?.domains[0]?.id ?? "");
    },
    [organization],
  );
  const value = useMemo(
    () => ({
      user,
      organizations,
      organization,
      business,
      domainId,
      loading,
      error,
      setOrganizationId: selectOrganization,
      setBusinessId: selectBusiness,
      setDomainId,
    }),
    [
      user,
      organizations,
      organization,
      business,
      domainId,
      loading,
      error,
      selectOrganization,
      selectBusiness,
    ],
  );
  return (
    <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
  );
}

export function useScope() {
  return useContext(ScopeContext);
}
