"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, Loader2, Pencil, Plus, RotateCcw, Search, X } from "lucide-react";

import {
  customerDetailResponseSchema,
  customersListResponseSchema,
  projectResponseSchema,
  projectsListResponseSchema,
  type Project,
  type ProjectStatus,
} from "@repo/api-contracts";
import type { Locale } from "@/lib/i18n/locale";
import { Alert, AlertDescription } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";

type ProjectForm = {
  title: string;
  projectNumber: string;
  status: ProjectStatus;
  customerId: string;
  siteAddressId: string;
  customerLabel: string;
  startDate: string;
  endDate: string;
};

type EditForm = ProjectForm & { archived: boolean };
type CustomerOption = { id: string; label: string };
type SiteAddressOption = { id: string; label: string };

const PAGE_SIZE = 20;

function emptyCreateForm(): ProjectForm {
  return {
    title: "",
    projectNumber: "",
    status: "active",
    customerId: "",
    siteAddressId: "",
    customerLabel: "",
    startDate: "",
    endDate: "",
  };
}

function formatStatusLabel(locale: Locale, status: ProjectStatus): string {
  if (locale === "en") {
    const m: Record<ProjectStatus, string> = {
      planned: "Planned",
      active: "Active",
      "on-hold": "On hold",
      completed: "Completed",
    };
    return m[status];
  }
  const m: Record<ProjectStatus, string> = {
    planned: "Geplant",
    active: "Aktiv",
    "on-hold": "Pausiert",
    completed: "Abgeschlossen",
  };
  return m[status];
}

function formatSiteAddressLabel(a: {
  kind: "billing" | "shipping" | "site" | "other";
  label: string | null;
  recipientName: string;
  street: string;
  postalCode: string;
  city: string;
}): string {
  const prefix =
    a.kind === "site"
      ? "Baustelle"
      : a.kind === "billing"
        ? "Rechnung"
        : a.kind === "shipping"
          ? "Lieferung"
          : "Adresse";
  const parts = [a.label, a.recipientName, a.street, `${a.postalCode} ${a.city}`]
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p && p.length > 0));
  return [prefix, ...parts].join(" · ");
}

async function fetchCustomerOptions(): Promise<CustomerOption[]> {
  try {
    const res = await fetch("/api/web/customers?limit=500&offset=0", {
      credentials: "include",
    });
    if (!res.ok) {
      return [];
    }
    const json: unknown = await res.json().catch(() => null);
    const parsed = customersListResponseSchema.safeParse(json);
    if (!parsed.success) {
      return [];
    }
    return parsed.data.customers
      .filter((c) => c.archivedAt === null)
      .map((c) => ({
        id: c.id,
        label: c.customerNumber
          ? `${c.displayName} (${c.customerNumber})`
          : c.displayName,
      }));
  } catch {
    return [];
  }
}

async function fetchCustomerSiteAddressOptions(
  customerId: string,
): Promise<SiteAddressOption[]> {
  if (!customerId.trim()) {
    return [];
  }
  try {
    const res = await fetch(`/api/web/customers/${encodeURIComponent(customerId)}`, {
      credentials: "include",
    });
    if (!res.ok) {
      return [];
    }
    const json: unknown = await res.json().catch(() => null);
    const parsed = customerDetailResponseSchema.safeParse(json);
    if (!parsed.success) {
      return [];
    }
    const sorted = [...parsed.data.customer.addresses].sort((a, b) => {
      const rank = (x: (typeof parsed.data.customer.addresses)[number]) =>
        (x.isDefault ? 0 : 10) +
        (x.kind === "site" ? 0 : x.kind === "billing" ? 1 : x.kind === "shipping" ? 2 : 3);
      return rank(a) - rank(b);
    });
    return sorted.map((a) => ({
      id: a.id,
      label: formatSiteAddressLabel(a),
    }));
  } catch {
    return [];
  }
}

