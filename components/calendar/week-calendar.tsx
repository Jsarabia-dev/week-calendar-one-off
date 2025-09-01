"use client"

import type React from "react"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon } from "@heroicons/react/24/outline"
import { cn } from "@/lib/utils"

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  color?: string
}

export interface CalendarCallbacks {
  onEventSelect?: (event: CalendarEvent) => void
  onEventCreate?: (event: Omit<CalendarEvent, "id">) => Promise<CalendarEvent> | CalendarEvent
  onEventUpdate?: (eventId: string, updates: Partial<Omit<CalendarEvent, "id">>) => Promise<void> | void
  onEventDelete?: (eventId: string) => Promise<void> | void
}

interface WeekCalendarProps extends CalendarCallbacks {
  events?: CalendarEvent[]
  initialDate?: Date
  timeFormat?: "12h" | "24h"
  showWeekends?: boolean
  minTime?: number // hour (0-23)
  maxTime?: number // hour (0-23)
  slotDuration?: number // minutes (15, 30, 60)
  className?: string
  loading?: boolean
  disabled?: boolean
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface EventBlockProps {
  event: CalendarEvent
  onClick?: () => void
  topOffset?: number
  width?: number
  zIndex?: number
  leftOffset?: number
  disabled?: boolean
}

function EventBlock({
  event,
  onClick,
  topOffset = 0,
  width = 100,
  zIndex = 1,
  leftOffset = 0,
  disabled = false,
}: EventBlockProps) {
  const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60)
  const height = Math.max(40, (duration / 30) * 50) // 50px per 30-minute slot
  const isSingleSlot = duration <= 30

  const shouldShowTime = useMemo(() => {
    // Calculate available space based on width and height
    const actualWidth = width * 0.84 // Account for the width reduction in styling
    const hasWideEnoughWidth = actualWidth >= 60 // Need at least 60% width
    const hasTallEnoughHeight = height >= 50 // Need at least 50px height
    const titleLength = event.title.length

    // Show time if we have enough space and title isn't too long
    return hasWideEnoughWidth && hasTallEnoughHeight && titleLength <= 15
  }, [width, height, event.title.length])

  const formatEventTime = useCallback(() => {
    const time = event.start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: event.start.getMinutes() === 0 ? undefined : "2-digit",
      hour12: true,
    })
    return time.replace(" ", "").toLowerCase() // Remove space and make lowercase for compactness
  }, [event.start])

  return (
    <div
      data-event-block="true"
      className={cn(
        "absolute rounded-md text-xs font-medium transition-colors",
        "bg-gray-800 text-white border border-gray-600/60 shadow-lg",
        "overflow-visible",
        !disabled && "cursor-pointer hover:bg-gray-700 hover:border-gray-500/80",
        disabled && "opacity-50 cursor-not-allowed",
        isSingleSlot ? "p-2" : "p-1.5",
      )}
      style={{
        height: `${height}px`,
        top: `${6 + topOffset}px`,
        left: `${8 + leftOffset}%`,
        width: `${width * 0.84}%`,
        zIndex: zIndex + 100,
        backgroundColor: event.color || undefined,
      }}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        if (!disabled) {
          onClick?.()
        }
      }}
      onMouseDown={(e) => {
        e.stopPropagation()
        e.preventDefault()
      }}
      onMouseEnter={(e) => {
        e.stopPropagation()
      }}
      onMouseUp={(e) => {
        e.stopPropagation()
        e.preventDefault()
      }}
      title={`${event.title} - ${event.start.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`}
    >
      <div className={cn("font-medium leading-tight", isSingleSlot ? "text-sm" : "text-xs")}>
        <div className="truncate">{event.title}</div>
        {shouldShowTime && <div className="text-[10px] opacity-75 mt-0.5 truncate">{formatEventTime()}</div>}
      </div>
    </div>
  )
}

