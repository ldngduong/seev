import { BadgeCheck, BriefcaseBusiness, ScanText } from 'lucide-react'

const solutions = [
  {
    title: 'Hiểu CV của bạn phù hợp với mảng nào',
    copy: 'Seev đọc kinh nghiệm, dự án và kỹ năng để nhận ra bạn phù hợp với Backend, Frontend, Mobile, Data hay các mảng CNTT khác.',
    icon: ScanText,
  },
  {
    title: 'Chỉ rõ điểm tốt và điểm cần sửa',
    copy: 'Mỗi nhận xét đi kèm đúng đoạn nội dung trong CV để bạn biết vấn đề nằm ở đâu và nên sửa phần nào trước.',
    icon: BadgeCheck,
  },
  {
    title: 'Tìm việc phù hợp với hồ sơ',
    copy: 'Lọc việc làm theo mảng, mức kinh nghiệm và địa điểm hoặc chọn một công việc cụ thể để xem CV của bạn phù hợp đến đâu.',
    icon: BriefcaseBusiness,
  },
]

export const LandingSolutionSection = () => {
  return (
    <section
      id="scoring"
      className="rounded-4xl bg-primary p-6 text-primary-foreground m-6 mt-0"
    >
      <div className="grid gap-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-end">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-semibold leading-tight tracking-normal md:text-5xl">
              Hiểu CV trước khi chọn việc để ứng tuyển
            </h2>
          </div>
          <p className="text-sm leading-6 text-primary-foreground/70">
            Seev giúp bạn nhìn rõ thế mạnh trong CV, chọn đúng nhóm công việc và tập trung vào những cơ hội phù hợp hơn.
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
