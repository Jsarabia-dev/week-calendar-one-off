"use client"

import { WeekCalendar, type CalendarEvent } from "@/components/calendar/week-calendar"
import { useState } from "react"

// Sample events data
const sampleEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Team Standup",
    start: new Date(2024, 11, 16, 9, 0),
    end: new Date(2024, 11, 16, 9, 30),
    color: "#10b981", // emerald
  },
  {
    id: "2",
    title: "Product Review",
    start: new Date(2024, 11, 16, 14, 0),
    end: new Date(2024, 11, 16, 15, 30),
    color: "#f59e0b", // amber
  },
  {
    id: "3",
    title: "Client Call",
    start: new Date(2024, 11, 17, 10, 0),
    end: new Date(2024, 11, 17, 11, 0),
    color: "#ef4444", // red
  },
  {
    id: "4",
    title: "Design Workshop",
    start: new Date(2024, 11, 18, 13, 0),
    end: new Date(2024, 11, 18, 16, 0),
    color: "#8b5cf6", // violet
  },
  {
    id: "5",
    title: "All Hands Meeting",
    start: new Date(2024, 11, 19, 15, 0),
    end: new Date(2024, 11, 19, 16, 0),
    color: "#06b6d4", // cyan
  },
]

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>(sampleEvents)
  const [loading, setLoading] = useState(false)

  const handleEventSelect = (event: CalendarEvent) => {
    console.log("Selected event:", event)
    // Handle event selection (e.g., open edit modal)
  }

  const handleTimeSlotSelect = (start: Date, end: Date) => {
    console.log("Selected time slot:", { start, end })
    // Handle time slot selection (e.g., create new event)
  }

  const handleEventCreate = async (newEvent: Omit<CalendarEvent, "id">): Promise<CalendarEvent> => {
    setLoading(true)

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      const eventWithId: CalendarEvent = {
        ...newEvent,
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Better ID generation
      }

      setEvents((prevEvents) => [...prevEvents, eventWithId])
      console.log("Created event:", eventWithId)

      return eventWithId
    } catch (error) {
      console.error("Failed to create event:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handleEventUpdate = async (eventId: string, updates: Partial<Omit<CalendarEvent, "id">>) => {
    setLoading(true)

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 300))

      setEvents((prevEvents) => prevEvents.map((event) => (event.id === eventId ? { ...event, ...updates } : event)))
      console.log("Updated event:", eventId, updates)
    } catch (error) {
      console.error("Failed to update event:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handleEventDelete = async (eventId: string) => {
    setLoading(true)

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 300))

      setEvents((prevEvents) => prevEvents.filter((event) => event.id !== eventId))
      console.log("Deleted event:", eventId)
    } catch (error) {
      console.error("Failed to delete event:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <h1 className="text-lg font-semibold">Calendar</h1>
          {loading && <div className="ml-4 text-sm text-muted-foreground">Processing...</div>}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <WeekCalendar
          events={events}
          onEventSelect={handleEventSelect}
          onTimeSlotSelect={handleTimeSlotSelect}
          onEventCreate={handleEventCreate}
          onEventUpdate={handleEventUpdate}
          onEventDelete={handleEventDelete}
          timeFormat="12h"
          showWeekends={true}
          minTime={0} // Start at midnight (12 AM) to show all hours
          maxTime={23} // End at 11 PM to show all hours
          loading={loading}
          className="h-full"
        />
      </main>
    </div>
  )
}
