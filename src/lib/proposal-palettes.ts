export const proposalPalettes = [
  { value: "graphite", label: "Графит" },
  { value: "steel", label: "Сталь" },
  { value: "copper", label: "Медь" },
  { value: "olive", label: "Олива" },
  { value: "mist", label: "Светло" },
  { value: "white", label: "Белый" },
] as const;

export type ProposalPalette = (typeof proposalPalettes)[number]["value"];

export function isProposalPalette(value: unknown): value is ProposalPalette {
  return proposalPalettes.some((palette) => palette.value === value);
}

export function getProposalPalette(value: unknown): ProposalPalette {
  return isProposalPalette(value) ? value : "graphite";
}