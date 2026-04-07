"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { employeeAttachmentsListResponseSchema } from "@repo/api-contracts";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";

import { getEmployeesCopy } from "@/content/employees-module";
import type { Locale } from "@/lib/i18n/locale";
import { parseResponseJson } from "@/lib/parse-response-json";
import { toast } from "sonner";

type AttachmentRow = {
  id: string;
  filename: string;
  kind: "document" | "certificate" | "other";
  byteSize: number;
  createdAt: string;
};

function formatBytes(bytes: number, locale: Locale): string {
  const numberFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  if (bytes < 1024) return `${numberFormatter.format(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${numberFormatter.format(kb)} KB`;
  return `${numberFormatter.format(kb / 1024)} MB`;
}

export function EmployeesFilesCard({
  employeeId,
  locale,
  canEdit,
}: {
  employeeId: string;
  locale: Locale;
  canEdit: boolean;
}) {
  const [profileVersion, setProfileVersion] = useState(0);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [attachmentKind, setAttachmentKind] = useState<"document" | "certificate" | "other">(
    "document",
  );
  const [busy, setBusy] = useState(false);
  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const t = useMemo(() => getEmployeesCopy(locale), [locale]);

  const profileImageUrl = useMemo(
    () =>
      `/api/web/employees/${encodeURIComponent(employeeId)}/profile-image?v=${profileVersion}`,
    [employeeId, profileVersion],
  );

  const loadAttachments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/web/employees/${encodeURIComponent(employeeId)}/attachments`,
        { credentials: "include" },
      );
      const text = await res.text();
      const json = parseResponseJson(text);
      const parsed = employeeAttachmentsListResponseSchema.safeParse(json);
      if (!res.ok || !parsed.success) return;
      setAttachments(
        parsed.data.attachments.map((a) => ({
          id: a.id,
          filename: a.filename,
          kind: a.kind,
          byteSize: a.byteSize,
          createdAt: a.createdAt,
        })),
      );
    } catch {
      // silent
    }
  }, [employeeId]);

  useEffect(() => {
    void loadAttachments();
  }, [loadAttachments]);

  async function uploadProfileImage(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/web/employees/${encodeURIComponent(employeeId)}/profile-image`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      );
      if (!res.ok) {
        toast.error(t.filesUploadError);
        return;
      }
      setProfileVersion((v) => v + 1);
    } catch {
      toast.error(t.filesUploadError);
    } finally {
      setBusy(false);
      if (profileInputRef.current) profileInputRef.current.value = "";
    }
  }

  async function deleteProfileImage() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/web/employees/${encodeURIComponent(employeeId)}/profile-image`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) {
        toast.error(t.filesDeleteError);
        return;
      }
      setProfileVersion((v) => v + 1);
    } catch {
      toast.error(t.filesDeleteError);
    } finally {
      setBusy(false);
    }
  }

  async function uploadAttachment(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("kind", attachmentKind);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/web/employees/${encodeURIComponent(employeeId)}/attachments`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      );
      if (!res.ok) {
        toast.error(t.filesUploadError);
        return;
      }
      await loadAttachments();
    } catch {
      toast.error(t.filesUploadError);
    } finally {
      setBusy(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  }

  async function deleteAttachment(attachmentId: string) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/web/employees/${encodeURIComponent(employeeId)}/attachments/${encodeURIComponent(attachmentId)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) {
        toast.error(t.filesDeleteError);
        return;
      }
      await loadAttachments();
    } catch {
      toast.error(t.filesDeleteError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-border/80 bg-muted/15 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">{t.filesCardTitle}</CardTitle>
        <CardDescription className="text-xs">{t.filesCardDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Image
            src={profileImageUrl}
            alt={t.profileImageAlt}
            width={80}
            height={80}
            unoptimized
            className="h-20 w-20 rounded-md border bg-muted object-cover"
          />
          {canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              <Label
                htmlFor={`employee-profile-upload-${employeeId}`}
                className="sr-only"
              >
                {t.filesProfileUploadAria}
              </Label>
              <Input
                ref={profileInputRef}
                id={`employee-profile-upload-${employeeId}`}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="w-full"
                onChange={(ev) => {
                  const file = ev.currentTarget.files?.[0];
                  if (file) void uploadProfileImage(file);
                }}
                disabled={busy}
              />
              <Button type="button" variant="ghost" onClick={() => void deleteProfileImage()} disabled={busy}>
                {t.filesProfileDelete}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">{t.filesAttachmentsTitle}</h3>
          {canEdit ? (
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr] sm:items-end">
              <div className="grid gap-2">
                <Label htmlFor={`employee-attachment-kind-${employeeId}`}>
                  {t.filesAttachmentKindLabel}
                </Label>
                <Select
                  value={attachmentKind}
                  onValueChange={(v) =>
                    setAttachmentKind(v as "document" | "certificate" | "other")
                  }
                  disabled={busy}
                >
                  <SelectTrigger
                    id={`employee-attachment-kind-${employeeId}`}
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">{t.filesKindDocument}</SelectItem>
                    <SelectItem value="certificate">{t.filesKindCertificate}</SelectItem>
                    <SelectItem value="other">{t.filesKindOther}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`employee-attachment-upload-${employeeId}`}>
                  {t.filesAttachmentUploadAria}
                </Label>
                <Input
                  ref={attachmentInputRef}
                  id={`employee-attachment-upload-${employeeId}`}
                  type="file"
                  className="w-full"
                  onChange={(ev) => {
                    const file = ev.currentTarget.files?.[0];
                    if (file) void uploadAttachment(file);
                  }}
                  disabled={busy}
                />
              </div>
            </div>
          ) : null}

          {attachments.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t.filesEmpty}</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{a.filename}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(a.byteSize, locale)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <Link
                        href={`/api/web/employees/${encodeURIComponent(employeeId)}/attachments/${encodeURIComponent(a.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t.filesDownload}
                      </Link>
                    </Button>
                    {canEdit ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void deleteAttachment(a.id)}
                        disabled={busy}
                      >
                        {t.filesDeleteAttachment}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