function toPatchPayload(form: EditForm) {
  const customerId = form.customerId.trim() === "" ? null : form.customerId.trim();
  const siteAddressId =
    customerId && form.siteAddressId.trim() !== "" ? form.siteAddressId.trim() : null;
  const payload: {
    title: string;
    projectNumber: string | null;
    status: ProjectStatus;
    customerId: string | null;
    siteAddressId: string | null;
    customerLabel?: string | null;
    startDate: string | null;
    endDate: string | null;
    archived: boolean;
  } = {
    title: form.title.trim(),
    projectNumber: form.projectNumber.trim() === "" ? null : form.projectNumber.trim(),
    status: form.status,
    customerId,
    siteAddressId,
    startDate: form.startDate === "" ? null : form.startDate,
    endDate: form.endDate === "" ? null : form.endDate,
    archived: form.archived,
  };
  if (customerId === null) {
    payload.customerLabel =
      form.customerLabel.trim() === "" ? null : form.customerLabel.trim();
  }
  return payload;
}

function fromProjectToEditForm(project: Project): EditForm {
  return {
    title: project.title,
    projectNumber: project.projectNumber ?? "",
    status: project.status,
    customerId: project.customerId ?? "",
    siteAddressId: project.siteAddressId ?? "",
    customerLabel: project.customerId ? "" : project.customerLabel ?? "",
    startDate: project.startDate ?? "",
    endDate: project.endDate ?? "",
    archived: project.archivedAt !== null,
  };
}

