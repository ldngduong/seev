import { BadgeCheck, BriefcaseBusiness, ScanText } from 'lucide-react'

const solutions = [
  {
    title: 'Chấm điểm dựa trên minh chứng',
    copy: 'Seev gắn liền mọi nhận xét với từng đoạn văn bản cụ thể trong CV, giúp bạn hiểu rõ nguyên nhân vì sao điểm số thay đổi.',
    icon: ScanText,
  },
  {
    title: 'Đánh giá độ tương thích vị trí và cấp bậc',
    copy: 'Hệ thống đối chiếu CV với nhóm ngành và cấp bậc bạn chọn trước khi đưa ra định hướng điều chỉnh.',
    icon: BadgeCheck,
  },
  {
    title: 'Gợi ý phát triển sự nghiệp',
    copy: 'Nền tảng chuyển đổi kết quả phân tích thành các từ khóa, vị trí và chức danh phù hợp cho đợt ứng tuyển tiếp theo.',
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
              Đánh giá CV bằng AI gắn liền với định hướng nghề nghiệp
            </h2>
          </div>
          <p className="text-sm leading-6 text-primary-foreground/70">
            Seev phân tích CV như một tài liệu dữ liệu, đối chiếu trực tiếp với công việc mục tiêu và đưa ra đề xuất điều chỉnh cụ thể cho từng vị trí.
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
