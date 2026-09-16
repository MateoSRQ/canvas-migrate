import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"
import { cn } from "#/lib/utils"

export interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  rangeClassName?: string
  thumbClassName?: string
}

export function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 1,
  rangeClassName,
  thumbClassName,
  ...props
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      step={step}
      className={cn(
        "relative flex w-full touch-none select-none items-center cursor-pointer",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="bg-muted relative h-2 w-full grow overflow-hidden rounded-full border border-border/50"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "bg-purple-600 dark:bg-purple-500 absolute h-full",
            rangeClassName
          )}
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        className={cn(
          "border-2 border-purple-600 dark:border-purple-500 bg-background block size-4 shrink-0 rounded-full shadow-md transition-shadow hover:scale-110 focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          thumbClassName
        )}
      />
    </SliderPrimitive.Root>
  )
}
