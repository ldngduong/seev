import { BadgeCheck, BriefcaseBusiness, ScanText } from 'lucide-react'

const solutions = [
  {
    title: 'Evidence-first scoring',
    copy: 'Seev ties every detailed remark to the text it reviewed, so users can understand why the score changed.',
    icon: ScanText,
  },
  {
    title: 'Role and seniority fit',
    copy: 'The review compares the CV with the selected job category and level before suggesting a direction.',
    icon: BadgeCheck,
  },
  {
    title: 'Career suggestions',
    copy: 'The platform turns the audit into relevant keyword, role, and job title ideas for the next application.',
    icon: BriefcaseBusiness,
  },
]

export const LandingSolutionSection = () => {
  return (
    <section
      id="scoring"
      className="rounded-4xl bg-primary p-6 text-primary-foreground"
    >
      <div className="grid gap-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-end">
          <div className="flex flex-col gap-4">
            <div className="w-fit rounded-4xl border border-primary-foreground/25 px-3 py-1 text-xs font-medium">
              Seev workflow
            </div>
            <h2 className="text-3xl font-semibold leading-tight tracking-normal md:text-5xl">
              AI review that connects scoring with career direction
            </h2>
          </div>
          <p className="text-sm leading-6 text-primary-foreground/70">
            Seev reviews the document as evidence, compares it with the target,
            and keeps the next action tied to the selected role instead of
            generic resume advice.
          </p>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          {solutions.map((solution, index) => (
            <div
              key={solution.title}
              className="flex min-h-64 flex-col justify-between rounded-3xl bg-primary-foreground/10 p-5 text-primary-foreground"
            >
              <div className="flex flex-col gap-8">
                <div className="flex items-start justify-between">
                  <solution.icon className="size-5" />
                  <span className="text-sm font-semibold">{index + 1}.</span>
                </div>
                <h3 className="text-xl font-semibold leading-tight">
                  {solution.title}
                </h3>
              </div>
              <div className="text-sm leading-6 text-primary-foreground/75">
                {solution.copy}
                <div className="mt-6 rounded-2xl bg-primary-foreground/18 p-3">
                  <div className="grid gap-2">
                    <div className="h-2 w-10/12 rounded-full bg-primary-foreground/45" />
                    <div className="h-2 w-7/12 rounded-full bg-primary-foreground/30" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
