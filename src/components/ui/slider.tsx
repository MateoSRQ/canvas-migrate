import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"
import { cn } from "#/lib/utils"

export function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 1,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
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
          className="bg-purple-600 dark:bg-purple-500 absolute h-full"
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        className="border-2 border-purple-600 dark:border-purple-500 bg-background block size-4 shrink-0 rounded-full shadow-md transition-shadow hover:scale-110 focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
      />
    </SliderPrimitive.Root>
  )
}