export function WeekCalendar({
  events = [],
  onEventSelect,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  initialDate = new Date(),
  timeFormat = "12h",
  showWeekends = true,
  minTime = 0,
  maxTime = 23,
  slotDuration = 30,
  loading = false,
  disabled = false,
  className,
}: WeekCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(initialDate)
  const [is24Hour, setIs24Hour] = useState(timeFormat === "24h")
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ day: Date; slotIndex: number } | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{ day: Date; slotIndex: number } | null>(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventTitle, setEventTitle] = useState("")
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventDetails, setShowEventDetails] = useState(false)

  const handleCancelEvent = useCallback(() => {
    setShowEventForm(false)
    setEventTitle("")
    setSelectionStart(null)
    setSelectionEnd(null)
  }, [])

  const weekStart = useMemo(() => {
    const date = new Date(currentWeek)
    const day = date.getDay()
    const diff = date.getDate() - day
    return new Date(date.setDate(diff))
  }, [currentWeek])

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      return date
    })
  }, [weekStart])

  const TIME_SLOTS = useMemo(() => {
    const slots = []
    const totalMinutes = (maxTime - minTime + 1) * 60
    const slotsCount = totalMinutes / slotDuration

    for (let i = 0; i < slotsCount; i++) {
      const totalMinutesFromStart = i * slotDuration
      const hour = minTime + Math.floor(totalMinutesFromStart / 60)
      const minute = totalMinutesFromStart % 60

      if (hour <= maxTime) {
        slots.push({ hour, minute, index: i })
      }
    }

    return slots
  }, [minTime, maxTime, slotDuration])

  const formatTime = useCallback(
    (hour: number, minute: number) => {
      if (is24Hour) {
        return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      }

      if (hour === 0) return minute === 0 ? "12AM" : `12:${minute.toString().padStart(2, "0")}AM`
      if (hour === 12) return minute === 0 ? "12PM" : `12:${minute.toString().padStart(2, "0")}PM`
      if (hour < 12) return minute === 0 ? `${hour}AM` : `${hour}:${minute.toString().padStart(2, "0")}AM`
      return minute === 0 ? `${hour - 12}PM` : `${hour - 12}:${minute.toString().padStart(2, "0")}PM`
    },
    [is24Hour],
  )

  const formatWeekRange = useCallback(() => {
    const start = weekDays[0]
    const end = weekDays[6]
    const startMonth = start.toLocaleDateString("en-US", { month: "short" })
    const endMonth = end.toLocaleDateString("en-US", { month: "short" })
    const year = start.getFullYear()

    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()}–${end.getDate()}, ${year}`
    }
    return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${year}`
  }, [weekDays])

  const navigateWeek = useCallback((direction: "prev" | "next") => {
    setCurrentWeek((prev) => {
      const newDate = new Date(prev)
      newDate.setDate(prev.getDate() + (direction === "next" ? 7 : -7))
      return newDate
    })
  }, [])

  const getEventsForTimeSlot = useCallback(
    (day: Date, slotIndex: number) => {
      const slot = TIME_SLOTS[slotIndex]
      const slotStart = new Date(day)
      slotStart.setHours(slot.hour, slot.minute, 0, 0)
      const slotEnd = new Date(slotStart)
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration)

      return events.filter((event) => {
        const eventStart = new Date(event.start)
        const eventEnd = new Date(event.end)

        // Event overlaps with slot if it starts before slot ends and ends after slot starts
        return eventStart < slotEnd && eventEnd > slotStart
      })
    },
    [events, slotDuration],
  )

  const getSelectionRange = useCallback(() => {
    if (!selectionStart || !selectionEnd) return null

    const startSlot = TIME_SLOTS[selectionStart.slotIndex]
    const endSlot = TIME_SLOTS[selectionEnd.slotIndex]

    const startTime = new Date(selectionStart.day)
    startTime.setHours(startSlot.hour, startSlot.minute, 0, 0)

    const endTime = new Date(selectionEnd.day)
    endTime.setHours(endSlot.hour, endSlot.minute, 0, 0)

    if (
      selectionStart.day.getTime() === selectionEnd.day.getTime() &&
      selectionStart.slotIndex === selectionEnd.slotIndex
    ) {
      // Single slot selected - create event of slotDuration
      const singleSlotEnd = new Date(startTime)
      singleSlotEnd.setMinutes(singleSlotEnd.getMinutes() + slotDuration)
      return { start: startTime, end: singleSlotEnd }
    }

    if (startTime > endTime) {
      const tempStart = new Date(endTime.getTime() - slotDuration * 60 * 1000)
      return { start: tempStart, end: startTime }
    }

    const adjustedEndTime = new Date(endTime)
    adjustedEndTime.setMinutes(adjustedEndTime.getMinutes() + slotDuration)
    return { start: startTime, end: adjustedEndTime }
  }, [selectionStart, selectionEnd, slotDuration])

  const isSlotInSelection = useCallback(
    (day: Date, slotIndex: number) => {
      if (!selectionStart || !selectionEnd) return false

      const slot = TIME_SLOTS[slotIndex]
      const slotTime = new Date(day)
      slotTime.setHours(slot.hour, slot.minute, 0, 0)

      const range = getSelectionRange()
      if (!range) return false

      return slotTime >= range.start && slotTime < range.end
    },
    [selectionStart, selectionEnd, getSelectionRange],
  )

  const handleTimeSlotMouseDown = useCallback((day: Date, slotIndex: number, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-event-block]")) {
      return
    }
    setIsSelecting(true)
    setSelectionStart({ day, slotIndex })
    setSelectionEnd({ day, slotIndex })
    setSelectedSlot(null)
  }, [])

  const handleTimeSlotMouseEnter = useCallback(
    (day: Date, slotIndex: number, e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-event-block]")) {
        return
      }
      if (isSelecting && selectionStart) {
        setSelectionEnd({ day, slotIndex })
      }
    },
    [isSelecting, selectionStart],
  )

  const handleTimeSlotMouseUp = useCallback(() => {
    if (isSelecting && selectionStart && selectionEnd) {
      const range = getSelectionRange()
      if (range) {
        setShowEventForm(true)
      }
    }
    setIsSelecting(false)
  }, [isSelecting, selectionStart, selectionEnd, getSelectionRange])

  const displayDays = useMemo(() => {
    return showWeekends ? weekDays : weekDays.slice(1, 6) // Mon-Fri only
  }, [weekDays, showWeekends])

  const getEventLayout = useCallback(
    (day: Date, slotIndex: number) => {
      const slotEvents = getEventsForTimeSlot(day, slotIndex)
      if (slotEvents.length === 0) return []

      const slot = TIME_SLOTS[slotIndex]
      const slotStart = new Date(day)
      slotStart.setHours(slot.hour, slot.minute, 0, 0)
      const slotEnd = new Date(slotStart)
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration)

      const eventGroups = new Map<number, CalendarEvent[]>()

      slotEvents.forEach((event) => {
        const startTime = event.start.getTime()
        if (!eventGroups.has(startTime)) {
          eventGroups.set(startTime, [])
        }
        eventGroups.get(startTime)!.push(event)
      })

      const layouts: Array<{
        event: CalendarEvent
        topOffset: number
        width: number
        zIndex: number
        leftOffset: number
      }> = []

      eventGroups.forEach((groupEvents, startTime) => {
        const sortedEvents = groupEvents.sort((a, b) => {
          const durationA = a.end.getTime() - a.start.getTime()
          const durationB = b.end.getTime() - b.start.getTime()
          if (durationA !== durationB) return durationB - durationA
          return a.title.localeCompare(b.title)
        })

        sortedEvents.forEach((event, index) => {
          const eventStart = new Date(event.start)
          const eventEnd = new Date(event.end)

          const eventStartSlot = new Date(day)
          eventStartSlot.setHours(slot.hour, slot.minute, 0, 0)
          const eventStartSlotEnd = new Date(eventStartSlot)
          eventStartSlotEnd.setMinutes(eventStartSlotEnd.getMinutes() + slotDuration)

          if (eventStart >= eventStartSlot && eventStart < eventStartSlotEnd) {
            const totalEventsInGroup = sortedEvents.length
            const eventWidth = totalEventsInGroup > 1 ? 100 / totalEventsInGroup : 100
            const leftOffset = totalEventsInGroup > 1 ? index * eventWidth : 0

            layouts.push({
              event,
              topOffset: 0,
              width: eventWidth,
              zIndex: 10 + index,
              leftOffset: leftOffset,
            })
          }
        })
      })

      return layouts
    },
    [getEventsForTimeSlot, slotDuration, TIME_SLOTS],
  )

  const getSlotHeight = useCallback(
    (day: Date, slotIndex: number) => {
      const eventLayouts = getEventLayout(day, slotIndex)
      if (eventLayouts.length === 0) return 50

      return 50
    },
    [getEventLayout],
  )

  const handleCreateEvent = useCallback(async () => {
    const range = getSelectionRange()
    if (range && eventTitle.trim() && onEventCreate && !isCreatingEvent) {
      setIsCreatingEvent(true)

      try {
        const newEventData = {
          title: eventTitle.trim(),
          start: range.start,
          end: range.end,
          color: "#374151",
        }

        const result = await Promise.resolve(onEventCreate(newEventData))

        console.log("Event created:", result)

        setEventTitle("")
        setShowEventForm(false)
        setSelectionStart(null)
        setSelectionEnd(null)
      } catch (error) {
        console.error("Failed to create event:", error)
      } finally {
        setIsCreatingEvent(false)
      }
    }
  }, [getSelectionRange, eventTitle, onEventCreate, isCreatingEvent, slotDuration])

  const handleEventClick = useCallback(
    async (event: CalendarEvent, action: "select" | "update" | "delete" = "select") => {
      if (disabled) return

      switch (action) {
        case "select":
          setSelectedEvent(event)
          setShowEventDetails(true)
          onEventSelect?.(event)
          break
        case "update":
          if (onEventUpdate) {
            await Promise.resolve(onEventUpdate(event.id, {}))
          }
          break
        case "delete":
          if (onEventDelete) {
            await Promise.resolve(onEventDelete(event.id))
          }
          break
      }
    },
    [onEventSelect, onEventUpdate, onEventDelete, disabled],
  )

  const handleCloseEventDetails = useCallback(() => {
    setShowEventDetails(false)
    setSelectedEvent(null)
  }, [])

  const formatEventDuration = useCallback((start: Date, end: Date) => {
    const duration = (end.getTime() - start.getTime()) / (1000 * 60)
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60

    if (hours === 0) {
      return `${minutes} minutes`
    } else if (minutes === 0) {
      return `${hours} hour${hours > 1 ? "s" : ""}`
    } else {
      return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minutes`
    }
  }, [])

  return (
    <div className={cn("flex flex-col h-full bg-background", loading && "opacity-50 pointer-events-none", className)}>
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")} disabled={disabled}>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateWeek("next")} disabled={disabled}>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold text-foreground">{formatWeekRange()}</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())} disabled={disabled}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIs24Hour(!is24Hour)} disabled={disabled}>
            <ClockIcon className="h-4 w-4 mr-1" />
            {is24Hour ? "24h" : "12h"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]">
          <div className={cn("grid border-b border-border bg-muted/30", `grid-cols-${displayDays.length + 1}`)}>
            <div className="p-2 text-sm font-medium text-muted-foreground"></div>
            {displayDays.map((day, index) => {
              const isToday = day.toDateString() === new Date().toDateString()
              const dayIndex = showWeekends ? index : index + 1

              return (
                <div
                  key={day.toISOString()}
                  className={cn("p-2 text-center border-l border-border first:border-l-0", isToday && "bg-primary/5")}
                >
                  <div
                    className={cn(
                      "text-sm font-medium",
                      isToday ? "text-primary font-semibold" : "text-muted-foreground",
                    )}
                  >
                    {DAYS[dayIndex]}
                  </div>
                  <div
                    className={cn(
                      "text-base font-semibold mt-0.5",
                      isToday
                        ? "text-primary bg-primary/10 rounded-full w-7 h-7 flex items-center justify-center mx-auto border border-primary/20"
                        : "text-foreground",
                    )}
                  >
                    {day.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="relative" onMouseUp={disabled ? undefined : handleTimeSlotMouseUp}>
            {TIME_SLOTS.map((slot) => {
              const maxSlotHeight = Math.max(...displayDays.map((day) => getSlotHeight(day, slot.index)))

              return (
                <div
                  key={slot.index}
                  className={cn(
                    `grid grid-cols-${displayDays.length + 1}`,
                    slot.minute === 0 && slot.hour > 0 ? "border-t border-border" : "border-t border-border/30",
                    "border-b border-border/30 last:border-b-border",
                  )}
                  style={{ minHeight: `${maxSlotHeight}px` }}
                >
                  <div
                    className={cn(
                      "p-3 text-sm text-muted-foreground font-medium border-r border-border flex items-start",
                      slot.minute !== 0 && "text-muted-foreground/60",
                    )}
                  >
                    {formatTime(slot.hour, slot.minute)}
                  </div>

                  {displayDays.map((day) => {
                    const eventLayouts = getEventLayout(day, slot.index)
                    const isSelected =
                      selectedSlot &&
                      selectedSlot.start.getTime() ===
                        new Date(day.getFullYear(), day.getMonth(), day.getDate(), slot.hour, slot.minute).getTime()
                    const isInSelection = isSlotInSelection(day, slot.index)

                    return (
                      <div
                        key={`${day.toISOString()}-${slot.index}`}
                        className={cn(
                          "relative transition-colors select-none",
                          "border-l border-t border-gray-300/40",
                          "first:border-l-0",
                          "bg-gray-50/50 shadow-inner shadow-gray-200/10",
                          !disabled && "cursor-pointer hover:bg-muted/20 hover:border-gray-400/60",
                          isSelected && "bg-primary/10",
                        )}
                        style={{
                          minHeight: `${maxSlotHeight}px`,
                          backgroundImage: `repeating-linear-gradient(
                            -45deg,
                            transparent,
                            transparent 8px,
                            rgba(255, 255, 255, 0.6) 8px,
                            rgba(255, 255, 255, 0.6) 10px
                          )`,
                        }}
                        onMouseDown={disabled ? undefined : (e) => handleTimeSlotMouseDown(day, slot.index, e)}
                        onMouseEnter={disabled ? undefined : (e) => handleTimeSlotMouseEnter(day, slot.index, e)}
                      >
                        {eventLayouts.map(({ event, topOffset, width, zIndex, leftOffset }) => (
                          <EventBlock
                            key={event.id}
                            event={event}
                            onClick={() => handleEventClick(event, "select")}
                            topOffset={topOffset}
                            width={width}
                            zIndex={zIndex}
                            leftOffset={leftOffset}
                            disabled={disabled}
                          />
                        ))}

                        {isInSelection && !disabled && (
                          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1000 }}>
                            <div className="absolute inset-0 bg-blue-500/20" />
                            <div className="absolute inset-0 border-2 border-dashed border-blue-600 animate-pulse" />
                            <div className="absolute top-0 left-0 w-2 h-2 bg-blue-600 rounded-full" />
                            <div className="absolute top-0 right-0 w-2 h-2 bg-blue-600 rounded-full" />
                            <div className="absolute bottom-0 left-0 w-2 h-2 bg-blue-600 rounded-full" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 bg-blue-600 rounded-full" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {showEventForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100]">
          <div className="bg-background border border-border rounded-lg p-6 w-96 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Create Event</h3>

            {getSelectionRange() && (
              <div className="text-sm text-muted-foreground mb-4">
                {getSelectionRange()!.start.toLocaleDateString()}{" "}
                {getSelectionRange()!.start.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: !is24Hour,
                })}{" "}
                -{" "}
                {getSelectionRange()!.end.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: !is24Hour,
                })}
              </div>
            )}

            <input
              type="text"
              placeholder="Event title"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="w-full p-2 border border-border rounded-md mb-4 bg-background text-foreground"
              autoFocus
              disabled={isCreatingEvent}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isCreatingEvent) handleCreateEvent()
                if (e.key === "Escape" && !isCreatingEvent) handleCancelEvent()
              }}
            />

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCancelEvent} disabled={isCreatingEvent}>
                Cancel
              </Button>
              <Button onClick={handleCreateEvent} disabled={!eventTitle.trim() || isCreatingEvent}>
                {isCreatingEvent ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showEventDetails && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100]">
          <div className="bg-background border border-border rounded-lg p-6 w-96 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Event Details</h3>
              <Button variant="ghost" size="sm" onClick={handleCloseEventDetails}>
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Title</label>
                <p className="text-base font-medium text-foreground mt-1">{selectedEvent.title}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Date</label>
                <p className="text-base text-foreground mt-1">
                  {selectedEvent.start.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Time</label>
                <p className="text-base text-foreground mt-1">
                  {selectedEvent.start.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: !is24Hour,
                  })}{" "}
                  -{" "}
                  {selectedEvent.end.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: !is24Hour,
                  })}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Duration</label>
                <p className="text-base text-foreground mt-1">
                  {formatEventDuration(selectedEvent.start, selectedEvent.end)}
                </p>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              {onEventDelete && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleEventClick(selectedEvent, "delete")
                    handleCloseEventDetails()
                  }}
                >
                  Delete
                </Button>
              )}
              <Button onClick={handleCloseEventDetails}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
