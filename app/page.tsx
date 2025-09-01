import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CalendarDaysIcon } from "@heroicons/react/24/outline"

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Week Calendar Demo</h1>
          <p className="text-lg text-muted-foreground">
            A professional calendar component built with Next.js and Tailwind CSS
          </p>
        </div>

        <Button asChild size="lg" className="gap-2">
          <Link href="/calendar">
            <CalendarDaysIcon className="h-5 w-5" />
            View Calendar
          </Link>
        </Button>
      </div>
    </div>
  )
}
