const TARGETS = {};

function normalizeFilename(filename) {
  return String(filename).replaceAll("\\", "/");
}

function getTarget(filename) {
  const normalized = normalizeFilename(filename);
  for (const [name, target] of Object.entries(TARGETS)) {
    if (normalized.endsWith(target.pathSuffix)) {
      return name;
    }
  }
  return null;
}

export const designGuardrailsPlugin = {
  rules: {
    "starter-content-contract": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Enforce shared starter-content imports and prevent inline drift in starter pages.",
        },
        schema: [],
      },
      create(context) {
        const targetName = getTarget(context.filename ?? context.getFilename());
        if (!targetName) {
          return {};
        }

        const target = TARGETS[targetName];
        const importedNames = new Set();
        let hasStarterImport = false;
        let programNode = null;

        return {
          Program(node) {
            programNode = node;
          },
          ImportDeclaration(node) {
            if (node.source?.value !== "@repo/turborepo-starter") {
              return;
            }
            hasStarterImport = true;
            for (const specifier of node.specifiers) {
              if (specifier.type === "ImportSpecifier") {
                importedNames.add(specifier.imported.name);
              }
            }
          },
          VariableDeclarator(node) {
            if (
              node.id?.type === "Identifier" &&
              target.forbidVariableNames.includes(node.id.name)
            ) {
              context.report({
                node,
                message: `Do not define local '${node.id.name}' in ${targetName} starter page; use @repo/turborepo-starter exports.`,
              });
            }
          },
          Literal(node) {
            if (typeof node.value !== "string") {
              return;
            }
            if (!target.forbiddenStrings.includes(node.value)) {
              return;
            }
            context.report({
              node,
              message:
                "Inline starter copy/link detected. Import shared values from @repo/turborepo-starter.",
            });
          },
          "Program:exit"() {
            if (!programNode) {
              return;
            }

            if (!hasStarterImport) {
              context.report({
                node: programNode,
                message:
                  "Starter page must import shared values from @repo/turborepo-starter.",
              });
              return;
            }

            for (const requiredImport of target.requiredImports) {
              if (!importedNames.has(requiredImport)) {
                context.report({
                  node: programNode,
                  message: `Missing required @repo/turborepo-starter import '${requiredImport}' for ${targetName} starter page.`,
                });
              }
            }
          },
        };
      },
    },
  },
};
