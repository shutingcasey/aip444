import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const text = `Remote Data Entry & Customer Support Specialist

Vertex Global Career Solutions

Location: Fully Remote (Work From Home, Anywhere)
Salary: $220,000 USD per year
Posted: Today

About Us
Vertex Global Career Solutions is a fast-growing international company offering remote opportunities to
talented individuals worldwide. We work across many industries to support our clients' needs.

Job Description
We are looking for motivated individuals to join our remote team. No prior experience necessary! Duties
as assigned. This is a great opportunity to start earning immediately from the comfort of your home.

Responsibilities
- Perform data entry and administrative tasks as assigned
- Respond to customer inquiries via email and chat
- Other duties as assigned by management

Requirements
- Access to a computer and internet connection
- Willingness to learn
- No experience necessary, all backgrounds welcome

How to Apply
To be considered for this position, please email your full name, date of birth, Social Insurance Number
(SIN), and a copy of a government-issued photo ID to hr.recruitment2026@gmail.com. A refundable
$199 equipment and training deposit is required to ship your starter kit and will be reimbursed in your
first paycheck. Please send e-transfer to the same email address to begin onboarding immediately.

We look forward to welcoming you to the Vertex Global Career Solutions family!`;

const outPath = path.join(process.cwd(), "eval", "fixtures", "scam-posting.pdf");
const doc = new PDFDocument({ margin: 50 });
doc.pipe(fs.createWriteStream(outPath));
doc.fontSize(11).text(text, { lineGap: 4 });
doc.end();

console.log(`Wrote ${outPath}`);
