const TARGETS = {
  webLanding: {
    pathSuffix: "/apps/web/app/page.tsx",
    requiredImportSpecs: [
      { source: "@/content/ui-text", names: ["getUiText"] },
      { source: "@/lib/i18n/server-locale", names: ["getServerLocale"] },
    ],
    forbiddenImportSources: ["@repo/turborepo-starter"],
    forbiddenStrings: [
      "Monorepo with Turborepo",
      "turborepo.dev?utm_source=create-turbo",
      "Hello from @repo/ui",
    ],
    forbidVariableNames: [
      "deployHrefWeb",
      "deployHrefDocs",
      "docsHref",
      "templatesHref",
      "turborepoSiteHref",
      "title",
      "description",
      "alertMessage",
    ],
  },
  docsPage: {
    pathSuffix: "/apps/docs/app/page.tsx",
    requiredImportSpecs: [
      { source: "@web/content/ui-text", names: ["getUiText"] },
      { source: "@web/content/faqs", names: ["getFaqs"] },
    ],
    forbiddenImportSources: ["@repo/turborepo-starter"],
    forbidVariableNames: [
      "deployHrefWeb",
      "deployHrefDocs",
      "docsHref",
      "templatesHref",
      "turborepoSiteHref",
      "title",
      "description",
      "alertMessage",
    ],
  },
};

function normalizeFilename(filename) {
  return String(filename).replaceAll("\\", "/");
}

function getTargetByFilename(filename) {
  const normalized = normalizeFilename(filename);
  for (const [name, target] of Object.entries(TARGETS)) {
    if (normalized.endsWith(target.pathSuffix)) {
      return { name, config: target };
    }
  }
  return null;
}

function readImportName(specifier) {
  if (specifier.type !== "ImportSpecifier") return null;
  if (!specifier.imported || specifier.imported.type !== "Identifier") return null;
  return specifier.imported.name;
}

export const designGuardrailsPlugin = {
  rules: {
    "starter-content-contract": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Enforce architecture contracts for web/docs entry pages and prevent starter-template regressions.",
        },
        schema: [],
      },
      create(context) {
        const target = getTargetByFilename(context.filename ?? context.getFilename());
        if (!target) {
          return {};
        }

        const targetName = target.name;
        const targetConfig = target.config;
        const forbiddenImportSources = targetConfig.forbiddenImportSources ?? [];
        const forbiddenStrings = targetConfig.forbiddenStrings ?? [];
        const forbidVariableNames = targetConfig.forbidVariableNames ?? [];
        const requiredImportSpecs = targetConfig.requiredImportSpecs ?? [];
        const requiredStrings = targetConfig.requiredStrings ?? [];

        /** @type {Map<string, Set<string>>} */
        const importedNamesBySource = new Map();
        const forbiddenImportNodes = [];
        const literalValues = new Set();
        let programNode = null;

        return {
          Program(node) {
            programNode = node;
          },
          ImportDeclaration(node) {
            const source = node.source?.value;
            if (typeof source !== "string") return;

            if (forbiddenImportSources.includes(source)) {
              forbiddenImportNodes.push(node);
            }

            const importedNames =
              importedNamesBySource.get(source) ?? new Set();
            for (const specifier of node.specifiers) {
              const importName = readImportName(specifier);
              if (importName) {
                importedNames.add(importName);
              }
            }
            importedNamesBySource.set(source, importedNames);
          },
          VariableDeclarator(node) {
            if (
              node.id?.type === "Identifier" &&
              forbidVariableNames.includes(node.id.name)
            ) {
              context.report({
                node,
                message: `Lokale Variable '${node.id.name}' ist in ${targetName} nicht erlaubt (Template-Regression verhindern).`,
              });
            }
          },
          Literal(node) {
            if (typeof node.value === "string") {
              literalValues.add(node.value);
              if (forbiddenStrings.includes(node.value)) {
                context.report({
                  node,
                  message:
                    "Verbotener Starter-Template-String gefunden. Bitte aktuellen Produkt-Content verwenden.",
                });
              }
            }
          },
          "Program:exit"() {
            if (!programNode) return;

            for (const node of forbiddenImportNodes) {
              context.report({
                node,
                message: `Import von verbotener Quelle '${node.source.value}' in ${targetName}.`,
              });
            }

            for (const requiredImport of requiredImportSpecs) {
              const importedNames =
                importedNamesBySource.get(requiredImport.source) ?? new Set();

              if (importedNames.size === 0) {
                context.report({
                  node: programNode,
                  message: `Fehlender Pflicht-Import aus '${requiredImport.source}' in ${targetName}.`,
                });
                continue;
              }

              for (const requiredName of requiredImport.names) {
                if (!importedNames.has(requiredName)) {
                  context.report({
                    node: programNode,
                    message: `Fehlender Importname '${requiredName}' aus '${requiredImport.source}' in ${targetName}.`,
                  });
                }
              }
            }

            for (const requiredString of requiredStrings) {
              if (!literalValues.has(requiredString)) {
                context.report({
                  node: programNode,
                  message: `Pflicht-String '${requiredString}' fehlt in ${targetName}.`,
                });
              }
            }
          },
        };
      },
    },
  },
};