export function ProjectsManagementContent({ locale }: { locale: Locale }) {
  const t = useMemo(() => {
    const isEn = locale === "en";
    return {
      intro: isEn
        ? "Manage project master data centrally. Projects can be linked in sales, GAEB, and project folders."
        : "Projekt-Stammdaten zentral verwalten. Projekte können in Sales, GAEB und Projektmappen verknüpft werden.",
      createTitle: isEn ? "Create project" : "Projekt anlegen",
      listTitle: isEn ? "Projects" : "Projekte",
      title: isEn ? "Title" : "Titel",
      projectNumber: isEn ? "Project no." : "Projektnummer",
      status: isEn ? "Status" : "Status",
      customer: isEn ? "Customer" : "Kunde",
      customerMaster: isEn ? "Master customer" : "Stammkunde",
      noCustomerMaster: isEn ? "No master customer" : "Kein Stammkunde",
      siteAddress: isEn ? "Site address" : "Baustellenadresse",
      noSiteAddress: isEn ? "No site address" : "Keine Baustellenadresse",
      legacyCustomer: isEn ? "Legacy customer (free text)" : "Legacy-Kunde (Freitext)",
      period: isEn ? "Period" : "Zeitraum",
      startDate: isEn ? "Start date" : "Startdatum",
      endDate: isEn ? "End date" : "Enddatum",
      save: isEn ? "Save" : "Speichern",
      saving: isEn ? "Saving…" : "Speichern…",
      cancel: isEn ? "Cancel" : "Abbrechen",
      create: isEn ? "Create" : "Anlegen",
      created: isEn ? "Project created." : "Projekt angelegt.",
      updated: isEn ? "Project updated." : "Projekt aktualisiert.",
      archived: isEn ? "Project archived." : "Projekt archiviert.",
      reactivated: isEn ? "Project reactivated." : "Projekt reaktiviert.",
      archive: isEn ? "Archive" : "Archivieren",
      reactivate: isEn ? "Reactivate" : "Reaktivieren",
      edit: isEn ? "Edit" : "Bearbeiten",
      noRows: isEn ? "No projects found." : "Keine Projekte gefunden.",
      searchPh: isEn ? "Search title, number, customer" : "Suche nach Titel, Nummer, Kunde",
      includeArchived: isEn ? "Include archived" : "Archivierte einblenden",
      clearFilters: isEn ? "Clear filters" : "Filter zurücksetzen",
      actions: isEn ? "Actions" : "Aktionen",
      createdAt: isEn ? "Created" : "Erstellt",
      updatedAt: isEn ? "Updated" : "Aktualisiert",
      page: isEn ? "Page" : "Seite",
      prev: isEn ? "Previous" : "Zurück",
      next: isEn ? "Next" : "Weiter",
      activeOnly: isEn ? "Active only" : "Nur aktive",
      allStatuses: isEn ? "All statuses" : "Alle Stati",
      loadFailed: isEn ? "Loading failed." : "Laden fehlgeschlagen.",
      saveFailed: isEn ? "Saving failed." : "Speichern fehlgeschlagen.",
      invalidCustomerReference: isEn
        ? "Please select a valid customer and matching site address."
        : "Bitte einen gueltigen Kunden und eine passende Baustellenadresse waehlen.",
      validationTitle: isEn ? "Title is required." : "Titel ist erforderlich.",
      conflictNumber: isEn
        ? "Project number already exists."
        : "Projektnummer ist bereits vergeben.",
      editTitle: isEn ? "Edit project" : "Projekt bearbeiten",
      of: isEn ? "of" : "von",
    };
  }, [locale]);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [offset, setOffset] = useState(0);

  const [rows, setRows] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [listBusy, setListBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<ProjectForm>(() => emptyCreateForm());
  const [createBusy, setCreateBusy] = useState(false);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [createSiteAddressOptions, setCreateSiteAddressOptions] = useState<
    SiteAddressOption[]
  >([]);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editSiteAddressOptions, setEditSiteAddressOptions] = useState<
    SiteAddressOption[]
  >([]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const refreshList = useCallback(async () => {
    setListBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (includeArchived) params.set("includeArchived", "1");
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));

      const res = await fetch(`/api/web/projects?${params.toString()}`, {
        credentials: "include",
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          typeof json === "object" &&
            json !== null &&
            "error" in json &&
            typeof (json as { error?: unknown }).error === "string"
            ? (json as { error: string }).error
            : t.loadFailed,
        );
        setRows([]);
        setTotal(0);
        return;
      }
      const parsed = projectsListResponseSchema.safeParse(json);
      if (!parsed.success) {
        setError(t.loadFailed);
        setRows([]);
        setTotal(0);
        return;
      }
      setRows(parsed.data.projects);
      setTotal(parsed.data.total);
    } catch {
      setError(t.loadFailed);
      setRows([]);
      setTotal(0);
    } finally {
      setListBusy(false);
    }
  }, [includeArchived, offset, q, statusFilter, t.loadFailed]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    let cancelled = false;
    void fetchCustomerOptions().then((options) => {
      if (!cancelled) {
        setCustomerOptions(options);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const customerId = createForm.customerId.trim();
    if (customerId === "") {
      setCreateSiteAddressOptions([]);
      setCreateForm((prev) =>
        prev.siteAddressId === "" ? prev : { ...prev, siteAddressId: "" },
      );
      return;
    }
    void fetchCustomerSiteAddressOptions(customerId).then((options) => {
      if (cancelled) {
        return;
      }
      setCreateSiteAddressOptions(options);
      setCreateForm((prev) => {
        if (prev.customerId.trim() !== customerId) {
          return prev;
        }
        const keep = options.some((o) => o.id === prev.siteAddressId);
        return keep ? prev : { ...prev, siteAddressId: "" };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [createForm.customerId]);

  useEffect(() => {
    let cancelled = false;
    const customerId = editForm?.customerId.trim() ?? "";
    if (customerId === "") {
      setEditSiteAddressOptions([]);
      setEditForm((prev) =>
        prev && prev.siteAddressId !== "" ? { ...prev, siteAddressId: "" } : prev,
      );
      return;
    }
    void fetchCustomerSiteAddressOptions(customerId).then((options) => {
      if (cancelled) {
        return;
      }
      setEditSiteAddressOptions(options);
      setEditForm((prev) => {
        if (!prev || prev.customerId.trim() !== customerId) {
          return prev;
        }
        const keep = options.some((o) => o.id === prev.siteAddressId);
        return keep ? prev : { ...prev, siteAddressId: "" };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [editForm?.customerId]);

  function resetFilters() {
    setQ("");
    setStatusFilter("all");
    setIncludeArchived(false);
    setOffset(0);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (createForm.title.trim() === "") {
      setError(t.validationTitle);
      return;
    }
    setCreateBusy(true);
    try {
      const res = await fetch("/api/web/projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createForm.title.trim(),
          projectNumber:
            createForm.projectNumber.trim() === ""
              ? null
              : createForm.projectNumber.trim(),
          status: createForm.status,
          customerId: createForm.customerId.trim() === "" ? null : createForm.customerId.trim(),
          siteAddressId:
            createForm.customerId.trim() !== "" && createForm.siteAddressId.trim() !== ""
              ? createForm.siteAddressId.trim()
              : null,
          customerLabel:
            createForm.customerId.trim() === "" && createForm.customerLabel.trim() !== ""
              ? createForm.customerLabel.trim()
              : null,
          startDate: createForm.startDate === "" ? null : createForm.startDate,
          endDate: createForm.endDate === "" ? null : createForm.endDate,
        }),
      });
      const json: unknown = await res.json().catch(() => null);
      if (res.status === 409) {
        setError(t.conflictNumber);
        return;
      }
      if (
        typeof json === "object" &&
        json !== null &&
        "error" in json &&
        ((json as { error?: unknown }).error === "invalid_customer" ||
          (json as { error?: unknown }).error === "invalid_site_address")
      ) {
        setError(t.invalidCustomerReference);
        return;
      }
      if (!res.ok) {
        setError(t.saveFailed);
        return;
      }
      const parsed = projectResponseSchema.safeParse(json);
      if (!parsed.success) {
        setError(t.saveFailed);
        return;
      }
      setCreateForm(emptyCreateForm());
      setOffset(0);
      await refreshList();
      setError(null);
    } catch {
      setError(t.saveFailed);
    } finally {
      setCreateBusy(false);
    }
  }

  async function saveEdit() {
    if (!editId || !editForm) return;
    if (editForm.title.trim() === "") {
      setError(t.validationTitle);
      return;
    }
    setEditBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/web/projects/${encodeURIComponent(editId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPatchPayload(editForm)),
      });
      const json: unknown = await res.json().catch(() => null);
      if (res.status === 409) {
        setError(t.conflictNumber);
        return;
      }
      if (
        typeof json === "object" &&
        json !== null &&
        "error" in json &&
        ((json as { error?: unknown }).error === "invalid_customer" ||
          (json as { error?: unknown }).error === "invalid_site_address")
      ) {
        setError(t.invalidCustomerReference);
        return;
      }
      if (!res.ok) {
        setError(t.saveFailed);
        return;
      }
      const parsed = projectResponseSchema.safeParse(json);
      if (!parsed.success) {
        setError(t.saveFailed);
        return;
      }
      setEditId(null);
      setEditForm(null);
      await refreshList();
    } catch {
      setError(t.saveFailed);
    } finally {
      setEditBusy(false);
    }
  }

  async function toggleArchive(project: Project) {
    setError(null);
    setEditBusy(true);
    try {
      const archived = project.archivedAt === null;
      const res = await fetch(`/api/web/projects/${encodeURIComponent(project.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      if (!res.ok) {
        setError(t.saveFailed);
        return;
      }
      await refreshList();
    } catch {
      setError(t.saveFailed);
    } finally {
      setEditBusy(false);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.createTitle}</CardTitle>
          <CardDescription>{t.intro}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" onSubmit={handleCreate}>
            <div className="grid gap-2">
              <Label htmlFor="project-create-title">{t.title}</Label>
              <Input
                id="project-create-title"
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, title: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-create-number">{t.projectNumber}</Label>
              <Input
                id="project-create-number"
                value={createForm.projectNumber}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, projectNumber: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-create-status">{t.status}</Label>
              <select
                id="project-create-status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={createForm.status}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, status: e.target.value as ProjectStatus }))
                }
              >
                {(["planned", "active", "on-hold", "completed"] as const).map((s) => (
                  <option key={s} value={s}>
                    {formatStatusLabel(locale, s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-create-customer-master">{t.customerMaster}</Label>
              <select
                id="project-create-customer-master"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={createForm.customerId}
                onChange={(e) => {
                  const customerId = e.target.value;
                  setCreateForm((p) => ({
                    ...p,
                    customerId,
                    siteAddressId: customerId === "" ? "" : p.siteAddressId,
                    customerLabel: customerId === "" ? p.customerLabel : "",
                  }));
                }}
              >
                <option value="">{t.noCustomerMaster}</option>
                {customerOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-create-site-address">{t.siteAddress}</Label>
              <select
                id="project-create-site-address"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                value={createForm.siteAddressId}
                disabled={createForm.customerId.trim() === ""}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, siteAddressId: e.target.value }))
                }
              >
                <option value="">{t.noSiteAddress}</option>
                {createSiteAddressOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            {createForm.customerId.trim() === "" ? (
              <div className="grid gap-2">
                <Label htmlFor="project-create-customer-legacy">{t.legacyCustomer}</Label>
                <Input
                  id="project-create-customer-legacy"
                  value={createForm.customerLabel}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, customerLabel: e.target.value }))
                  }
                />
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="project-create-start">{t.startDate}</Label>
              <Input
                id="project-create-start"
                type="date"
                value={createForm.startDate}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, startDate: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-create-end">{t.endDate}</Label>
              <Input
                id="project-create-end"
                type="date"
                value={createForm.endDate}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, endDate: e.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={createBusy}>
                {createBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
                {createBusy ? t.saving : t.create}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.listTitle}</CardTitle>
          <CardDescription>
            {t.page} {page} {t.of} {pages}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto_auto] md:items-end">
            <div className="grid gap-2">
              <Label htmlFor="projects-search">{t.searchPh}</Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="projects-search"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setOffset(0);
                  }}
                  className="pl-9"
                  placeholder={t.searchPh}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="projects-status-filter">{t.status}</Label>
              <select
                id="projects-status-filter"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as "all" | ProjectStatus);
                  setOffset(0);
                }}
              >
                <option value="all">{t.allStatuses}</option>
                {(["planned", "active", "on-hold", "completed"] as const).map((s) => (
                  <option key={s} value={s}>
                    {formatStatusLabel(locale, s)}
                  </option>
                ))}
              </select>
            </div>
            <label className="inline-flex h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => {
                  setIncludeArchived(e.target.checked);
                  setOffset(0);
                }}
              />
              {t.includeArchived}
            </label>
            <Button type="button" variant="outline" onClick={resetFilters}>
              <X className="size-4" aria-hidden />
              {t.clearFilters}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t.title}</th>
                  <th className="px-3 py-2 text-left font-medium">{t.projectNumber}</th>
                  <th className="px-3 py-2 text-left font-medium">{t.status}</th>
                  <th className="px-3 py-2 text-left font-medium">{t.customer}</th>
                  <th className="px-3 py-2 text-left font-medium">{t.period}</th>
                  <th className="px-3 py-2 text-left font-medium">{t.updatedAt}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {listBusy ? (
                  <tr>
                    <td className="px-3 py-6 text-muted-foreground" colSpan={7}>
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Laden…
                      </span>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-muted-foreground" colSpan={7}>
                      {t.noRows}
                    </td>
                  </tr>
                ) : (
                  rows.map((p) => (
                    <tr key={p.id} className={p.archivedAt ? "opacity-70" : undefined}>
                      <td className="px-3 py-2">
                        <Link
                          href={`/web/projects/${p.id}`}
                          className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {p.title}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{p.projectNumber ?? "—"}</td>
                      <td className="px-3 py-2">{formatStatusLabel(locale, p.status)}</td>
                      <td className="px-3 py-2">{p.customerLabel ?? "—"}</td>
                      <td className="px-3 py-2">
                        {p.startDate ?? "—"}
                        {" → "}
                        {p.endDate ?? "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-xs text-muted-foreground">
                        {new Date(p.updatedAt).toLocaleString(locale === "en" ? "en-GB" : "de-DE")}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditId(p.id);
                              setEditForm(fromProjectToEditForm(p));
                            }}
                          >
                            <Pencil className="size-4" aria-hidden />
                            {t.edit}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void toggleArchive(p)}
                            disabled={editBusy}
                          >
                            {p.archivedAt ? (
                              <RotateCcw className="size-4" aria-hidden />
                            ) : (
                              <Archive className="size-4" aria-hidden />
                            )}
                            {p.archivedAt ? t.reactivate : t.archive}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
          <span className="text-xs text-muted-foreground">
            {total} {t.listTitle.toLowerCase()}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={offset <= 0 || listBusy}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            >
              {t.prev}
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {t.page} {page} {t.of} {pages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= total || listBusy}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              {t.next}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {editId && editForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.editTitle}</CardTitle>
            <CardDescription>{rows.find((r) => r.id === editId)?.title ?? "—"}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="project-edit-title">{t.title}</Label>
              <Input
                id="project-edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm((p) => (p ? { ...p, title: e.target.value } : p))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-edit-number">{t.projectNumber}</Label>
              <Input
                id="project-edit-number"
                value={editForm.projectNumber}
                onChange={(e) =>
                  setEditForm((p) => (p ? { ...p, projectNumber: e.target.value } : p))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-edit-status">{t.status}</Label>
              <select
                id="project-edit-status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((p) =>
                    p ? { ...p, status: e.target.value as ProjectStatus } : p,
                  )
                }
              >
                {(["planned", "active", "on-hold", "completed"] as const).map((s) => (
                  <option key={s} value={s}>
                    {formatStatusLabel(locale, s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-edit-customer-master">{t.customerMaster}</Label>
              <select
                id="project-edit-customer-master"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editForm.customerId}
                onChange={(e) => {
                  const customerId = e.target.value;
                  setEditForm((p) =>
                    p
                      ? {
                          ...p,
                          customerId,
                          siteAddressId: customerId === "" ? "" : p.siteAddressId,
                          customerLabel: customerId === "" ? p.customerLabel : "",
                        }
                      : p,
                  );
                }}
              >
                <option value="">{t.noCustomerMaster}</option>
                {customerOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-edit-site-address">{t.siteAddress}</Label>
              <select
                id="project-edit-site-address"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                value={editForm.siteAddressId}
                disabled={editForm.customerId.trim() === ""}
                onChange={(e) =>
                  setEditForm((p) => (p ? { ...p, siteAddressId: e.target.value } : p))
                }
              >
                <option value="">{t.noSiteAddress}</option>
                {editSiteAddressOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            {editForm.customerId.trim() === "" ? (
              <div className="grid gap-2">
                <Label htmlFor="project-edit-customer-legacy">{t.legacyCustomer}</Label>
                <Input
                  id="project-edit-customer-legacy"
                  value={editForm.customerLabel}
                  onChange={(e) =>
                    setEditForm((p) => (p ? { ...p, customerLabel: e.target.value } : p))
                  }
                />
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="project-edit-start">{t.startDate}</Label>
              <Input
                id="project-edit-start"
                type="date"
                value={editForm.startDate}
                onChange={(e) =>
                  setEditForm((p) => (p ? { ...p, startDate: e.target.value } : p))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-edit-end">{t.endDate}</Label>
              <Input
                id="project-edit-end"
                type="date"
                value={editForm.endDate}
                onChange={(e) =>
                  setEditForm((p) => (p ? { ...p, endDate: e.target.value } : p))
                }
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2 border-t pt-6">
            <Button type="button" onClick={() => void saveEdit()} disabled={editBusy}>
              {editBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {editBusy ? t.saving : t.save}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditId(null);
                setEditForm(null);
              }}
              disabled={editBusy}
            >
              {t.cancel}
            </Button>
          </CardFooter>
        </Card>
      ) : null}
    </div>
  );
}

