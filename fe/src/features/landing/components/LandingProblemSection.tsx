import { FileWarning, Goal, ListChecks, SearchCheck } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

const problems = [
  {
    title: 'CV CNTT quá chung chung',
    copy: 'Một hồ sơ ghi “Software Developer” có thể chưa thể hiện rõ thế mạnh Backend, Frontend, Mobile, Data hay DevOps.',
    icon: FileWarning,
  },
  {
    title: 'Chọn sai vị trí hoặc mức kinh nghiệm',
    copy: 'Bạn có thể có đúng kỹ năng nhưng vẫn ứng tuyển vào công việc đòi hỏi nhiều hoặc ít kinh nghiệm hơn thực tế.',
    icon: Goal,
  },
  {
    title: 'Kỹ năng chỉ được liệt kê',
    copy: 'Ghi tên framework và công nghệ là chưa đủ nếu phần dự án chưa cho thấy bạn đã dùng chúng để làm gì.',
    icon: SearchCheck,
  },
  {
    title: 'Danh sách việc làm nhiều nhiễu',
    copy: 'Cùng một công việc nhưng mỗi trang tuyển dụng đặt một tên khác nhau, khiến bạn khó biết đâu là vị trí phù hợp.',
    icon: ListChecks,
  },
]


export const LandingProblemSection = () => {
  return (
    <section id="product" className="relative z-10 rounded-3xl bg-card p-4 sm:rounded-4xl sm:p-6">
        <div className="flex flex-col gap-5 lg:col-span-3">
          <h2 className="text-center text-2xl font-bold sm:text-3xl md:text-4xl">
            Vì sao CV CNTT vẫn khó tìm đúng việc?
          </h2>

          <div className="grid gap-6 md:grid-cols-4">
            {problems.map((problem) => (
              <div
                key={problem.title}
                className={cn(
                  'flex min-h-44 flex-col justify-between rounded-3xl bg-muted/70 p-5',
                )}
              >
                <div className="flex flex-col gap-7">
                  <problem.icon className="size-5 text-primary" />
                  <h3 className="text-lg font-semibold leading-tight">
                    {problem.title}
                  </h3>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {problem.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
    </section>
  )
}
