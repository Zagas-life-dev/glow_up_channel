import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-up-sm bg-up-fill", className)}
      {...props}
    />
  )
}

export { Skeleton }
