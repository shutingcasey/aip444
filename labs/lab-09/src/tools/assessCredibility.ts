import { tool } from '@openai/agents';
import { z } from 'zod';

const authorSchema = z.object({
  name: z
    .string()
    .describe(
      'The author\'s full name as credited on the source. If no author can ' +
        'be identified after checking the byline, "About"/"Team" pages, and ' +
        'a web search for the article title, write exactly "Unknown" and ' +
        'explain what you checked in credibility_assessment.',
    ),
  credentials: z
    .string()
    .describe(
      'The author\'s relevant qualifications, affiliations, and other ' +
        'published work, based on what you actually found via web_search or ' +
        'an author bio page. If you could not find credentials, describe ' +
        'specifically what you searched for and why it came up empty — do ' +
        'not invent a background for them.',
    ),
  credibility_assessment: z
    .string()
    .describe(
      'Your judgment of the author\'s credibility on this specific topic ' +
        '(e.g., a domain expert writing in their field vs. a generalist ' +
        'writing outside it vs. no identifiable author at all). If the ' +
        'author is unknown, explicitly state that this is a credibility ' +
        'concern and explain how it affects your overall rating.',
    ),
});

const publicationSchema = z.object({
  name: z
    .string()
    .describe(
      'The publication, outlet, or website name. If it is not a ' +
        'recognized outlet, use the bare domain name (e.g. "example.com").',
    ),
  reputation: z
    .string()
    .describe(
      'What your web_search research revealed about this publication\'s ' +
        'reputation, history, and track record (e.g. known fact-checking ' +
        'incidents, awards, retractions, or being a known low-quality/' +
        'predatory outlet). If you found nothing, describe what you ' +
        'searched for and state plainly that the outlet is unestablished ' +
        'or unverifiable rather than assuming it is fine.',
    ),
  editorial_process: z
    .enum(['peer_reviewed', 'editor_reviewed', 'self_published', 'unknown'])
    .describe(
      'The editorial process this piece went through, based on evidence ' +
        '(an "About"/masthead/editorial-policy page, or knowledge of the ' +
        'outlet). Use "unknown" if you could not determine this rather ' +
        'than guessing.',
    ),
});

const contentAnalysisSchema = z.object({
  claims_supported_by_evidence: z
    .boolean()
    .describe(
      'True only if the article\'s main claims are backed by data, ' +
        'citations, or primary sources you were able to identify in the ' +
        'text.',
    ),
  sources_cited: z
    .boolean()
    .describe('True if the article cites its own sources at all (links, footnotes, named studies, or named sources) — independent of whether you verified those sources.'),
  corroborated_by_other_sources: z
    .boolean()
    .describe(
      'True only if your own web_search turned up other credible, ' +
        'independent sources reporting the same core claims.',
    ),
  contradicted_by_other_sources: z
    .boolean()
    .describe(
      'True only if your own web_search turned up credible sources or ' +
        'fact-checks that dispute or contradict the article\'s claims. ' +
        'This is independent from corroborated_by_other_sources — both can ' +
        'be false if you simply found no other coverage either way.',
    ),
  primary_vs_secondary: z
    .enum(['primary_source', 'secondary_source', 'tertiary_source'])
    .describe(
      'Whether this is a primary source (original research, first-hand ' +
        'account, official data release), a secondary source (reporting ' +
        'on/analyzing primary sources), or a tertiary source (a summary of ' +
        'secondary sources, e.g. an encyclopedia or aggregator).',
    ),
  funding_or_sponsorship: z
    .string()
    .describe(
      'Any evidence you found of who funds the publication, the specific ' +
        'research, or the author (grants, sponsorships, corporate ' +
        'ownership, advocacy affiliations). If you found no such ' +
        'information, say so explicitly rather than assuming it is ' +
        'independent/unbiased.',
    ),
  date_published: z
    .string()
    .describe(
      'The publication date as stated on the page (or "Unknown" if not ' +
        'found), plus a brief note on whether the information is still ' +
        'current or has likely been superseded by newer research/events.',
    ),
});

const evaluationSchema = z.object({
  source_url: z.string().describe('The exact URL being evaluated.'),
  source_type: z
    .enum([
      'peer_reviewed_journal',
      'news_organization',
      'government_agency',
      'nonprofit_organization',
      'corporate_blog',
      'personal_blog',
      'social_media',
      'wiki',
      'unknown',
    ])
    .describe('The single category that best describes this source.'),
  author: authorSchema,
  publication: publicationSchema,
  content_analysis: contentAnalysisSchema,
  transparency_score: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe(
      'A 1-5 rating of how transparent the source is about who wrote it, ' +
        'what methods/evidence back it, and who funds it. 1 = no ' +
        'attribution or disclosure at all; 5 = fully transparent on all ' +
        'three dimensions.',
    ),
  overall_credibility: z
    .enum(['high', 'medium', 'low', 'very_low'])
    .describe(
      'Your final verdict, weighing authorship, publication reputation, ' +
        'evidence quality, corroboration, and transparency together.',
    ),
  reasoning: z
    .string()
    .describe(
      'A thorough explanation of the overall_credibility rating that ' +
        'cites specific evidence you gathered (named search results, ' +
        'quotes, dates, etc.) rather than vague impressions. Explicitly ' +
        'call out anything you could not verify and how that uncertainty ' +
        'factored into the rating.',
    ),
});

export const assessCredibilityTool = tool({
  name: 'assess_credibility',
  description:
    'Records your structured credibility evaluation of the source. This tool has no side effects — it does not save or publish anything. Its only purpose is to force you to organize everything you have learned into a complete, evidence-based assessment BEFORE you write the final report. Call this only after you have read the source, investigated the author, investigated the publication, and searched for corroboration/contradiction of its main claims. Every field must reflect evidence you actually gathered with read_url/web_search — never fabricate a value to fill a gap; write "Unknown" and explain instead.',
  parameters: evaluationSchema,
  execute: async (evaluation) => {
    console.error(
      `[assess_credibility] Recording evaluation for ${evaluation.source_url} ` +
        `(overall: ${evaluation.overall_credibility})`,
    );

    return {
      status: 'evaluation_recorded',
      evaluation,
    };
  },
});
