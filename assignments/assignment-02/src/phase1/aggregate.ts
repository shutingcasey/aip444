import type { JobPostingRecord } from "../schemas/job.js";
import type { MarketAnalysis } from "../schemas/marketAnalysis.js";

function countFrequencies(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const key = raw.trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function topSkills(allSkillLists: string[][], total: number, limit = 15) {
  const flat = allSkillLists.flat();
  const counts = countFrequencies(flat);

  const displayNames = new Map<string, string>();
  for (const list of allSkillLists) {
    for (const skill of list) {
      const key = skill.trim().toLowerCase();
      if (!displayNames.has(key)) displayNames.set(key, skill.trim());
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({
      skill: displayNames.get(key) ?? key,
      count,
      percentage: Math.round((count / total) * 100),
    }));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2 : (sorted[mid] as number);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export function computeMarketStats(
  records: JobPostingRecord[]
): Omit<MarketAnalysis, "commonResponsibilityThemes" | "trends" | "industryAndCultureExpectations"> {
  const total = records.length;

  const minYears = records.map((r) => r.experience.minYears).filter((v): v is number => v !== null);
  const maxYears = records.map((r) => r.experience.maxYears).filter((v): v is number => v !== null);

  const seniorityDistribution: Record<string, number> = {};
  for (const r of records) {
    const level = r.experience.seniorityLevel ?? "not listed";
    seniorityDistribution[level] = (seniorityDistribution[level] ?? 0) + 1;
  }

  const educationDistribution: Record<string, number> = {};
  let postingsRequiringDegree = 0;
  for (const r of records) {
    const key = r.educationRequirements ?? "not listed";
    educationDistribution[key] = (educationDistribution[key] ?? 0) + 1;
    if (r.educationRequirements && /degree|bachelor|master|bs\b|ba\b|msc|bsc/i.test(r.educationRequirements)) {
      postingsRequiringDegree += 1;
    }
  }

  const HOURS_PER_YEAR = 2080;
  const annualize = (value: number, period: string): number => {
    if (period === "hourly") return value * HOURS_PER_YEAR;
    if (period === "monthly") return value * 12;
    return value;
  };

  const salaries = records.filter((r) => r.salary.listed);
  const hadNonYearly = salaries.some((r) => r.salary.period === "hourly" || r.salary.period === "monthly");
  const mins = salaries
    .map((r) => (r.salary.min !== null ? annualize(r.salary.min, r.salary.period) : null))
    .filter((v): v is number => v !== null);
  const maxs = salaries
    .map((r) => (r.salary.max !== null ? annualize(r.salary.max, r.salary.period) : null))
    .filter((v): v is number => v !== null);
  const allSalaryPoints = [...mins, ...maxs];
  const currency = salaries.find((r) => r.salary.currency)?.salary.currency ?? null;
  const normalizationNote = hadNonYearly
    ? `Some postings listed hourly/monthly pay; those were annualized (hourly x ${HOURS_PER_YEAR} hrs/year, monthly x 12) so all figures below are comparable yearly amounts.`
    : null;

  const remoteDistribution: Record<string, number> = {};
  for (const r of records) {
    remoteDistribution[r.remoteStatus] = (remoteDistribution[r.remoteStatus] ?? 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    postingsAnalyzed: total,
    sourceSlugs: records.map((r) => r.slug),
    topRequiredSkills: topSkills(
      records.map((r) => r.requiredSkills),
      total
    ),
    topPreferredSkills: topSkills(
      records.map((r) => r.preferredSkills),
      total
    ),
    experience: {
      averageMinYears: average(minYears),
      averageMaxYears: average(maxYears),
      seniorityDistribution,
    },
    educationRequirements: {
      postingsRequiringDegree,
      distribution: educationDistribution,
    },
    salary: {
      postingsWithSalary: salaries.length,
      min: allSalaryPoints.length ? Math.min(...allSalaryPoints) : null,
      max: allSalaryPoints.length ? Math.max(...allSalaryPoints) : null,
      median: median(allSalaryPoints),
      currency,
      normalizationNote,
    },
    remoteDistribution,
  };
}
