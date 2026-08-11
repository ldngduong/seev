import { cvTargetInferenceSchema } from './cv-audit-result.schema';

const validInference = {
  target_role: 'Backend Developer',
  target_category_code: 'software.backend',
  target_category_hint: 'Backend Development',
  seniority_code: 'middle',
  seniority_hint: 'Middle',
  confidence: 0.9,
  reasoning: 'Kinh nghiệm backend được thể hiện rõ trong CV.',
  keywords: ['Node.js', 'PostgreSQL', 'REST API'],
  search_queries: ['Backend Developer', 'Backend Engineer'],
};

describe('cvTargetInferenceSchema', () => {
  it('requires a canonical category code', () => {
    const { target_category_code: _removed, ...withoutCategoryCode } =
      validInference;

    expect(() => cvTargetInferenceSchema.parse(withoutCategoryCode)).toThrow();
  });

  it('accepts a canonical category and nullable seniority', () => {
    expect(
      cvTargetInferenceSchema.parse({
        ...validInference,
        seniority_code: null,
        seniority_hint: '',
      }),
    ).toMatchObject({
      target_category_code: 'software.backend',
      seniority_code: null,
    });
  });
});
