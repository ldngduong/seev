import { FileWarning, Goal, ListChecks, SearchCheck } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

const problems = [
  {
    title: 'Nhận xét thiếu minh chứng',
    copy: 'Phần lớn các công cụ review chỉ bảo bạn nên sửa gì, chứ không chỉ rõ chính xác câu văn nào đang gặp vấn đề.',
    icon: FileWarning,
  },
  {
    title: 'Định hướng vị trí chưa rõ ràng',
    copy: 'Một CV trông có vẻ chỉn chu nhưng vẫn có thể bị lệch nhóm ngành, sai cấp bậc hoặc chưa đúng bộ kỹ năng yêu cầu.',
    icon: Goal,
  },
  {
    title: 'Thiếu hụt từ khóa quan trọng',
    copy: 'Việc bỏ sót các thuật ngữ khiến CV dễ bị bộ lọc ATS và nhà tuyển dụng bỏ qua, dù bạn có kinh nghiệm phù hợp.',
    icon: SearchCheck,
  },
  {
    title: 'Lời khuyên chung chung',
    copy: 'Ứng viên cần hướng dẫn cụ thể và ưu tiên theo đúng vị trí đã chọn, thay vì một danh sách kiểm tra lý thuyết.',
    icon: ListChecks,
  },
]


export const LandingProblemSection = () => {
  return (
    <section id="product" className="relative z-10 rounded-4xl bg-card p-6">
        <div className="flex flex-col gap-5 lg:col-span-3">
          <h2 className="text-3xl md:text-4xl font-bold text-center">
            Vì sao một CV tốt vẫn có thể chưa tìm được việc?           
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
