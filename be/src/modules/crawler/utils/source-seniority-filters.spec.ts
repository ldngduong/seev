import {
  resolveIndeedSearchParams,
  resolveTopCvPositionFilter,
  resolveVietnamWorksLevelFilter,
} from './source-seniority-filters';

describe('source seniority filters', () => {
  const internIntent = {
    targetRole: 'Intern Frontend Developer',
    seniorityLevelName: 'Intern',
  };

  it('maps internship intent to source-level filters instead of keyword terms', () => {
    expect(resolveTopCvPositionFilter(internIntent)).toBe('50');
    expect(resolveVietnamWorksLevelFilter(internIntent)).toBe('8');
    expect(resolveIndeedSearchParams(internIntent)).toEqual({
      sc: '0kf:jt(internship);',
    });
  });

  it('maps employee-level intent to broad employee filters where the source has no junior/mid/senior split', () => {
    const juniorIntent = {
      targetRole: 'Junior Frontend Developer',
      seniorityLevelName: 'Junior',
    };

    expect(resolveTopCvPositionFilter(juniorIntent)).toBe('1');
    expect(resolveVietnamWorksLevelFilter(juniorIntent)).toBe('5');
    expect(resolveIndeedSearchParams(juniorIntent)).toEqual({});
  });
});
