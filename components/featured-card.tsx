import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, MapPin, Clock, Users } from "lucide-react"

interface FeaturedCardProps {
  type: "Event" | "Opportunity" | "Resources" | "Jobs"
  title: string
  description: string
  date?: string
  location?: string
  deadline?: string
  eligibility?: string
  isFree?: boolean // Only for Event
  link: string
}

export default function FeaturedCard({
  type,
  title,
  description,
  date,
  location,
  deadline,
  eligibility,
  isFree,
  link,
}: FeaturedCardProps) {
  return (
    <Card className="card-hover border-gray-200 h-full flex flex-col">
      <CardHeader className="flex-grow-0">
        <div className="flex justify-between items-start">
          <Badge
            variant={type === "Event" ? "secondary" : "default"}
            className={type === "Event" ? "bg-gray-200 text-gray-800" : "bg-brand-orange text-white"}
          >
            {type}
          </Badge>
          {type === "Event" && (
            <Badge
              variant={isFree ? "outline" : "secondary"}
              className={isFree ? "border-brand-orange text-brand-orange" : "bg-gray-200 text-gray-800"}
            >
              {isFree ? "Free" : "Paid"}
            </Badge>
          )}
        </div>
        <CardTitle className="mt-2 text-lg font-semibold break-words hyphens-auto">
          {title}
        </CardTitle>
        <CardDescription className="mt-2 text-sm break-words hyphens-auto">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {type === "Event" && (
            <>
              {date && (
                <div className="flex items-center text-sm">
                  <Calendar className="mr-2 h-4 w-4 text-brand-orange" />
                  <span>{date}</span>
                </div>
              )}
              {location && (
                <div className="flex items-center text-sm">
                  <MapPin className="mr-2 h-4 w-4 text-brand-orange" />
                  <span>{location}</span>
                </div>
              )}
            </>
          )}
          {type === "Opportunity" && (
            <>
              {deadline && (
                <div className="flex items-center text-sm">
                  <Clock className="mr-2 h-4 w-4 text-brand-orange" />
                  <span>{deadline}</span>
                </div>
              )}
              {eligibility && (
                <div className="flex items-center text-sm">
                  <Users className="mr-2 h-4 w-4 text-brand-orange" />
                  <span>{eligibility}</span>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Link
          href={link}
          className="text-brand-orange hover:underline font-medium"
          target="_blank"
          rel="noopener noreferrer"
        >
          {type === "Event" ? "Register Now" : type === "Opportunity" ? "Apply Now" : "View Resource"} →
        </Link>
      </CardFooter>
    </Card>
  )
}
