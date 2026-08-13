# Reflection

## Workflows, agents, or hybrid?

I used a hybrid approach. Structured extraction for job postings and my resume is a workflow because the steps and expected output are known in advance, and every result is validated with Zod. Market statistics such as skill frequencies, salary ranges, and experience distributions are calculated deterministically in TypeScript rather than by the LLM. I chose this approach because these numbers should be reproducible and should not depend on LLM-generated calculations.

Company research, gap analysis, legitimacy checking, and application advice are more agentic. The model can decide what information it needs to search for and which tools to call. I also added a hard step limit of 5–6 steps to prevent unnecessary loops and control API costs.

## Prompt engineering for extraction consistency

One of my first tests showed that the model sometimes put experience or education requirements into requiredSkills. For example, “5+ years of experience” could incorrectly appear as a skill.

I improved this by adding explicit negative instructions telling the model not to include experience or education in the skills field. I added this instruction both to the system prompt and the Zod field descriptions. I also provided a worked example showing how skills, experience, and education should be separated. After these changes, all 8 real postings classified these fields correctly.

Another issue was that keyResponsibilities was empty for 5 of 8 postings even when responsibilities were clearly listed. Adding a clearer schema description and moving the field earlier in the schema fixed 7 of the 8 cases. The remaining posting genuinely did not contain a clear responsibilities section.

## Legitimacy agent design

The legitimacy agent uses two main tools: web search through Tavily and my WHOIS lookup tool. The agent checks signals such as domain registration age, company web presence, careers-page information, contact details, and whether the salary is reasonable compared with my Phase 1 market data.

I prioritized domain registration age because a very new domain claiming to represent an established company is a strong red flag. In testing, the agent correctly classified the real Compass Group Canada posting as GREEN with 95% confidence, while a synthetic scam posting was classified as RED.

There are still limitations. An old domain could be purchased or hijacked by a scammer, and the system does not independently prove that every posting is currently listed on the official careers page. Also, legitimacy and fit scoring are separate, so a fake posting could still receive a high fit score. To reduce this risk, the HTML report always shows the legitimacy assessment first.

**Limitations:** There are still limitations. An old domain could be purchased or hijacked by a scammer, and the system does not independently prove that every posting is currently listed on the official careers page. Also, legitimacy and fit scoring are separate, so a fake posting could still receive a high fit score. To reduce this risk, the HTML report always shows the legitimacy assessment first.

## Models and cost

I used openai/gpt-4o-mini through OpenRouter for the LLM calls in the project. I chose a smaller model because most tasks involve structured extraction, tool use, and evidence-based analysis rather than complex reasoning.

My development and evaluation runs used under approximately 250k tokens in total, keeping the cost well within my available OpenRouter credits. I did not need to switch to a larger model because the main problems I encountered were fixed through prompt, schema, or code improvements rather than using a more expensive model.

## Coding agent process (Phase 3)

I used Claude Code as my coding agent for Phase 3. My initial instructions included the Phase 3 assignment requirements: reuse the Phase 1 extraction and search logic, build a legitimacy agent using WHOIS and web search, calculate an encouraging fit score, generate resume and cover letter suggestions, prepare interview advice, and produce a single-page HTML report with the legitimacy result shown first.

It took 2 main iterations to reach the final working version.

The agent got the overall architecture right in its first working version, including code reuse, the tool loop, WHOIS lookup, schemas, and HTML report structure.

The main issue discovered during testing was a pdf-parse problem where parsing the same PDF twice in one process caused a bad XRef entry error. I traced the problem and changed the pipeline so each PDF is parsed once and its text is reused. Testing also exposed a resume PDF exported from Canva without a usable text layer, which required using a properly exported resume file.

Overall, the coding agent was very useful for building the first working version quickly, but actual end-to-end testing was necessary to find issues that were not obvious from reading the generated code.

## Other AI tools

Claude Code was the main AI development tool I used for this assignment. One useful example was its suggestion to run a synthetic smoke test before processing the real postings. This helped catch the requiredSkills classification problem before it affected all 8 extractions.

One generated implementation that required correction was the original salary aggregation. It mixed hourly and yearly salary values when calculating market statistics, which produced misleading results. I caught this by manually comparing the generated market report with the original salary data and then corrected the aggregation logic.

This experience showed me that AI coding tools can speed up development significantly, but their output still needs to be tested and verified rather than accepted automatically.
