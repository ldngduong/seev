export const JOB_SOURCES = [
  'topcv',
  'vietnamworks',
  'indeed',
  'topdev',
  'itviec',
  'jobsgo',
  'viecoi',
] as const;

export type JobSource = (typeof JOB_SOURCES)[number];

export const JOB_RESEARCH_QUEUE = 'job-research';
export const JOB_RESEARCH_JOB = 'run-job-research';
