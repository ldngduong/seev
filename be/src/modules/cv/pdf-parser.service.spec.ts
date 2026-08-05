import { PdfParserService } from './pdf-parser.service';

describe('PdfParserService', () => {
  let service: PdfParserService;

  beforeEach(() => {
    service = new PdfParserService();
  });

  it('keeps letter-spaced blocks separate while merging real wrapped sentences', () => {
    const highlights = service.buildCandidateHighlights([
      {
        pageNumber: 1,
        text: 'I N T E R N F R O N T E N D D E V E L O P E R',
      },
      { pageNumber: 1, text: '+84865641682 | email@example.com' },
      { pageNumber: 1, text: 'P R O F I L E S U M M A R Y' },
      {
        pageNumber: 1,
        text: 'Aspiring Frontend Intern with strong foundation in ReactJS.',
      },
      { pageNumber: 1, text: 'P R O J E C T S' },
      { pageNumber: 1, text: 'Technologies: Next.js, NestJS, Prisma' },
      { pageNumber: 1, text: 'Key responsibilities:' },
      {
        pageNumber: 1,
        text: 'Handled file uploads/management via Cloudinary API and integrated Resend for email',
      },
      { pageNumber: 1, text: 'functionality.' },
    ]);

    expect(highlights.map((highlight) => highlight.text)).toEqual([
      'I N T E R N F R O N T E N D D E V E L O P E R',
      '+84865641682 | email@example.com',
      'P R O F I L E S U M M A R Y',
      'Aspiring Frontend Intern with strong foundation in ReactJS.',
      'P R O J E C T S',
      'Technologies: Next.js, NestJS, Prisma',
      'Key responsibilities:',
      'Handled file uploads/management via Cloudinary API and integrated Resend for email functionality.',
    ]);
  });
});
