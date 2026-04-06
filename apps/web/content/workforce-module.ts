import type { TradeFeatureItem } from "@/content/trades";
import type { Locale } from "@/lib/i18n/locale";

/** Icons aus `TradeFeatureIcon` / `iconMap`. */
export type WorkforceNavIconName = "UsersRound" | "CalendarRange" | "Clock";

export type WorkforceNavItem = {
  href: string;
  label: string;
  tooltip: string;
  icon: WorkforceNavIconName;
};

export type WorkforceSidebarCopy = {
  groupLabel: string;
  items: WorkforceNavItem[];
};

export type WorkforcePageKind = "employees" | "scheduling" | "workTime";

type HeaderPair = { title: string; subtitle: string };

type WorkforceMessages = {
  sidebar: WorkforceSidebarCopy;
  headers: Record<WorkforcePageKind, HeaderPair>;
  schedulingFeature: TradeFeatureItem;
};

const de: WorkforceMessages = {
  sidebar: {
    groupLabel: "Team & Planung",
    items: [
      {
        href: "/web/employees",
        label: "Mitarbeiterverwaltung",
        tooltip: "Mitarbeiterverwaltung",
        icon: "UsersRound",
      },
      {
        href: "/web/scheduling",
        label: "Terminplanung",
        tooltip: "Terminplanung",
        icon: "CalendarRange",
      },
      {
        href: "/web/work-time",
        label: "Zeiterfassung",
        tooltip: "Zeiterfassung",
        icon: "Clock",
      },
    ],
  },
  headers: {
    employees: {
      title: "Mitarbeiterverwaltung",
      subtitle:
        "Stammdaten, Qualifikationen und Verfuegbarkeit — Grundlage fuer die Terminplanung.",
    },
    scheduling: {
      title: "Terminplanung",
      subtitle:
        "Einsaetze, Kundenbesuche und Teamkapazitaeten in einer Plantafel buchen.",
    },
    workTime: {
      title: "Zeiterfassung",
      subtitle:
        "Ist-Stunden je Mitarbeitendem erfassen — mit optionalem Projektbezug.",
    },
  },
  schedulingFeature: {
    label: "Terminplanung",
    description:
      "Einsaetze, Kundenbesuche und Teamkapazitaeten in einer Plantafel buchen.",
    icon: "CalendarRange",
  },
};

const en: WorkforceMessages = {
  sidebar: {
    groupLabel: "Team & planning",
    items: [
      {
        href: "/web/employees",
        label: "Employee management",
        tooltip: "Employee management",
        icon: "UsersRound",
      },
      {
        href: "/web/scheduling",
        label: "Scheduling",
        tooltip: "Scheduling",
        icon: "CalendarRange",
      },
      {
        href: "/web/work-time",
        label: "Time tracking",
        tooltip: "Time tracking",
        icon: "Clock",
      },
    ],
  },
  headers: {
    employees: {
      title: "Employee management",
      subtitle:
        "Master data, qualifications, and availability — the basis for scheduling.",
    },
    scheduling: {
      title: "Scheduling",
      subtitle:
        "Book field jobs, customer visits, and team capacity on one planning board.",
    },
    workTime: {
      title: "Time tracking",
      subtitle:
        "Log actual hours per employee — optionally linked to a project.",
    },
  },
  schedulingFeature: {
    label: "Scheduling",
    description:
      "Book field jobs, customer visits, and team capacity on one planning board.",
    icon: "CalendarRange",
  },
};

function copy(locale: Locale): WorkforceMessages {
  return locale === "en" ? en : de;
}

export function getWorkforceSidebarCopy(locale: Locale): WorkforceSidebarCopy {
  return copy(locale).sidebar;
}

export function getWorkforceHeaderMeta(
  pathname: string,
  locale: Locale,
): HeaderPair | null {
  const c = copy(locale);
  const p =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  if (p === "/web/employees" || p === "/web/employees/list") {
    return c.headers.employees;
  }
  if (p.startsWith("/web/employees/") && p !== "/web/employees/list") {
    return c.headers.employees;
  }
  if (p === "/web/scheduling") {
    return c.headers.scheduling;
  }
  if (p === "/web/work-time") {
    return c.headers.workTime;
  }
  return null;
}

export function getSchedulingFeatureForPage(locale: Locale): TradeFeatureItem {
  return copy(locale).schedulingFeature;
}
