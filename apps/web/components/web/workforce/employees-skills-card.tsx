"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  employeeSkillCatalogListResponseSchema,
  employeeSkillLinksResponseSchema,
} from "@repo/api-contracts";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import { Checkbox } from "@repo/ui/checkbox";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";

import { getEmployeesCopy } from "@/content/employees-module";
import type { Locale } from "@/lib/i18n/locale";
import { parseResponseJson } from "@/lib/parse-response-json";
import { toast } from "sonner";

type SkillItem = {
  id: string;
  name: string;
};

export function EmployeesSkillsCard({
  employeeId,
  locale,
  canEdit,
}: {
  employeeId: string;
  locale: Locale;
  canEdit: boolean;
}) {
  const t = useMemo(() => getEmployeesCopy(locale), [locale]);
  const [catalog, setCatalog] = useState<SkillItem[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  const [newSkillName, setNewSkillName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [catalogRes, linksRes] = await Promise.all([
        fetch("/api/web/employees/skills/catalog", { credentials: "include" }),
        fetch(`/api/web/employees/${encodeURIComponent(employeeId)}/skills`, {
          credentials: "include",
        }),
      ]);
      const [catalogText, linksText] = await Promise.all([
        catalogRes.text(),
        linksRes.text(),
      ]);
      const catalogJson = parseResponseJson(catalogText);
      const linksJson = parseResponseJson(linksText);
      const parsedCatalog = employeeSkillCatalogListResponseSchema.safeParse(catalogJson);
      const parsedLinks = employeeSkillLinksResponseSchema.safeParse(linksJson);
      if (!catalogRes.ok || !linksRes.ok || !parsedCatalog.success || !parsedLinks.success) {
        return;
      }
      setCatalog(
        parsedCatalog.data.skills.map((s) => ({
          id: s.id,
          name: s.name,
        })),
      );
      setSelectedSkillIds(new Set(parsedLinks.data.selectedSkillIds));
    } catch {
      // silent; page has base-level toasts already
    }
  }, [employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addSkill() {
    const name = newSkillName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const res = await fetch("/api/web/employees/skills/catalog", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        toast.error(t.skillsCreateError);
        return;
      }
      setNewSkillName("");
      await load();
    } catch {
      toast.error(t.skillsCreateError);
    } finally {
      setBusy(false);
    }
  }

  async function saveSelected() {
    setBusy(true);
    try {
      const res = await fetch(`/api/web/employees/${encodeURIComponent(employeeId)}/skills`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillIds: [...selectedSkillIds] }),
      });
      if (!res.ok) {
        toast.error(t.skillsSaveError);
        return;
      }
      toast.success(t.skillsSaved);
    } catch {
      toast.error(t.skillsSaveError);
    } finally {
      setBusy(false);
    }
  }

  function toggleSkill(skillId: string, checked: boolean) {
    setSelectedSkillIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(skillId);
      else next.delete(skillId);
      return next;
    });
  }

  return (
    <Card className="border-border/80 bg-muted/15 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">{t.skillsCardTitle}</CardTitle>
        <CardDescription className="text-xs">{t.skillsCardDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canEdit ? (
          <div className="flex flex-col gap-2 sm:max-w-xl sm:flex-row">
            <Input
              value={newSkillName}
              onChange={(ev) => setNewSkillName(ev.target.value)}
              placeholder={t.skillsCreatePlaceholder}
            />
            <Button type="button" variant="secondary" onClick={() => void addSkill()} disabled={busy}>
              {t.skillsCreateCatalog}
            </Button>
          </div>
        ) : null}

        {catalog.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t.skillsEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {catalog.map((skill) => {
              const checked = selectedSkillIds.has(skill.id);
              return (
                <li key={skill.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => toggleSkill(skill.id, v === true)}
                    disabled={!canEdit}
                    id={`employee-skill-${skill.id}`}
                  />
                  <Label htmlFor={`employee-skill-${skill.id}`} className="font-normal">
                    {skill.name}
                  </Label>
                </li>
              );
            })}
          </ul>
        )}

        {canEdit ? (
          <div>
            <Button type="button" onClick={() => void saveSelected()} disabled={busy}>
              {t.skillsSave}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
