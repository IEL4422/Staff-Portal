import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

/**
 * DatePicker component with calendar popup and manual input
 * @param {Object} props
 * @param {string} props.value - Date value in YYYY-MM-DD format
 * @param {function} props.onChange - Callback when date changes, receives YYYY-MM-DD string
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.clearable - Whether to show a clear button
 */
function DatePicker({ 
  value, 
  onChange, 
  placeholder = "Pick a date",
  disabled = false,
  className,
  clearable = true,
  ...props 
}) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  // Parse the value prop to a Date object
  const selectedDate = React.useMemo(() => {
    if (!value) return undefined
    const parsed = parse(value, "yyyy-MM-dd", new Date())
    return isValid(parsed) ? parsed : undefined
  }, [value])

  // Update input value when value prop changes
  React.useEffect(() => {
    if (selectedDate) {
      setInputValue(format(selectedDate, "MM/dd/yyyy"))
    } else {
      setInputValue("")
    }
  }, [selectedDate])

  // Handle calendar selection
  const handleSelect = (date) => {
    if (date) {
      onChange(format(date, "yyyy-MM-dd"))
    }
    setOpen(false)
  }

  // Handle manual input
  const handleInputChange = (e) => {
    const val = e.target.value
    setInputValue(val)
    
    // Try to parse common date formats
    const formats = ["MM/dd/yyyy", "M/d/yyyy", "MM-dd-yyyy", "M-d-yyyy", "yyyy-MM-dd"]
    for (const fmt of formats) {
      const parsed = parse(val, fmt, new Date())
      if (isValid(parsed)) {
        onChange(format(parsed, "yyyy-MM-dd"))
        return
      }
    }
  }

  // Handle blur - validate and format
  const handleBlur = () => {
    if (inputValue && selectedDate) {
      setInputValue(format(selectedDate, "MM/dd/yyyy"))
    } else if (!inputValue) {
      onChange("")
    }
  }

  // Handle clear
  const handleClear = (e) => {
    e.stopPropagation()
    onChange("")
    setInputValue("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative", className)}>
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "pr-16 cursor-pointer",
              !value && "text-muted-foreground"
            )}
            onClick={() => !disabled && setOpen(true)}
            {...props}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {clearable && value && !disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-slate-200"
                onClick={handleClear}
              >
                <X className="h-3 w-3 text-slate-400" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(!open)
              }}
            >
              <CalendarIcon className="h-4 w-4 text-slate-500" />
            </Button>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
        />
        <div className="p-2 border-t flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => handleSelect(new Date())}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => {
              onChange("")
              setOpen(false)
            }}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

DatePicker.displayName = "DatePicker"

export { DatePicker }
