import { Toaster as Sonner } from "sonner"
import type { ComponentProps } from "react"

type ToasterProps = ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success:
            "group-[.toaster]:!border-primary group-[.toaster]:!bg-primary group-[.toaster]:!text-primary-foreground [&_[data-description]]:!text-primary-foreground/90",
          error:
            "group-[.toaster]:!border-destructive group-[.toaster]:!bg-destructive group-[.toaster]:!text-destructive-foreground [&_[data-description]]:!text-destructive-foreground/90",
          warning:
            "group-[.toaster]:!border-amber-300 group-[.toaster]:!bg-amber-200 group-[.toaster]:!text-amber-950 dark:group-[.toaster]:!border-amber-500/50 dark:group-[.toaster]:!bg-amber-400/25 dark:group-[.toaster]:!text-amber-50 [&_[data-description]]:!text-amber-900/80 dark:[&_[data-description]]:!text-amber-50/80",
          info:
            "group-[.toaster]:!border-sky-300 group-[.toaster]:!bg-sky-200 group-[.toaster]:!text-sky-950 dark:group-[.toaster]:!border-sky-500/50 dark:group-[.toaster]:!bg-sky-400/25 dark:group-[.toaster]:!text-sky-50 [&_[data-description]]:!text-sky-900/80 dark:[&_[data-description]]:!text-sky-50/80",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
