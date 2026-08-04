import { lineCvAuditResultSchema } from './cv-audit-result.schema';

describe('lineCvAuditResultSchema', () => {
  it('requires an explicit coverage receipt', () => {
    expect(() =>
      lineCvAuditResultSchema.parse({ detailed_feedbacks: [] }),
    ).toThrow();
    expect(() =>
      lineCvAuditResultSchema.parse({
        reviewed_source_line_ids: [],
        detailed_feedbacks: [],
      }),
    ).toThrow();
  });

  it('allows a reviewed line to have no issue', () => {
    expect(
      lineCvAuditResultSchema.parse({
        reviewed_source_line_ids: ['hl_001'],
        detailed_feedbacks: [],
      }),
    ).toEqual({
      reviewed_source_line_ids: ['hl_001'],
      detailed_feedbacks: [],
    });
  });

  it('requires a grounding contract for every feedback item', () => {
    const feedback = {
      source_line_id: 'hl_001',
      section: 'Dynamically inferred section',
      original_text: 'Built a customer-facing dashboard.',
      issue: 'Cau mo ta chua neu ro pham vi cong viec.',
      suggestion: 'Built a customer-facing dashboard.',
    };

    expect(() =>
      lineCvAuditResultSchema.parse({
        reviewed_source_line_ids: ['hl_001'],
        detailed_feedbacks: [feedback],
      }),
    ).toThrow();

    expect(
      lineCvAuditResultSchema.parse({
        reviewed_source_line_ids: ['hl_001'],
        detailed_feedbacks: [
          {
            ...feedback,
            suggestion_mode: 'direct_rewrite',
            evidence_source_line_ids: ['hl_001'],
          },
        ],
      }).detailed_feedbacks[0],
    ).toMatchObject({
      suggestion_mode: 'direct_rewrite',
      evidence_source_line_ids: ['hl_001'],
    });
  });
});
