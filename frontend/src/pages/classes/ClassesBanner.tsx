import { Button } from 'antd'
import { PlusIcon, UsersFilledIcon } from '@/components/ui/icons'
import { CLASS_ASSETS } from '@/pages/classes/classUi'

/** Page title, what the page is for, the school scene and "Tạo lớp học". */
export function ClassesBanner({ onCreate, canCreate }: { onCreate: () => void; canCreate: boolean }) {
  return (
    <section className="@container relative overflow-hidden rounded-[22px] bg-[linear-gradient(100deg,#E7F6EE_0%,#E4F1FD_55%,#DCEBFD_100%)]">
      <div className="flex min-h-[150px] flex-wrap items-center gap-x-6 gap-y-4 px-5 py-5 sm:px-7 @min-[880px]:flex-nowrap @min-[880px]:py-0">
        <div className="flex min-w-[240px] flex-1 items-center gap-4 @min-[880px]:flex-none">
          <span className="flex size-[58px] shrink-0 items-center justify-center rounded-[18px] bg-[#CDEFD9] text-[#1E9E62] shadow-[inset_0_-3px_0_rgba(30,158,98,0.12)]">
            <UsersFilledIcon size={30} />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="m-0 text-[27px] leading-tight font-black tracking-[-0.01em] whitespace-nowrap text-[#1A2440] @min-[700px]:text-[32px]">
              Quản lý lớp học
            </h1>
            <p className="m-0 text-[15px] text-ink-soft @min-[700px]:text-[16px] @min-[880px]:max-w-[330px]">
              Tạo lớp, quản lý học sinh và theo dõi tiến độ học tập dễ dàng.
            </p>
          </div>
        </div>

        <img
          src={`${CLASS_ASSETS}/banner-school.svg`}
          alt=""
          aria-hidden="true"
          className="hidden h-[150px] min-w-0 flex-1 self-end object-contain object-bottom select-none @min-[880px]:block"
        />
        <p className="relative m-0 hidden max-w-[178px] shrink-0 rounded-[18px] bg-white px-4 py-3 text-[14px] leading-snug font-bold text-ink shadow-[0_4px_14px_rgba(53,99,233,0.08)] @min-[1180px]:block">
          {/* The bubble's tail points at the pupils. */}
          <span aria-hidden="true" className="absolute top-1/2 -left-[7px] size-3.5 -translate-y-1/2 rotate-45 bg-white" />
          Mỗi lớp học là một hành trình khám phá đầy niềm vui!
        </p>

        <Button
          type="primary"
          size="large"
          icon={<PlusIcon size={18} />}
          onClick={onCreate}
          disabled={!canCreate}
          className="h-12 shrink-0 rounded-[14px] px-6 font-extrabold shadow-[0_6px_14px_rgba(53,99,233,0.25)]"
        >
          Tạo lớp học
        </Button>
      </div>
    </section>
  )
}
